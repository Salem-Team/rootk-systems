import { splitMentionText } from "@/lib/mentions";
import { cn } from "@/lib/utils";

interface CrmMentionTextProps {
  text: string;
  names?: string[];
  className?: string;
}

/** Renders feedback text with @mentions highlighted. */
export function CrmMentionText({
  text,
  names = [],
  className,
}: CrmMentionTextProps) {
  const parts = splitMentionText(text, names);
  if (parts.length === 0) return null;

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {parts.map((part, index) =>
        part.type === "mention" ? (
          <span key={`${part.value}-${index}`} className="font-medium text-primary">
            {part.value}
          </span>
        ) : (
          <span key={`t-${index}`}>{part.value}</span>
        )
      )}
    </span>
  );
}

export function CrmMentionChips({
  users,
}: {
  users?: { id: string; name: string }[];
}) {
  if (!users?.length) return null;
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {users.map((user) => (
        <span
          key={user.id}
          className="inline-flex items-center rounded-full bg-primary/8 px-1.5 py-0.5 text-[10px] font-medium text-primary"
        >
          @{user.name}
        </span>
      ))}
    </span>
  );
}
