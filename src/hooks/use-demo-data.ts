"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  clearDemoDataset,
  generateDemoDataset,
  resetDemoDataset,
} from "@/services/demo-data.service";
import { useTranslation } from "@/hooks/use-translation";

/**
 * UI → Hook → Service → Storage bootstrap.
 * Components must never touch Local Storage directly.
 */
export function useDemoData() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<"reset" | "generate" | "clear" | null>(null);

  const run = useCallback(
    async (action: "reset" | "generate" | "clear") => {
      setBusy(action);
      try {
        const res =
          action === "reset"
            ? await resetDemoDataset()
            : action === "generate"
              ? await generateDemoDataset()
              : await clearDemoDataset();

        if (!res.success) {
          toast.error(res.message ?? t("common.error"));
          return false;
        }

        toast.success(res.message ?? t("common.success"));
        // Hard reload so Zustand/pages pick up fresh storage state.
        window.setTimeout(() => window.location.reload(), 400);
        return true;
      } catch {
        toast.error(t("common.error"));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [t]
  );

  return {
    busy,
    resetDemoData: () => run("reset"),
    generateSampleData: () => run("generate"),
    clearData: () => run("clear"),
  };
}
