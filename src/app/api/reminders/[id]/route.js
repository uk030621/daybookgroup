import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { connectToDatabase } from "../../../../lib/mongodb";
import Reminder from "../../../../models/Reminder";
import Membership from "../../../../models/Membership";
import { getActiveMembership } from "../../../../lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// A reminder is visible to its owner, or to any active member of the group
// it's shared with.
async function findVisibleReminder(id, userId) {
  const reminder = await Reminder.findById(id);
  if (!reminder) return null;

  if (reminder.userId === userId) return reminder;

  if (reminder.sharedWithGroupId) {
    const membership = await getActiveMembership(
      Membership,
      reminder.sharedWithGroupId,
      userId,
    );
    if (membership) return reminder;
  }

  return null;
}

// GET /api/reminders/:id
export async function GET(request, { params }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const reminder = await findVisibleReminder(id, session.user.id);
  if (!reminder) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ reminder });
}

// PUT /api/reminders/:id
//
// The owner can change anything. A non-owner who's an active member of the
// group this reminder is shared with can ONLY toggle `completed` — every
// other field in the request body is silently ignored for them, not just
// rejected, since a shared "mark as done" click shouldn't fail outright
// just because the client happens to send other unchanged fields too.
export async function PUT(request, { params }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  await connectToDatabase();

  const existing = await Reminder.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = existing.userId === session.user.id;

  if (!isOwner) {
    let canToggle = false;
    if (existing.sharedWithGroupId) {
      const membership = await getActiveMembership(
        Membership,
        existing.sharedWithGroupId,
        session.user.id,
      );
      canToggle = Boolean(membership);
    }
    if (!canToggle) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.completed === undefined) {
      return NextResponse.json(
        { error: "You can only mark this reminder complete or active" },
        { status: 403 },
      );
    }

    existing.completed = !!body.completed;
    existing.completedAt = body.completed ? new Date() : null;
    await existing.save();
    return NextResponse.json({ reminder: existing.toObject() });
  }

  // Owner — full edit access.
  const update = {};
  if (body.title !== undefined) update.title = body.title.trim();
  if (body.notes !== undefined) update.notes = body.notes.trim();
  if (body.dueDate !== undefined)
    update.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.timezone !== undefined) update.timezone = body.timezone || null;
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
  if (body.sharedWithGroupId !== undefined) {
    if (body.sharedWithGroupId) {
      const membership = await getActiveMembership(
        Membership,
        body.sharedWithGroupId,
        session.user.id,
      );
      if (!membership) {
        return NextResponse.json(
          { error: "You can only share with a group you belong to" },
          { status: 403 },
        );
      }
      update.sharedWithGroupId = body.sharedWithGroupId;
    } else {
      update.sharedWithGroupId = null;
    }
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

// DELETE /api/reminders/:id — owner only. A shared reminder can't be
// deleted by anyone other than the person who created it.
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
