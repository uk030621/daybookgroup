import { NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { connectToDatabase } from "../../../../lib/mongodb";
import { pushIsConfigured, sendPushToUsers } from "../../../../lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// POST /api/push/test — sends a test notification to the caller's own
// devices, so they can confirm everything is wired up without waiting for a
// real reminder to fall due.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!pushIsConfigured()) {
    return NextResponse.json(
      { error: "Push notifications aren't set up on this server yet." },
      { status: 503 },
    );
  }

  await connectToDatabase();

  const result = await sendPushToUsers([session.user.id], {
    title: "Daybook",
    body: "Notifications are working on this device.",
    tag: "daybook-test",
    url: "/",
  });

  if (result.delivered === 0) {
    return NextResponse.json(
      {
        error:
          result.attempted === 0
            ? "No device is registered for notifications yet."
            : "The notification couldn't be delivered. Try turning notifications off and on again.",
        detail: result.errors,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ delivered: result.delivered });
}
