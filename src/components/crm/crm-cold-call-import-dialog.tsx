"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CrmLeadsColumnMapping } from "@/components/crm/crm-leads-column-mapping";
import { LtrNum } from "@/components/shared/ltr-num";
import { useCrmLeadsImport } from "@/hooks/use-crm-leads-import";
import { downloadCrmLeadsTemplate } from "@/lib/crm/leads-excel";
import { cn } from "@/lib/utils";

interface CrmColdCallImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

/**
 * Canonical cold-call Excel import — 3 steps, editable column mapping.
 * Matches the product design: file → map → review (not counted with leads).
 */
export function CrmColdCallImportDialog({
  open,
  onOpenChange,
  onImported,
}: CrmColdCallImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const importer = useCrmLeadsImport(onImported, "cold_call");
  const { t } = importer;
  const [dragging, setDragging] = useState(false);

  const hasFile = Boolean(importer.sheet);
  const canImport =
    importer.mapped.rows.length > 0 && importer.missingRequired.length === 0;
  const step: 1 | 2 | 3 = !hasFile ? 1 : !canImport ? 2 : 3;

  function close() {
    onOpenChange(false);
    importer.reset();
    setDragging(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit() {
    const done = await importer.submit();
    if (done) close();
  }

  function onPick(file: File | null | undefined) {
    if (!file) return;
    void importer.onFile(file);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    onPick(e.dataTransfer.files?.[0]);
  }

  function clearFile() {
    importer.reset();
    setDragging(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="space-y-3 border-b border-border/50 px-5 pb-4 pt-5 text-start sm:px-6">
          <div className="space-y-1.5 pe-8">
            <DialogTitle className="text-base font-semibold tracking-tight">
              {t("crm.coldImport.title")}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-relaxed text-muted-foreground">
              {t("crm.coldImport.description")}
            </DialogDescription>
          </div>
          <ColdImportSteps
            step={step}
            labels={[
              t("crm.coldImport.stepFile"),
              t("crm.coldImport.stepMap"),
              t("crm.coldImport.stepReview"),
            ]}
          />
        </DialogHeader>

        <div className="grid max-h-[min(68vh,34rem)] gap-3.5 overflow-y-auto px-5 py-4 sm:gap-4 sm:px-6">
          {!hasFile ? (
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onClick={() => inputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragging(false);
              }}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-11 text-center transition-colors",
                dragging
                  ? "border-primary bg-primary/[0.06]"
                  : "border-border/80 bg-muted/15 hover:border-primary/35 hover:bg-muted/30"
              )}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background shadow-sm ring-1 ring-border/60">
                <Upload className="h-5 w-5 text-primary" aria-hidden />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {t("crm.coldImport.dropTitle")}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {t("crm.coldImport.dropHint")}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                >
                  <Upload className="me-1.5 h-3.5 w-3.5" />
                  {t("crm.import.chooseFile")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    void downloadCrmLeadsTemplate("crm-cold-calls-template.xlsx");
                  }}
                >
                  <Download className="me-1.5 h-3.5 w-3.5" />
                  {t("crm.import.downloadTemplate")}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-muted/15 px-3 py-2.5">
                <FileSpreadsheet
                  className="h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold tracking-tight">
                    {importer.fileName}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {t("crm.import.sheetName", {
                      name: importer.sheet?.sheetName ?? "",
                    })}
                    {" · "}
                    {t("crm.import.readyCount", {
                      count: String(importer.mapped.rows.length),
                    })}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground"
                  onClick={clearFile}
                  aria-label={t("dateTime.clear")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0 rounded-lg px-3 text-[12px]"
                  onClick={() => inputRef.current?.click()}
                >
                  {t("crm.coldImport.changeFile")}
                </Button>
              </div>

              {importer.truncated ? (
                <p className="rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-900 dark:text-amber-200">
                  {t("crm.import.truncated")}
                </p>
              ) : null}

              {importer.missingRequired.length > 0 ? (
                <p className="rounded-xl bg-amber-500/[0.12] px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-950 dark:text-amber-100">
                  {t("crm.import.needNamePhone")}
                </p>
              ) : null}

              <div className="space-y-2">
                <p className="text-[12px] leading-relaxed text-muted-foreground">
                  {t("crm.coldImport.mapHint")}
                </p>
                <CrmLeadsColumnMapping
                  sheet={importer.sheet!}
                  mapping={importer.mapping}
                  samples={importer.samples}
                  onChange={importer.setFieldColumn}
                  emphasizeRequired
                  alwaysShowSample
                />
              </div>

              {importer.mapped.errors.length > 0 ? (
                <ul className="max-h-24 overflow-auto rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-2 text-[12px] text-amber-900 dark:text-amber-200">
                  {importer.mapped.errors.slice(0, 8).map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              ) : null}

              {step === 3 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    {t("crm.coldImport.previewReady", {
                      count: String(
                        Math.min(importer.mapped.rows.length, 12)
                      ),
                    })}
                  </div>
                  <div className="max-h-36 overflow-auto rounded-xl border border-border/60 text-[12px]">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-muted/95 backdrop-blur">
                        <tr className="text-start">
                          <th className="px-3 py-2 font-medium">
                            {t("crm.leads.colLead")}
                          </th>
                          <th className="px-3 py-2 font-medium">
                            {t("crm.leads.colPhone")}
                          </th>
                          <th className="px-3 py-2 font-medium">
                            {t("crm.leads.colSource")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {importer.mapped.rows.slice(0, 12).map((row, idx) => (
                          <tr
                            key={`${row.phone}-${idx}`}
                            className="border-t border-border/50"
                          >
                            <td className="px-3 py-2">{row.name}</td>
                            <td className="px-3 py-2 font-mono tabular-nums">
                              <LtrNum>{row.phone}</LtrNum>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {row.source || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {importer.summary ? (
                <p className="rounded-xl border border-border/60 bg-muted/15 px-3.5 py-2.5 text-[12px]">
                  {importer.summary}
                </p>
              ) : null}
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />
        </div>

        <DialogFooter className="gap-2 border-t border-border/50 px-5 py-3.5 sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="min-h-10 rounded-xl"
            onClick={close}
          >
            {t("crm.actions.cancel")}
          </Button>
          <Button
            type="button"
            className="min-h-10 rounded-xl"
            disabled={importer.busy || !canImport}
            onClick={() => void submit()}
          >
            {importer.busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("crm.coldImport.upload")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ColdImportSteps({
  step,
  labels,
}: {
  step: 1 | 2 | 3;
  labels: [string, string, string];
}) {
  return (
    <ol className="flex w-full items-center gap-0" aria-label="import steps">
      {labels.map((label, index) => {
        const n = (index + 1) as 1 | 2 | 3;
        const active = n === step;
        const done = n < step;
        const reached = done || active;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
                  reached
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {n}
              </span>
              <span
                className={cn(
                  "truncate text-[11px] font-medium sm:text-[12px]",
                  active
                    ? "text-foreground"
                    : done
                      ? "text-foreground/80"
                      : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {index < labels.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "mx-2 h-px min-w-3 flex-1 sm:mx-3",
                  done ? "bg-primary/35" : "bg-border"
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
