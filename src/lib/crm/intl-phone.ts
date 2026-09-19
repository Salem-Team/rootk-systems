import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export const DEFAULT_PHONE_COUNTRY: CountryCode = "EG";

const PINNED: CountryCode[] = [
  "EG",
  "SA",
  "AE",
  "KW",
  "QA",
  "BH",
  "OM",
  "JO",
  "LB",
  "IQ",
  "US",
  "GB",
  "DE",
  "FR",
  "TR",
];

export type PhoneCountryOption = {
  iso: CountryCode;
  name: string;
  calling: string;
  flag: string;
};

export function countryFlag(iso: string): string {
  const code = iso.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return [...code]
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export function asCountry(value: string | null | undefined): CountryCode {
  const iso = (value || DEFAULT_PHONE_COUNTRY).toUpperCase();
  if (getCountries().includes(iso as CountryCode)) return iso as CountryCode;
  return DEFAULT_PHONE_COUNTRY;
}

export function nationalDigits(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+/, "").slice(0, 15);
}

/** Split a stored phone into country + national digits for the picker. */
export function splitStoredPhone(
  phone: string,
  phoneNormalized?: string | null
): { country: CountryCode; national: string } {
  const source = (phoneNormalized || phone || "").trim();
  if (!source) return { country: DEFAULT_PHONE_COUNTRY, national: "" };

  const direct = source.startsWith("+")
    ? parsePhoneNumberFromString(source)
    : parsePhoneNumberFromString(source, DEFAULT_PHONE_COUNTRY);
  if (direct?.country && direct.nationalNumber) {
    return {
      country: direct.country,
      national: String(direct.nationalNumber),
    };
  }
  return {
    country: DEFAULT_PHONE_COUNTRY,
    national: nationalDigits(source),
  };
}

/** E.164 when complete, otherwise `+callingCode` + digits so validation can reject it. */
export function phoneFormValue(country: string, national: string): string {
  const iso = asCountry(country);
  const digits = nationalDigits(national);
  if (!digits) return "";
  const parsed = parsePhoneNumberFromString(digits, iso);
  if (parsed?.isValid()) return parsed.number;
  return `+${getCountryCallingCode(iso)}${digits}`;
}

export function listPhoneCountries(
  locale: string,
  query: string
): PhoneCountryOption[] {
  const names = new Intl.DisplayNames([locale === "ar" ? "ar" : "en", "en"], {
    type: "region",
  });
  const q = query.trim().toLowerCase().replace(/^\+/, "");
  const rows: PhoneCountryOption[] = [];
  for (const iso of getCountries()) {
    let calling = "";
    try {
      calling = getCountryCallingCode(iso);
    } catch {
      continue;
    }
    const name = names.of(iso) || iso;
    if (
      q &&
      !name.toLowerCase().includes(q) &&
      !iso.toLowerCase().includes(q) &&
      !calling.includes(q)
    ) {
      continue;
    }
    rows.push({ iso, name, calling, flag: countryFlag(iso) });
  }

  rows.sort((a, b) => {
    if (!q) {
      const ap = PINNED.indexOf(a.iso);
      const bp = PINNED.indexOf(b.iso);
      if (ap !== -1 || bp !== -1) {
        if (ap === -1) return 1;
        if (bp === -1) return -1;
        return ap - bp;
      }
    }
    return a.name.localeCompare(b.name, locale === "ar" ? "ar" : "en");
  });
  return rows;
}
