import { ar } from "@/i18n/locales/ar";
import { en, type TranslationKeys } from "@/i18n/locales/en";

export type Locale = "en" | "ar";

export const locales: Locale[] = ["en", "ar"];

export const dictionaries: Record<Locale, TranslationKeys> = {
  en,
  ar,
};

export function getDictionary(locale: Locale): TranslationKeys {
  return dictionaries[locale] ?? en;
}

export function getDir(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

type Primitive = string | number | boolean | null | undefined;

type NestedKeyOf<T> = T extends Primitive
  ? never
  : {
      [K in keyof T & string]: T[K] extends Primitive
        ? K
        : `${K}` | `${K}.${NestedKeyOf<T[K]>}`;
    }[keyof T & string];

export type TranslationPath = NestedKeyOf<TranslationKeys>;

export function translate(
  dict: TranslationKeys,
  path: TranslationPath,
  vars?: Record<string, string | number>
): string {
  const parts = path.split(".");
  let current: unknown = dict;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return path;
    }
  }

  if (typeof current !== "string") return path;

  if (!vars) return current;

  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    current
  );
}

export type { TranslationKeys };
