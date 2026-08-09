"use client";

import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { buildOpsChecklist, buildOpsGoals } from "@/components/operations/operations-mock-data";

export function EmployeeWorkDayPanel({
  checklist,
  setChecklist,
  goals,
}: {
  checklist: ReturnType<typeof buildOpsChecklist>;
  setChecklist: (
    updater: (prev: ReturnType<typeof buildOpsChecklist>) => ReturnType<typeof buildOpsChecklist>
  ) => void;
  goals: ReturnType<typeof buildOpsGoals>;
}) {
  const { t } = useTranslation();
  const checklistDone = checklist.filter((i) => i.done).length;
  const checklistPct = Math.round(
    (checklistDone / Math.max(checklist.length, 1)) * 100
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold">
              {t("ops.checklistTitle")}
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {t("ops.checklistProgress", {
                done: checklistDone,
                total: checklist.length,
              })}
            </p>
          </div>
          <span className="font-mono text-sm font-semibold tabular-nums text-primary">
            {checklistPct}%
          </span>
        </div>
        <Progress value={checklistPct} className="mb-4 h-1.5" />
        <ul className="space-y-2">
          {checklist.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() =>
                  setChecklist((prev) =>
                    prev.map((x) =>
                      x.id === item.id ? { ...x, done: !x.done } : x
                    )
                  )
                }
                className="flex w-full items-center gap-2.5 rounded-xl border border-border/60 px-3 py-2.5 text-start text-sm hover:bg-muted/40"
                aria-pressed={item.done}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    item.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {item.done ? <Check className="h-3 w-3" /> : null}
                </span>
                <span
                  className={cn(item.done && "text-muted-foreground line-through")}
                >
                  {t(item.labelKey)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="mb-4">
          <h2 className="text-[15px] font-semibold">{t("ops.goalsTitle")}</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {t("ops.goalsDesc")}
          </p>
        </div>
        <ul className="space-y-4">
          {goals.map((g) => (
            <li key={g.id}>
              <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{t(g.labelKey)}</span>
                <span className="font-mono text-[12px] tabular-nums text-muted-foreground">
                  {g.progress}%
                </span>
              </div>
              <Progress value={g.progress} className="h-1.5" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
