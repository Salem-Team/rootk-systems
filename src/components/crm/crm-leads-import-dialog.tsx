"use client";

import { useRef } from "react";
import { Download, Loader2, Upload } from "lucide-react";
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
import { useCrmLeadsImport } from "@/hooks/use-crm-leads-import";
import { downloadCrmLeadsTemplate } from "@/lib/crm/leads-excel";

interface CrmLeadsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

/** Upload Excel/CSV leads with column mapping, preview, and import summary. */
export function CrmLeadsImportDialog({
  open,
  onOpenChange,
  onImported,
}: CrmLeadsImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const importer = useCrmLeadsImport(onImported);
  const { t } = importer;

  function close() {
    onOpenChange(false);
    importer.reset();
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit() {
    const done = await importer.submit();
    if (done) close();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("crm.import.title")}</DialogTitle>
          <DialogDescription>{t("crm.import.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => downloadCrmLeadsTemplate()}
            >
              <Download className="me-1.5 h-3.5 w-3.5" />
              {t("crm.import.downloadTemplate")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="me-1.5 h-3.5 w-3.5" />
              {t("crm.import.chooseFile")}
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={(e) => void importer.onFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {importer.fileName ? (
            <p className="text-[12px] text-muted-foreground">
              {t("crm.import.selectedFile", { name: importer.fileName })}
              {importer.sheet
                ? ` · ${t("crm.import.sheetName", { name: importer.sheet.sheetName })}`
                : ""}
              {" · "}
              {t("crm.import.readyCount", {
                count: String(importer.mapped.rows.length),
              })}
            </p>
          ) : null}

          {importer.truncated ? (
            <p className="text-[12px] text-amber-800 dark:text-amber-200">
              {t("crm.import.truncated")}
            </p>
          ) : null}

          {importer.sheet && importer.missingRequired.length > 0 ? (
            <p className="text-[12px] text-amber-800 dark:text-amber-200">
              {t("crm.import.needNamePhone")}
            </p>
          ) : null}

          {importer.sheet ? (
            <CrmLeadsColumnMapping
              sheet={importer.sheet}
              mapping={importer.mapping}
              samples={importer.samples}
              onChange={importer.setFieldColumn}
            />
          ) : null}

          {importer.mapped.errors.length > 0 ? (
            <ul className="max-h-24 overflow-auto rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-200">
              {importer.mapped.errors.slice(0, 8).map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          ) : null}

          {importer.mapped.rows.length > 0 ? (
            <div className="max-h-40 overflow-auto rounded-md border border-border/70 text-[12px]">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted/80">
                  <tr className="text-start">
                    <th className="px-2 py-1.5 font-medium">{t("crm.leads.colLead")}</th>
                    <th className="px-2 py-1.5 font-medium">{t("crm.leads.colPhone")}</th>
                    <th className="px-2 py-1.5 font-medium">{t("crm.leads.colSource")}</th>
                  </tr>
                </thead>
                <tbody>
                  {importer.mapped.rows.slice(0, 12).map((row, idx) => (
                    <tr key={`${row.phone}-${idx}`} className="border-t border-border/50">
                      <td className="px-2 py-1.5">{row.name}</td>
                      <td className="px-2 py-1.5 font-mono">{row.phone}</td>
                      <td className="px-2 py-1.5">{row.source || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {importer.summary ? (
            <p className="rounded-md border border-border/70 px-3 py-2 text-[12px]">
              {importer.summary}
            </p>
          ) : null}
        </div>

        <DialogFooter>
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
              t("crm.import.upload")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
