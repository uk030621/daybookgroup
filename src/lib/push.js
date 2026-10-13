import webpush from "web-push";
import PushSubscription from "../models/PushSubscription";
import Membership from "../models/Membership";
import User from "../models/User";

// How long a push service should hold a notification for a device that is
// offline before giving up. A reminder that arrives hours late is worse than
// none, so this is deliberately short (one hour, in seconds).
const PUSH_TTL_SECONDS = 60 * 60;

let configured = false;

export function pushIsConfigured() {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT,
  );
}

function configure() {
  if (configured) return;
  if (!pushIsConfigured()) {
    throw new Error(
      "Push notifications aren't configured: set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT.",
    );
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
  configured = true;
}

// Sends one payload to every registered device belonging to the given users.
// Devices the push service reports as gone (404/410) are deleted so they
// aren't retried forever.
export async function sendPushToUsers(userIds, payload) {
  configure();

  const ids = [...new Set((userIds || []).filter(Boolean))];
  const result = { attempted: 0, delivered: 0, removed: 0, failed: 0, errors: [] };
  if (!ids.length) return result;

  const subscriptions = await PushSubscription.find({
    userId: { $in: ids },
  }).lean();
  const body = JSON.stringify(payload);

  // Nothing found for this user: say how many devices the database holds
  // overall, so a missing row can be told apart from a lookup problem.
  if (!subscriptions.length) {
    const total = await PushSubscription.countDocuments({});
    result.note = `looked for user ending ${String(ids[0]).slice(-4)}; database holds ${total} device(s) in total`;
  }

  await Promise.all(
    subscriptions.map(async (sub) => {
      result.attempted += 1;
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          body,
          { TTL: PUSH_TTL_SECONDS, urgency: "high" },
        );
        result.delivered += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[push] device removed: push service said ${err.statusCode} (expired or unsubscribed)`);
          await PushSubscription.deleteOne({ _id: sub._id });
          result.removed += 1;
        } else {
          result.failed += 1;
          result.errors.push(
            `${err.statusCode || "error"}: ${String(err.body || err.message || "").slice(0, 120)}`,
          );
        }
      }
    }),
  );

  return result;
}

// UK date format (day Month year, 24-hour clock) in the reminder's own
// timezone. Reminders saved before the timezone field existed fall back to
// London time.
function formatDue(date, timezone) {
  const options = {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };
  try {
    return new Intl.DateTimeFormat("en-GB", {
      ...options,
      timeZone: timezone || "Europe/London",
    }).format(new Date(date));
  } catch {
    return new Intl.DateTimeFormat("en-GB", {
      ...options,
      timeZone: "UTC",
    }).format(new Date(date));
  }
}

export function buildReminderPayload(reminder, { sharedBy } = {}) {
  const due = reminder.dueDate ? `Due ${formatDue(reminder.dueDate, reminder.timezone)}` : "";
  const body = [sharedBy ? `Shared by ${sharedBy}` : null, due || null]
    .filter(Boolean)
    .join(" · ");

  return {
    title: reminder.title,
    body,
    // Same tag for the same reminder, so a repeat replaces rather than stacks.
    tag: `reminder-${reminder._id}`,
    url: "/",
  };
}

function mergeResults(into, from) {
  into.attempted += from.attempted;
  into.delivered += from.delivered;
  into.removed += from.removed;
  into.failed += from.failed;
  into.errors.push(...from.errors);
  if (from.note && !into.note) into.note = from.note;
}

// Sends the lead-time push for a reminder: always to its owner, and — only
// when the owner switched "Notify group members too" on and the reminder is
// still shared — to the other active members of that group who haven't
// muted it.
export async function sendReminderPush(reminder) {
  const total = { attempted: 0, delivered: 0, removed: 0, failed: 0, errors: [] };

  mergeResults(
    total,
    await sendPushToUsers([reminder.userId], buildReminderPayload(reminder)),
  );

  if (reminder.sharedWithGroupId && reminder.pushNotifyGroup) {
    // When the owner limited the reminder to particular people, only they
    // are notified; otherwise it's every active member of the group.
    const chosen = reminder.sharedWithUserIds || [];
    const memberships = await Membership.find({
      groupId: reminder.sharedWithGroupId,
      status: "active",
      userId: chosen.length
        ? { $nin: [null, reminder.userId], $in: chosen }
        : { $nin: [null, reminder.userId] },
      pushMuted: { $ne: true },
    })
      .select("userId")
      .lean();
    const memberIds = memberships.map((m) => m.userId);

    if (memberIds.length) {
      const owner = await User.findById(reminder.userId).select("name").lean();
      mergeResults(
        total,
        await sendPushToUsers(
          memberIds,
          buildReminderPayload(reminder, {
            sharedBy: owner?.name || "someone in your group",
          }),
        ),
      );
    }
  }

  return total;
}
