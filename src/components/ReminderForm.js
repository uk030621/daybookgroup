"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const PRIORITIES = ["low", "medium", "high"];
const RECURRENCES = [
  { value: "none", label: "Doesn't repeat" },
  { value: "daily", label: "Repeats daily" },
  { value: "weekly", label: "Repeats weekly" },
  { value: "monthly", label: "Repeats monthly" },
];
const LEAD_TIME_OPTIONS = [
  { value: 0, label: "At the due time" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 180, label: "3 hours before" },
  { value: 1440, label: "1 day before" },
  { value: 2880, label: "2 days before" },
];

function toLocalDateTimeParts(dateString) {
  if (!dateString) return { date: "", time: "" };
  const d = new Date(dateString);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  const iso = local.toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export default function ReminderForm({
  open,
  initial,
  categories,
  onClose,
  onSubmit,
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDatePart, setDueDatePart] = useState("");
  const [dueTimePart, setDueTimePart] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("General");
  const [categoryMode, setCategoryMode] = useState("select");
  const [recurrence, setRecurrence] = useState("none");
  const [remindMinutesBefore, setRemindMinutesBefore] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef(null);
  const categoryRef = useRef(null);
  const lastPickedCategoryRef = useRef("General");

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title || "");
    setNotes(initial?.notes || "");
    const parts = toLocalDateTimeParts(initial?.dueDate);
    setDueDatePart(parts.date);
    setDueTimePart(parts.time);
    setPriority(initial?.priority || "medium");
    setCategory(initial?.category || "General");
    setCategoryMode("select");
    setRecurrence(initial?.recurrence || "none");
    setRemindMinutesBefore(initial?.remindMinutesBefore ?? 60);
    setError("");
    setSubmitting(false);
    setTimeout(() => titleRef.current?.focus(), 30);
  }, [open, initial]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give it a title first.");
      return;
    }
    setSubmitting(true);
    setError("");
    const combinedDueDate = dueDatePart
      ? new Date(`${dueDatePart}T${dueTimePart || "09:00"}`).toISOString()
      : null;
    try {
      await onSubmit({
        title: title.trim(),
        notes: notes.trim(),
        dueDate: combinedDueDate,
        priority,
        category: category.trim() || "General",
        recurrence,
        remindMinutesBefore: combinedDueDate ? remindMinutesBefore : undefined,
        timezone: combinedDueDate // ← already here
          ? Intl.DateTimeFormat().resolvedOptions().timeZone // ← already here
          : undefined, // ← already here
      });
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 dark:bg-black/60 backdrop-blur-sm px-0 sm:px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-md bg-paper dark:bg-dusk-card border border-rule dark:border-dusk-rule rounded-t-2xl sm:rounded-card shadow-cardHover animate-popIn max-h-[92vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="font-display text-xl italic text-ink dark:text-paper">
            {initial ? "Edit reminder" : "New reminder"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded text-ink-faint dark:text-paper/50 hover:bg-ink/5 dark:hover:bg-paper/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-faint dark:text-paper/50 mb-1.5">
              Title
            </label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Call the dentist"
              maxLength={200}
              className="w-full bg-white/70 dark:bg-dusk/70 border border-rule dark:border-dusk-rule rounded-md px-3 py-2.5 text-base sm:text-sm text-ink dark:text-paper outline-none focus:ring-2 focus:ring-amber/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-faint dark:text-paper/50 mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details worth remembering"
              rows={3}
              maxLength={2000}
              className="w-full bg-white/70 dark:bg-dusk/70 border border-rule dark:border-dusk-rule rounded-md px-3 py-2.5 text-base sm:text-sm text-ink dark:text-paper outline-none focus:ring-2 focus:ring-amber/40 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="block text-xs font-medium text-ink-faint dark:text-paper/50 mb-1.5">
                Due Date & Time
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dueDatePart}
                  onChange={(e) => setDueDatePart(e.target.value)}
                  className="w-1/2 min-w-0 appearance-none bg-white/70 dark:bg-dusk/70 border border-rule dark:border-dusk-rule rounded-md px-2 py-2.5 text-base sm:text-sm text-ink dark:text-paper outline-none focus:ring-2 focus:ring-amber/40"
                />
                <input
                  type="time"
                  value={dueTimePart}
                  onChange={(e) => setDueTimePart(e.target.value)}
                  disabled={!dueDatePart}
                  className="w-1/2 min-w-0 appearance-none bg-white/70 dark:bg-dusk/70 border border-rule dark:border-dusk-rule rounded-md px-2 py-2.5 text-base sm:text-sm text-ink dark:text-paper outline-none focus:ring-2 focus:ring-amber/40 disabled:opacity-50"
                />
              </div>

              {dueDatePart && (
                <select
                  value={remindMinutesBefore}
                  onChange={(e) =>
                    setRemindMinutesBefore(Number(e.target.value))
                  }
                  className="w-full min-w-0 mt-2 bg-white/70 dark:bg-dusk/70 border border-rule dark:border-dusk-rule rounded-md px-3 py-2 text-base sm:text-xs text-ink dark:text-paper outline-none focus:ring-2 focus:ring-amber/40"
                >
                  {LEAD_TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      Email me {opt.label.toLowerCase()}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="min-w-0">
              <label className="block text-xs font-medium text-ink-faint dark:text-paper/50 mb-1.5">
                Category
              </label>

              {categoryMode === "select" ? (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      lastPickedCategoryRef.current = category;
                      setCategory("");
                      setCategoryMode("custom");
                      setTimeout(() => categoryRef.current?.focus(), 30);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full min-w-0 bg-white/70 dark:bg-dusk/70 border border-rule dark:border-dusk-rule rounded-md px-3 py-2.5 text-base sm:text-sm text-ink dark:text-paper outline-none focus:ring-2 focus:ring-amber/40"
                >
                  {Array.from(
                    new Set(
                      ["General", ...(categories || []), category].filter(
                        Boolean,
                      ),
                    ),
                  )
                    .sort((a, b) => a.localeCompare(b))
                    .map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  <option value="__new__">+ Add new category…</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    ref={categoryRef}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="New category name"
                    maxLength={50}
                    className="w-full min-w-0 bg-white/70 dark:bg-dusk/70 border border-rule dark:border-dusk-rule rounded-md px-3 py-2.5 text-base sm:text-sm text-ink dark:text-paper outline-none focus:ring-2 focus:ring-amber/40"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCategory(lastPickedCategoryRef.current || "General");
                      setCategoryMode("select");
                    }}
                    title="Choose from existing categories instead"
                    className="shrink-0 px-2.5 rounded-md border border-rule dark:border-dusk-rule text-xs text-ink-faint dark:text-paper/50 hover:text-ink dark:hover:text-paper hover:bg-ink/5 dark:hover:bg-paper/10 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-faint dark:text-paper/50 mb-1.5">
              Priority
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 capitalize text-sm py-2 rounded-md border transition ${
                    priority === p
                      ? "bg-ink dark:bg-paper text-paper dark:text-ink border-ink dark:border-paper"
                      : "border-rule dark:border-dusk-rule text-ink-faint dark:text-paper/50 hover:text-ink dark:hover:text-paper"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-faint dark:text-paper/50 mb-1.5">
              Repeat
            </label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className="w-full bg-white/70 dark:bg-dusk/70 border border-rule dark:border-dusk-rule rounded-md px-3 py-2.5 text-base sm:text-sm text-ink dark:text-paper outline-none focus:ring-2 focus:ring-amber/40"
            >
              {RECURRENCES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-coral-dark dark:text-coral">{error}</p>
          )}
        </div>

        <div className="flex items-center gap-2 p-5 pt-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-md border border-rule dark:border-dusk-rule text-sm font-medium text-ink dark:text-paper hover:bg-ink/5 dark:hover:bg-paper/10 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2.5 rounded-md bg-ink dark:bg-paper text-paper dark:text-ink text-sm font-medium hover:opacity-90 disabled:opacity-60 transition"
          >
            {submitting ? "Saving…" : initial ? "Save changes" : "Add reminder"}
          </button>
        </div>
      </form>
    </div>
  );
}
