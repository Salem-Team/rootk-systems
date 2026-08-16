"use client";

import {
  CRM_LEAD_CSV_HEADERS,
  isCrmLeadRequiredField,
  type CrmLeadCsvHeader,
} from "@/lib/crm/leads-csv";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import type { CrmLeadSpreadsheet } from "@/lib/crm/leads-excel";
import type { TranslationPath } from "@/i18n";

const SKIP = "__none__";

const FIELD_LABEL: Record<CrmLeadCsvHeader, TranslationPath> = {
  name: "crm.import.fields.name",
  phone: "crm.import.fields.phone",
  email: "crm.import.fields.email",
  companyName: "crm.import.fields.companyName",
  businessType: "crm.import.fields.businessType",
  source: "crm.import.fields.source",
  stage: "crm.import.fields.stage",
  owner: "crm.import.fields.owner",
  status: "crm.import.fields.status",
  tags: "crm.import.fields.tags",
  nextAction: "crm.import.fields.nextAction",
  notes: "crm.import.fields.notes",
};

interface CrmLeadsColumnMappingProps {
  sheet: CrmLeadSpreadsheet;
  mapping: Partial<Record<CrmLeadCsvHeader, number>>;
  samples: Map<number, string[]>;
  onChange: (field: CrmLeadCsvHeader, columnIndex: number | undefined) => void;
}

/** Map spreadsheet columns onto canonical CRM lead fields. */
export function CrmLeadsColumnMapping({
  sheet,
  mapping,
  samples,
  onChange,
}: CrmLeadsColumnMappingProps) {
  const { t } = useTranslation();

  return (
    <div className="max-h-64 overflow-auto rounded-md border border-border/70">
      <table className="w-full text-[12px]">
        <thead className="sticky top-0 bg-muted/90">
          <tr className="text-start">
            <th className="px-2 py-1.5 font-medium">{t("crm.import.mapField")}</th>
            <th className="px-2 py-1.5 font-medium">{t("crm.import.mapColumn")}</th>
            <th className="hidden px-2 py-1.5 font-medium sm:table-cell">
              {t("crm.import.mapSample")}
            </th>
          </tr>
        </thead>
        <tbody>
          {CRM_LEAD_CSV_HEADERS.map((field) => {
            const required = isCrmLeadRequiredField(field);
            const selected = mapping[field];
            const sample =
              selected === undefined
                ? []
                : (samples.get(selected) ?? []);
            return (
              <tr key={field} className="border-t border-border/50">
                <td className="px-2 py-1.5 align-middle">
                  <span className="font-medium">
                    {t(FIELD_LABEL[field])}
                  </span>
                  {required ? (
                    <span className="ms-1 text-rose-600">*</span>
                  ) : null}
                </td>
                <td className="px-2 py-1.5">
                  <Select
                    value={selected === undefined ? SKIP : String(selected)}
                    onValueChange={(value) =>
                      onChange(
                        field,
                        value === SKIP ? undefined : Number(value)
                      )
                    }
                  >
                    <SelectTrigger className="h-8 min-w-[8rem] text-[12px]">
                      <SelectValue placeholder={t("crm.import.skipColumn")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SKIP}>
                        {t("crm.import.skipColumn")}
                      </SelectItem>
                      {sheet.headers.map((header, idx) => (
                        <SelectItem key={`${header}-${idx}`} value={String(idx)}>
                          {header || t("crm.import.unnamedColumn", { index: String(idx + 1) })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="hidden max-w-[180px] truncate px-2 py-1.5 text-muted-foreground sm:table-cell">
                  {sample.length > 0 ? sample.join(" · ") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
