"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { NotebookPen } from "lucide-react";

export default function AcceptInvite({ token }) {
  const router = useRouter();
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "This invite couldn't be loaded.");
        setPreview(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    setAccepting(true);
    setError("");
    try {
      const res = await fetch(`/api/invites/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Couldn't accept this invite.");
      router.push("/family");
    } catch (err) {
      setError(err.message);
      setAccepting(false);
    }
  }

  return (
    <div className="w-full max-w-sm animate-fadeUp">
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-ink dark:bg-paper flex items-center justify-center mb-5 shadow-card">
          <NotebookPen className="w-6 h-6 text-paper dark:text-ink" />
        </div>
        <h1 className="font-display text-3xl italic text-ink dark:text-paper">
          Daybook
        </h1>
      </div>

      <div className="bg-white/60 dark:bg-dusk-card/60 border border-rule dark:border-dusk-rule rounded-card p-6 shadow-card text-center">
        {loading && (
          <p className="text-sm text-ink-faint dark:text-paper/60">
            Loading invite…
          </p>
        )}

        {!loading && error && (
          <p className="text-sm text-coral-dark dark:text-coral">{error}</p>
        )}

        {!loading && !error && preview && (
          <>
            <p className="text-ink dark:text-paper mb-1">
              You've been invited to join
            </p>
            <p className="font-display text-xl italic text-ink dark:text-paper mb-4">
              {preview.groupName}
            </p>

            {!preview.emailMatches ? (
              <div className="space-y-4">
                <p className="text-sm text-coral-dark dark:text-coral">
                  This invite was sent to {preview.invitedEmail}
                  {preview.signedInAs
                    ? `, but you're signed in as ${preview.signedInAs}`
                    : ""}
                  . Sign in with the Google account for that address to accept
                  it.
                </p>
                <button
                  onClick={() =>
                    signOut({
                      callbackUrl: `/login?callbackUrl=${encodeURIComponent(
                        `/invite/${token}`,
                      )}`,
                    })
                  }
                  className="w-full border border-rule dark:border-dusk-rule text-ink dark:text-paper font-medium rounded-md py-3 px-4 hover:bg-ink/5 dark:hover:bg-paper/10 transition"
                >
                  Sign out and use a different account
                </button>
              </div>
            ) : (
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-ink dark:bg-paper text-paper dark:text-ink font-medium rounded-md py-3 px-4 hover:opacity-90 disabled:opacity-60 transition"
              >
                {accepting
                  ? "Joining…"
                  : `Accept and join ${preview.groupName}`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
