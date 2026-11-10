"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import { CLIENT_REQUEST_OPEN_EVENT } from "@/lib/events";
import { buildManagementTemplate } from "@/lib/crm/management-request-templates";
import { isProtectedAdminAccount } from "@/lib/protected-accounts";
import { readQuotationPrices } from "@/lib/crm/quotation-prices";
import { templateDraftIssue } from "@/lib/crm/technical-proposal";
import { cn } from "@/lib/utils";
import {
  createCrmClientRequest,
  listCrmClientRequests,
  replyCrmClientRequest,
  saveCrmTechnicalProposal,
} from "@/services/crm/crm-client-requests.service";
import { logCrmQuotationExport } from "@/services/crm.service";
import { useSessionStore } from "@/stores/session-store";
import type { Employee } from "@/types";
import type {
  CrmClientRequest,
  CrmClientRequestKind,
  CrmClientRequestStatus,
  TechnicalProposalDocument,
} from "@/types/crm";

function isSalesLetter(kind: CrmClientRequestKind): boolean {
  return (
    kind === "technical_proposal" ||
    kind === "contract" ||
    kind === "price_exception"
  );
}

function salesHintKey(kind: CrmClientRequestKind) {
  if (kind === "contract") return "crm.clientRequests.proposal.salesHintContract";
  if (kind === "price_exception") {
    return "crm.clientRequests.proposal.salesHintQuotation";
  }
  return "crm.clientRequests.proposal.salesHint";
}

function composeTitleKey(kind: CrmClientRequestKind) {
  if (kind === "contract") return "crm.clientRequests.proposal.composeTitleContract";
  if (kind === "price_exception") {
    return "crm.clientRequests.proposal.composeTitleQuotation";
  }
  return "crm.clientRequests.proposal.composeTitle";
}

function letterMessage(
  kind: CrmClientRequestKind,
  document: TechnicalProposalDocument
): string {
  return (
    document.intro.trim() ||
    document.title.trim() ||
    (kind === "contract"
      ? "عقد"
      : kind === "price_exception"
        ? "كوتشين"
        : "الملحق الفني")
  );
}

function savedToastKey(kind: CrmClientRequestKind) {
  if (kind === "contract") return "crm.clientRequests.proposal.savedContract";
  if (kind === "price_exception") {
    return "crm.clientRequests.proposal.savedQuotation";
  }
  return "crm.clientRequests.proposal.saved";
}

