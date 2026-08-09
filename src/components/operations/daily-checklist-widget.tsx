"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { OpsWidget } from "@/components/operations/ops-widget";
import { buildOpsChecklist } from "@/components/operations/operations-mock-data";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";

export function DailyChecklistWidget() {
  const { t } = useTranslation();
  const [items, setItems] = useState(buildOpsChecklist);
  const done = items.filter((i) => i.done).length;

  return (
    <OpsWidget
      id="checklist"
      title={t("ops.checklistTitle")}
      description={t("ops.checklistProgress", { done, total: items.length })}
    >
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() =>
                setItems((prev) =>
                  prev.map((x) =>
                    x.id === item.id ? { ...x, done: !x.done } : x
                  )
                )
              }
              className="flex w-full items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-start transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-pressed={item.done}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border",
                  item.done
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border"
                )}
                aria-hidden
              >
                {item.done ? <Check className="h-3 w-3" /> : null}
              </span>
              <span
                className={cn(
                  "text-sm",
                  item.done && "text-muted-foreground line-through"
                )}
              >
                {t(item.labelKey)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </OpsWidget>
  );
}
