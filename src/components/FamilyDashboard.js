"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, Trash2, Shield, Mail } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import Toast from "./Toast";

export default function FamilyDashboard() {
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch("/api/groups", { cache: "no-store" });
      const data = await res.json();
      setGroups(data.groups || []);
      if (data.groups?.length && !selectedGroupId) {
        setSelectedGroupId(data.groups[0]._id);
      }
    } catch {
      setError("Couldn't load your family groups.");
    } finally {
      setLoadingGroups(false);
    }
    // selectedGroupId intentionally omitted — this only auto-selects once,
    // on first load, and shouldn't re-run just because selection changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDetail = useCallback(async (groupId) => {
    if (!groupId) return;
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't load this group.");
      setDetail(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (selectedGroupId) loadDetail(selectedGroupId);
  }, [selectedGroupId, loadDetail]);

  async function handleCreateGroup(e) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    setError("");
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't create the group.");
      setNewGroupName("");
      setGroups((prev) => [...prev, data.group]);
      setSelectedGroupId(data.group._id);
      showToast("Group created");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingGroup(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedGroupId) return;
    setInviting(true);
    setError("");
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't send that invite.");
      setInviteEmail("");
      showToast(`Invite sent to ${data.invitedEmail}`);
      loadDetail(selectedGroupId);
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  }

  async function confirmRemoval() {
    const member = pendingRemoval;
    setPendingRemoval(null);
    try {
      const res = await fetch(
        `/api/groups/${selectedGroupId}/members/${member.membershipId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Couldn't remove that person.");
      showToast("Removed");
      loadDetail(selectedGroupId);
    } catch (err) {
      setError(err.message);
    }
  }

  const isAdmin = detail?.myRole === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl italic text-ink dark:text-paper">
          Family
        </h1>
        <p className="text-sm text-ink-faint dark:text-paper/50 mt-1">
          Manage who's in your family group.
        </p>
      </div>

      {error && (
        <p className="text-sm text-coral-dark dark:text-coral bg-coral/10 border border-coral/30 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Group switcher, only shown once there's more than one group */}
      {groups.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {groups.map((g) => (
            <button
              key={g._id}
              onClick={() => setSelectedGroupId(g._id)}
              className={`px-3 py-1.5 rounded-md text-sm border transition ${
                selectedGroupId === g._id
                  ? "bg-ink dark:bg-paper text-paper dark:text-ink border-ink dark:border-paper"
                  : "border-rule dark:border-dusk-rule text-ink-faint dark:text-paper/60 hover:text-ink dark:hover:text-paper"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Create-group form: always available */}
      <form
        onSubmit={handleCreateGroup}
        className="bg-white/60 dark:bg-dusk-card/60 border border-rule dark:border-dusk-rule rounded-card p-4 flex gap-2"
      >
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder={
            groups.length ? "Start another group…" : "e.g. The Morgan Family"
          }
          maxLength={100}
          className="flex-1 min-w-0 bg-white/70 dark:bg-dusk/70 border border-rule dark:border-dusk-rule rounded-md px-3 py-2 text-base sm:text-sm text-ink dark:text-paper outline-none focus:ring-2 focus:ring-amber/40"
        />
        <button
          type="submit"
          disabled={creatingGroup || !newGroupName.trim()}
          className="shrink-0 bg-ink dark:bg-paper text-paper dark:text-ink text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50 transition"
        >
          {creatingGroup ? "Creating…" : "Create"}
        </button>
      </form>

      {loadingGroups && (
        <p className="text-sm text-ink-faint dark:text-paper/50">Loading…</p>
      )}

      {!loadingGroups && groups.length === 0 && (
        <p className="text-sm text-ink-faint dark:text-paper/50">
          You're not part of a family group yet — create one above.
        </p>
      )}

      {selectedGroupId && (loadingDetail || detail) && (
        <div className="bg-white/60 dark:bg-dusk-card/60 border border-rule dark:border-dusk-rule rounded-card p-5 space-y-4">
          {loadingDetail && (
            <p className="text-sm text-ink-faint dark:text-paper/50">
              Loading members…
            </p>
          )}

          {!loadingDetail && detail && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg italic text-ink dark:text-paper">
                  {detail.group.name}
                </h2>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-dark dark:text-amber">
                    <Shield className="w-3.5 h-3.5" /> You're an admin
                  </span>
                )}
              </div>

              <ul className="space-y-2">
                {detail.members.map((m) => (
                  <li
                    key={m.membershipId}
                    className="flex items-center justify-between gap-3 py-2 border-b border-rule/60 dark:border-dusk-rule/60 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-ink dark:text-paper truncate">
                        {m.user?.name || m.invitedEmail}
                      </p>
                      <p className="text-xs text-ink-faint dark:text-paper/50 flex items-center gap-1">
                        {m.status === "invited" ? (
                          <>
                            <Mail className="w-3 h-3" /> Invited, not joined yet
                          </>
                        ) : (
                          <>
                            {m.role === "admin" ? "Admin" : "Member"} ·{" "}
                            {m.user?.email}
                          </>
                        )}
                      </p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => setPendingRemoval(m)}
                        title="Remove"
                        className="shrink-0 p-1.5 rounded text-ink-faint dark:text-paper/50 hover:bg-coral/10 hover:text-coral-dark dark:hover:text-coral transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

              {isAdmin && (
                <form onSubmit={handleInvite} className="flex gap-2 pt-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Invite by email"
                    className="flex-1 min-w-0 bg-white/70 dark:bg-dusk/70 border border-rule dark:border-dusk-rule rounded-md px-3 py-2 text-base sm:text-sm text-ink dark:text-paper outline-none focus:ring-2 focus:ring-amber/40"
                  />
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="shrink-0 inline-flex items-center gap-1.5 bg-ink dark:bg-paper text-paper dark:text-ink text-sm font-medium rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50 transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    {inviting ? "Sending…" : "Invite"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        title="Remove this person?"
        description={
          pendingRemoval
            ? `${pendingRemoval.user?.name || pendingRemoval.invitedEmail} will lose access to this group.`
            : ""
        }
        onConfirm={confirmRemoval}
        onCancel={() => setPendingRemoval(null)}
      />

      <Toast message={toast} />
    </div>
  );
}
