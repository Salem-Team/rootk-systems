"use client";

import { useMemo, useRef, useState } from "react";
import { AtSign, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import {
  filterMentionUsers,
  insertMentionToken,
  readMentionQuery,
  type MentionableUser,
} from "@/lib/mentions";
import { cn } from "@/lib/utils";

interface CrmMentionTextareaProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  users: MentionableUser[];
  mentionedUsers: MentionableUser[];
  onMentionedUsersChange: (users: MentionableUser[]) => void;
  selfUserId?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

/** Feedback textarea with @-mention picker for any company user. */
export function CrmMentionTextarea({
  id,
  value,
  onChange,
  users,
  mentionedUsers,
  onMentionedUsersChange,
  selfUserId,
  placeholder,
  rows = 4,
  disabled,
}: CrmMentionTextareaProps) {
  const { t } = useTranslation();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const matches = useMemo(
    () => filterMentionUsers(users, query, selfUserId, 10),
    [users, query, selfUserId]
  );

  function addMention(user: MentionableUser, start: number, caret: number) {
    const next = insertMentionToken(value, start, caret, user.name);
    onChange(next.value);
    if (!mentionedUsers.some((item) => item.id === user.id)) {
      onMentionedUsersChange([...mentionedUsers, user]);
    }
    setPickerOpen(false);
    setQuery("");
    setActiveIndex(0);
    requestAnimationFrame(() => {
      const el = areaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.caret, next.caret);
    });
  }

  function syncPicker(nextValue: string, caret: number) {
    const mention = readMentionQuery(nextValue, caret);
    if (!mention) {
      setPickerOpen(false);
      setQuery("");
      return;
    }
    setPickerOpen(true);
    setQuery(mention.query);
    setActiveIndex(0);
  }

  function selectAt(index: number) {
    const user = matches[index];
    const el = areaRef.current;
    if (!user || !el) return;
    const caret = el.selectionStart ?? value.length;
    const mention = readMentionQuery(value, caret);
    addMention(user, mention?.start ?? caret, caret);
  }

  function removeMention(id: string) {
    onMentionedUsersChange(mentionedUsers.filter((user) => user.id !== id));
  }

  return (
    <div className="grid gap-1.5">
      <Textarea
        ref={areaRef}
        id={id}
        value={value}
        rows={rows}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          syncPicker(next, e.target.selectionStart ?? next.length);
        }}
        onClick={(e) => {
          const el = e.currentTarget;
          syncPicker(value, el.selectionStart ?? value.length);
        }}
        onKeyDown={(e) => {
          if (!pickerOpen) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, Math.max(0, matches.length - 1)));
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
            return;
          }
          if (e.key === "Escape") {
            e.preventDefault();
            setPickerOpen(false);
            return;
          }
          if ((e.key === "Enter" || e.key === "Tab") && matches[activeIndex]) {
            e.preventDefault();
            selectAt(activeIndex);
          }
        }}
      />

      {pickerOpen ? (
        <ul
          role="listbox"
          aria-label={t("crm.feedback.mentionList")}
          className="max-h-48 overflow-auto rounded-lg border border-border/70 bg-popover p-1 shadow-sm"
        >
          {matches.length === 0 ? (
            <li className="px-2.5 py-2 text-[12px] text-muted-foreground">
              {t("crm.feedback.mentionEmpty")}
            </li>
          ) : (
            matches.map((user, index) => (
              <li key={user.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start",
                    index === activeIndex ? "bg-muted" : "hover:bg-muted/60"
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectAt(index)}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    {user.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">
                      {user.name}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {mentionedUsers.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {mentionedUsers.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/8 px-2 py-0.5 text-[11px] font-medium"
            >
              <AtSign className="h-3 w-3 text-primary" aria-hidden />
              {user.name}
              <button
                type="button"
                className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={t("crm.feedback.mentionRemove")}
                onClick={() => removeMention(user.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        {t("crm.feedback.mentionHint")}
      </p>
    </div>
  );
}
