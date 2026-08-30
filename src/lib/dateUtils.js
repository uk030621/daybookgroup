import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  isPast,
  formatDistanceToNowStrict,
} from "date-fns";

export function formatDueDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);

  if (isToday(date)) return `Today, ${format(date, "h:mm a")}`;
  if (isTomorrow(date)) return `Tomorrow, ${format(date, "h:mm a")}`;
  if (isYesterday(date)) return `Yesterday, ${format(date, "h:mm a")}`;

  return format(date, "MMM d, h:mm a");
}

export function isOverdue(dateString, completed) {
  if (!dateString || completed) return false;
  return isPast(new Date(dateString));
}

export function isDueSoon(dateString, completed) {
  if (!dateString || completed) return false;
  const date = new Date(dateString);
  if (isPast(date)) return false;
  const hoursUntil = (date.getTime() - Date.now()) / (1000 * 60 * 60);
  return hoursUntil <= 24;
}

export function relativeTime(dateString) {
  if (!dateString) return "";
  return formatDistanceToNowStrict(new Date(dateString), { addSuffix: true });
}
