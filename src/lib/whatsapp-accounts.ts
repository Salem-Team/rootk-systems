export {
  MAX_WHATSAPP_ACCOUNTS,
  WHATSAPP_ACCOUNTS_KEY,
  accountsOnCompany,
  accountsOnEmployee,
  normalizeWhatsappClientApp,
  parseWhatsappAccountsInput,
  readWhatsappAccounts,
  withWhatsappAccounts,
} from "../../shared/whatsapp-accounts";
export type {
  WhatsappAccount,
  WhatsappAccountsParse,
  WhatsappClientApp,
} from "../../shared/whatsapp-accounts";

import {
  formatEgyptianNationalDisplay,
  formatPhoneInternational,
} from "@/lib/phone-normalize";

export function displayWhatsappPhone(phone: string): string {
  return (
    formatEgyptianNationalDisplay(phone) ??
    formatPhoneInternational(phone) ??
    phone
  );
}
