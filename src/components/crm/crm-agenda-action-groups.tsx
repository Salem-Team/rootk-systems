"use client";

import { format } from "date-fns";
import {
  CalendarClock,
  ChevronRight,
  FileText,
  Mail,
  MessageCircle,
  PhoneCall,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { BidiText } from "@/components/shared/bidi-text";
import { useTranslation } from "@/hooks/use-translation";
import { agendaAction, groupLeadsByAction } from "@/lib/crm/day-agenda";
import { parseMaybe } from "@/lib/crm/date-range";
import { dateFnsLocale, TIME_12H } from "@/lib/format-time";
import { cn } from "@/lib/utils";
import type { CrmLead, CrmNextAction } from "@/types/crm";
import type { WorkTask } from "@/types/work";

export const ACTION_TONE: Record<
  CrmNextAction,
  { icon: LucideIcon; chip: string; solid: string; rail: string }
> = {
  call: {
    icon: PhoneCall,
    chip: "bg-sky-500/12 text-sky-800 dark:text-sky-200",
    solid: "border-sky-600 bg-sky-600 text-white",
    rail: "border-s-sky-500",
  },
  meeting: {
    icon: Users,
    chip: "bg-violet-500/12 text-violet-800 dark:text-violet-200",
    solid: "border-violet-600 bg-violet-600 text-white",
    rail: "border-s-violet-500",
  },
  whatsapp: {
    icon: MessageCircle,
    chip: "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200",
    solid: "border-emerald-600 bg-emerald-600 text-white",
    rail: "border-s-emerald-500",
  },
  email: {
    icon: Mail,
    chip: "bg-blue-500/12 text-blue-800 dark:text-blue-200",
    solid: "border-blue-600 bg-blue-600 text-white",
    rail: "border-s-blue-500",
  },
  send_proposal: {
    icon: FileText,
    chip: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
    solid: "border-amber-600 bg-amber-600 text-white",
    rail: "border-s-amber-500",
  },
  follow_up: {
    icon: CalendarClock,
    chip: "bg-primary/10 text-primary",
    solid: "border-primary bg-primary text-primary-foreground",
    rail: "border-s-primary",
  },
  none: {
    icon: CalendarClock,
    chip: "bg-muted text-muted-foreground",
    solid: "border-foreground bg-foreground text-background",
    rail: "border-s-border",
  },
};

export function ActionGroups({
  leads,
  locale,
  ownerName,
  onOpenLead,
  late = false,
  showHeaders = true,
}: {
  leads: CrmLead[];
  locale: string;
  ownerName: (id: string | null | undefined) => string | undefined;
  onOpenLead: (leadId: string) => void;
  late?: boolean;
  showHeaders?: boolean;
}) {
  const { t } = useTranslation();
  const groups = groupLeadsByAction(leads);
  if (groups.length === 0) return null;
  return (
    <div className="grid gap-2.5 sm:gap-3">
      {groups.map((group) => {
        const tone = ACTION_TONE[group.action];
        const Icon = tone.icon;
        return (
          <section
            key={group.action}
            className={cn(
              "min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card",
              showHeaders && "border-s-[3px]",
              showHeaders && (late ? "border-s-amber-500" : tone.rail)
            )}
          >
            {showHeaders ? (
              <div className="flex min-h-11 items-center gap-2 border-b border-border/60 px-3 py-2">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", tone.chip)}>
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="min-w-0 truncate text-[13px] font-semibold sm:text-sm">
                  {t(`crm.nextAction.${group.action}`)}
                </p>
                <span className="ms-auto rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {group.leads.length}
                </span>
              </div>
            ) : null}
            <ul className="divide-y divide-border/60">
              {group.leads.map((lead) => (
                <FollowUpRow
                  key={lead.id}
                  lead={lead}
                  locale={locale}
                  owner={ownerName(lead.ownerEmployeeId)}
                  onOpen={() => onOpenLead(lead.id)}
                  late={late}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function FilterChip({
  active,
  count,
  onClick,
  activeClassName,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  activeClassName?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-11 shrink-0 snap-start touch-manipulation items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors",
        active
          ? (activeClassName ?? "border-primary bg-primary text-primary-foreground")
          : "border-border/70 bg-card text-foreground active:bg-muted/60 sm:hover:bg-muted/50"
      )}
    >
      {children}
      <span
        className={cn(
          "min-w-[1.1rem] rounded-full px-1.5 py-0.5 text-center font-mono text-[11px] tabular-nums",
          active ? "bg-white/20" : "bg-muted text-muted-foreground"
        )}
      >
        {count}
      </span>
    </button>
  );
}

function FollowUpRow({
  lead,
  locale,
  owner,
  onOpen,
  late = false,
}: {
  lead: CrmLead;
  locale: string;
  owner?: string;
  onOpen: () => void;
  late?: boolean;
}) {
  const action = agendaAction(lead);
  const tone = ACTION_TONE[action];
  const Icon = tone.icon;
  const due = parseMaybe(lead.nextFollowUpAt);
  const time = due ? format(due, TIME_12H, { locale: dateFnsLocale(locale) }) : "—";
  const company = lead.companyName?.trim();
  const phone = lead.phone?.trim();
  const showPhone = (action === "call" || action === "whatsapp") && Boolean(phone);
  const meta = [company, owner].filter(Boolean).join(" · ");
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-[3.5rem] w-full items-center gap-2.5 px-3 py-2.5 text-start transition-colors active:bg-muted/60 sm:hover:bg-muted/40"
      >
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone.chip)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-snug">
            <BidiText text={lead.name} />
          </span>
          {showPhone || meta ? (
            <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[12px] leading-snug text-muted-foreground">
              {showPhone ? (
                <bdi dir="ltr" className="shrink-0 font-mono text-[11px] tabular-nums">
                  {phone}
                </bdi>
              ) : null}
              {showPhone && meta ? <span aria-hidden>·</span> : null}
              {meta ? (
                <span className="min-w-0 truncate">
                  <BidiText text={meta} />
                </span>
              ) : null}
            </span>
          ) : null}
        </span>
        <span
          dir="ltr"
          className={cn(
            "shrink-0 whitespace-nowrap text-end font-mono text-[12px] font-semibold leading-tight tabular-nums",
            late ? "text-amber-700 dark:text-amber-300" : "text-foreground"
          )}
        >
          {time}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70 rtl:rotate-180" aria-hidden />
      </button>
    </li>
  );
}

export function TaskRow({ task, label }: { task: WorkTask; label: string }) {
  return (
    <div>
      <Link
        href="/tasks"
        className="flex min-h-[3.5rem] items-center gap-2.5 rounded-xl border border-border/70 bg-card px-3 py-2.5 transition-colors active:bg-muted/60 sm:hover:bg-muted/40"
      >
        <span
          className={cn(
            "h-2.5 w-2.5 shrink-0 rounded-full",
            task.priority === "high" && "bg-rose-500",
            task.priority === "medium" && "bg-amber-500",
            task.priority === "low" && "bg-sky-500",
            task.status === "completed" && "bg-emerald-500"
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-sm font-semibold leading-snug",
                task.status === "completed" && "text-muted-foreground line-through"
              )}
            >
            <BidiText text={task.title} />
          </span>
          <span className="mt-0.5 block text-[12px] text-muted-foreground">{label}</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70 rtl:rotate-180" aria-hidden />
      </Link>
    </div>
  );
}
