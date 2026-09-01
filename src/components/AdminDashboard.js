"use client";

import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/overview", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Couldn't load overview.");
        setData(body);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl italic text-ink dark:text-paper flex items-center gap-2">
          <ShieldAlert className="w-6 h-6" />
          Platform overview
        </h1>
        <p className="text-sm text-ink-faint dark:text-paper/50 mt-1">
          Read-only. Across every family group, everyone.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-ink-faint dark:text-paper/50">Loading…</p>
      )}

      {error && (
        <p className="text-sm text-coral-dark dark:text-coral bg-coral/10 border border-coral/30 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Users", value: data.stats.totalUsers },
              { label: "Groups", value: data.stats.totalGroups },
              { label: "Reminders", value: data.stats.totalReminders },
              { label: "Shared", value: data.stats.sharedReminders },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white/60 dark:bg-dusk-card/60 border border-rule dark:border-dusk-rule rounded-card px-4 py-3"
              >
                <div className="font-display text-2xl text-ink dark:text-paper">
                  {s.value}
                </div>
                <div className="text-xs uppercase tracking-wide text-ink-faint dark:text-paper/50 mt-0.5">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white/60 dark:bg-dusk-card/60 border border-rule dark:border-dusk-rule rounded-card p-5">
            <h2 className="font-display text-lg italic text-ink dark:text-paper mb-3">
              Groups
            </h2>
            {data.groups.length === 0 ? (
              <p className="text-sm text-ink-faint dark:text-paper/50">
                No groups created yet.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-faint dark:text-paper/50 border-b border-rule/60 dark:border-dusk-rule/60">
                      <th className="pb-2 pr-3 font-medium">Name</th>
                      <th className="pb-2 pr-3 font-medium">Members</th>
                      <th className="pb-2 pr-3 font-medium">Admins</th>
                      <th className="pb-2 pr-3 font-medium">Pending</th>
                      <th className="pb-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.groups.map((g) => (
                      <tr
                        key={g._id}
                        className="border-b border-rule/40 dark:border-dusk-rule/40 last:border-0"
                      >
                        <td className="py-2 pr-3 text-ink dark:text-paper">
                          {g.name}
                        </td>
                        <td className="py-2 pr-3 text-ink-faint dark:text-paper/60">
                          {g.activeMembers}
                        </td>
                        <td className="py-2 pr-3 text-ink-faint dark:text-paper/60">
                          {g.admins}
                        </td>
                        <td className="py-2 pr-3 text-ink-faint dark:text-paper/60">
                          {g.pendingInvites}
                        </td>
                        <td className="py-2 text-ink-faint dark:text-paper/60">
                          {formatDate(g.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white/60 dark:bg-dusk-card/60 border border-rule dark:border-dusk-rule rounded-card p-5">
            <h2 className="font-display text-lg italic text-ink dark:text-paper mb-3">
              Users
            </h2>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-ink-faint dark:text-paper/50 border-b border-rule/60 dark:border-dusk-rule/60">
                    <th className="pb-2 pr-3 font-medium">Name</th>
                    <th className="pb-2 pr-3 font-medium">Email</th>
                    <th className="pb-2 pr-3 font-medium">Joined</th>
                    <th className="pb-2 font-medium">Last sign-in</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr
                      key={u._id}
                      className="border-b border-rule/40 dark:border-dusk-rule/40 last:border-0"
                    >
                      <td className="py-2 pr-3 text-ink dark:text-paper whitespace-nowrap">
                        {u.name || "—"}
                      </td>
                      <td className="py-2 pr-3 text-ink-faint dark:text-paper/60 whitespace-nowrap">
                        {u.email}
                      </td>
                      <td className="py-2 pr-3 text-ink-faint dark:text-paper/60 whitespace-nowrap">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="py-2 text-ink-faint dark:text-paper/60 whitespace-nowrap">
                        {formatDate(u.lastSignInAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
