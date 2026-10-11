import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { auth } from "../../../../lib/auth";
import { connectToDatabase } from "../../../../lib/mongodb";
import PushSubscription from "../../../../models/PushSubscription";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// A readable name for a device, worked out from the browser's user-agent
// text ("iPhone · Safari"). Only a rough label — it's there so you can
// recognise which phone or laptop is which.
function describeDevice(userAgent) {
  const ua = String(userAgent || "");

  let device = "Unknown device";
  if (/iPhone/.test(ua)) device = "iPhone";
  else if (/iPad/.test(ua)) device = "iPad";
  else if (/Android/.test(ua)) device = "Android";
  else if (/Windows/.test(ua)) device = "Windows";
  else if (/Macintosh|Mac OS X/.test(ua)) device = "Mac";
  else if (/Linux/.test(ua)) device = "Linux";

  let browser = "";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/.test(ua)) browser = "Opera";
  else if (/Firefox|FxiOS/.test(ua)) browser = "Firefox";
  else if (/Chrome|CriOS/.test(ua)) browser = "Chrome";
  else if (/Safari/.test(ua)) browser = "Safari";

  return browser ? `${device} · ${browser}` : device;
}

// POST /api/push/devices — list the signed-in user's notification devices.
// Body: { endpoint } (optional) — this browser's own endpoint, so the list
// can say which entry is "this device". It's a POST rather than a GET only
// so the long endpoint address doesn't travel in the URL.
export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // no body is fine — nothing will be marked as this device
  }
  const thisEndpoint = typeof body?.endpoint === "string" ? body.endpoint : null;

  await connectToDatabase();
  const rows = await PushSubscription.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .select("endpoint userAgent createdAt")
    .limit(20)
    .lean();

  return NextResponse.json({
    devices: rows.map((row) => ({
      id: row._id.toString(),
      label: describeDevice(row.userAgent),
      addedAt: row.createdAt,
      current: Boolean(thisEndpoint) && row.endpoint === thisEndpoint,
    })),
  });
}

// DELETE /api/push/devices — remove one of the user's devices, for example
// a lost phone, from any other device they're signed in on.
// Body: { id }
export async function DELETE(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // fall through — the id check below returns the 400
  }
  if (typeof body?.id !== "string" || !mongoose.isValidObjectId(body.id)) {
    return NextResponse.json({ error: "A valid device id is required" }, { status: 400 });
  }

  await connectToDatabase();
  const result = await PushSubscription.deleteOne({
    _id: body.id,
    userId: session.user.id,
  });
  console.log(`[push] device removed from the device list (deleted=${result.deletedCount})`);

  return NextResponse.json({ success: true });
}
