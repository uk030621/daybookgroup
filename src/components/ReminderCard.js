"use client";

import {
  Check,
  Pencil,
  Trash2,
  Pin,
  Repeat,
  AlertTriangle,
  Clock,
  Users,
} from "lucide-react";
import { formatDueDate, isOverdue, isDueSoon } from "../lib/dateUtils";

const PRIORITY_DOT = {
  low: "bg-sage",
  medium: "bg-amber",
  high: "bg-coral",
};

export default function ReminderCard({
  reminder,
  onToggleComplete,
  onEdit,
  onDelete,
  onTogglePin,
}) {
  const overdue = isOverdue(reminder.dueDate, reminder.completed);
  const dueSoon = isDueSoon(reminder.dueDate, reminder.completed);

  return (
    <div
      className={`group relative bg-white/70 dark:bg-dusk-card/70 border rounded-card shadow-card hover:shadow-cardHover transition-all animate-fadeUp ${
        overdue
          ? "border-coral/50"
          : reminder.pinned
            ? "border-amber/50"
            : "border-rule dark:border-dusk-rule"
      } ${reminder.completed ? "opacity-60" : ""}`}
    >
      <div className="margin-rule py-4 pr-4 sm:pr-24">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onToggleComplete(reminder)}
            title={reminder.completed ? "Mark as active" : "Mark as complete"}
            className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
              reminder.completed
                ? "bg-sage border-sage text-white"
                : "border-ink-faint dark:border-paper/40 hover:border-sage"
            }`}
          >
            {reminder.completed && <Check className="w-3 h-3" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`font-medium text-ink dark:text-paper leading-snug break-words ${
                  reminder.completed ? "line-through" : ""
                }`}
              >
                {reminder.title}
              </h3>
              <span
                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[reminder.priority]}`}
                title={`${reminder.priority} priority`}
              />
            </div>

            {reminder.notes && (
              <p className="text-sm text-ink-faint dark:text-paper/60 mt-1 line-clamp-2 break-words">
                {reminder.notes}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 text-xs font-mono">
              {reminder.dueDate && (
                <span
                  className={`inline-flex items-center gap-1 ${
                    overdue
                      ? "text-coral-dark dark:text-coral"
                      : dueSoon
                        ? "text-amber-dark dark:text-amber"
                        : "text-ink-faint dark:text-paper/50"
                  }`}
                >
                  {overdue ? (
                    <AlertTriangle className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )}
                  {formatDueDate(reminder.dueDate)}
                </span>
              )}

              <span className="inline-flex items-center gap-1 text-ink-faint dark:text-paper/50 bg-paper-dim dark:bg-dusk px-1.5 py-0.5 rounded">
                {reminder.category}
              </span>

              {reminder.recurrence !== "none" && (
                <span
                  className="inline-flex items-center gap-1 text-ink-faint dark:text-paper/50"
                  title={`Repeats ${reminder.recurrence}`}
                >
                  <Repeat className="w-3 h-3" />
                  {reminder.recurrence}
                </span>
              )}

              {reminder.isOwner === false && (
                <span
                  className="inline-flex items-center gap-1 text-ink-faint dark:text-paper/50"
                  title="Shared with you"
                >
                  <Users className="w-3 h-3" />
                  {reminder.owner?.name || "Shared"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions: a normal-flow row on mobile (always visible, tappable),
           promoted to a hover-revealed overlay in the card's top-right corner
           from `sm` up, where hover exists and there's room to spare.
           Only the owner sees these — a shared reminder can only be toggled
           complete by anyone else, not pinned, edited, or deleted. */}
        {reminder.isOwner !== false && (
          <div
            className="flex items-center gap-1 mt-3 pl-8 border-t border-rule/60 dark:border-dusk-rule/60 pt-2.5 -mb-1
              sm:mt-0 sm:pl-0 sm:pt-0 sm:border-t-0 sm:mb-0
              sm:absolute sm:top-2 sm:right-2
              sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 sm:transition"
          >
            <button
              onClick={() => onTogglePin(reminder)}
              title={reminder.pinned ? "Unpin" : "Pin to top"}
              className={`p-1.5 rounded hover:bg-ink/5 dark:hover:bg-paper/10 ${
                reminder.pinned
                  ? "text-amber-dark dark:text-amber"
                  : "text-ink-faint dark:text-paper/50"
              }`}
            >
              <Pin
                className="w-3.5 h-3.5"
                fill={reminder.pinned ? "currentColor" : "none"}
              />
            </button>
            <button
              onClick={() => onEdit(reminder)}
              title="Edit"
              className="p-1.5 rounded text-ink-faint dark:text-paper/50 hover:bg-ink/5 dark:hover:bg-paper/10 hover:text-ink dark:hover:text-paper"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(reminder)}
              title="Delete"
              className="p-1.5 rounded text-ink-faint dark:text-paper/50 hover:bg-coral/10 hover:text-coral-dark dark:hover:text-coral"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
