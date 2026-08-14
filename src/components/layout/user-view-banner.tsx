"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { stopUserView } from "@/services/auth.service";
import { useAttendanceStore } from "@/stores/attendance-store";
import { useSessionStore } from "@/stores/session-store";

/** Sticky banner while admin is inside another user's account. */
export function UserViewBanner() {
  const router = useRouter();
  const { t } = useTranslation();
  const impersonation = useSessionStore((s) => s.impersonation);
  const user = useSessionStore((s) => s.user);
  const [busy, setBusy] = useState(false);

  if (!impersonation) return null;

  async function exitView() {
    setBusy(true);
    const res = await stopUserView();
    setBusy(false);
    if (!res.success) {
      toast.error(res.message || t("userView.exitFailed"));
      return;
    }
    useAttendanceStore.getState().reset();
    toast.success(t("userView.exited"));
    router.replace("/dashboard");
  }

  const viewingName = user.displayName || user.firstName || user.email;

  return (
    <div
      role="status"
      className="border-b border-amber-500/35 bg-gradient-to-r from-amber-100/95 via-amber-50/90 to-orange-50/90 text-amber-950 dark:from-amber-950/80 dark:via-amber-950/55 dark:to-orange-950/50 dark:text-amber-50"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-4 md:px-6 lg:px-8">
        <div className="flex min-w-0 items-start gap-2">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 opacity-80" aria-hidden />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-snug sm:text-[13px]">
              {t("userView.bannerTitle", { name: viewingName })}
            </p>
            <p className="mt-0.5 text-[11px] opacity-80">
              {t("userView.bannerDesc", {
                admin: impersonation.impersonatorName || impersonation.impersonatorEmail,
              })}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 border-amber-700/30 bg-white/70 text-amber-950 hover:bg-white dark:border-amber-200/25 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-900/50"
          disabled={busy}
          onClick={() => void exitView()}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Undo2 className="h-3.5 w-3.5" />
          )}
          {t("userView.exit")}
        </Button>
      </div>
    </div>
  );
}
