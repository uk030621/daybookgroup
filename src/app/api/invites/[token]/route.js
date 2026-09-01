import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { connectToDatabase } from "../../../../lib/mongodb";
import Group from "../../../../models/Group";
import Membership from "../../../../models/Membership";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/invites/:token — preview details, so the accept page can show
// "You've been invited to <group>" before the person commits to accepting.
export async function GET(request, { params }) {
  const { token } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const membership = await Membership.findOne({
    inviteToken: token,
    status: "invited",
  }).lean();

  if (!membership) {
    return NextResponse.json(
      { error: "This invite is invalid or has already been used" },
      { status: 404 },
    );
  }

  const group = await Group.findById(membership.groupId).lean();

  const emailMatches =
    membership.invitedEmail === session.user.email.toLowerCase();

  return NextResponse.json({
    groupName: group?.name,
    invitedEmail: membership.invitedEmail,
    emailMatches,
  });
}

// POST /api/invites/:token — accept the invite. Only works if the currently
// signed-in account's email matches the invited address, so one person's
// invite link can't be used by whoever happens to click it.
export async function POST(request, { params }) {
  const { token } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const membership = await Membership.findOne({
    inviteToken: token,
    status: "invited",
  });

  if (!membership) {
    return NextResponse.json(
      { error: "This invite is invalid or has already been used" },
      { status: 404 },
    );
  }

  if (membership.invitedEmail !== session.user.email.toLowerCase()) {
    return NextResponse.json(
      {
        error:
          "This invite was sent to a different email address. Sign in with the account it was sent to.",
      },
      { status: 403 },
    );
  }

  membership.userId = session.user.id;
  membership.status = "active";
  membership.joinedAt = new Date();
  membership.inviteToken = null;
  await membership.save();

  const group = await Group.findById(membership.groupId).lean();

  return NextResponse.json({
    groupId: membership.groupId,
    groupName: group?.name,
  });
}
