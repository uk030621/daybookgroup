import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/push/public-key
//
// Hands the browser the VAPID (Voluntary Application Server Identification)
// public key it needs to create a push subscription. The public key is
// meant to be shared with browsers, so this route needs no sign-in. It is
// served from here rather than a NEXT_PUBLIC_ variable so it is read at
// runtime, not baked into the build.
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json(
      { error: "Push notifications aren't set up on this server yet." },
      { status: 503 },
    );
  }
  return NextResponse.json({ publicKey });
}
