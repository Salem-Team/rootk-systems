"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { FormSkeleton } from "@/components/shared/loading-state";
import {
  deleteLocation,
  getLocations,
  resolveMapsUrl,
  saveLocation,
} from "@/services/org.service";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp, staggerContainer } from "@/lib/animations";
import { getBrowserLocation } from "@/lib/geo";
import type { OfficeLocation } from "@/types/org";
import { EMPTY_LOCATION_DRAFT, LocationForm } from "./location-form";
import { LocationCard } from "./location-card";

export function LocationsAdminPanel() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [items, setItems] = useState<OfficeLocation[]>([]);
  const [draft, setDraft] = useState(EMPTY_LOCATION_DRAFT);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resolvingMaps, setResolvingMaps] = useState(false);
  const [locatingDevice, setLocatingDevice] = useState(false);

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

  async function applyMapsUrl(rawUrl = draft.mapsUrl) {
    const url = rawUrl.trim();
    if (!url) {
      toast.error(t("admin.mapsUrlRequired"));
      return;
    }
    setResolvingMaps(true);
    const res = await resolveMapsUrl(url);
    setResolvingMaps(false);
    if (!res.success || !res.data) {
      toast.error(res.message ?? t("admin.mapsUrlInvalid"));
      return;
    }
    setDraft((d) => ({
      ...d,
      mapsUrl: url,
      latitude: String(res.data!.latitude),
      longitude: String(res.data!.longitude),
    }));
    toast.success(t("admin.mapsUrlApplied"));
  }

  async function useMyLocation() {
    setLocatingDevice(true);
    try {
      const coords = await getBrowserLocation({
        enableHighAccuracy: true,
        timeout: 25_000,
        maximumAge: 0,
      });
      setDraft((d) => ({
        ...d,
        latitude: String(coords.latitude),
        longitude: String(coords.longitude),
      }));
      toast.success(t("admin.useMyLocationApplied"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/permission denied/i.test(msg)) {
        toast.error(t("errors.locationPermissionDenied"));
      } else {
        toast.error(t("errors.locationUnavailable"));
      }
    } finally {
      setLocatingDevice(false);
    }
  }

  async function onSave() {
    if (!draft.name.trim() || !draft.city.trim()) {
      toast.error(t("common.error"));
      return;
    }
    let lat = Number(draft.latitude);
    let lng = Number(draft.longitude);

    if (
      (!Number.isFinite(lat) || !Number.isFinite(lng) || draft.latitude === "") &&
      draft.mapsUrl.trim()
    ) {
      setBusy(true);
      const resolved = await resolveMapsUrl(draft.mapsUrl);
      setBusy(false);
      if (!resolved.success || !resolved.data) {
        toast.error(resolved.message ?? t("admin.mapsUrlInvalid"));
        return;
      }
      lat = resolved.data.latitude;
      lng = resolved.data.longitude;
      setDraft((d) => ({
        ...d,
        latitude: String(lat),
        longitude: String(lng),
      }));
    }

    if (
      draft.latitude === "" ||
      draft.longitude === "" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      toast.error(t("admin.geoRequiredHint"));
      return;
    }
    const radius = Number(draft.radiusMeters) || 200;
    if (radius < 100) {
      toast.error(t("admin.radiusTooSmall"));
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
      latitude: lat,
      longitude: lng,
      radiusMeters: radius,
      active: true,
    } as Parameters<typeof saveLocation>[0]);
    setBusy(false);
    if (!res.success || !res.data) {
      toast.error(res.message ?? t("common.error"));
      return;
    }
    setDraft(EMPTY_LOCATION_DRAFT);
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
    return <FormSkeleton />;
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

      <LocationForm
        draft={draft}
        setDraft={setDraft}
        busy={busy}
        resolvingMaps={resolvingMaps}
        locatingDevice={locatingDevice}
        onApplyMapsUrl={applyMapsUrl}
        onUseMyLocation={useMyLocation}
        onSave={onSave}
        onCancel={() => setDraft(EMPTY_LOCATION_DRAFT)}
      />

      <motion.ul
        variants={staggerContainer}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {items.map((loc) => (
          <LocationCard
            key={loc.id}
            location={loc}
            busy={busy}
            onEdit={setDraft}
            onDelete={onDelete}
          />
        ))}
      </motion.ul>
    </motion.section>
  );
}
