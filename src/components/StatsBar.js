"use client";

const stats = [
  { key: "active", label: "Active", color: "text-ink dark:text-paper" },
  { key: "dueSoon", label: "Due soon", color: "text-amber-dark dark:text-amber" },
  { key: "overdue", label: "Overdue", color: "text-coral-dark dark:text-coral" },
  { key: "completed", label: "Completed", color: "text-sage-dark dark:text-sage" },
];

export default function StatsBar({ counts }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.key}
          className="bg-white/60 dark:bg-dusk-card/60 border border-rule dark:border-dusk-rule rounded-card px-4 py-3"
        >
          <div className={`font-display text-2xl ${s.color}`}>
            {counts[s.key] ?? 0}
          </div>
          <div className="text-xs uppercase tracking-wide text-ink-faint dark:text-paper/50 mt-0.5">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
