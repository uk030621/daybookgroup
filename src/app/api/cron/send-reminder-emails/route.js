import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import Reminder from "../../../../models/Reminder";
import { sendReminderEmail } from "../../../../lib/email";
import { pushIsConfigured, sendReminderPush } from "../../../../lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// A push is only useful near the moment it's due. If the notify time passed
// more than this long ago (cron was down, or someone just turned
// notifications on with old reminders lying around), skip it quietly rather
// than buzzing about something stale.
const PUSH_STALE_MS = 3 * 60 * 60 * 1000;

// GET /api/cron/send-reminder-emails
//
// Not user-facing — this is meant to be called on a schedule (an external
// scheduler like cron-job.org) every few minutes. It finds every reminder
// whose lead-time has arrived and, for each one, sends the email and/or the
// push notification that hasn't gone out yet, marking each as sent so it's
// never delivered twice.
//
// The URL keeps its original name so the existing cron-job.org job needs no
// changes. Protected by a shared secret rather than a user session, since
// there's no browser involved when this runs.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const now = new Date();
  const pushReady = pushIsConfigured();

  // "Due for a notification" means: not completed, has a due date,
  // (dueDate - leadTime) has already arrived, and at least one channel is
  // still waiting — an email that hasn't been sent to a real address, or a
  // push that is switched on and hasn't been sent.
  const pending = [{ reminderEmailSentAt: null, email: { $ne: null } }];
  if (pushReady) {
    pending.push({ pushEnabled: { $ne: false }, pushSentAt: null });
  }

  const candidates = await Reminder.find({
    completed: false,
    dueDate: { $ne: null },
    $or: pending,
    $expr: {
      $lte: [
        {
          $subtract: [
            "$dueDate",
            { $multiply: [{ $ifNull: ["$remindMinutesBefore", 60] }, 60000] },
          ],
        },
        now,
      ],
    },
  }).limit(200); // safety cap per run

  let sent = 0;
  let failed = 0;
  const errors = [];
  const push = { sent: 0, waiting: 0, skippedStale: 0, failed: 0 };

  for (const reminder of candidates) {
    let changed = false;

    // ---- Email (unchanged behaviour) ----
    if (!reminder.reminderEmailSentAt && reminder.email) {
      try {
        await sendReminderEmail(reminder);
        reminder.reminderEmailSentAt = now;
        changed = true;
        sent += 1;
      } catch (err) {
        failed += 1;
        errors.push({ id: reminder._id.toString(), message: err.message });
      }
    }

    // ---- Push ----
    if (pushReady && reminder.pushEnabled !== false && !reminder.pushSentAt) {
      const notifyAt =
        reminder.dueDate.getTime() -
        (reminder.remindMinutesBefore ?? 60) * 60000;

      if (now.getTime() - notifyAt > PUSH_STALE_MS) {
        reminder.pushSentAt = now;
        changed = true;
        push.skippedStale += 1;
      } else {
        try {
          const result = await sendReminderPush(reminder);
          if (result.delivered > 0) {
            reminder.pushSentAt = now;
            changed = true;
            push.sent += 1;
          } else if (result.failed > 0) {
            // Left unmarked so the next run tries again.
            push.failed += 1;
            errors.push({
              id: reminder._id.toString(),
              message: `push: ${result.errors[0]}`,
            });
          } else {
            // No registered device yet. Left unmarked, so turning
            // notifications on shortly afterwards still catches it.
            push.waiting += 1;
          }
        } catch (err) {
          push.failed += 1;
          errors.push({
            id: reminder._id.toString(),
            message: `push: ${err.message}`,
          });
        }
      }
    }

    if (changed) {
      try {
        await reminder.save();
      } catch (err) {
        errors.push({ id: reminder._id.toString(), message: err.message });
      }
    }
  }

  return NextResponse.json({
    checked: candidates.length,
    sent,
    failed,
    push,
    errors: errors.slice(0, 10),
  });
}
