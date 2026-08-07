/**
 * Resolve the signed-in account's real name (never invent i18n mock labels).
 */
export function resolveAccountFullName(user: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const parts = [user.firstName?.trim(), user.lastName?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (parts) return parts;
  const display = user.displayName?.trim();
  if (display) return display;
  const email = user.email?.trim();
  if (email) return email.split("@")[0] || email;
  return "";
}

export function resolveAccountFirstName(user: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  const first = user.firstName?.trim();
  if (first) return first;
  const full = resolveAccountFullName(user);
  if (!full) return "";
  return full.split(/\s+/)[0] || full;
}
