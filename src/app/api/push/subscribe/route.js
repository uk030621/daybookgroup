import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { connectToDatabase } from "../../../../lib/mongodb";
import PushSubscription from "../../../../models/PushSubscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_DEVICES_PER_USER = 10;

// POST /api/push/subscribe — save (or re-assign) this device's subscription.
// Body: the browser's PushSubscription JSON ({ endpoint, keys: { p256dh, auth } }).
//
// Keyed by endpoint, so if a different person signs in on the same browser
// the device simply moves to them rather than notifying the wrong account.
export async function POST(request) {
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

  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const authKey = body?.keys?.auth;
  if (
    typeof endpoint !== "string" ||
    !endpoint.startsWith("https://") ||
    typeof p256dh !== "string" ||
    typeof authKey !== "string"
  ) {
    return NextResponse.json(
      { error: "That doesn't look like a valid push subscription" },
      { status: 400 },
    );
  }

  await connectToDatabase();

  await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      $set: {
        userId: session.user.id,
        keys: { p256dh, auth: authKey },
        userAgent: (request.headers.get("user-agent") || "").slice(0, 300),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  // Keep the table tidy: only the newest few devices per person.
  const mine = await PushSubscription.find({ userId: session.user.id })
    .sort({ updatedAt: -1 })
    .select("_id")
    .lean();
  if (mine.length > MAX_DEVICES_PER_USER) {
    await PushSubscription.deleteMany({
      _id: { $in: mine.slice(MAX_DEVICES_PER_USER).map((s) => s._id) },
    });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/push/subscribe — forget this device. Body: { endpoint }
export async function DELETE(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // fall through — endpoint check below returns the 400
  }
  if (typeof body?.endpoint !== "string") {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }

  await connectToDatabase();
  console.log(
    `[push] device removed by request: ${String(body.reason || "no reason given").slice(0, 60)}`,
  );
  await PushSubscription.deleteOne({
    endpoint: body.endpoint,
    userId: session.user.id,
  });

  return NextResponse.json({ success: true });
}
