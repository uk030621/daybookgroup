import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { connectToDatabase } from "../../../../../lib/mongodb";
import User from "../../../../../models/User";
import PushSubscription from "../../../../../models/PushSubscription";
import { isPlatformAdmin } from "../../../../../lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// PATCH /api/admin/users/:id — the app's owner blocks or unblocks someone.
// Body: { blocked: boolean }
//
// Blocking stops them signing in and cuts off any session they already
// have, removes their devices from push notifications, and pauses their
// reminder emails. Nothing is deleted, so unblocking brings it all back
// (they'll need to switch notifications on again on their devices).
export async function PATCH(request, { params }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // handled by the check below
  }
  if (typeof body?.blocked !== "boolean") {
    return NextResponse.json(
      { error: "blocked must be true or false" },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const target = await User.findById(id).lean();
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (body.blocked) {
    if (target._id === session.user.id) {
      return NextResponse.json(
        { error: "You can't block your own account." },
        { status: 400 },
      );
    }
    if (isPlatformAdmin(target.email)) {
      return NextResponse.json(
        { error: "You can't block another owner of the app." },
        { status: 400 },
      );
    }
  }

  await User.updateOne(
    { _id: id },
    {
      $set: {
        blocked: body.blocked,
        blockedAt: body.blocked ? new Date() : null,
      },
    },
  );

  if (body.blocked) {
    await PushSubscription.deleteMany({ userId: id });
  }

  return NextResponse.json({ id, blocked: body.blocked });
}
