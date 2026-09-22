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
  companyLocation: "crm.import.fields.companyLocation",
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
  /** Keep the sample column visible on small screens. */
  alwaysShowSample?: boolean;
}

/** Map spreadsheet columns onto canonical CRM lead fields. */
export function CrmLeadsColumnMapping({
  sheet,
  mapping,
  samples,
  onChange,
  emphasizeRequired = false,
  alwaysShowSample = false,
}: CrmLeadsColumnMappingProps) {
  const { t } = useTranslation();
  const fields = emphasizeRequired
    ? [
        ...CRM_LEAD_CSV_HEADERS.filter((f) => isCrmLeadRequiredField(f)),
        ...CRM_LEAD_CSV_HEADERS.filter((f) => !isCrmLeadRequiredField(f)),
      ]
    : [...CRM_LEAD_CSV_HEADERS];

  return (
    <div className="max-h-[min(22rem,50vh)] overflow-auto overscroll-contain rounded-xl border border-border/60">
      <ul className="divide-y divide-border/45">
        {fields.map((field) => {
          const required = isCrmLeadRequiredField(field);
          const selected = mapping[field];
          const sample =
            selected === undefined ? [] : (samples.get(selected) ?? []);
          const mapped = selected !== undefined;
          const sampleText = sample.length > 0 ? sample.join(" · ") : "";

          return (
            <li
              key={field}
              className={cn(
                "grid gap-2 px-3 py-3 sm:grid-cols-[minmax(7.5rem,0.9fr)_minmax(9rem,1fr)_minmax(0,1.2fr)] sm:items-start sm:gap-3 sm:px-3.5 sm:py-2.5",
                emphasizeRequired && required && !mapped && "bg-amber-500/[0.04]",
                emphasizeRequired && required && mapped && "bg-primary/[0.02]"
              )}
            >
              <div className="min-w-0">
                <p className="text-[13px] font-semibold leading-snug text-foreground sm:text-[12px]">
                  <span>{t(FIELD_LABEL[field])}</span>
                  {required ? (
                    <span
                      className="ms-1 font-semibold text-rose-600"
                      title="required"
                    >
                      *
                    </span>
                  ) : emphasizeRequired ? (
                    <span className="ms-1.5 text-[11px] font-normal text-muted-foreground">
                      {t("crm.coldImport.optional")}
                    </span>
                  ) : null}
                </p>
              </div>

              <Select
                value={selected === undefined ? SKIP : String(selected)}
                onValueChange={(value) =>
                  onChange(field, value === SKIP ? undefined : Number(value))
                }
              >
                <SelectTrigger
                  className={cn(
                    "h-11 w-full min-w-0 rounded-xl text-[13px] touch-manipulation sm:h-9 sm:rounded-lg sm:text-[12px]",
                    emphasizeRequired &&
                      required &&
                      !mapped &&
                      "border-amber-500/45"
                  )}
                >
                  <SelectValue placeholder={t("crm.import.skipColumn")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SKIP}>
                    {t("crm.import.skipColumn")}
                  </SelectItem>
                  {sheet.headers.map((header, idx) => (
                    <SelectItem key={`${header}-${idx}`} value={String(idx)}>
                      {header ||
                        t("crm.import.unnamedColumn", {
                          index: String(idx + 1),
                        })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div
                className={cn(
                  "min-w-0 rounded-lg bg-muted/35 px-2.5 py-2 text-[12px] leading-relaxed text-muted-foreground break-words",
                  !alwaysShowSample && "hidden sm:block",
                  !sampleText && "text-muted-foreground/55"
                )}
                title={sampleText || undefined}
              >
                {sampleText || "—"}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
