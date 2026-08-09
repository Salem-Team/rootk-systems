"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import {
  createOrganicAd,
  inspectOrganicAdUrl,
} from "@/services/organic-ads.service";
import { canOrganicAds } from "@/lib/organic-ads-policies";
import { useSessionStore } from "@/stores/session-store";
import type { UrlInspectionResult } from "@/types/organic-ads";

interface AddAdvertisementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  onViewExisting?: (id: string) => void;
  employeeNames?: Map<string, string>;
}

export function AddAdvertisementSheet({
  open,
  onOpenChange,
  onCreated,
  onViewExisting,
  employeeNames,
}: AddAdvertisementSheetProps) {
  const { t } = useTranslation();
  const role = useSessionStore((s) => s.role);
  const canOverride = canOrganicAds(role, "override_duplicate");

  const [url, setUrl] = useState("");
  const [project, setProject] = useState("");
  const [campaign, setCampaign] = useState("");
  const [notes, setNotes] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inspection, setInspection] = useState<UrlInspectionResult | null>(
    null
  );

  useEffect(() => {
    if (!open) {
      setUrl("");
      setProject("");
      setCampaign("");
      setNotes("");
      setInspection(null);
      setInspecting(false);
      setSaving(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = url.trim();
    if (trimmed.length < 8) {
      setInspection(null);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setInspecting(true);
      const res = await inspectOrganicAdUrl(trimmed);
      if (cancelled) return;
      setInspecting(false);
      if (res.success) setInspection(res.data);
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [url, open]);

  async function submit(forceDuplicate = false) {
    setSaving(true);
    try {
      const res = await createOrganicAd({
        url: url.trim(),
        project,
        campaign,
        notes,
        forceDuplicate,
        linkToOpenTask: true,
      });
      if (!res.success) {
        if (res.error?.code === "DUPLICATE_AD") {
          toast.error(t("organicAds.toast.duplicateBlocked"));
          return;
        }
        toast.error(res.message || t("organicAds.toast.createFailed"));
        return;
      }
      toast.success(t("organicAds.toast.created"));
      onOpenChange(false);
      onCreated?.();
    } finally {
      setSaving(false);
    }
  }

  const duplicate = inspection?.duplicate ?? null;
  const canSubmit =
    !!url.trim() &&
    !inspecting &&
    !!inspection &&
    inspection.validationStatus !== "invalid" &&
    inspection.validationStatus !== "unsupported" &&
    (!duplicate || canOverride);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("organicAds.add.title")}</SheetTitle>
          <SheetDescription>{t("organicAds.add.description")}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="ad-url">{t("organicAds.add.url")}</Label>
            <Input
              id="ad-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("organicAds.add.urlPlaceholder")}
              autoFocus
              inputMode="url"
              autoComplete="off"
            />
            <div className="min-h-5 text-[12px] text-muted-foreground" aria-live="polite">
              {inspecting ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  {t("organicAds.add.checking")}
                </span>
              ) : null}
              {!inspecting &&
              inspection &&
              inspection.validationStatus === "valid" &&
              !duplicate ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <Check className="h-3 w-3" aria-hidden />
                  {t("organicAds.add.validated")}
                </span>
              ) : null}
              {!inspecting &&
              inspection &&
              inspection.validationStatus !== "valid" ? (
                <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  {inspection.validationMessage}
                </span>
              ) : null}
            </div>
          </div>

          {inspection && inspection.platform !== "unknown" ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5 text-[12px]">
              <div>
                <p className="text-muted-foreground">
                  {t("organicAds.add.platformDetected")}
                </p>
                <p className="mt-0.5 font-medium">
                  {t(`organicAds.platform.${inspection.platform}`)}
                  {inspection.platform !== "other" ? " ✓" : ""}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {t("organicAds.add.typeDetected")}
                </p>
                <p className="mt-0.5 font-medium">
                  {t(`organicAds.adType.${inspection.adType}`)}
                </p>
              </div>
            </div>
          ) : null}

          {duplicate ? (
            <div
              role="alert"
              className="rounded-lg border border-amber-300/80 bg-amber-50 px-3 py-3 text-[13px] dark:border-amber-700 dark:bg-amber-950/40"
            >
              <p className="font-semibold">
                {t("organicAds.add.duplicateTitle")}
              </p>
              <p className="mt-1 text-muted-foreground">
                {t("organicAds.add.duplicateDesc")}
              </p>
              <p className="mt-2">
                {t("organicAds.add.addedBy")}:{" "}
                <span className="font-medium">
                  {employeeNames?.get(duplicate.ownerEmployeeId) ??
                    duplicate.ownerEmployeeId}
                </span>
              </p>
              <p>
                {t("organicAds.add.addedAt")}:{" "}
                {new Date(duplicate.addedAt).toLocaleDateString()}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onViewExisting?.(duplicate.id);
                    onOpenChange(false);
                  }}
                >
                  {t("organicAds.actions.viewExisting")}
                </Button>
                {canOverride ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="warning"
                    disabled={saving}
                    onClick={() => void submit(true)}
                  >
                    {t("organicAds.actions.addAnyway")}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="grid gap-1.5">
            <Label htmlFor="ad-project">{t("organicAds.add.project")}</Label>
            <Input
              id="ad-project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder={t("organicAds.add.projectPlaceholder")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ad-campaign">{t("organicAds.add.campaign")}</Label>
            <Input
              id="ad-campaign"
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              placeholder={t("organicAds.add.campaignPlaceholder")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ad-notes">{t("organicAds.add.notes")}</Label>
            <Textarea
              id="ad-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("organicAds.add.notesPlaceholder")}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("organicAds.actions.cancel")}
            </Button>
            <Button
              type="button"
              disabled={!canSubmit || saving || !!duplicate}
              onClick={() => void submit(false)}
            >
              {saving ? (
                <>
                  <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                  {t("organicAds.actions.saving")}
                </>
              ) : (
                t("organicAds.actions.add")
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
