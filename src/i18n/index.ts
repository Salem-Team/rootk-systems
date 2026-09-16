import { ar } from "@/i18n/locales/ar";
import type { TranslationKeys } from "@/i18n/locales/en";

export type Locale = "en" | "ar";

export const locales: Locale[] = ["en", "ar"];

/** Default locale ships in the main bundle; the other loads on demand. */
const dictionaryCache: Partial<Record<Locale, TranslationKeys>> = {
  ar,
};

const loaders: Record<Locale, () => Promise<TranslationKeys>> = {
  ar: async () => ar,
  en: async () => {
    const mod = await import("@/i18n/locales/en");
    return mod.en;
  },
};

const inflight = new Map<Locale, Promise<TranslationKeys>>();

/** Sync lookup — falls back to Arabic until the requested locale is cached. */
export function getDictionary(locale: Locale): TranslationKeys {
  return dictionaryCache[locale] ?? ar;
}

/** Ensure a locale dictionary is loaded (and cached). */
export async function ensureDictionary(
  locale: Locale
): Promise<TranslationKeys> {
  const cached = dictionaryCache[locale];
  if (cached) return cached;

  let pending = inflight.get(locale);
  if (!pending) {
    pending = loaders[locale]().then((dict) => {
      dictionaryCache[locale] = dict;
      inflight.delete(locale);
      return dict;
    });
    inflight.set(locale, pending);
  }
  return pending;
}

/** Preload the inactive locale in the background. */
export function preloadInactiveDictionary(active: Locale): void {
  const other: Locale = active === "ar" ? "en" : "ar";
  void ensureDictionary(other);
}

/** Sync snapshot of cached dictionaries (may omit unloaded locales). */
export function getCachedDictionaries(): Partial<
  Record<Locale, TranslationKeys>
> {
  return { ...dictionaryCache };
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
