import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { connectToDatabase } from "../../../../../lib/mongodb";
import Group from "../../../../../models/Group";
import Membership from "../../../../../models/Membership";
import {
  getActiveMembership,
  isGroupAdmin,
} from "../../../../../lib/permissions";
import { sendGroupInviteEmail } from "../../../../../lib/email";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/groups/:id/invite — admin-only. Body: { email }
export async function POST(request, { params }) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const invitedEmail = body.email?.trim().toLowerCase();
  if (!invitedEmail || !invitedEmail.includes("@")) {
    return NextResponse.json(
      { error: "A valid email address is required" },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const myMembership = await getActiveMembership(
    Membership,
    id,
    session.user.id,
  );
  if (!isGroupAdmin(myMembership)) {
    return NextResponse.json(
      { error: "Only a group admin can invite members" },
      { status: 403 },
    );
  }

  const group = await Group.findById(id).lean();
  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await Membership.findOne({ groupId: id, invitedEmail });
  if (existing?.status === "active") {
    return NextResponse.json(
      { error: "That person is already a member" },
      { status: 409 },
    );
  }

  const inviteToken = randomBytes(24).toString("hex");

  let membership;
  if (existing) {
    // Re-inviting someone whose previous invite is still pending — refresh
    // the token rather than creating a duplicate row (unique index on
    // groupId+invitedEmail would reject a duplicate anyway).
    existing.inviteToken = inviteToken;
    existing.invitedBy = session.user.id;
    await existing.save();
    membership = existing;
  } else {
    membership = await Membership.create({
      groupId: id,
      role: "member",
      status: "invited",
      invitedEmail,
      invitedBy: session.user.id,
      inviteToken,
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const acceptUrl = `${appUrl}/invite/${inviteToken}`;

  try {
    await sendGroupInviteEmail({
      toEmail: invitedEmail,
      groupName: group.name,
      inviterName: session.user.name,
      acceptUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Invite saved but the email failed to send: ${err.message}` },
      { status: 502 },
    );
  }

  return NextResponse.json(
    { membershipId: membership._id, invitedEmail },
    { status: 201 },
  );
}
