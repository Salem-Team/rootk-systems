import { motion } from "framer-motion";
import { MapPin, Save, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import type { OfficeLocation } from "@/types/org";
import type { LocationDraft } from "./location-form";

export function LocationCard({
  location,
  busy,
  onEdit,
  onDelete,
}: {
  location: OfficeLocation;
  busy: boolean;
  onEdit: (draft: LocationDraft) => void;
  onDelete: (id: string) => void | Promise<void>;
}) {
  const { t } = useTranslation();

  return (
    <motion.li
      variants={fadeInUp}
      className="surface-panel surface-panel-interactive p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="icon-well">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-semibold tracking-tight">{location.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {location.address}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              onEdit({
                id: location.id,
                name: location.name,
                city: location.city,
                address: location.address,
                timezone: location.timezone,
                capacity: location.capacity,
                workingDays: location.workingDays,
                mapsUrl:
                  location.latitude != null && location.longitude != null
                    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
                    : "",
                latitude:
                  location.latitude != null ? String(location.latitude) : "",
                longitude:
                  location.longitude != null ? String(location.longitude) : "",
                radiusMeters: location.radiusMeters ?? 200,
                active: location.active,
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
            onClick={() => void onDelete(location.id)}
            aria-label={t("common.delete")}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
          <dt className="text-muted-foreground">{t("settings.timezone")}</dt>
          <dd className="mt-0.5 font-medium">{location.timezone}</dd>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
          <dt className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-3 w-3" aria-hidden />
            {t("admin.capacity")}
          </dt>
          <dd className="mt-0.5 font-semibold tabular-nums">
            {location.capacity}
          </dd>
        </div>
        <div className="col-span-2 rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
          <dt className="text-muted-foreground">{t("admin.workingDays")}</dt>
          <dd className="mt-0.5 font-medium">{location.workingDays}</dd>
        </div>
        <div className="col-span-2 rounded-lg border border-border/60 bg-muted/25 px-2.5 py-2">
          <dt className="text-muted-foreground">
            {t("admin.radiusMeters")}
          </dt>
          <dd className="mt-0.5 font-medium tabular-nums" dir="ltr">
            {location.latitude != null && location.longitude != null
              ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)} · ${location.radiusMeters ?? 200}m`
              : "—"}
          </dd>
        </div>
      </dl>
    </motion.li>
  );
}
