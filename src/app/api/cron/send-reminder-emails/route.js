import { NextResponse } from "next/server";
import { connectToDatabase } from "../../../../lib/mongodb";
import Reminder from "../../../../models/Reminder";
import { sendReminderEmail } from "../../../../lib/email";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/cron/send-reminder-emails
//
// Not user-facing — this is meant to be called on a schedule (Vercel Cron,
// or an external scheduler like cron-job.org) every few minutes. It finds
// every reminder whose lead-time has arrived and hasn't been emailed yet,
// sends the email, and marks it sent so it's never emailed twice.
//
// Protected by a shared secret rather than a user session, since there's no
// browser involved when this runs.
export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const now = new Date();

  // "Due for an email" means: not completed, has a due date, hasn't been
  // emailed yet, has a real recipient address, and (dueDate - leadTime) has
  // already arrived.
  const candidates = await Reminder.find({
    completed: false,
    dueDate: { $ne: null },
    reminderEmailSentAt: null,
    email: { $ne: null },
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

  for (const reminder of candidates) {
    try {
      await sendReminderEmail(reminder);
      reminder.reminderEmailSentAt = now;
      await reminder.save();
      sent += 1;
    } catch (err) {
      failed += 1;
      errors.push({ id: reminder._id.toString(), message: err.message });
    }
  }

  return NextResponse.json({
    checked: candidates.length,
    sent,
    failed,
    errors: errors.slice(0, 10),
  });
}
