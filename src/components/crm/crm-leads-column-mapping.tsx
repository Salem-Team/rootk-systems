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
import { cn } from "@/lib/utils";

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
  request: "crm.import.fields.request",
  budget: "crm.import.fields.budget",
  notes: "crm.import.fields.notes",
};

interface CrmLeadsColumnMappingProps {
  sheet: CrmLeadSpreadsheet;
  mapping: Partial<Record<CrmLeadCsvHeader, number>>;
  samples: Map<number, string[]>;
  onChange: (field: CrmLeadCsvHeader, columnIndex: number | undefined) => void;
  /** Put required fields first and highlight them (cold-call import). */
  emphasizeRequired?: boolean;
}

/** Map spreadsheet columns onto canonical CRM lead fields. */
export function CrmLeadsColumnMapping({
  sheet,
  mapping,
  samples,
  onChange,
  emphasizeRequired = false,
}: CrmLeadsColumnMappingProps) {
  const { t } = useTranslation();
  const fields = emphasizeRequired
    ? [
        ...CRM_LEAD_CSV_HEADERS.filter((f) => isCrmLeadRequiredField(f)),
        ...CRM_LEAD_CSV_HEADERS.filter((f) => !isCrmLeadRequiredField(f)),
      ]
    : [...CRM_LEAD_CSV_HEADERS];

  return (
    <div className="max-h-64 overflow-auto rounded-xl border border-border/70">
      <table className="w-full text-[12px]">
        <thead className="sticky top-0 z-[1] bg-muted/95 backdrop-blur">
          <tr className="text-start">
            <th className="px-3 py-2 font-medium">{t("crm.import.mapField")}</th>
            <th className="px-3 py-2 font-medium">{t("crm.import.mapColumn")}</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell">
              {t("crm.import.mapSample")}
            </th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => {
            const required = isCrmLeadRequiredField(field);
            const selected = mapping[field];
            const sample =
              selected === undefined ? [] : (samples.get(selected) ?? []);
            const mapped = selected !== undefined;
            return (
              <tr
                key={field}
                className={cn(
                  "border-t border-border/50",
                  emphasizeRequired && required && "bg-primary/[0.03]"
                )}
              >
                <td className="px-3 py-2 align-middle">
                  <span className="font-medium">{t(FIELD_LABEL[field])}</span>
                  {required ? (
                    <span className="ms-1 text-rose-600" title="required">
                      *
                    </span>
                  ) : emphasizeRequired ? (
                    <span className="ms-1.5 text-[10px] font-normal text-muted-foreground">
                      {t("crm.coldImport.optional")}
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <Select
                    value={selected === undefined ? SKIP : String(selected)}
                    onValueChange={(value) =>
                      onChange(
                        field,
                        value === SKIP ? undefined : Number(value)
                      )
                    }
                  >
                    <SelectTrigger
                      className={cn(
                        "h-9 min-w-[9rem] text-[12px]",
                        emphasizeRequired &&
                          required &&
                          !mapped &&
                          "border-amber-500/50"
                      )}
                    >
                      <SelectValue placeholder={t("crm.import.skipColumn")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SKIP}>
                        {t("crm.import.skipColumn")}
                      </SelectItem>
                      {sheet.headers.map((header, idx) => (
                        <SelectItem
                          key={`${header}-${idx}`}
                          value={String(idx)}
                        >
                          {header ||
                            t("crm.import.unnamedColumn", {
                              index: String(idx + 1),
                            })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="hidden max-w-[200px] truncate px-3 py-2 text-muted-foreground sm:table-cell">
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
