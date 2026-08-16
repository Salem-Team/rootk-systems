export interface MentionableUser {
  id: string;
  name: string;
  email: string;
  initials: string;
}

export interface MentionUserRef {
  id: string;
  name: string;
}

export function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function collectMentionedUserIds(
  explicit: string[] | undefined,
  extra: string[] = []
): string[] {
  return uniqueIds([...(explicit ?? []), ...extra]).slice(0, 20);
}

export function readMentionQuery(
  value: string,
  caret: number
): { start: number; query: string } | null {
  if (caret < 0 || caret > value.length) return null;
  const before = value.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  const prev = at === 0 ? "" : before[at - 1];
  if (prev && !/[\s\n(]/.test(prev)) return null;
  const query = before.slice(at + 1);
  if (query.includes("\n") || query.includes("@") || query.length > 40) {
    return null;
  }
  return { start: at, query };
}

export function insertMentionToken(
  value: string,
  start: number,
  caret: number,
  name: string
): { value: string; caret: number } {
  const token = `@${name.replace(/\s+/g, " ").trim()} `;
  const next = `${value.slice(0, start)}${token}${value.slice(caret)}`;
  return { value: next, caret: start + token.length };
}

export function filterMentionUsers(
  users: MentionableUser[],
  query: string,
  excludeId?: string,
  limit = 8
): MentionableUser[] {
  const q = query.trim().toLowerCase();
  return users
    .filter((user) => user.id !== excludeId)
    .filter((user) => {
      if (!q) return true;
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
      );
    })
    .slice(0, limit);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function splitMentionText(
  text: string,
  names: string[] = []
): Array<{ type: "text" | "mention"; value: string }> {
  if (!text) return [];
  const known = names
    .map((name) => name.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const pattern =
    known.length > 0
      ? new RegExp(`@(?:${known.map(escapeRegExp).join("|")})`, "g")
      : /@[\p{L}\p{N}._-]+/gu;
  const parts: Array<{ type: "text" | "mention"; value: string }> = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) {
      parts.push({ type: "text", value: text.slice(last, match.index) });
    }
    parts.push({ type: "mention", value: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }
  return parts.length ? parts : [{ type: "text", value: text }];
}
