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
