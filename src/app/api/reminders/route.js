import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { connectToDatabase } from "../../../lib/mongodb";
import Reminder from "../../../models/Reminder";

// Reminders change on every write, and this route reads the session cookie
// on every request — never cache it, or newly created/updated reminders can
// appear to "disappear" behind a stale cached response.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/reminders?search=&status=all|active|completed&category=&priority=&sort=dueDate
export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status") || "all";
  const category = searchParams.get("category");
  const priority = searchParams.get("priority");
  const sort = searchParams.get("sort") || "dueDate";

  const query = { userId: session.user.id };

  if (status === "active") query.completed = false;
  if (status === "completed") query.completed = true;
  if (category && category !== "all") query.category = category;
  if (priority && priority !== "all") query.priority = priority;
  if (search) {
    query.$text = { $search: search };
  }

  let sortSpec = { pinned: -1, dueDate: 1, createdAt: -1 };
  if (sort === "createdAt") sortSpec = { pinned: -1, createdAt: -1 };
  if (sort === "priority") {
    // handled client-side weighting is simpler, but give a reasonable default here
    sortSpec = { pinned: -1, priority: -1, dueDate: 1 };
  }
  if (sort === "title") sortSpec = { pinned: -1, title: 1 };

  const reminders = await Reminder.find(query).sort(sortSpec).lean();
  const categories = await Reminder.distinct("category", {
    userId: session.user.id,
  });

  return NextResponse.json({ reminders, categories });
}

// POST /api/reminders
export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  await connectToDatabase();

  const remindMinutesBefore = Number.isFinite(Number(body.remindMinutesBefore))
    ? Number(body.remindMinutesBefore)
    : 60;

  const reminder = await Reminder.create({
    userId: session.user.id,
    email: session.user.email || null,
    title: body.title.trim(),
    notes: body.notes?.trim() || "",
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    timezone: body.timezone || null, // ← already here
    priority: ["low", "medium", "high"].includes(body.priority)
      ? body.priority
      : "medium",
    category: body.category?.trim() || "General",
    recurrence: ["none", "daily", "weekly", "monthly"].includes(body.recurrence)
      ? body.recurrence
      : "none",
    pinned: !!body.pinned,
    remindMinutesBefore,
    reminderEmailSentAt: null,
  });

  return NextResponse.json({ reminder }, { status: 201 });
}
