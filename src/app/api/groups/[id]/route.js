import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { connectToDatabase } from "../../../../lib/mongodb";
import Group from "../../../../models/Group";
import Membership from "../../../../models/Membership";
import User from "../../../../models/User";
import { getActiveMembership } from "../../../../lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/groups/:id — group detail plus every member (active + pending
// invites), only visible to someone who is themself an active member.
export async function GET(request, { params }) {
  const { id } = await params;

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
  if (!myMembership) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const group = await Group.findById(id).lean();
  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const memberships = await Membership.find({ groupId: id }).lean();

  const userIds = memberships
    .filter((m) => m.status === "active" && m.userId)
    .map((m) => m.userId);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userById = new Map(users.map((u) => [u._id, u]));

  const members = memberships.map((m) => ({
    membershipId: m._id,
    role: m.role,
    status: m.status,
    invitedEmail: m.invitedEmail,
    joinedAt: m.joinedAt,
    user:
      m.userId && userById.has(m.userId)
        ? {
            id: m.userId,
            name: userById.get(m.userId).name,
            email: userById.get(m.userId).email,
            image: userById.get(m.userId).image,
          }
        : null,
  }));

  return NextResponse.json({
    group,
    myRole: myMembership.role,
    members,
  });
}
