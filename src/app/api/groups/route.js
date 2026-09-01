import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { connectToDatabase } from "../../../lib/mongodb";
import Group from "../../../models/Group";
import Membership from "../../../models/Membership";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/groups — every group the caller is an active member of, with
// their role in each.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const memberships = await Membership.find({
    userId: session.user.id,
    status: "active",
  }).lean();

  const groupIds = memberships.map((m) => m.groupId);
  const groups = await Group.find({ _id: { $in: groupIds } }).lean();

  const roleByGroupId = new Map(
    memberships.map((m) => [m.groupId.toString(), m.role]),
  );

  const result = groups.map((group) => ({
    ...group,
    myRole: roleByGroupId.get(group._id.toString()),
  }));

  return NextResponse.json({ groups: result });
}

// POST /api/groups — create a new group. Creator automatically becomes its
// first admin member.
export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.name || !body.name.trim()) {
    return NextResponse.json(
      { error: "Group name is required" },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const group = await Group.create({
    name: body.name.trim(),
    createdBy: session.user.id,
  });

  await Membership.create({
    groupId: group._id,
    userId: session.user.id,
    role: "admin",
    status: "active",
    invitedEmail: session.user.email.toLowerCase(),
    invitedBy: session.user.id,
    joinedAt: new Date(),
  });

  return NextResponse.json(
    { group: { ...group.toObject(), myRole: "admin" } },
    { status: 201 },
  );
}
