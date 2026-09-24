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
import type { CrmRecordType } from "@/types/crm";

interface CrmLeadsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
  /** Cold-call imports stay out of lead totals. */
  recordType?: CrmRecordType;
}

/** Upload Excel/CSV with column mapping, preview, and import summary. */
export function CrmLeadsImportDialog({
  open,
  onOpenChange,
  onImported,
  recordType = "lead",
}: CrmLeadsImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const importer = useCrmLeadsImport(onImported, recordType);
  const { t } = importer;
  const isCold = recordType === "cold_call";
  const [dragging, setDragging] = useState(false);

  const hasFile = Boolean(importer.sheet);
  const mappedOk =
    importer.mapped.rows.length > 0 && importer.missingRequired.length === 0;
  const step: 1 | 2 | 3 = !hasFile ? 1 : !mappedOk ? 2 : 3;

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

  const onPick = (file: File | null | undefined) => {
    if (!file) return;
    void importer.onFile(file);
  };

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    onPick(e.dataTransfer.files?.[0]);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent
        className={cn(
          "gap-0 overflow-hidden p-0 sm:max-w-2xl",
          isCold && "sm:max-w-2xl"
        )}
      >
        <DialogHeader className="space-y-2 border-b border-border/60 px-5 py-4 text-start sm:px-6">
          <DialogTitle className="text-base">
            {t(isCold ? "crm.coldImport.title" : "crm.import.title")}
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            {t(isCold ? "crm.coldImport.description" : "crm.import.description")}
          </DialogDescription>
          {isCold ? (
            <ImportSteps
              step={step}
              labels={[
                t("crm.coldImport.stepFile"),
                t("crm.coldImport.stepMap"),
                t("crm.coldImport.stepReview"),
              ]}
            />
          ) : null}
        </DialogHeader>

        <div className="grid max-h-[min(70vh,36rem)] gap-4 overflow-y-auto px-5 py-4 sm:px-6">
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
                "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-10 text-center transition-colors",
                dragging
                  ? "border-primary bg-primary/[0.06]"
                  : "border-border/80 bg-muted/20 hover:border-primary/35 hover:bg-muted/35"
              )}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background shadow-sm ring-1 ring-border/60">
                <Upload className="h-5 w-5 text-primary" aria-hidden />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold">
                  {t(
                    isCold
                      ? "crm.coldImport.dropTitle"
                      : "crm.import.dropTitle"
                  )}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {t(
                    isCold ? "crm.coldImport.dropHint" : "crm.import.dropHint"
                  )}
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
                    void downloadCrmLeadsTemplate(
                      isCold
                        ? "crm-cold-calls-template.xlsx"
                        : "crm-leads-template.xlsx"
                    );
                  }}
                >
                  <Download className="me-1.5 h-3.5 w-3.5" />
                  {t("crm.import.downloadTemplate")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
              <FileSpreadsheet
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">
                  {importer.fileName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {importer.sheet
                    ? t("crm.import.sheetName", {
                        name: importer.sheet.sheetName,
                      })
                    : null}
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
                className="shrink-0"
                onClick={() => {
                  importer.reset();
                  if (inputRef.current) inputRef.current.value = "";
                }}
                aria-label={t("dateTime.clear")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                  onClick={() => inputRef.current?.click()}
              >
                {t(
                  isCold
                    ? "crm.coldImport.changeFile"
                    : "crm.import.changeFile"
                )}
              </Button>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="hidden"
            onChange={(e) => onPick(e.target.files?.[0])}
          />

          {importer.truncated ? (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-200">
              {t("crm.import.truncated")}
            </p>
          ) : null}

          {importer.sheet && importer.missingRequired.length > 0 ? (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-200">
              {t("crm.import.needNamePhone")}
            </p>
          ) : null}

          {importer.sheet ? (
            <div className="space-y-2">
              {isCold ? (
                <p className="text-[12px] font-medium text-muted-foreground">
                  {t("crm.coldImport.mapHint")}
                </p>
              ) : null}
              <CrmLeadsColumnMapping
                sheet={importer.sheet}
                mapping={importer.mapping}
                samples={importer.samples}
                onChange={importer.setFieldColumn}
                emphasizeRequired={isCold}
              />
            </div>
          ) : null}

          {importer.mapped.errors.length > 0 ? (
            <ul className="max-h-24 overflow-auto rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-200">
              {importer.mapped.errors.slice(0, 8).map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          ) : null}

          {importer.mapped.rows.length > 0 ? (
            <div className="space-y-2">
              {isCold ? (
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t("crm.coldImport.previewReady", {
                    count: String(
                      Math.min(importer.mapped.rows.length, 12)
                    ),
                  })}
                </div>
              ) : null}
              <div className="max-h-40 overflow-auto rounded-xl border border-border/70 text-[12px]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur">
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
            <p className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-[12px]">
              {importer.summary}
            </p>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/60 px-5 py-3.5 sm:px-6">
          <Button type="button" variant="outline" onClick={close}>
            {t("crm.actions.cancel")}
          </Button>
          <Button
            type="button"
            disabled={
              importer.busy ||
              importer.mapped.rows.length === 0 ||
              importer.missingRequired.length > 0
            }
            onClick={() => void submit()}
          >
            {importer.busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t(isCold ? "crm.coldImport.upload" : "crm.import.upload")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportSteps({
  step,
  labels,
}: {
  step: 1 | 2 | 3;
  labels: [string, string, string];
}) {
  return (
    <ol className="flex items-center gap-1.5 pt-1 sm:gap-2">
      {labels.map((label, index) => {
        const n = (index + 1) as 1 | 2 | 3;
        const active = n === step;
        const done = n < step;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
            <span
              className={cn(
                "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums",
                done || active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {n}
            </span>
            <span
              className={cn(
                "truncate text-[11px] font-medium",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
            {index < labels.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "ms-auto hidden h-px w-full max-w-6 sm:block",
                  done ? "bg-primary/40" : "bg-border"
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
