"use client";

// A labelled on/off switch row. Rendered as a button with role="switch" so
// it is announced properly by screen readers and works with the keyboard.
export default function SwitchRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink dark:text-paper">{label}</p>
        {description && (
          <p className="text-xs text-ink-faint dark:text-paper/50 mt-0.5">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 mt-0.5 h-6 w-11 rounded-full transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber/60 ${
          checked ? "bg-sage-dark dark:bg-sage" : "bg-ink/20 dark:bg-paper/20"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
