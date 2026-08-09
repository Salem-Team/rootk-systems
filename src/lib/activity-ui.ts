import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BriefcaseBusiness,
  CheckCircle2,
  Clock,
  FileCheck,
  FileX,
  LogIn,
  LogOut,
  Megaphone,
  Target,
} from "lucide-react";

const DEFAULT_TONE = "bg-muted text-muted-foreground";

const TONE = {
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  muted: "bg-secondary text-secondary-foreground",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  danger: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  brand: "bg-primary/10 text-primary",
} as const;

type ActivityVisual = { icon: LucideIcon; tone: string };

/** Visual map for company Activity feed (DB `type` is a free string). */
const ACTIVITY_VISUAL: Record<string, ActivityVisual> = {
  check_in: { icon: LogIn, tone: TONE.success },
  check_out: { icon: LogOut, tone: TONE.muted },
  leave_request: { icon: FileCheck, tone: TONE.warning },
  leave_approved: { icon: CheckCircle2, tone: TONE.success },
  leave_rejected: { icon: FileX, tone: TONE.danger },
  announcement: { icon: Megaphone, tone: TONE.info },
  late: { icon: Clock, tone: TONE.warning },
  organic_ad: { icon: Target, tone: TONE.brand },
  crm_stage_created: { icon: BriefcaseBusiness, tone: TONE.brand },
  crm_stage_updated: { icon: BriefcaseBusiness, tone: TONE.brand },
  crm_stage_deleted: { icon: BriefcaseBusiness, tone: TONE.danger },
  crm_lead_created: { icon: BriefcaseBusiness, tone: TONE.success },
  crm_stage_changed: { icon: BriefcaseBusiness, tone: TONE.info },
  crm_lead_assigned: { icon: BriefcaseBusiness, tone: TONE.info },
  crm_lead_updated: { icon: BriefcaseBusiness, tone: TONE.muted },
  crm_lead_deleted: { icon: BriefcaseBusiness, tone: TONE.danger },
  crm_activity_added: { icon: BriefcaseBusiness, tone: TONE.brand },
  crm_feedback_added: { icon: BriefcaseBusiness, tone: TONE.warning },
};

const FALLBACK: ActivityVisual = { icon: Activity, tone: DEFAULT_TONE };

/** Resolve icon + tone for any activity type string from API/DB. */
export function resolveActivityVisual(type: string | undefined | null): ActivityVisual {
  if (!type) return FALLBACK;
  return ACTIVITY_VISUAL[type] ?? FALLBACK;
}
