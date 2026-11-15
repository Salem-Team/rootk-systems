"use client";

import { useEffect, useState } from "react";
import { Download, FileText, FileUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import {
  openWorkProjectPdf,
  removeWorkProjectPdf,
  uploadWorkProjectPdf,
} from "@/services/work.service";
import { cn } from "@/lib/utils";

const actionClass =
  "h-11 w-11 shrink-0 rounded-xl active:scale-95 motion-reduce:active:scale-100";

export function ProjectPdfCard({
  projectId,
  fileName,
  className,
}: {
  projectId: string;
  fileName?: string | null;
  className?: string;
}) {
  const { t } = useTranslation();
  const [currentName, setCurrentName] = useState(fileName ?? null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setCurrentName(fileName ?? null);
  }, [fileName]);

  async function upload(file: File | null) {
    if (!file || pending) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t("workAdmin.projects.pdfTooLarge"));
      return;
    }
    setPending(true);
    const res = await uploadWorkProjectPdf(projectId, file);
    setPending(false);
    if (!res.success || !res.data) {
      toast.error(res.message || t("workAdmin.projects.pdfFailed"));
      return;
    }
    setCurrentName(res.data.fileName);
    toast.success(t("workAdmin.projects.pdfUploaded"));
  }

  async function openFile(download: boolean) {
    if (!currentName || pending) return;
    setPending(true);
    try {
      const blob = await openWorkProjectPdf(projectId);
      const url = URL.createObjectURL(
        blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" })
      );
      if (download) {
        const link = document.createElement("a");
        link.href = url;
        link.download = currentName;
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : t("workAdmin.projects.pdfFailed")
      );
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (pending) return;
    setPending(true);
    const res = await removeWorkProjectPdf(projectId);
    setPending(false);
    if (!res.success) {
      toast.error(res.message || t("workAdmin.projects.pdfFailed"));
      return;
    }
    setCurrentName(null);
    toast.success(t("workAdmin.projects.pdfRemoved"));
  }

  return (
    <section
      className={cn(
        "grid gap-3 rounded-2xl border border-primary/25 bg-primary/[0.04] p-3.5 sm:p-4",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <FileText className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold">{t("workAdmin.projects.pdfTitle")}</h3>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
            {t("workAdmin.projects.pdfHint")}
          </p>
        </div>
      </div>
      {currentName ? (
        <p className="truncate text-[13px] font-medium" title={currentName}>
          {currentName}
        </p>
      ) : (
        <p className="text-[13px] text-muted-foreground">{t("workAdmin.projects.pdfEmpty")}</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={cn(
            "inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]",
            pending && "pointer-events-none opacity-60"
          )}
        >
          <FileUp className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          {currentName
            ? t("workAdmin.projects.pdfReplace")
            : t("workAdmin.projects.pdfUpload")}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={pending}
            aria-label={
              currentName
                ? t("workAdmin.projects.pdfReplace")
                : t("workAdmin.projects.pdfUpload")
            }
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              event.target.value = "";
              void upload(file);
            }}
          />
        </label>
        {currentName ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={actionClass}
              disabled={pending}
              aria-label={t("workAdmin.projects.pdfOpen")}
              title={t("workAdmin.projects.pdfOpen")}
              onClick={() => void openFile(false)}
            >
              <FileText className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={actionClass}
              disabled={pending}
              aria-label={t("workAdmin.projects.pdfDownload")}
              title={t("workAdmin.projects.pdfDownload")}
              onClick={() => void openFile(true)}
            >
              <Download className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={cn(actionClass, "text-destructive")}
              disabled={pending}
              aria-label={t("workAdmin.projects.pdfRemove")}
              title={t("workAdmin.projects.pdfRemove")}
              onClick={() => void remove()}
            >
              <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
            </Button>
          </>
        ) : null}
      </div>
    </section>
  );
}
