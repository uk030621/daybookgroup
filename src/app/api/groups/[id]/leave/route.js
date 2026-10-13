import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Membership from "../../../../../models/Membership";
import Reminder from "../../../../../models/Reminder";
import {
  getActiveMembership,
  unshareMemberReminders,
} from "../../../../../lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/groups/:id/leave — the signed-in member leaves the group.
//
// Reminders they had shared with it become private again (nothing is
// deleted). They'd need a fresh invite to rejoin. A group's last admin can't
// leave, since that would leave the group with nobody to manage it — they can
// delete the group instead.
export async function POST(request, { params }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const mine = await getActiveMembership(Membership, id, session.user.id);
  if (!mine) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (mine.role === "admin") {
    const adminCount = await Membership.countDocuments({
      groupId: id,
      status: "active",
      role: "admin",
    });
    if (adminCount <= 1) {
      return NextResponse.json(
        {
          error:
            "You're the only admin of this group, so you can't leave it. You can delete the group instead.",
        },
        { status: 409 },
      );
    }
  }

  await Membership.deleteOne({ _id: mine._id });
  await unshareMemberReminders(Reminder, id, session.user.id);

  return NextResponse.json({ success: true });
}
