"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteShift, getShifts, saveShift } from "@/services/org.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { ShiftDefinition } from "@/types/org";
import { EMPTY_SHIFT_DRAFT, SHIFT_COLORS } from "./shift-constants";
import { ShiftCreateForm } from "./shift-create-form";
import { ShiftListItem } from "./shift-list-item";

export function ShiftsPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [shifts, setShifts] = useState<ShiftDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(EMPTY_SHIFT_DRAFT);

  async function reload() {
    const res = await getShifts();
    if (res.success) setShifts(res.data);
  }

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await reload();
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function persist(next: ShiftDefinition) {
    setBusy(true);
    const res = await saveShift(next);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    await reload();
    toast.success(t("admin.shiftSaved"));
  }

  async function onCreate() {
    if (!draft.name.trim()) {
      toast.error(t("common.error"));
      return;
    }
    setBusy(true);
    const res = await saveShift({
      name: draft.name.trim(),
      type: draft.type,
      start: draft.start,
      end: draft.end,
      color: draft.color,
      active: true,
    } as Parameters<typeof saveShift>[0]);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setDraft({
      ...EMPTY_SHIFT_DRAFT,
      color: SHIFT_COLORS[shifts.length % SHIFT_COLORS.length],
    });
    await reload();
    toast.success(t("admin.shiftCreated"));
  }

  async function onDelete(id: string) {
    setBusy(true);
    const res = await deleteShift(id);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    await reload();
    toast.success(t("admin.shiftRemoved"));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <motion.section
      variants={fadeInUp}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="space-y-3"
      aria-labelledby="shifts-heading"
    >
      <ShiftCreateForm
        draft={draft}
        setDraft={setDraft}
        busy={busy}
        onCreate={() => void onCreate()}
      />

      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="surface-panel panel-body space-y-4"
      >
        {shifts.length === 0 ? (
          <li className="py-8 text-center text-sm text-muted-foreground">
            {t("common.noResults")}
          </li>
        ) : (
          shifts.map((shift) => (
            <ShiftListItem
              key={shift.id}
              shift={shift}
              busy={busy}
              onUpdate={(updater) =>
                setShifts((prev) =>
                  prev.map((s) => (s.id === shift.id ? updater(s) : s))
                )
              }
              onSave={() => void persist(shift)}
              onDelete={() => void onDelete(shift.id)}
            />
          ))
        )}
      </motion.ul>
    </motion.section>
  );
}
