import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Membership from "../../../../../models/Membership";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// PUT /api/groups/:id/mute — body: { muted: boolean }
//
// Lets any active member silence push notifications for reminders that
// other people share with this group, without leaving the group. It only
// affects the caller's own membership.
export async function PUT(request, { params }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof body?.muted !== "boolean") {
    return NextResponse.json(
      { error: "muted must be true or false" },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const membership = await Membership.findOneAndUpdate(
    { groupId: id, userId: session.user.id, status: "active" },
    { $set: { pushMuted: body.muted } },
    { new: true },
  ).lean();

  if (!membership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ pushMuted: Boolean(membership.pushMuted) });
}
