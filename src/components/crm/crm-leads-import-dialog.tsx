"use client";

import { useRef, useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/hooks/use-translation";
import {
  crmLeadCsvTemplate,
  parseCrmLeadsCsv,
  type CrmLeadCsvRow,
} from "@/lib/crm/leads-csv";
import { importCrmLeads } from "@/services/crm.service";

interface CrmLeadsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

/** Upload CSV leads with preview + import summary. */
export function CrmLeadsImportDialog({
  open,
  onOpenChange,
  onImported,
}: CrmLeadsImportDialogProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CrmLeadCsvRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  function reset() {
    setRows([]);
    setParseErrors([]);
    setFileName("");
    setSummary(null);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function downloadTemplate() {
    const blob = new Blob([crmLeadCsvTemplate()], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "crm-leads-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(file: File | null) {
    if (!file) return;
    setSummary(null);
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseCrmLeadsCsv(text);
    setRows(parsed.rows);
    setParseErrors(parsed.errors);
    if (parsed.rows.length === 0 && parsed.errors.length === 0) {
      toast.error(t("crm.import.emptyFile"));
    }
  }

  async function submit() {
    if (rows.length === 0) {
      toast.error(t("crm.import.noRows"));
      return;
    }
    setBusy(true);
    const res = await importCrmLeads(rows);
    setBusy(false);
    if (!res.success || !res.data) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    const { created, failed, total } = res.data;
    setSummary(
      t("crm.import.summary", {
        created: String(created),
        failed: String(failed),
        total: String(total),
      })
    );
    toast.success(
      t("crm.toast.imported", {
        count: String(created),
      })
    );
    onImported?.();
    if (failed === 0) {
      onOpenChange(false);
      reset();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("crm.import.title")}</DialogTitle>
          <DialogDescription>{t("crm.import.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={downloadTemplate}>
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
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {fileName ? (
            <p className="text-[12px] text-muted-foreground">
              {t("crm.import.selectedFile", { name: fileName })} ·{" "}
              {t("crm.import.readyCount", { count: String(rows.length) })}
            </p>
          ) : null}

          {parseErrors.length > 0 ? (
            <ul className="max-h-24 overflow-auto rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-200">
              {parseErrors.slice(0, 8).map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          ) : null}

          {rows.length > 0 ? (
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
                  {rows.slice(0, 12).map((row, idx) => (
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

          {summary ? (
            <p className="rounded-md border border-border/70 px-3 py-2 text-[12px]">
              {summary}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("crm.actions.cancel")}
          </Button>
          <Button
            type="button"
            disabled={busy || rows.length === 0}
            onClick={() => void submit()}
          >
            {busy ? (
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
