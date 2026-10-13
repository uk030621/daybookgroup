// Platform admins are bootstrapped via an env var allow-list rather than a
// database flag, since Phase 1 has no admin UI yet to manage this properly.
// PLATFORM_ADMIN_EMAILS is a comma-separated list, e.g.:
//   PLATFORM_ADMIN_EMAILS=you@example.com,someone-else@example.com
export function isPlatformAdmin(email) {
  if (!email) return false;

  const admins = (process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return admins.includes(email.toLowerCase());
}

// Returns the caller's active membership row for a group, or null if
// they're not an active member (pending invites don't count).
export async function getActiveMembership(Membership, groupId, userId) {
  return Membership.findOne({ groupId, userId, status: "active" }).lean();
}

export function isGroupAdmin(membership) {
  return membership?.status === "active" && membership?.role === "admin";
}

// A reminder shared with a group is visible to every active member unless
// its owner chose particular people, in which case only those people (and
// the owner) can see it. Call this for someone who is already known to be an
// active member of the reminder's group.
export function reminderVisibleToMember(reminder, userId) {
  const chosen = reminder?.sharedWithUserIds;
  return !chosen || chosen.length === 0 || chosen.includes(userId);
}

// MongoDB filter for "shared with one of my groups AND not limited to other
// people". Reminders with no list at all (saved before the feature existed)
// or an empty list count as shared with the whole group.
export function sharedWithMeClause(groupIds, userId) {
  return {
    sharedWithGroupId: { $in: groupIds },
    $or: [
      { sharedWithUserIds: { $exists: false } },
      { sharedWithUserIds: { $size: 0 } },
      { sharedWithUserIds: userId },
    ],
  };
}

// Cleans a "share with these people" list from a request: keeps only people
// who are active members of the group (never the owner), without repeats.
// Returns { ids } or, if people were named but none of them are in the
// group, { error }.
export async function sanitiseChosenMembers(Membership, groupId, ownerId, requested) {
  if (!Array.isArray(requested) || requested.length === 0) return { ids: [] };

  const wanted = [...new Set(requested.filter((id) => typeof id === "string"))].filter(
    (id) => id && id !== ownerId,
  );
  const rows = wanted.length
    ? await Membership.find({
        groupId,
        status: "active",
        userId: { $in: wanted },
      })
        .select("userId")
        .lean()
    : [];
  const ids = rows.map((r) => r.userId);

  if (ids.length === 0) {
    return { error: "Choose at least one member of the group to share with" };
  }
  return { ids };
}

// Who may start a new group. Groups are created by the app's owner (the
// emails in PLATFORM_ADMIN_EMAILS); everyone else is invited into them. If
// that list hasn't been set at all, creation stays open so the owner can't be
// locked out of their own app.
export function canCreateGroups(email) {
  const configured = (process.env.PLATFORM_ADMIN_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (configured.length === 0) return true;
  return isPlatformAdmin(email);
}

// When someone stops being a member of a group (they leave, or an admin
// removes them), the reminders they had shared with it go back to being
// private. Nothing is deleted.
export async function unshareMemberReminders(Reminder, groupId, userId) {
  return Reminder.updateMany(
    { userId, sharedWithGroupId: groupId },
    {
      $set: {
        sharedWithGroupId: null,
        sharedWithUserIds: [],
        pushNotifyGroup: false,
      },
    },
  );
}
