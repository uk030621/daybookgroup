import { NextResponse } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { connectToDatabase } from "../../../../../../lib/mongodb";
import Membership from "../../../../../../models/Membership";
import {
  getActiveMembership,
  isGroupAdmin,
} from "../../../../../../lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// DELETE /api/groups/:id/members/:membershipId — admin-only. Works for
// removing an active member or cancelling a pending invite.
export async function DELETE(request, { params }) {
  const { id, membershipId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const myMembership = await getActiveMembership(
    Membership,
    id,
    session.user.id,
  );
  if (!isGroupAdmin(myMembership)) {
    return NextResponse.json(
      { error: "Only a group admin can remove members" },
      { status: 403 },
    );
  }

  const target = await Membership.findOne({ _id: membershipId, groupId: id });
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (target.status === "active" && target.role === "admin") {
    const adminCount = await Membership.countDocuments({
      groupId: id,
      status: "active",
      role: "admin",
    });
    if (adminCount <= 1) {
      return NextResponse.json(
        {
          error:
            "A group needs at least one admin — promote someone else first",
        },
        { status: 409 },
      );
    }
  }

  await target.deleteOne();

  return NextResponse.json({ success: true });
}
