"use client";

import { Check, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/hooks/use-translation";
import type { IncomingCallReadiness } from "@/lib/native/incoming-call";
import { cn } from "@/lib/utils";

interface CrmIncomingCallEnableProps {
  open: boolean;
  busy: boolean;
  readiness: IncomingCallReadiness | null;
  onOpenChange: (open: boolean) => void;
  onActivate: () => void;
}

/** One clear step so caller name and budget can show over the ringing screen. */
export function CrmIncomingCallEnable({
  open,
  busy,
  readiness,
  onOpenChange,
  onActivate,
}: CrmIncomingCallEnableProps) {
  const { t } = useTranslation();
  const steps = [
    { ok: readiness?.screening === true, label: t("crm.call.incoming.stepScreening") },
    { ok: readiness?.overlay === true, label: t("crm.call.incoming.stepOverlay") },
    { ok: readiness?.phone === true, label: t("crm.call.incoming.stepPhone") },
    {
      ok: readiness?.notifications === true,
      label: t("crm.call.incoming.stepNotifications"),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {t("crm.call.incoming.enableTitle")}
          </DialogTitle>
          <DialogDescription>{t("crm.call.incoming.enableDesc")}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2 px-0">
          <ul className="space-y-2">
            {steps.map((step) => (
              <li
                key={step.label}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/40 px-3 py-2.5"
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                    step.ok
                      ? "border-emerald-600/30 bg-emerald-600 text-white"
                      : "border-border bg-background text-muted-foreground"
                  )}
                  aria-hidden
                >
                  {step.ok ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                <span className="text-sm font-medium leading-snug">{step.label}</span>
              </li>
            ))}
          </ul>
          <p className="px-1 pt-1 text-[13px] leading-relaxed text-muted-foreground">
            {t("crm.call.incoming.enableMissing")}
          </p>
        </DialogBody>
        <DialogFooter className="sm:flex-col">
          <Button
            className="min-h-11 w-full"
            disabled={busy}
            onClick={onActivate}
          >
            {t("crm.call.incoming.enableAction")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-full text-muted-foreground"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {t("crm.call.incoming.enableLater")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
