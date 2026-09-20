"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import {
  Loader2,
  MessageSquare,
  MessageSquarePlus,
  Mic,
  Reply,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { BidiBlocks, BidiText } from "@/components/shared/bidi-text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { VoicePlayer } from "@/components/voice/voice-player";
import {
  VoiceRecorderControl,
  type VoiceDraft,
} from "@/components/voice/voice-recorder-control";
import { useTranslation } from "@/hooks/use-translation";
import { WORK_UPDATED_EVENT } from "@/lib/events";
import { formatIsoDateTime, DATETIME_12H_SHORT } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import {
  createTaskComment,
  deleteTaskComment,
  listTaskComments,
} from "@/services/work/work-task-comments.service";
import { useSessionStore } from "@/stores/session-store";
import type { WorkTaskComment } from "@/types/work";

function relativeTime(iso: string, locale: "en" | "ar"): string {
  try {
    return formatDistanceToNow(new Date(iso), {
      addSuffix: true,
      locale: locale === "ar" ? arLocale : enUS,
    });
  } catch {
    return formatIsoDateTime(iso, locale, DATETIME_12H_SHORT);
  }
}

function CommentCard({
  comment,
  isReply,
  canDelete,
  onReply,
  onDelete,
  locale,
}: {
  comment: WorkTaskComment;
  isReply?: boolean;
  canDelete: boolean;
  onReply?: () => void;
  onDelete: () => void;
  locale: "en" | "ar";
}) {
  const { t } = useTranslation();
  const voiceSrc = comment.voiceUrl || null;
  const initials = (comment.authorName || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-3 sm:rounded-xl sm:p-3.5",
        isReply
          ? "border-border/50 bg-muted/20 shadow-none"
          : "border-border/70 shadow-[var(--shadow-card)]"
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold sm:h-10 sm:w-10 sm:text-[12px]",
            isReply
              ? "bg-muted text-muted-foreground"
              : "bg-primary/10 text-primary"
          )}
          aria-hidden
        >
          {initials || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="truncate text-[13px] font-semibold sm:text-sm">
              <BidiText text={comment.authorName || t("workComments.someone")} />
            </p>
            {voiceSrc && !comment.body ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                <Mic className="h-3 w-3" aria-hidden />
                {t("workComments.voiceOnly")}
              </span>
            ) : null}
            <time
              className="ms-auto text-[11px] tabular-nums text-muted-foreground"
              dateTime={comment.createdAt}
              title={formatIsoDateTime(comment.createdAt, locale)}
            >
              {relativeTime(comment.createdAt, locale)}
            </time>
          </div>
          {comment.body ? (
            <BidiBlocks
              text={comment.body}
              className="mt-1.5 break-words text-[13px] text-foreground/95 sm:text-sm"
            />
          ) : null}
          {voiceSrc ? (
            <VoicePlayer
              className="mt-2.5"
              src={voiceSrc}
              durationMs={comment.voiceDurationMs}
            />
          ) : null}
          <div className="-ms-2 mt-1.5 flex flex-wrap items-center gap-0.5">
            {onReply ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-10 touch-manipulation gap-1.5 rounded-xl px-2.5 text-[12px] font-semibold"
                onClick={onReply}
              >
                <Reply className="h-3.5 w-3.5" />
                {t("workComments.reply")}
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-10 touch-manipulation gap-1.5 rounded-xl px-2.5 text-[12px] font-semibold text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("common.delete")}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function Composer({
  taskId,
  parentId,
  onDone,
  onCancel,
  autofocus,
}: {
  taskId: string;
  parentId?: string | null;
  onDone: () => void;
  onCancel?: () => void;
  autofocus?: boolean;
}) {
  const { t } = useTranslation();
  const [body, setBody] = useState("");
  const [voice, setVoice] = useState<VoiceDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const isReply = Boolean(parentId);
  const canSend = Boolean(body.trim() || voice);

  async function submit() {
    if (busy || !canSend) return;
    setBusy(true);
    const res = await createTaskComment(taskId, {
      body,
      parentId: parentId ?? null,
      voice: voice
        ? {
            dataBase64: voice.dataBase64,
            mime: voice.mime,
            durationMs: voice.durationMs,
          }
        : null,
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("workComments.postFailed"));
      return;
    }
    setBody("");
    setVoice(null);
    toast.success(t("workComments.posted"));
    onDone();
  }

  return (
    <div
      className={cn(
        "grid gap-2.5 rounded-2xl border p-3 sm:rounded-xl sm:p-3.5",
        isReply
          ? "border-primary/25 bg-primary/[0.04]"
          : "border-border/70 bg-card shadow-[var(--shadow-card)]"
      )}
    >
      {isReply ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-primary">
          {t("workComments.replying")}
        </p>
      ) : (
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
          <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {t("workComments.composerHint")}
        </p>
      )}
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={
          isReply
            ? t("workComments.replyPlaceholder")
            : t("workComments.placeholder")
        }
        className="min-h-[4.75rem] resize-none rounded-xl border-border/70 bg-background text-base leading-relaxed sm:min-h-[4.25rem] sm:text-sm"
        autoFocus={autofocus}
        disabled={busy}
      />
      <VoiceRecorderControl
        value={voice}
        onChange={setVoice}
        disabled={busy}
        compact={isReply}
      />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            className="h-11 touch-manipulation rounded-xl sm:min-w-[6.5rem]"
            disabled={busy}
            onClick={onCancel}
          >
            {t("common.cancel")}
          </Button>
        ) : null}
        <Button
          type="button"
          className="h-11 touch-manipulation gap-2 rounded-xl sm:min-w-[8rem]"
          disabled={busy || !canSend}
          onClick={() => void submit()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {isReply ? t("workComments.sendReply") : t("workComments.send")}
        </Button>
      </div>
    </div>
  );
}

