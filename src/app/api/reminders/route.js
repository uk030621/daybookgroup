import { NextResponse } from "next/server";
import { auth } from "../../../lib/auth";
import { connectToDatabase } from "../../../lib/mongodb";
import Reminder from "../../../models/Reminder";
import Membership from "../../../models/Membership";
import User from "../../../models/User";
import { getActiveMembership } from "../../../lib/permissions";

// Reminders change on every write, and this route reads the session cookie
// on every request — never cache it, or newly created/updated reminders can
// appear to "disappear" behind a stale cached response.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/reminders?search=&status=all|active|completed&category=&priority=&sort=dueDate
//
// Returns the caller's own reminders PLUS any reminder shared with a group
// they're an active member of. Each reminder comes back with `isOwner` and,
// for ones owned by someone else, an `owner` object so the UI can show
// whose reminder it is.
export async function GET(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim();
  const status = searchParams.get("status") || "all";
  const category = searchParams.get("category");
  const priority = searchParams.get("priority");
  const sort = searchParams.get("sort") || "dueDate";

  const myMemberships = await Membership.find({
    userId: session.user.id,
    status: "active",
  }).lean();
  const myGroupIds = myMemberships.map((m) => m.groupId);

  const ownershipOr = [{ userId: session.user.id }];
  if (myGroupIds.length) {
    ownershipOr.push({ sharedWithGroupId: { $in: myGroupIds } });
  }

  const filters = [{ $or: ownershipOr }];
  if (status === "active") filters.push({ completed: false });
  if (status === "completed") filters.push({ completed: true });
  if (category && category !== "all") filters.push({ category });
  if (priority && priority !== "all") filters.push({ priority });
  if (search) filters.push({ $text: { $search: search } });

  const query = { $and: filters };

  let sortSpec = { pinned: -1, dueDate: 1, createdAt: -1 };
  if (sort === "createdAt") sortSpec = { pinned: -1, createdAt: -1 };
  if (sort === "priority") {
    // handled client-side weighting is simpler, but give a reasonable default here
    sortSpec = { pinned: -1, priority: -1, dueDate: 1 };
  }
  if (sort === "title") sortSpec = { pinned: -1, title: 1 };

  const reminders = await Reminder.find(query).sort(sortSpec).lean();
  const categories = await Reminder.distinct("category", { $or: ownershipOr });

  // Look up display info for anyone who owns a shared reminder that isn't
  // the caller themself, so the UI can show whose reminder it is.
  const otherOwnerIds = [
    ...new Set(
      reminders
        .filter((r) => r.userId !== session.user.id)
        .map((r) => r.userId),
    ),
  ];
  const owners = otherOwnerIds.length
    ? await User.find({ _id: { $in: otherOwnerIds } }).lean()
    : [];
  const ownerById = new Map(owners.map((u) => [u._id, u]));

  const enriched = reminders.map((r) => {
    const isOwner = r.userId === session.user.id;
    return {
      ...r,
      isOwner,
      owner: isOwner
        ? null
        : ownerById.has(r.userId)
          ? {
              name: ownerById.get(r.userId).name,
              image: ownerById.get(r.userId).image,
            }
          : null,
    };
  });

  return NextResponse.json({ reminders: enriched, categories });
}

// POST /api/reminders
export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (!body.title || !body.title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  await connectToDatabase();

  const remindMinutesBefore = Number.isFinite(Number(body.remindMinutesBefore))
    ? Number(body.remindMinutesBefore)
    : 60;

  let sharedWithGroupId = null;
  if (body.sharedWithGroupId) {
    const membership = await getActiveMembership(
      Membership,
      body.sharedWithGroupId,
      session.user.id,
    );
    if (!membership) {
      return NextResponse.json(
        { error: "You can only share with a group you belong to" },
        { status: 403 },
      );
    }
    sharedWithGroupId = body.sharedWithGroupId;
  }

  const reminder = await Reminder.create({
    userId: session.user.id,
    email: session.user.email || null,
    title: body.title.trim(),
    notes: body.notes?.trim() || "",
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    timezone: body.timezone || null,
    priority: ["low", "medium", "high"].includes(body.priority)
      ? body.priority
      : "medium",
    category: body.category?.trim() || "General",
    recurrence: ["none", "daily", "weekly", "monthly"].includes(body.recurrence)
      ? body.recurrence
      : "none",
    pinned: !!body.pinned,
    remindMinutesBefore,
    reminderEmailSentAt: null,
    sharedWithGroupId,
  });

  return NextResponse.json(
    { reminder: { ...reminder.toObject(), isOwner: true, owner: null } },
    { status: 201 },
  );
}
