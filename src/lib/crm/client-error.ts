import type { TranslationPath } from "@/i18n";

/**
 * Map CRM API failures to professional user-facing copy.
 * Never surface Prisma, stack traces, or raw HTTP internals.
 */
export function crmUserFacingMessage(
  res: { message?: string; error?: { code?: string; details?: unknown } },
  t: (path: TranslationPath) => string,
  fallback: TranslationPath
): string {
  const code = res.error?.code;
  const details = res.error?.details;
  const nestCode =
    details && typeof details === "object" && "code" in details
      ? String((details as { code?: unknown }).code ?? "")
      : "";
  const status =
    details && typeof details === "object" && "status" in details
      ? Number((details as { status?: unknown }).status)
      : undefined;
  const raw = res.message ?? "";

  if (code === "UNAUTHORIZED") return t("crm.errors.session");
  if (code === "FORBIDDEN") return t("crm.errors.permission");
  if (code === "NOT_FOUND") return t("crm.errors.notFound");
  if (nestCode === "INVALID_PHONE") return t("crm.phone.invalid");
  if (status === 429 || /too many requests/i.test(raw)) {
    return t("crm.errors.rateLimited");
  }
  if (
    /unable to reach the server|failed to fetch|network request failed|load failed/i.test(
      raw
    )
  ) {
    return t("crm.errors.offline");
  }
  if (
    code === "INTERNAL_ERROR" ||
    /prisma|p20\d{2}|internal server error|invalid `prisma/i.test(raw)
  ) {
    return t("crm.errors.server");
  }
  return t(fallback);
}
