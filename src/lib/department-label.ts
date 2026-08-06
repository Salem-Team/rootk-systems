import { DEPARTMENTS } from "@/constants";
import type { TranslationPath } from "@/i18n";

type TranslateFn = (
  path: TranslationPath,
  vars?: Record<string, string | number>
) => string;

/** Resolve a department display name (i18n for seeded names, raw otherwise). */
export function departmentLabel(department: string, t: TranslateFn): string {
  if ((DEPARTMENTS as readonly string[]).includes(department)) {
    return t(`departments.${department}` as TranslationPath);
  }
  return department;
}
