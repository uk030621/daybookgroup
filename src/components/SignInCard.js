"use client";

import { signIn } from "next-auth/react";
import { NotebookPen } from "lucide-react";

export default function SignInCard({ callbackUrl = "/" }) {
  return (
    <div className="w-full max-w-sm animate-fadeUp">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-ink dark:bg-paper flex items-center justify-center mb-5 shadow-card">
          <NotebookPen className="w-6 h-6 text-paper dark:text-ink" />
        </div>
        <h1 className="font-display text-3xl italic text-ink dark:text-paper">
          Daybook
        </h1>
        <p className="text-ink-faint dark:text-paper/60 mt-2 text-sm max-w-[26ch]">
          A quiet place to keep track of what matters today, and what's coming.
        </p>
      </div>

      <div className="bg-white/60 dark:bg-dusk-card/60 border border-rule dark:border-dusk-rule rounded-card p-6 shadow-card">
        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 bg-ink dark:bg-paper text-paper dark:text-ink font-medium rounded-md py-3 px-4 hover:opacity-90 active:scale-[0.99] transition"
        >
          <GoogleMark />
          Continue with Google
        </button>
        <p className="text-xs text-center text-ink-faint dark:text-paper/50 mt-4">
          Your reminders are private and tied to your Google account.
        </p>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.95v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.71V4.96H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.04l3.02-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.96l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
