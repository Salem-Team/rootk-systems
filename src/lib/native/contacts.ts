import { canonicalPhoneOrNull } from "@/lib/phone-normalize";
import { isNativeApp } from "@/lib/native/platform";

export type PickedPhoneContact = {
  name: string;
  phone: string;
  phoneNormalized: string | null;
};

type NativeContact = {
  name?: { display?: string | null; given?: string | null; family?: string | null };
  phones?: Array<{ number?: string | null } | string | null>;
};

/**
 * Native Contact Picker only — never enumerates or uploads the address book.
 * iOS CNContactPicker / Android ACTION_PICK do not require full-book permission.
 */
export async function pickPhoneContact(): Promise<
  | { ok: true; contact: PickedPhoneContact }
  | { ok: false; reason: "cancelled" | "unavailable" | "no_phone" | "denied" }
> {
  if (!isNativeApp()) return { ok: false, reason: "unavailable" };
  try {
    const mod = await import("@capacitor-community/contacts");
    const picker = mod.Contacts;
    if (!picker?.pickContact) return { ok: false, reason: "unavailable" };
    const result = await picker.pickContact({
      projection: { name: true, phones: true },
    });
    const row = result.contact as NativeContact | undefined;
    if (!row) return { ok: false, reason: "cancelled" };
    const name =
      row.name?.display?.trim() ||
      [row.name?.given, row.name?.family].filter(Boolean).join(" ").trim() ||
      "";
    const firstPhone = (row.phones ?? [])
      .map((p) => (typeof p === "string" ? p : p?.number ?? ""))
      .map((p) => p.trim())
      .find(Boolean);
    if (!firstPhone) return { ok: false, reason: "no_phone" };
    return {
      ok: true,
      contact: {
        name,
        phone: firstPhone,
        phoneNormalized: canonicalPhoneOrNull(firstPhone),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/denied|permission/i.test(message)) return { ok: false, reason: "denied" };
    if (/cancel/i.test(message)) return { ok: false, reason: "cancelled" };
    return { ok: false, reason: "unavailable" };
  }
}
