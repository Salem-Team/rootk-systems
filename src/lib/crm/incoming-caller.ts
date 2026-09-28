/** Phone tails used to match a ringing number to a CRM client. */

export type IncomingCallerLead = {
  id: string;
  name: string;
  phone: string;
  phoneNormalized?: string | null;
  companyName?: string | null;
  request?: string | null;
  budget?: string | null;
  contacts?: Array<{ phone?: string | null; phoneNormalized?: string | null }>;
};

export type IncomingCallerLabels = {
  rtl: boolean;
  title: string;
  request: string;
  budget: string;
  empty: string;
  open: string;
  hide: string;
};

export type IncomingCallerCard = {
  id: string;
  name: string;
  phone: string;
  company: string;
  request: string;
  budget: string;
};

export type IncomingCallerIndex = {
  rtl: boolean;
  labels: {
    title: string;
    request: string;
    budget: string;
    empty: string;
    open: string;
    hide: string;
  };
  byTail: Record<string, IncomingCallerCard>;
};

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Longest key first. Last-9 matches Egyptian mobiles with or without 20 / 0020.
 * Last-10 is an extra key for the same number written a different way.
 */
export function incomingPhoneKeys(raw: string | null | undefined): string[] {
  const digits = digitsOnly(raw ?? "");
  if (digits.length < 7) return [];
  const keys: string[] = [];
  const push = (key: string) => {
    if (key.length >= 7 && !keys.includes(key)) keys.push(key);
  };
  if (digits.length >= 10) push(digits.slice(-10));
  if (digits.length >= 9) push(digits.slice(-9));
  if (digits.length < 9) push(digits);
  return keys;
}

function clip(value: string, max = 180): string {
  const text = value.trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function buildIncomingCallerIndex(
  leads: IncomingCallerLead[],
  labels: IncomingCallerLabels,
  displayPhone: (phone: string, normalized?: string | null) => string
): IncomingCallerIndex {
  const byTail: Record<string, IncomingCallerCard> = {};
  for (const lead of leads) {
    const card: IncomingCallerCard = {
      id: lead.id,
      name: lead.name.trim(),
      phone: displayPhone(lead.phone, lead.phoneNormalized),
      company: (lead.companyName ?? "").trim(),
      request: clip(lead.request ?? "") || labels.empty,
      budget: clip(lead.budget ?? "") || labels.empty,
    };
    const values = [
      lead.phone,
      lead.phoneNormalized,
      ...(lead.contacts ?? []).flatMap((contact) => [
        contact.phone,
        contact.phoneNormalized,
      ]),
    ];
    for (const value of values) {
      for (const key of incomingPhoneKeys(value)) {
        if (!byTail[key]) byTail[key] = card;
      }
    }
  }
  return {
    rtl: labels.rtl,
    labels: {
      title: labels.title,
      request: labels.request,
      budget: labels.budget,
      empty: labels.empty,
      open: labels.open,
      hide: labels.hide,
    },
    byTail,
  };
}

export function matchIncomingCaller(
  index: IncomingCallerIndex,
  rawPhone: string
): IncomingCallerCard | null {
  for (const key of incomingPhoneKeys(rawPhone)) {
    const card = index.byTail[key];
    if (card) return card;
  }
  return null;
}