function letterDraft(
  kind: CrmClientRequestKind,
  leadName: string
): TechnicalProposalDocument {
  return buildManagementTemplate({
    kind,
    leadName: leadName.trim() || "العميل",
    message: "",
  });
}

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
  leadName = "",
  variant,
  readOnly = false,
  employees = [],
  onOpenLead,
  hideIntro = false,
}: {
  leadId?: string;
  leadName?: string;
  variant: "lead" | "inbox";
  readOnly?: boolean;
  employees?: Employee[];
  onOpenLead?: (leadId: string) => void;
  hideIntro?: boolean;
}) {
  const { t, locale } = useTranslation();
  const [focusedId, setFocusedId] = useState("");
  const capturedRequestUrl = useRef(false);
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
  const [sending, setSending] = useState(false);
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [replying, setReplying] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, TechnicalProposalDocument>>(
    {}
  );
  const [composeByKind, setComposeByKind] = useState<
    Partial<Record<CrmClientRequestKind, TechnicalProposalDocument>>
  >({});
  const [savingAnnexId, setSavingAnnexId] = useState<string | null>(null);

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

  const revealRequest = useCallback(
    (requestId: string) => {
      if (!requestId) return;
      const match = items.find((item) => item.id === requestId);
      if (!match) {
        if (variant === "inbox" && status !== "all") setStatus("all");
        return;
      }
      setReplyFor(match.id);
      window.setTimeout(() => {
        document.getElementById(`client-request-${match.id}`)?.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      }, 60);
    },
    [items, status, variant]
  );

  useEffect(() => {
    if (loading || capturedRequestUrl.current) return;
    capturedRequestUrl.current = true;
    const id = new URLSearchParams(window.location.search).get("request")?.trim();
    if (id) setFocusedId(id);
  }, [loading]);

  useEffect(() => {
    if (!focusedId || loading) return;
    revealRequest(focusedId);
  }, [focusedId, loading, revealRequest]);

  useEffect(() => {
    function onOpen(event: Event) {
      const id = (event as CustomEvent<string>).detail?.trim();
      if (!id) return;
      setFocusedId(id);
      revealRequest(id);
    }
    window.addEventListener(CLIENT_REQUEST_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CLIENT_REQUEST_OPEN_EVENT, onOpen);
  }, [revealRequest]);

  const visible = useMemo(() => {
    if (variant === "lead" || status === "all") return items;
    return items.filter((item) => item.status === status);
  }, [items, status, variant]);

  function annexIssue(document: TechnicalProposalDocument): boolean {
    const issue = templateDraftIssue(document);
    if (!issue) return false;
    toast.error(
      issue === "title"
        ? t("crm.clientRequests.proposal.invalid.title")
        : t("crm.clientRequests.proposal.invalid.section")
    );
    return true;
  }

  function recordQuotationExport(targetLeadId: string | undefined, reference?: string) {
    const id = (targetLeadId || leadId || "").trim();
    if (!id) return;
    void logCrmQuotationExport(id, { reference }).then((res) => {
      if (!res.success) toast.error(res.message || t("common.error"));
    });
  }

  function clientReference(): string {
    for (const item of items) {
      if (
        item.kind !== "technical_proposal" &&
        item.kind !== "contract"
      ) {
        continue;
      }
      const reference = item.proposal?.reference?.trim();
      if (reference) return reference;
    }
    return "";
  }

  function composeDocument(): TechnicalProposalDocument {
    const draft = composeByKind[kind] ?? letterDraft(kind, leadName);
    if (kind === "price_exception") return draft;
    const reference = draft.reference?.trim() || clientReference();
    if (!reference || draft.reference === reference) return draft;
    return { ...draft, reference };
  }

  async function submitRequest() {
    if (!leadId) return;
    const document = composeDocument();
    const text = letterMessage(kind, document);
    if (annexIssue(document)) return;
    const prices =
      kind === "price_exception" ? readQuotationPrices(document) : null;
    setSending(true);
    const res = await createCrmClientRequest(leadId, {
      kind,
      message: text,
      listedPrice: prices?.listed ?? "",
      requestedPrice: prices?.requested ?? "",
      document,
    });
    setSending(false);
    if (!res.success || !res.data) {
      toast.error(res.message || t("common.error"));
      return;
    }
    setComposeByKind((prev) => {
      const next = { ...prev };
      delete next[kind];
      return next;
    });
    setItems((prev) => [res.data!, ...prev.filter((row) => row.id !== res.data!.id)]);
    toast.success(t(savedToastKey(kind)));
  }

  async function saveAnnex(item: CrmClientRequest) {
    const document = ensureDraft(item);
    if (annexIssue(document)) return;
    setSavingAnnexId(item.id);
    const res = await saveCrmTechnicalProposal(item.id, document);
    setSavingAnnexId(null);
    if (!res.success || !res.data) {
      toast.error(res.message || t("common.error"));
      return;
    }
    setDrafts((prev) => ({ ...prev, [item.id]: res.data!.proposal ?? document }));
    setItems((prev) =>
      prev.map((row) => (row.id === res.data!.id ? res.data! : row))
    );
    toast.success(t(savedToastKey(item.kind)));
  }

  function ensureDraft(item: CrmClientRequest): TechnicalProposalDocument {
    const existing = drafts[item.id];
    if (existing) return existing;
    const next = item.proposal ?? buildManagementTemplate(item);
    setDrafts((prev) => (prev[item.id] ? prev : { ...prev, [item.id]: next }));
    return next;
  }

  function commentValue(item: CrmClientRequest): string {
    if (comments[item.id] != null) return comments[item.id];
    const hasManagementReply = (item.replies ?? []).some(
      (reply) => reply.fromManagement
    );
    return canReply && !hasManagementReply
      ? t(`crm.clientRequests.defaultComments.${item.kind}`)
      : "";
  }

  function activateReply(item: CrmClientRequest) {
    ensureDraft(item);
    setReplyFor(item.id);
    setComments((prev) =>
      prev[item.id] != null ? prev : { ...prev, [item.id]: commentValue(item) }
    );
  }

  async function submitReply(item: CrmClientRequest) {
    const text = commentValue(item).trim();
    if (text.length < 2) {
      toast.error(t("crm.clientRequests.replyValidation"));
      return;
    }
    const document = canReply ? ensureDraft(item) : undefined;
    if (document) {
      const issue = templateDraftIssue(document);
      if (issue) {
        toast.error(
          issue === "title"
            ? t("crm.clientRequests.proposal.invalid.title")
            : t("crm.clientRequests.proposal.invalid.section")
        );
        return;
      }
    }
    setReplyFor(item.id);
    setReplying(true);
    const res = await replyCrmClientRequest(item.id, text, document);
    setReplying(false);
    if (!res.success || !res.data) {
      toast.error(res.message || t("common.error"));
      return;
    }
    if (res.data.proposal) {
      setDrafts((prev) => ({ ...prev, [item.id]: res.data!.proposal! }));
    }
    setComments((prev) => ({ ...prev, [item.id]: "" }));
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
          <h3 className="text-[13px] font-semibold">{t(composeTitleKey(kind))}</h3>
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
          <div className="mt-3">
            <TechnicalProposalEditor
              kind={kind}
              leadName={leadName || composeDocument().subtitle}
              doc={composeDocument()}
              saved={null}
              canEdit
              hint={t(salesHintKey(kind))}
              saving={sending}
              onSave={() => void submitRequest()}
              onChange={(next) =>
                setComposeByKind((prev) => ({ ...prev, [kind]: next }))
              }
              onExported={(doc) => recordQuotationExport(leadId, doc.reference)}
            />
          </div>
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
            const salesAnnex =
              variant === "lead" &&
              isSalesLetter(item.kind) &&
              !readOnly &&
              !canReply;
            const canEditAnnex = (canReply || salesAnnex) && !readOnly;
            const author =
              employeeName(employees, item.requestedByEmployeeId) ||
              t("crm.clientRequests.requester");
            return (
              <li
                key={item.id}
                id={`client-request-${item.id}`}
                className={cn(
                  "overflow-hidden rounded-2xl border border-border/70 bg-card scroll-mt-24",
                  focusedId === item.id && "border-primary/50 ring-2 ring-primary/25"
                )}
              >
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-3 text-start"
                  onClick={() => {
                    if (replyFor === item.id && variant !== "lead") {
                      setReplyFor(null);
                      return;
                    }
                    activateReply(item);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                        {t(`crm.clientRequests.kinds.${item.kind}`)}
                      </span>
                      {item.proposal?.reference ? (
                        <span
                          dir="ltr"
                          className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary"
                        >
                          {item.proposal.reference}
                        </span>
                      ) : null}
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
                    <TechnicalProposalEditor
                      kind={item.kind}
                      leadName={item.leadName}
                      doc={(() => {
                        if (!canEditAnnex) return null;
                        const draft =
                          drafts[item.id] ??
                          item.proposal ??
                          buildManagementTemplate(item);
                        const reference = item.proposal?.reference?.trim();
                        if (!reference || draft.reference) return draft;
                        return { ...draft, reference };
                      })()}
                      saved={item.proposal ?? null}
                      canEdit={canEditAnnex}
                      hint={salesAnnex ? t(salesHintKey(item.kind)) : undefined}
                      saving={savingAnnexId === item.id}
                      onSave={
                        salesAnnex ? () => void saveAnnex(item) : undefined
                      }
                      onChange={(next) =>
                        setDrafts((prev) => ({ ...prev, [item.id]: next }))
                      }
                      onExported={(doc) =>
                        recordQuotationExport(item.leadId, doc.reference)
                      }
                    />
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
                        {canReply ? (
                          <p className="text-[12px] font-semibold">
                            {t("crm.clientRequests.commentLabel")}
                          </p>
                        ) : null}
                        <Textarea
                          value={commentValue(item)}
                          onFocus={() => activateReply(item)}
                          onChange={(event) => {
                            setReplyFor(item.id);
                            setComments((prev) => ({
                              ...prev,
                              [item.id]: event.target.value,
                            }));
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
                          disabled={replying}
                          onClick={() => void submitReply(item)}
                        >
                          {replying && replyFor === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          {canReply
                            ? t("crm.clientRequests.sendTemplate")
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
