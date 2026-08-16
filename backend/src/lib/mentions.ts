export interface MentionUserRef {
  id: string;
  name: string;
}

export function uniqueIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const id = String(raw ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function collectMentionedUserIds(body: Record<string, unknown>): string[] {
  const raw = body.mentionedUserIds;
  if (!Array.isArray(raw)) return [];
  return uniqueIds(raw.map((item) => String(item ?? ""))).slice(0, 20);
}

export function formatUserMentionName(user: {
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

export function mentionMetadata(users: MentionUserRef[]): {
  mentionedUserIds: string[];
  mentionedUsers: MentionUserRef[];
} {
  return {
    mentionedUserIds: users.map((user) => user.id),
    mentionedUsers: users,
  };
}

export function mentionsFromMetadata(metadata: unknown): MentionUserRef[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return [];
  }
  const row = metadata as {
    mentionedUsers?: unknown;
    mentionedUserIds?: unknown;
  };
  if (Array.isArray(row.mentionedUsers)) {
    return row.mentionedUsers
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const ref = item as { id?: unknown; name?: unknown };
        const id = String(ref.id ?? "").trim();
        const name = String(ref.name ?? "").trim();
        if (!id) return null;
        return { id, name: name || id };
      })
      .filter((item): item is MentionUserRef => Boolean(item));
  }
  if (Array.isArray(row.mentionedUserIds)) {
    return uniqueIds(row.mentionedUserIds.map((id) => String(id ?? ""))).map(
      (id) => ({ id, name: id })
    );
  }
  return [];
}
