"use client";

export default function ConfirmDialog({ open, title, description, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 dark:bg-black/60 backdrop-blur-sm px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm bg-paper dark:bg-dusk-card border border-rule dark:border-dusk-rule rounded-card shadow-cardHover p-5 animate-popIn">
        <h3 className="font-display text-lg text-ink dark:text-paper">{title}</h3>
        {description && (
          <p className="text-sm text-ink-faint dark:text-paper/60 mt-1.5">
            {description}
          </p>
        )}
        <div className="flex gap-2 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-md border border-rule dark:border-dusk-rule text-sm font-medium text-ink dark:text-paper hover:bg-ink/5 dark:hover:bg-paper/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-md bg-coral text-white text-sm font-medium hover:bg-coral-dark transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
