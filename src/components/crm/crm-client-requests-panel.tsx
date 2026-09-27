"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ar as arLocale, enUS } from "date-fns/locale";
import {
  BadgePercent,
  FileSignature,
  FileText,
  Loader2,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { BidiText } from "@/components/shared/bidi-text";
import { TechnicalProposalEditor } from "@/components/crm/technical-proposal-editor";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { isProtectedAdminAccount } from "@/lib/protected-accounts";
import { cn } from "@/lib/utils";
import {
  createCrmClientRequest,
  listCrmClientRequests,
  replyCrmClientRequest,
} from "@/services/crm/crm-client-requests.service";
import { useSessionStore } from "@/stores/session-store";
import type { Employee } from "@/types";
import type {
  CrmClientRequest,
  CrmClientRequestKind,
  CrmClientRequestStatus,
} from "@/types/crm";

const KINDS: {
  id: CrmClientRequestKind;
  icon: typeof BadgePercent;
}[] = [
  { id: "price_exception", icon: BadgePercent },
  { id: "technical_proposal", icon: FileText },
  { id: "contract", icon: FileSignature },
];

function employeeName(employees: Employee[], id: string): string {
  if (!id) return "";
  return employees.find((employee) => employee.id === id)?.name ?? "";
}

export function CrmClientRequestsPanel({
  leadId,
  variant,
  readOnly = false,
  employees = [],
  onOpenLead,
  hideIntro = false,
}: {
  leadId?: string;
  variant: "lead" | "inbox";
  readOnly?: boolean;
  employees?: Employee[];
  onOpenLead?: (leadId: string) => void;
  hideIntro?: boolean;
}) {
  const { t, locale } = useTranslation();
  const user = useSessionStore((s) => s.user);
  const canReply = isProtectedAdminAccount({
    userId: user.id,
    employeeId: user.employeeId,
    email: user.email,
  });
  const myEmployeeId = useSessionStore((s) => s.user.employeeId);
  const dateLocale = locale === "ar" ? arLocale : enUS;
  const [items, setItems] = useState<CrmClientRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<CrmClientRequestStatus | "all">("open");
  const [kind, setKind] = useState<CrmClientRequestKind>("price_exception");
  const [message, setMessage] = useState("");
  const [listedPrice, setListedPrice] = useState("");
  const [requestedPrice, setRequestedPrice] = useState("");
  const [sending, setSending] = useState(false);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await listCrmClientRequests(
      variant === "lead"
        ? { leadId }
        : status === "all"
          ? undefined
          : { status }
    );
    if (res.success) setItems(res.data);
    setLoading(false);
  }, [leadId, status, variant]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    if (variant === "lead" || status === "all") return items;
    return items.filter((item) => item.status === status);
  }, [items, status, variant]);

  async function submitRequest() {
    if (!leadId) return;
    const text = message.trim();
    if (text.length < 2) {
      toast.error(t("crm.clientRequests.validation"));
      return;
    }
    setSending(true);
    const res = await createCrmClientRequest(leadId, {
      kind,
      message: text,
      listedPrice,
      requestedPrice,
    });
    setSending(false);
    if (!res.success || !res.data) {
      toast.error(res.message || t("common.error"));
      return;
    }
    setMessage("");
    setListedPrice("");
    setRequestedPrice("");
    setItems((prev) => [res.data!, ...prev.filter((row) => row.id !== res.data!.id)]);
    toast.success(t("crm.clientRequests.sent"));
  }

  async function submitReply(requestId: string) {
    const text = replyText.trim();
    if (text.length < 2) {
      toast.error(t("crm.clientRequests.replyValidation"));
      return;
    }
    setReplying(true);
    const res = await replyCrmClientRequest(requestId, text);
    setReplying(false);
    if (!res.success || !res.data) {
      toast.error(res.message || t("common.error"));
      return;
    }
    setReplyText("");
    setReplyFor(null);
    setItems((prev) =>
      prev.map((row) => (row.id === res.data!.id ? res.data! : row))
    );
    toast.success(
      canReply
        ? t("crm.clientRequests.replied")
        : t("crm.clientRequests.followedUp")
    );
  }

  return (
    <div className="space-y-3">
      {variant === "inbox" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          {hideIntro ? null : (
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight">
                {t("crm.clientRequests.title")}
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {canReply
                  ? t("crm.clientRequests.inboxDesc")
                  : t("crm.clientRequests.inboxMine")}
              </p>
            </div>
          )}
          <div
            className={cn(
              "grid grid-cols-2 gap-1 rounded-xl border border-border/70 bg-muted/40 p-1",
              hideIntro && "sm:ms-auto sm:w-64"
            )}
          >
            {(["open", "answered"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={cn(
                  "min-h-10 rounded-lg px-3 text-[12px] font-semibold",
                  status === value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                {t(`crm.clientRequests.status.${value}`)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {variant === "lead" && !readOnly ? (
        <section className="rounded-2xl border border-border/70 bg-card p-3 shadow-sm">
          <h3 className="text-[13px] font-semibold">
            {t("crm.clientRequests.newTitle")}
          </h3>
          <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
            {t("crm.clientRequests.newHint")}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            {KINDS.map((item) => {
              const Icon = item.icon;
              const active = kind === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setKind(item.id)}
                  className={cn(
                    "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center text-[11px] font-semibold leading-tight",
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/70 bg-muted/30 text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="line-clamp-2">
                    {t(`crm.clientRequests.kinds.${item.id}`)}
                  </span>
                </button>
              );
            })}
          </div>
          {kind === "price_exception" ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-[12px] font-medium">
                {t("crm.clientRequests.listedPrice")}
                <Input
                  value={listedPrice}
                  onChange={(event) => setListedPrice(event.target.value)}
                  placeholder={t("crm.clientRequests.pricePlaceholder")}
                  className="h-11"
                />
              </label>
              <label className="grid gap-1 text-[12px] font-medium">
                {t("crm.clientRequests.requestedPrice")}
                <Input
                  value={requestedPrice}
                  onChange={(event) => setRequestedPrice(event.target.value)}
                  placeholder={t("crm.clientRequests.pricePlaceholder")}
                  className="h-11"
                />
              </label>
            </div>
          ) : null}
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t(`crm.clientRequests.placeholders.${kind}`)}
            className="mt-3 min-h-24 resize-y text-[14px]"
          />
          {kind === "technical_proposal" ? (
            <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
              {t("crm.clientRequests.proposal.sendHint")}
            </p>
          ) : null}
          <Button
            type="button"
            className="mt-3 h-11 w-full"
            disabled={sending}
            onClick={() => void submitRequest()}
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="h-4 w-4" aria-hidden />
            )}
            {t("crm.clientRequests.send")}
          </Button>
        </section>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          compact
          title={t("crm.clientRequests.emptyTitle")}
          description={
            variant === "lead"
              ? t("crm.clientRequests.emptyLead")
              : t("crm.clientRequests.emptyInbox")
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {visible.map((item) => {
            const open = variant === "lead" || replyFor === item.id;
            const author =
              employeeName(employees, item.requestedByEmployeeId) ||
              t("crm.clientRequests.requester");
            return (
              <li
                key={item.id}
                className="overflow-hidden rounded-2xl border border-border/70 bg-card"
              >
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-3 text-start"
                  onClick={() => {
                    setReplyText("");
                    setReplyFor((current) =>
                      current === item.id ? null : item.id
                    );
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                        {t(`crm.clientRequests.kinds.${item.kind}`)}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                          item.status === "open"
                            ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                            : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                        )}
                      >
                        {t(`crm.clientRequests.status.${item.status}`)}
                      </span>
                    </div>
                    {variant === "inbox" ? (
                      <p className="mt-1.5 truncate text-[14px] font-semibold">
                        <BidiText text={item.leadName} />
                      </p>
                    ) : null}
                    <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                      <BidiText text={item.message} />
                    </p>
                  </div>
                  <time className="shrink-0 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </time>
                </button>

                {open ? (
                  <div className="space-y-2.5 border-t border-border/60 px-3 py-3">
                    <p className="text-[11px] text-muted-foreground">{author}</p>
                    <p className="whitespace-pre-wrap text-[14px] leading-relaxed">
                      <BidiText text={item.message} />
                    </p>
                    {item.kind === "technical_proposal" ? (
                      <TechnicalProposalEditor
                        requestId={item.id}
                        leadName={item.leadName}
                        initial={item.proposal ?? null}
                        canEdit={canReply && !readOnly}
                        onSaved={(saved) =>
                          setItems((prev) =>
                            prev.map((row) =>
                              row.id === saved.id ? saved : row
                            )
                          )
                        }
                      />
                    ) : null}
                    {item.kind === "price_exception" &&
                    (item.listedPrice || item.requestedPrice) ? (
                      <dl className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-muted/50 px-2.5 py-2">
                          <dt className="text-[11px] text-muted-foreground">
                            {t("crm.clientRequests.listedPrice")}
                          </dt>
                          <dd className="mt-0.5 text-[13px] font-semibold">
                            {item.listedPrice || "—"}
                          </dd>
                        </div>
                        <div className="rounded-xl bg-muted/50 px-2.5 py-2">
                          <dt className="text-[11px] text-muted-foreground">
                            {t("crm.clientRequests.requestedPrice")}
                          </dt>
                          <dd className="mt-0.5 text-[13px] font-semibold">
                            {item.requestedPrice || "—"}
                          </dd>
                        </div>
                      </dl>
                    ) : null}

                    <ul className="space-y-2">
                      {(item.replies ?? []).map((reply) => (
                        <li
                          key={reply.id}
                          className={cn(
                            "rounded-xl px-3 py-2.5",
                            reply.fromManagement
                              ? "border border-primary/20 bg-primary/[0.06]"
                              : "bg-muted/45"
                          )}
                        >
                          <p className="text-[11px] font-semibold">
                            {reply.fromManagement
                              ? t("crm.clientRequests.management")
                              : employeeName(employees, reply.authorEmployeeId) ||
                                (reply.authorEmployeeId === myEmployeeId
                                  ? t("crm.clientRequests.you")
                                  : t("crm.clientRequests.requester"))}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed">
                            <BidiText text={reply.body} />
                          </p>
                        </li>
                      ))}
                    </ul>

                    {variant === "inbox" && onOpenLead ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 w-full"
                        onClick={() => onOpenLead(item.leadId)}
                      >
                        {t("crm.clientRequests.openLead")}
                      </Button>
                    ) : null}

                    {!readOnly ? (
                      <div className="space-y-2">
                        <Textarea
                          value={replyFor === item.id ? replyText : ""}
                          onChange={(event) => {
                            setReplyFor(item.id);
                            setReplyText(event.target.value);
                          }}
                          placeholder={
                            canReply
                              ? t("crm.clientRequests.replyPlaceholder")
                              : t("crm.clientRequests.followUpPlaceholder")
                          }
                          className="min-h-20 text-[14px]"
                        />
                        <Button
                          type="button"
                          className="h-11 w-full"
                          disabled={replying || replyFor !== item.id}
                          onClick={() => void submitReply(item.id)}
                        >
                          {replying && replyFor === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          {canReply
                            ? t("crm.clientRequests.sendReply")
                            : t("crm.clientRequests.sendFollowUp")}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
