import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { connectToDatabase } from "../../../../lib/mongodb";
import User from "../../../../models/User";
import Group from "../../../../models/Group";
import Membership from "../../../../models/Membership";
import Reminder from "../../../../models/Reminder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/admin/overview — platform-admin-only, read-only oversight data.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isPlatformAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectToDatabase();

  const [users, groups, memberships, totalReminders, sharedReminders] =
    await Promise.all([
      User.find().sort({ createdAt: -1 }).lean(),
      Group.find().sort({ createdAt: -1 }).lean(),
      Membership.find().lean(),
      Reminder.countDocuments(),
      Reminder.countDocuments({ sharedWithGroupId: { $ne: null } }),
    ]);

  const membershipsByGroup = new Map();
  for (const m of memberships) {
    const key = m.groupId.toString();
    if (!membershipsByGroup.has(key)) membershipsByGroup.set(key, []);
    membershipsByGroup.get(key).push(m);
  }

  const groupSummaries = groups.map((g) => {
    const rows = membershipsByGroup.get(g._id.toString()) || [];
    return {
      _id: g._id,
      name: g.name,
      createdAt: g.createdAt,
      activeMembers: rows.filter((m) => m.status === "active").length,
      pendingInvites: rows.filter((m) => m.status === "invited").length,
      admins: rows.filter((m) => m.status === "active" && m.role === "admin")
        .length,
    };
  });

  return NextResponse.json({
    stats: {
      totalUsers: users.length,
      totalGroups: groups.length,
      totalReminders,
      sharedReminders,
    },
    users: users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      image: u.image,
      createdAt: u.createdAt,
      lastSignInAt: u.lastSignInAt,
    })),
    groups: groupSummaries,
  });
}
