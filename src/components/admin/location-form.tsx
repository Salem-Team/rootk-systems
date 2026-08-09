import { Link2, Loader2, MapPin, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/hooks/use-translation";

export const EMPTY_LOCATION_DRAFT = {
  id: "",
  name: "",
  city: "",
  address: "",
  timezone: "Africa/Cairo",
  capacity: 20,
  workingDays: "Sun–Thu",
  mapsUrl: "",
  latitude: "",
  longitude: "",
  radiusMeters: 200,
  active: true,
};

export type LocationDraft = typeof EMPTY_LOCATION_DRAFT;

export function LocationForm({
  draft,
  setDraft,
  busy,
  resolvingMaps,
  onApplyMapsUrl,
  onSave,
  onCancel,
}: {
  draft: LocationDraft;
  setDraft: (updater: (d: LocationDraft) => LocationDraft) => void;
  busy: boolean;
  resolvingMaps: boolean;
  onApplyMapsUrl: (rawUrl?: string) => void | Promise<void>;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="surface-panel p-4">
      <div className="space-y-1.5">
        <Label htmlFor="loc-maps-url">{t("admin.mapsUrl")}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Link2 className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="loc-maps-url"
              className="ps-9"
              dir="ltr"
              placeholder="https://maps.app.goo.gl/… أو https://www.google.com/maps/…"
              value={draft.mapsUrl}
              onChange={(e) =>
                setDraft((d) => ({ ...d, mapsUrl: e.target.value }))
              }
              onPaste={(e) => {
                const pasted = e.clipboardData.getData("text");
                if (!pasted.trim()) return;
                // Let the value land, then resolve on next tick.
                window.setTimeout(() => {
                  void onApplyMapsUrl(pasted);
                }, 0);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onApplyMapsUrl();
                }
              }}
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0"
            disabled={resolvingMaps || busy || !draft.mapsUrl.trim()}
            onClick={() => void onApplyMapsUrl()}
          >
            {resolvingMaps ? (
              <Loader2 className="animate-spin" />
            ) : (
              <MapPin />
            )}
            {t("admin.mapsUrlApply")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("admin.mapsUrlHint")}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="space-y-1.5">
          <Label htmlFor="loc-lat">{t("admin.latitude")}</Label>
          <Input
            id="loc-lat"
            type="number"
            step="any"
            inputMode="decimal"
            dir="ltr"
            placeholder="30.0075"
            value={draft.latitude}
            onChange={(e) =>
              setDraft((d) => ({ ...d, latitude: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loc-lng">{t("admin.longitude")}</Label>
          <Input
            id="loc-lng"
            type="number"
            step="any"
            inputMode="decimal"
            dir="ltr"
            placeholder="31.4913"
            value={draft.longitude}
            onChange={(e) =>
              setDraft((d) => ({ ...d, longitude: e.target.value }))
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loc-radius">{t("admin.radiusMeters")}</Label>
          <Input
            id="loc-radius"
            type="number"
            min={100}
            value={draft.radiusMeters}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                radiusMeters: Number(e.target.value) || 200,
              }))
            }
          />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {t("admin.geoRequiredHint")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || resolvingMaps} onClick={() => void onSave()}>
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
          <Button size="sm" variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
