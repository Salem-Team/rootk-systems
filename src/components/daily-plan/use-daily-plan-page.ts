"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { hasPermissionId } from "@/constants/permissions";
import { useLiveReload } from "@/hooks/use-live-reload";
import { useTickingNow } from "@/hooks/use-ticking-now";
import { useTranslation } from "@/hooks/use-translation";
import { resolveDailyPlanNow } from "@/lib/daily-plan";
import { DAILY_PLAN_UPDATED_EVENT } from "@/lib/events";
import { getDailyPlan, saveDailyPlan } from "@/services/daily-plan.service";
import { useSessionStore } from "@/stores/session-store";
import type { DailyPlan, DailyPlanSlot, DailyPlanSlotInput } from "@/types/daily-plan";

export function useDailyPlanPage() {
  const { t, locale } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const permissions = useSessionStore((s) =>
    s.authenticated ? s.permissions : []
  );
  const canEdit = hasPermissionId(
    "dailyPlan.editCompanyPlan",
    permissions,
    role
  );
  const now = useTickingNow(15_000);

  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<DailyPlanSlot | null>(null);

  const load = useCallback(async () => {
    const res = await getDailyPlan();
    if (res.success) setPlan(res.data);
    setReady(true);
  }, []);

  useLiveReload(load, [DAILY_PLAN_UPDATED_EVENT]);

  const snapshot = useMemo(
    () => resolveDailyPlanNow(plan?.slots ?? [], now),
    [plan, now]
  );

  async function persist(slots: DailyPlanSlotInput[], title?: string) {
    setBusy(true);
    const res = await saveDailyPlan({
      title: title ?? plan?.title,
      slots: slots.map((slot) => ({
        ...slot,
        description: slot.description ?? "",
      })),
    });
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return false;
    }
    setPlan(res.data);
    toast.success(t("dailyPlan.saved"));
    return true;
  }

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(slot: DailyPlanSlot) {
    setEditing(slot);
    setSheetOpen(true);
  }

  async function saveSlot(input: DailyPlanSlotInput) {
    const rest = (plan?.slots ?? []).filter((s) => s.id !== input.id);
    const next = [
      ...rest.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      input,
    ];
    const ok = await persist(next);
    if (ok) setSheetOpen(false);
  }

  async function deleteSlot(slot: DailyPlanSlot) {
    const confirmed = window.confirm(
      t("dailyPlan.confirmDelete", { title: slot.title })
    );
    if (!confirmed) return;
    const next = (plan?.slots ?? [])
      .filter((s) => s.id !== slot.id)
      .map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        startTime: s.startTime,
        endTime: s.endTime,
      }));
    await persist(next);
  }

  return {
    t,
    locale,
    canEdit,
    now,
    ready,
    busy,
    plan,
    snapshot,
    sheetOpen,
    setSheetOpen,
    editing,
    openCreate,
    openEdit,
    saveSlot,
    deleteSlot,
  };
}
