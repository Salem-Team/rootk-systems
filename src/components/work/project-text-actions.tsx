"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { copyPlainText } from "@/lib/copy-text";
import { cn } from "@/lib/utils";

const iconButtonClass =
  "h-10 w-10 shrink-0 rounded-xl border-border/80 bg-card shadow-xs transition duration-200 hover:border-primary/30 hover:bg-muted active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100";

function briefingFileName(name: string): string {
  const base = name
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "project"}.txt`;
}

export function downloadPlainText(fileName: string, text: string): boolean {
  const value = text.replace(/\r\n/g, "\n").trim();
  if (!value || typeof document === "undefined") return false;
  const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function CopyTextButton({
  text,
  label,
  copiedLabel,
  className,
}: {
  text: string;
  label: string;
  copiedLabel: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const value = text.trim();

  async function copy() {
    if (!value) return;
    const ok = await copyPlainText(value);
    if (!ok) {
      toast.error(t("workAdmin.projects.copyBriefingFailed"));
      return;
    }
    setCopied(true);
    toast.success(copiedLabel);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(iconButtonClass, className)}
      aria-label={copied ? copiedLabel : label}
      title={copied ? copiedLabel : label}
      disabled={!value}
      onClick={() => void copy()}
    >
      <span className="relative grid h-[18px] w-[18px] place-items-center">
        <Copy
          className={cn(
            "col-start-1 row-start-1 h-[18px] w-[18px] transition duration-200",
            copied ? "scale-75 opacity-0" : "scale-100 opacity-100",
            "motion-reduce:transition-none"
          )}
          strokeWidth={1.75}
          aria-hidden
        />
        <Check
          className={cn(
            "col-start-1 row-start-1 h-[18px] w-[18px] text-emerald-600 transition duration-200",
            copied ? "scale-100 opacity-100" : "scale-75 opacity-0",
            "motion-reduce:transition-none"
          )}
          strokeWidth={2}
          aria-hidden
        />
      </span>
    </Button>
  );
}

export function DownloadTextButton({
  text,
  fileName,
  label,
  doneLabel,
  className,
}: {
  text: string;
  fileName: string;
  label: string;
  doneLabel: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const value = text.trim();

  function download() {
    if (!downloadPlainText(briefingFileName(fileName), value)) return;
    setDone(true);
    toast.success(doneLabel);
    window.setTimeout(() => setDone(false), 1600);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(iconButtonClass, className)}
      aria-label={done ? doneLabel : label}
      title={done ? doneLabel : label}
      disabled={!value}
      onClick={download}
    >
      {done ? (
        <Check className="h-[18px] w-[18px] text-emerald-600" strokeWidth={2} aria-hidden />
      ) : (
        <Download className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
      )}
    </Button>
  );
}
