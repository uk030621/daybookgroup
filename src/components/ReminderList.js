"use client";

import { NotebookPen, SearchX } from "lucide-react";
import ReminderCard from "./ReminderCard";

export default function ReminderList({
  reminders,
  loading,
  hasFilters,
  onToggleComplete,
  onEdit,
  onDelete,
  onTogglePin,
  onNew,
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-card bg-white/40 dark:bg-dusk-card/40 border border-rule dark:border-dusk-rule animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (reminders.length === 0 && hasFilters) {
    return (
      <div className="flex flex-col items-center text-center py-20 text-ink-faint dark:text-paper/50">
        <SearchX className="w-8 h-8 mb-3" />
        <p className="font-medium text-ink dark:text-paper">No matches</p>
        <p className="text-sm mt-1">
          Nothing fits that search or filter combination.
        </p>
      </div>
    );
  }

  if (reminders.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-20 text-ink-faint dark:text-paper/50">
        <NotebookPen className="w-8 h-8 mb-3" />
        <p className="font-medium text-ink dark:text-paper">
          A blank page, for now
        </p>
        <p className="text-sm mt-1 max-w-[32ch]">
          Add the first thing you don't want to forget.
        </p>
        <button
          onClick={onNew}
          className="mt-4 text-sm font-medium text-ink dark:text-paper underline underline-offset-4 decoration-rule hover:decoration-ink dark:hover:decoration-paper"
        >
          Write a reminder
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {reminders.map((reminder) => (
        <ReminderCard
          key={reminder._id}
          reminder={reminder}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onDelete={onDelete}
          onTogglePin={onTogglePin}
        />
      ))}
    </div>
  );
}