/** Threaded task comments with optional voice notes — mobile-first. */
export function TaskCommentsPanel({ taskId }: { taskId: string }) {
  const { t, locale } = useTranslation();
  const userId = useSessionStore((s) => s.user.id);
  const role = useSessionStore((s) => s.role);
  const [items, setItems] = useState<WorkTaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await listTaskComments(taskId);
    if (res.success) setItems(res.data);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    setLoading(true);
    setReplyTo(null);
    void load();
  }, [load]);

  useEffect(() => {
    const onUpdate = () => void load();
    window.addEventListener(WORK_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(WORK_UPDATED_EVENT, onUpdate);
  }, [load]);

  const roots = useMemo(() => {
    return items
      .filter((c) => !c.parentId)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [items]);

  const repliesByParent = useMemo(() => {
    const map = new Map<string, WorkTaskComment[]>();
    for (const item of items) {
      if (!item.parentId) continue;
      const list = map.get(item.parentId) ?? [];
      list.push(item);
      map.set(item.parentId, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    return map;
  }, [items]);

  async function remove(commentId: string) {
    const res = await deleteTaskComment(taskId, commentId);
    if (!res.success) {
      toast.error(res.message ?? t("workComments.deleteFailed"));
      return;
    }
    toast.success(t("workComments.deleted"));
    if (replyTo === commentId) setReplyTo(null);
    void load();
  }

  return (
    <section className="surface-panel min-w-0 overflow-hidden">
      <header className="flex items-start gap-3 border-b border-border/70 px-3.5 py-3.5 sm:px-4">
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <MessageSquare className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold tracking-tight sm:text-base">
              {t("workComments.title")}
            </h3>
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
              {items.length}
            </span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground sm:text-[13px]">
            {t("workComments.description")}
          </p>
        </div>
        {!loading && roots.length > 0 ? (
          <span className="hidden rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground sm:inline-flex">
            {t("workComments.newestFirst")}
          </span>
        ) : null}
      </header>

      <div className="grid gap-4 p-3 sm:gap-4 sm:p-4">
        <Composer taskId={taskId} onDone={() => void load()} />

        {loading ? (
          <div className="grid gap-2.5">
            <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
            <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
          </div>
        ) : null}

        {!loading && roots.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center sm:rounded-xl">
            <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MessageSquare className="h-4 w-4" aria-hidden />
            </span>
            <p className="text-[13px] font-medium text-muted-foreground">
              {t("workComments.empty")}
            </p>
          </div>
        ) : null}

        <div className="grid gap-4">
          {roots.map((comment) => {
            const replies = repliesByParent.get(comment.id) ?? [];
            const canDelete =
              role === "admin" || comment.authorUserId === userId;
            return (
              <div key={comment.id} className="grid gap-0">
                <CommentCard
                  comment={comment}
                  canDelete={canDelete}
                  locale={locale}
                  onReply={() =>
                    setReplyTo((cur) =>
                      cur === comment.id ? null : comment.id
                    )
                  }
                  onDelete={() => void remove(comment.id)}
                />

                {replies.length > 0 || replyTo === comment.id ? (
                  <div className="relative ms-3 mt-2 grid gap-2 border-s-2 border-primary/20 ps-3 sm:ms-5 sm:ps-4">
                    {replies.length > 0 ? (
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        {replies.length === 1
                          ? t("workComments.replyCountOne")
                          : t("workComments.repliesCount", {
                              count: String(replies.length),
                            })}
                      </p>
                    ) : null}
                    {replies.map((reply) => (
                      <CommentCard
                        key={reply.id}
                        comment={reply}
                        isReply
                        canDelete={
                          role === "admin" || reply.authorUserId === userId
                        }
                        locale={locale}
                        onDelete={() => void remove(reply.id)}
                      />
                    ))}
                    {replyTo === comment.id ? (
                      <Composer
                        taskId={taskId}
                        parentId={comment.id}
                        autofocus
                        onCancel={() => setReplyTo(null)}
                        onDone={() => {
                          setReplyTo(null);
                          void load();
                        }}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
