import type { CrmLeadSource, CrmLeadStatus, CrmLeadTag, CrmNextAction } from "@/types/crm";

export const SOURCES: CrmLeadSource[] = [
  "facebook",
  "instagram",
  "tiktok",
  "website",
  "whatsapp",
  "referral",
  "organic",
  "advertisement",
  "other",
];

export const STATUSES: CrmLeadStatus[] = ["active", "inactive", "archived"];

export const TAGS: CrmLeadTag[] = [
  "hot",
  "warm",
  "cold",
  "vip",
  "high_budget",
  "follow_up",
  "interested",
];

export const NEXT_ACTIONS: CrmNextAction[] = [
  "call",
  "whatsapp",
  "email",
  "meeting",
  "follow_up",
  "send_proposal",
  "none",
];

export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}
