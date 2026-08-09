import { formatEgp } from "@/lib/payroll";
import type { TranslationPath } from "@/i18n";
import { cn } from "@/lib/utils";
import type { PayslipLine } from "@/types/payroll";

const LINE_CODE_KEYS: Record<string, TranslationPath> = {
  BASIC: "payroll.line.BASIC",
  HOUSING: "payroll.line.HOUSING",
  TRANS: "payroll.line.TRANS",
  MEAL: "payroll.line.MEAL",
  PHONE: "payroll.line.PHONE",
  OTHER: "payroll.line.OTHER",
  SHIFT: "payroll.line.SHIFT",
  BONUS: "payroll.line.BONUS",
  COMM: "payroll.line.COMM",
  INC: "payroll.line.INC",
  ADJ: "payroll.line.ADJ",
  OT: "payroll.line.OT",
  ATT: "payroll.line.ATT",
  LEAVE: "payroll.line.LEAVE",
  INS: "payroll.line.INS",
  TAX: "payroll.line.TAX",
  LOAN: "payroll.line.LOAN",
  ADV: "payroll.line.ADV",
  REC: "payroll.line.REC",
  PEN: "payroll.line.PEN",
};

export function lineLabel(
  line: PayslipLine,
  t: (path: TranslationPath) => string
): string {
  const key = LINE_CODE_KEYS[line.code.toUpperCase()];
  if (!key) return line.label;
  const translated = t(key);
  return translated === key ? line.label : translated;
}

export function StatementColumn({
  title,
  totalLabel,
  total,
  lines,
  locale,
  currency,
  resolveLabel,
  tone,
  absolute,
}: {
  title: string;
  totalLabel: string;
  total: number;
  lines: PayslipLine[];
  locale: string;
  currency: string;
  resolveLabel: (line: PayslipLine) => string;
  tone: "earn" | "deduct";
  absolute?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-border/50 px-4 py-3 sm:px-5 sm:py-4",
        tone === "deduct" ? "sm:border-s" : "border-b sm:border-b-0"
      )}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {lines.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-1.5">
          {lines.map((line) => (
            <li
              key={line.id}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate text-foreground/90">
                {resolveLabel(line)}
              </span>
              <span
                className={cn(
                  "shrink-0 tabular-nums font-medium",
                  tone === "deduct"
                    ? "text-rose-700 dark:text-rose-300"
                    : "text-foreground"
                )}
              >
                {formatEgp(
                  absolute ? Math.abs(line.amount) : line.amount,
                  locale,
                  currency
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2 text-sm font-semibold">
        <span>{totalLabel}</span>
        <span className="tabular-nums">
          {formatEgp(total, locale, currency)}
        </span>
      </div>
    </div>
  );
}
