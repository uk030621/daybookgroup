"use client";

import { Search, Plus, X } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

export default function Toolbar({
  search,
  onSearchChange,
  status,
  onStatusChange,
  category,
  onCategoryChange,
  categories,
  sort,
  onSortChange,
  onNew,
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint dark:text-paper/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search reminders…"
            className="w-full bg-white/70 dark:bg-dusk-card/70 border border-rule dark:border-dusk-rule rounded-md pl-10 pr-9 py-2.5 text-base sm:text-sm text-ink dark:text-paper placeholder:text-ink-faint dark:placeholder:text-paper/40 focus:ring-2 focus:ring-amber/40 outline-none transition"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint dark:text-paper/40 hover:text-ink dark:hover:text-paper"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={onNew}
          className="flex items-center justify-center gap-1.5 bg-ink dark:bg-paper text-paper dark:text-ink font-medium rounded-md px-4 py-2.5 text-sm hover:opacity-90 active:scale-[0.98] transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          New reminder
        </button>
      </div>

      <div className="flex w-full bg-white/60 dark:bg-dusk-card/60 border border-rule dark:border-dusk-rule rounded-md p-0.5 text-sm">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onStatusChange(opt.value)}
            className={`flex-1 text-center px-3 py-1.5 rounded text-xs font-medium transition ${
              status === opt.value
                ? "bg-ink dark:bg-paper text-paper dark:text-ink"
                : "text-ink-faint dark:text-paper/50 hover:text-ink dark:hover:text-paper"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="flex-1 min-w-0 bg-white/60 dark:bg-dusk-card/60 border border-rule dark:border-dusk-rule rounded-md px-2.5 py-1.5 text-base sm:text-xs text-ink dark:text-paper outline-none focus:ring-2 focus:ring-amber/40"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="flex-1 min-w-0 bg-white/60 dark:bg-dusk-card/60 border border-rule dark:border-dusk-rule rounded-md px-2.5 py-1.5 text-base sm:text-xs text-ink dark:text-paper outline-none focus:ring-2 focus:ring-amber/40"
        >
          <option value="dueDate">Sort by due date</option>
          <option value="priority">Sort by priority</option>
          <option value="createdAt">Sort by newest</option>
          <option value="title">Sort by title</option>
        </select>
      </div>
    </div>
  );
}
