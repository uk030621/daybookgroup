import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { connectToDatabase } from "../../../../lib/mongodb";
import Reminder from "../../../../models/Reminder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/reminders/:id
export async function GET(request, { params }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const reminder = await Reminder.findOne({
    _id: id,
    userId: session.user.id,
  }).lean();

  if (!reminder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ reminder });
}

// PUT /api/reminders/:id
export async function PUT(request, { params }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  await connectToDatabase();

  const update = {};
  if (body.title !== undefined) update.title = body.title.trim();
  if (body.notes !== undefined) update.notes = body.notes.trim();
  if (body.dueDate !== undefined)
    update.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.timezone !== undefined) update.timezone = body.timezone || null; // ← already here
  if (body.priority !== undefined) update.priority = body.priority;
  if (body.category !== undefined)
    update.category = body.category.trim() || "General";
  if (body.recurrence !== undefined) update.recurrence = body.recurrence;
  if (body.pinned !== undefined) update.pinned = !!body.pinned;
  if (body.remindMinutesBefore !== undefined) {
    const minutes = Number(body.remindMinutesBefore);
    update.remindMinutesBefore = Number.isFinite(minutes) ? minutes : 60;
  }
  if (body.completed !== undefined) {
    update.completed = !!body.completed;
    update.completedAt = body.completed ? new Date() : null;
  }

  // A reminder's due date or lead time changing means any previously-sent
  // lead-time email was for the wrong moment — clear it so the cron job
  // sends a fresh one at the new time.
  if (body.dueDate !== undefined || body.remindMinutesBefore !== undefined) {
    update.reminderEmailSentAt = null;
  }

  const reminder = await Reminder.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    update,
    { new: true, runValidators: true },
  ).lean();

  if (!reminder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ reminder });
}

// DELETE /api/reminders/:id
export async function DELETE(request, { params }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const reminder = await Reminder.findOneAndDelete({
    _id: id,
    userId: session.user.id,
  }).lean();

  if (!reminder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
