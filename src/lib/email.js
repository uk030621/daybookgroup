import { Resend } from "resend";

let resendClient = null;

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

const PRIORITY_LABEL = {
  low: "Low priority",
  medium: "Medium priority",
  high: "High priority",
};

function formatDue(date, timezone) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "long",
    // Falling back to UTC only happens for reminders created before this
    // field existed, or if a browser ever fails to report its timezone.
    timeZone: timezone || "UTC",
  }).format(new Date(date));
}

export async function sendReminderEmail(reminder) {
  const resend = getResendClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const fromAddress =
    process.env.EMAIL_FROM || "Daybook <onboarding@resend.dev>";

  const dueText = reminder.dueDate
    ? formatDue(reminder.dueDate, reminder.timezone)
    : null;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #16302A;">
      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #5C6F67; margin: 0 0 8px;">
        Daybook reminder
      </p>
      <h1 style="font-size: 22px; margin: 0 0 12px; color: #16302A;">
        ${escapeHtml(reminder.title)}
      </h1>
      ${dueText ? `<p style="font-size: 15px; margin: 0 0 12px;"><strong>Due:</strong> ${dueText}</p>` : ""}
      ${reminder.notes ? `<p style="font-size: 14px; line-height: 1.5; color: #2B463D; margin: 0 0 12px;">${escapeHtml(reminder.notes)}</p>` : ""}
      <p style="font-size: 13px; color: #5C6F67; margin: 0 0 20px;">
        ${PRIORITY_LABEL[reminder.priority] || "Medium priority"} · ${escapeHtml(reminder.category || "General")}
      </p>
      ${
        appUrl
          ? `<a href="${appUrl}" style="display: inline-block; background: #16302A; color: #EEF0E9; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-size: 14px;">Open Daybook</a>`
          : ""
      }
    </div>
  `;

  const text = [
    reminder.title,
    dueText ? `Due: ${dueText}` : null,
    reminder.notes || null,
    appUrl || null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return resend.emails.send({
    from: fromAddress,
    to: reminder.email,
    subject: `Reminder: ${reminder.title}`,
    html,
    text,
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendGroupInviteEmail({
  toEmail,
  groupName,
  inviterName,
  acceptUrl,
}) {
  const resend = getResendClient();
  const fromAddress =
    process.env.EMAIL_FROM || "Daybook <onboarding@resend.dev>";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #16302A;">
      <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #5C6F67; margin: 0 0 8px;">
        Daybook invite
      </p>
      <h1 style="font-size: 22px; margin: 0 0 12px; color: #16302A;">
        ${escapeHtml(inviterName || "Someone")} invited you to ${escapeHtml(groupName)}
      </h1>
      <p style="font-size: 14px; line-height: 1.5; color: #2B463D; margin: 0 0 20px;">
        Accept below to join, using the same Google account you'd like to use with Daybook.
      </p>
      <a href="${acceptUrl}" style="display: inline-block; background: #16302A; color: #EEF0E9; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-size: 14px;">Accept invite</a>
    </div>
  `;

  const text = [
    `${inviterName || "Someone"} invited you to ${groupName} on Daybook.`,
    `Accept here: ${acceptUrl}`,
  ].join("\n\n");

  return resend.emails.send({
    from: fromAddress,
    to: toEmail,
    subject: `You've been invited to ${groupName} on Daybook`,
    html,
    text,
  });
}
