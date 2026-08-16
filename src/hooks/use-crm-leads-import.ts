"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CRM_LEAD_CSV_HEADERS,
  applyLeadColumnMapping,
  isCrmLeadRequiredField,
  sampleColumnValues,
  suggestLeadColumnMapping,
  type CrmLeadCsvHeader,
  type CrmLeadCsvRow,
} from "@/lib/crm/leads-csv";
import {
  parseCrmLeadsFile,
  type CrmLeadSpreadsheet,
} from "@/lib/crm/leads-excel";
import { importCrmLeads } from "@/services/crm.service";
import { useTranslation } from "@/hooks/use-translation";

const MAX_IMPORT_ROWS = 500;

export function useCrmLeadsImport(onImported?: () => void) {
  const { t } = useTranslation();
  const [fileName, setFileName] = useState("");
  const [sheet, setSheet] = useState<CrmLeadSpreadsheet | null>(null);
  const [mapping, setMapping] = useState<
    Partial<Record<CrmLeadCsvHeader, number>>
  >({});
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFileName("");
    setSheet(null);
    setMapping({});
    setBusy(false);
    setSummary(null);
  }, []);

  const mapped = useMemo(() => {
    if (!sheet) return { rows: [] as CrmLeadCsvRow[], errors: [] as string[] };
    if (mapping.name === undefined || mapping.phone === undefined) {
      return { rows: [] as CrmLeadCsvRow[], errors: [] as string[] };
    }
    return applyLeadColumnMapping(sheet.dataRows, mapping);
  }, [sheet, mapping]);

  const samples = useMemo(() => {
    if (!sheet) return new Map<number, string[]>();
    const map = new Map<number, string[]>();
    sheet.headers.forEach((_, idx) => {
      map.set(idx, sampleColumnValues(sheet.dataRows, idx));
    });
    return map;
  }, [sheet]);

  const missingRequired = CRM_LEAD_CSV_HEADERS.filter(
    (field) => isCrmLeadRequiredField(field) && mapping[field] === undefined
  );

  async function onFile(file: File | null) {
    if (!file) return;
    setSummary(null);
    setFileName(file.name);
    try {
      const parsed = await parseCrmLeadsFile(file);
      if (!parsed.headers.length) {
        setSheet(null);
        setMapping({});
        toast.error(t("crm.import.emptyFile"));
        return;
      }
      setSheet(parsed);
      setMapping(suggestLeadColumnMapping(parsed.headers));
    } catch {
      setSheet(null);
      setMapping({});
      toast.error(t("crm.import.invalidFile"));
    }
  }

  function setFieldColumn(field: CrmLeadCsvHeader, columnIndex: number | undefined) {
    setMapping((prev) => {
      const next = { ...prev };
      if (columnIndex === undefined) delete next[field];
      else next[field] = columnIndex;
      return next;
    });
  }

  async function submit() {
    const rows = mapped.rows.slice(0, MAX_IMPORT_ROWS);
    if (missingRequired.length > 0) {
      toast.error(t("crm.import.needNamePhone"));
      return;
    }
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
    toast.success(t("crm.toast.imported", { count: String(created) }));
    onImported?.();
    return failed === 0;
  }

  return {
    t,
    fileName,
    sheet,
    mapping,
    mapped,
    samples,
    missingRequired,
    busy,
    summary,
    truncated: mapped.rows.length > MAX_IMPORT_ROWS,
    reset,
    onFile,
    setFieldColumn,
    submit,
  };
}
