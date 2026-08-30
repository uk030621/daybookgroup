"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { addDays, addWeeks, addMonths } from "date-fns";
import Navbar from "./Navbar";
import StatsBar from "./StatsBar";
import Toolbar from "./Toolbar";
import ReminderList from "./ReminderList";
import ReminderForm from "./ReminderForm";
import ConfirmDialog from "./ConfirmDialog";
import Toast from "./Toast";
import { isOverdue, isDueSoon } from "../lib/dateUtils";

function advanceRecurrence(dateString, recurrence) {
  const base = dateString ? new Date(dateString) : new Date();
  if (recurrence === "daily") return addDays(base, 1).toISOString();
  if (recurrence === "weekly") return addWeeks(base, 1).toISOString();
  if (recurrence === "monthly") return addMonths(base, 1).toISOString();
  return null;
}

export default function Dashboard({ user }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("dueDate");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }, []);

  const loadReminders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reminders", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load reminders");
      const data = await res.json();
      setReminders(data.reminders || []);
    } catch (err) {
      showToast("Couldn't load your reminders");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const categories = useMemo(() => {
    const set = new Set(reminders.map((r) => r.category || "General"));
    return Array.from(set).sort();
  }, [reminders]);

  const counts = useMemo(() => {
    const active = reminders.filter((r) => !r.completed).length;
    const completed = reminders.filter((r) => r.completed).length;
    const overdue = reminders.filter((r) =>
      isOverdue(r.dueDate, r.completed),
    ).length;
    const dueSoon = reminders.filter((r) =>
      isDueSoon(r.dueDate, r.completed),
    ).length;
    return { active, completed, overdue, dueSoon };
  }, [reminders]);

  const visibleReminders = useMemo(() => {
    let list = [...reminders];

    if (status === "active") list = list.filter((r) => !r.completed);
    if (status === "completed") list = list.filter((r) => r.completed);
    if (category !== "all") list = list.filter((r) => r.category === category);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.notes?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q),
      );
    }

    const priorityWeight = { high: 3, medium: 2, low: 1 };

    list.sort((a, b) => {
      if (!!b.pinned - !!a.pinned !== 0) return !!b.pinned - !!a.pinned;

      if (sort === "priority") {
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      }
      if (sort === "title") {
        return a.title.localeCompare(b.title);
      }
      if (sort === "createdAt") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      // dueDate: items without a due date sink to the bottom
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    return list;
  }, [reminders, status, category, search, sort]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(reminder) {
    setEditing(reminder);
    setFormOpen(true);
  }

  async function handleFormSubmit(values) {
    if (editing) {
      const res = await fetch(`/api/reminders/${editing._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Couldn't save your changes");
      const data = await res.json();
      setReminders((prev) =>
        prev.map((r) => (r._id === editing._id ? data.reminder : r)),
      );
      showToast("Reminder updated");
    } else {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Couldn't create the reminder");
      const data = await res.json();
      setReminders((prev) => [data.reminder, ...prev]);
      showToast("Reminder added");
    }
    setFormOpen(false);
    setEditing(null);
  }

  async function handleToggleComplete(reminder) {
    const completing = !reminder.completed;

    const res = await fetch(`/api/reminders/${reminder._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: completing }),
    });
    if (!res.ok) {
      showToast("Couldn't update that reminder");
      return;
    }
    const data = await res.json();
    setReminders((prev) =>
      prev.map((r) => (r._id === reminder._id ? data.reminder : r)),
    );

    // Spin off the next occurrence of a recurring reminder when completed.
    if (completing && reminder.recurrence !== "none") {
      const nextDueDate = advanceRecurrence(
        reminder.dueDate,
        reminder.recurrence,
      );
      const createRes = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reminder.title,
          notes: reminder.notes,
          dueDate: nextDueDate,
          priority: reminder.priority,
          category: reminder.category,
          recurrence: reminder.recurrence,
          remindMinutesBefore: reminder.remindMinutesBefore,
          timezone: reminder.timezone, // ← already here
        }),
      });
      if (createRes.ok) {
        const createData = await createRes.json();
        setReminders((prev) => [createData.reminder, ...prev]);
        showToast("Done — next occurrence scheduled");
      }
    } else {
      showToast(completing ? "Marked complete" : "Marked active");
    }
  }

  async function handleTogglePin(reminder) {
    const res = await fetch(`/api/reminders/${reminder._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !reminder.pinned }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setReminders((prev) =>
      prev.map((r) => (r._id === reminder._id ? data.reminder : r)),
    );
  }

  async function confirmDelete() {
    const reminder = pendingDelete;
    setPendingDelete(null);
    const res = await fetch(`/api/reminders/${reminder._id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      showToast("Couldn't delete that reminder");
      return;
    }
    setReminders((prev) => prev.filter((r) => r._id !== reminder._id));
    showToast("Reminder deleted");
  }

  const hasFilters = Boolean(
    search.trim() || status !== "all" || category !== "all",
  );

  return (
    <div className="min-h-screen paper-texture">
      <Navbar user={user} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl italic text-ink dark:text-paper">
            Good to see you, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-sm text-ink-faint dark:text-paper/50 mt-1">
            Here's what's on the page today.
          </p>
        </div>

        <StatsBar counts={counts} />

        <Toolbar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          category={category}
          onCategoryChange={setCategory}
          categories={categories}
          sort={sort}
          onSortChange={setSort}
          onNew={openNew}
        />

        <ReminderList
          reminders={visibleReminders}
          loading={loading}
          hasFilters={hasFilters}
          onToggleComplete={handleToggleComplete}
          onEdit={openEdit}
          onDelete={setPendingDelete}
          onTogglePin={handleTogglePin}
          onNew={openNew}
        />
      </main>

      <ReminderForm
        open={formOpen}
        initial={editing}
        categories={categories}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this reminder?"
        description={
          pendingDelete ? `"${pendingDelete.title}" will be gone for good.` : ""
        }
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <Toast message={toast} />
    </div>
  );
}
