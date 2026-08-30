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
