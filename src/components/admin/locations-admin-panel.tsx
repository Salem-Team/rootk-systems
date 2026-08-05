"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, MapPin, Plus, Save, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteLocation,
  getLocations,
  saveLocation,
} from "@/services/org.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import type { OfficeLocation } from "@/types/org";

const EMPTY = {
  id: "",
  name: "",
  city: "",
  address: "",
  timezone: "Africa/Cairo",
  capacity: 20,
  workingDays: "Sun–Thu",
  active: true,
};

export function LocationsAdminPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [items, setItems] = useState<OfficeLocation[]>([]);
  const [draft, setDraft] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const res = await getLocations();
    if (res.success) setItems(res.data);
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

  async function onSave() {
    if (!draft.name.trim() || !draft.city.trim()) {
      toast.error(t("common.error"));
      return;
    }
    setBusy(true);
    const res = await saveLocation({
      id: draft.id || undefined,
      name: draft.name.trim(),
      city: draft.city.trim(),
      address: draft.address.trim(),
      timezone: draft.timezone,
      capacity: draft.capacity,
      workingDays: draft.workingDays,
      active: true,
    } as Parameters<typeof saveLocation>[0]);
    setBusy(false);
    if (!res.success || !res.data) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setDraft(EMPTY);
    await reload();
    toast.success(t("admin.locationSaved"));
  }

  async function onDelete(id: string) {
    setBusy(true);
    const res = await deleteLocation(id);
    setBusy(false);
    if (!res.success) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    await reload();
    toast.success(t("admin.locationRemoved"));
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
    >
      <div>
        <h3 className="text-base font-semibold tracking-tight">
          {t("admin.locationsTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("admin.locationsDesc")}
        </p>
      </div>

      <div className="surface-panel p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["name", t("common.name")],
              ["city", t("admin.city")],
              ["address", t("settings.address")],
              ["timezone", t("settings.timezone")],
              ["workingDays", t("admin.workingDays")],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`loc-${key}`}>{label}</Label>
              <Input
                id={`loc-${key}`}
                value={draft[key]}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [key]: e.target.value }))
                }
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="loc-capacity">{t("admin.capacity")}</Label>
            <Input
              id="loc-capacity"
              type="number"
              value={draft.capacity}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  capacity: Number(e.target.value) || 0,
                }))
              }
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => void onSave()}>
            {busy ? (
              <Loader2 className="animate-spin" />
            ) : draft.id ? (
              <Save />
            ) : (
              <Plus />
            )}
            {draft.id ? t("common.save") : t("common.add")}
          </Button>
          {draft.id ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDraft(EMPTY)}
            >
              {t("common.cancel")}
            </Button>
          ) : null}
        </div>
      </div>

      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {items.map((loc) => (
          <motion.li
            key={loc.id}
            variants={fadeInUp}
            className="surface-panel surface-panel-interactive p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="icon-well">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold tracking-tight">{loc.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {loc.address}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setDraft({
                      id: loc.id,
                      name: loc.name,
                      city: loc.city,
                      address: loc.address,
                      timezone: loc.timezone,
                      capacity: loc.capacity,
                      workingDays: loc.workingDays,
                      active: loc.active,
                    })
                  }
                  aria-label={t("common.edit")}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void onDelete(loc.id)}
                  aria-label={t("common.delete")}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
                <dt className="text-muted-foreground">{t("settings.timezone")}</dt>
                <dd className="mt-0.5 font-medium">{loc.timezone}</dd>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
                <dt className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3 w-3" aria-hidden />
                  {t("admin.capacity")}
                </dt>
                <dd className="mt-0.5 font-semibold tabular-nums">
                  {loc.capacity}
                </dd>
              </div>
              <div className="col-span-2 rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
                <dt className="text-muted-foreground">{t("admin.workingDays")}</dt>
                <dd className="mt-0.5 font-medium">{loc.workingDays}</dd>
              </div>
            </dl>
          </motion.li>
        ))}
      </motion.ul>
    </motion.section>
  );
}
