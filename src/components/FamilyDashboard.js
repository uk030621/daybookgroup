"use client";

import { useCallback, useEffect, useState } from "react";
import {
  UserPlus,
  Trash2,
  Shield,
  Mail,
  Pencil,
  Check,
  X,
  LogOut,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import Toast from "./Toast";
import SwitchRow from "./SwitchRow";

export default function FamilyDashboard() {
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  // Only the app's owner can start groups; everyone else is invited into them.
  const [canCreate, setCanCreate] = useState(true);
  const [pendingLeave, setPendingLeave] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  const [pendingRemoval, setPendingRemoval] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [pendingGroupDelete, setPendingGroupDelete] = useState(false);
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
      setCanCreate(data.canCreateGroups !== false);
      if (data.groups?.length && !selectedGroupId) {
        setSelectedGroupId(data.groups[0]._id);
      }
    } catch {
      setError("Couldn't load your groups.");
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

  function startRename() {
    setNameDraft(detail.group.name);
    setEditingName(true);
  }

  async function saveRename() {
    const name = nameDraft.trim();
    if (!name) return;
    setSavingName(true);
    setError("");
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't rename this group.");
      setDetail((prev) => ({ ...prev, group: { ...prev.group, name } }));
      setGroups((prev) =>
        prev.map((g) => (g._id === selectedGroupId ? { ...g, name } : g)),
      );
      setEditingName(false);
      showToast("Renamed");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingName(false);
    }
  }

  async function confirmGroupDelete() {
    setPendingGroupDelete(false);
    const deletedId = selectedGroupId;
    try {
      const res = await fetch(`/api/groups/${deletedId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't delete this group.");
      const remaining = groups.filter((g) => g._id !== deletedId);
      setGroups(remaining);
      setDetail(null);
      setSelectedGroupId(remaining[0]?._id || null);
      showToast("Group deleted");
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmLeave() {
    setPendingLeave(false);
    const leftId = selectedGroupId;
    try {
      const res = await fetch(`/api/groups/${leftId}/leave`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't leave this group.");
      const remaining = groups.filter((g) => g._id !== leftId);
      setGroups(remaining);
      setDetail(null);
      setSelectedGroupId(remaining[0]?._id || null);
      showToast("You've left the group");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleMuteChange(muted) {
    const previous = detail.pushMuted;
    setDetail((prev) => ({ ...prev, pushMuted: muted }));
    setError("");
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}/mute`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ muted }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't save that setting.");
      showToast(muted ? "Group notifications muted" : "Group notifications on");
    } catch (err) {
      setDetail((prev) => ({ ...prev, pushMuted: previous }));
      setError(err.message);
    }
  }

  const isAdmin = detail?.myRole === "admin";
  // A group's last admin can't leave (they can delete the group instead).
  const adminCount = (detail?.members || []).filter(
    (m) => m.status === "active" && m.role === "admin",
  ).length;
  const canLeave = Boolean(detail) && (!isAdmin || adminCount > 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl italic text-ink dark:text-paper">
          Group Setup
        </h1>
        <p className="text-sm text-ink-faint dark:text-paper/50 mt-1">
          Give your group a name & manage who's in it.
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

      {/* Create-group form: only for the app's owner */}
      {canCreate && (
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
      )}

      {loadingGroups && (
        <p className="text-sm text-ink-faint dark:text-paper/50">Loading…</p>
      )}

      {!loadingGroups && groups.length === 0 && (
        <p className="text-sm text-ink-faint dark:text-paper/50">
          {canCreate
            ? "You're not part of a selected group yet — create one above."
            : "You're not in a group yet. Ask a group admin to invite you — the invite arrives by email."}
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
              <div className="flex items-center justify-between gap-2">
                {editingName ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      maxLength={100}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                      className="flex-1 min-w-0 bg-white/70 dark:bg-dusk/70 border border-rule dark:border-dusk-rule rounded-md px-2.5 py-1.5 text-base sm:text-sm text-ink dark:text-paper outline-none focus:ring-2 focus:ring-amber/40"
                    />
                    <button
                      onClick={saveRename}
                      disabled={savingName || !nameDraft.trim()}
                      title="Save"
                      className="shrink-0 p-1.5 rounded text-sage-dark dark:text-sage hover:bg-sage/10 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingName(false)}
                      title="Cancel"
                      className="shrink-0 p-1.5 rounded text-ink-faint dark:text-paper/50 hover:bg-ink/5 dark:hover:bg-paper/10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2 className="font-display text-lg italic text-ink dark:text-paper truncate">
                      {detail.group.name}
                    </h2>
                    {isAdmin && (
                      <button
                        onClick={startRename}
                        title="Rename group"
                        className="shrink-0 p-1 rounded text-ink-faint dark:text-paper/50 hover:bg-ink/5 dark:hover:bg-paper/10 hover:text-ink dark:hover:text-paper"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-dark dark:text-amber shrink-0">
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

              <div className="rounded-md border border-rule dark:border-dusk-rule bg-white/40 dark:bg-dusk/40">
                <SwitchRow
                  label="Mute push notifications from this group"
                  description="You'll still see shared reminders in Daybook, and can stay in the group. Your own reminders are unaffected."
                  checked={Boolean(detail.pushMuted)}
                  onChange={handleMuteChange}
                />
              </div>

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

              {(isAdmin || canLeave) && (
                <div className="pt-3 mt-1 border-t border-rule/60 dark:border-dusk-rule/60 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {canLeave && (
                    <button
                      onClick={() => setPendingLeave(true)}
                      className="inline-flex items-center gap-1.5 text-sm text-coral-dark dark:text-coral hover:bg-coral/10 rounded-md px-2 py-2 -ml-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Leave this group
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => setPendingGroupDelete(true)}
                      className="inline-flex items-center gap-1.5 text-sm text-coral-dark dark:text-coral hover:bg-coral/10 rounded-md px-2 py-2 -ml-2 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete this group
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        title="Remove this person?"
        confirmLabel="Remove"
        description={
          pendingRemoval
            ? `${pendingRemoval.user?.name || pendingRemoval.invitedEmail} will lose access to this group.`
            : ""
        }
        onConfirm={confirmRemoval}
        onCancel={() => setPendingRemoval(null)}
      />

      <ConfirmDialog
        open={pendingLeave}
        title="Leave this group?"
        confirmLabel="Leave group"
        description={
          detail
            ? `You'll stop seeing "${detail.group.name}" and its reminders, and won't get its notifications. Reminders you shared with it become private again. You'd need a new invite to rejoin.`
            : ""
        }
        onConfirm={confirmLeave}
        onCancel={() => setPendingLeave(false)}
      />

      <ConfirmDialog
        open={pendingGroupDelete}
        title="Delete this group?"
        description={
          detail
            ? `"${detail.group.name}" and all ${detail.members.length} member${
                detail.members.length === 1 ? "" : "s"
              } will be removed. Reminders shared with this group will become private again, not deleted.`
            : ""
        }
        onConfirm={confirmGroupDelete}
        onCancel={() => setPendingGroupDelete(false)}
      />

      <Toast message={toast} />
    </div>
  );
}
