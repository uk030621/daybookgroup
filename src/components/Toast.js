"use client";

export default function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-fadeUp">
      <div className="bg-ink dark:bg-paper text-paper dark:text-ink text-sm font-medium px-4 py-2.5 rounded-full shadow-cardHover">
        {message}
      </div>
    </div>
  );
}
