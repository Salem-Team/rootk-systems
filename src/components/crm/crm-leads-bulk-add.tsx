"use client";

import { useState } from "react";
import { ListPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCrmLeadsBulkAdd } from "@/hooks/use-crm-leads-bulk-add";
import type { Employee } from "@/types";
import type { CrmBusinessType, CrmStage } from "@/types/crm";

interface CrmLeadsBulkAddProps {
  stages: CrmStage[];
  businessTypes?: CrmBusinessType[];
  employees: Employee[];
  canAssign?: boolean;
  onImported?: () => void;
  size?: "default" | "sm";
  className?: string;
}

/** Paste Egyptian mobiles (optionally with names) and create several leads at once. */
export function CrmLeadsBulkAdd({
  stages,
  businessTypes,
  employees,
  canAssign = false,
  onImported,
  size = "default",
  className,
}: CrmLeadsBulkAddProps) {
  const [open, setOpen] = useState(false);
  const bulk = useCrmLeadsBulkAdd({
    stages,
    businessTypes,
    employees,
    canAssign,
    onImported,
  });
  const { t } = bulk;

  function close() {
    setOpen(false);
    bulk.reset();
  }

  async function submit() {
    const done = await bulk.submit();
    if (done) close();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={size}
        className={className}
        onClick={() => {
          bulk.hydrateDefaults();
          setOpen(true);
        }}
      >
        <ListPlus className="h-4 w-4" />
        {t("crm.actions.bulkAdd")}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
          else {
            bulk.hydrateDefaults();
            setOpen(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("crm.bulkAdd.title")}</DialogTitle>
            <DialogDescription>{t("crm.bulkAdd.description")}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="crm-bulk-leads">{t("crm.bulkAdd.listLabel")}</Label>
              <Textarea
                id="crm-bulk-leads"
                value={bulk.raw}
                onChange={(e) => bulk.setRaw(e.target.value)}
                placeholder={t("crm.bulkAdd.placeholder")}
                className="min-h-[160px] font-mono text-[13px]"
              />
              <p className="text-[12px] text-muted-foreground">{t("crm.bulkAdd.hint")}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>{t("crm.leadForm.source")}</Label>
                <Select
                  value={bulk.source}
                  onValueChange={(v) => bulk.setSource(v as typeof bulk.source)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {bulk.sources.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`crm.source.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>{t("crm.leadForm.stage")}</Label>
                <Select
                  value={bulk.stageId || undefined}
                  onValueChange={bulk.setStageId}
                  disabled={bulk.activeStages.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("crm.leadForm.selectStage")} />
                  </SelectTrigger>
                  <SelectContent>
                    {bulk.activeStages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {bulk.canAssign ? (
                <div className="grid gap-1.5">
                  <Label>{t("crm.leadForm.owner")}</Label>
                  <Select
                    value={bulk.ownerEmployeeId}
                    onValueChange={bulk.setOwnerEmployeeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("crm.leadForm.selectOwner")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("crm.leads.unassigned")}</SelectItem>
                      {bulk.safeEmployees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              {bulk.activeBusinessTypes.length > 0 ? (
                <div className="grid gap-1.5">
                  <Label>{t("crm.leadForm.businessType")}</Label>
                  <Select
                    value={bulk.businessTypeId}
                    onValueChange={bulk.setBusinessTypeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("crm.leadForm.selectBusinessType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {t("crm.leadForm.noBusinessType")}
                      </SelectItem>
                      {bulk.activeBusinessTypes.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            {bulk.raw.trim() ? (
              <p className="text-[12px] text-muted-foreground">
                {t("crm.bulkAdd.ready", { count: String(bulk.parsed.rows.length) })}
                {bulk.parsed.invalid.length > 0
                  ? ` · ${t("crm.bulkAdd.invalid", { count: String(bulk.parsed.invalid.length) })}`
                  : ""}
                {bulk.parsed.duplicates.length > 0
                  ? ` · ${t("crm.bulkAdd.duplicates", { count: String(bulk.parsed.duplicates.length) })}`
                  : ""}
              </p>
            ) : null}

            {bulk.parsed.truncated ? (
              <p className="text-[12px] text-amber-800 dark:text-amber-200">
                {t("crm.bulkAdd.truncated")}
              </p>
            ) : null}

            {bulk.parsed.rows.length > 0 ? (
              <div className="max-h-40 overflow-auto rounded-md border border-border/70 text-[12px]">
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted/80">
                    <tr className="text-start">
                      <th className="px-2 py-1.5 font-medium">
                        {t("crm.leads.colLead")}
                      </th>
                      <th className="px-2 py-1.5 font-medium">
                        {t("crm.leads.colPhone")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulk.parsed.rows.slice(0, 12).map((row) => (
                      <tr key={row.e164} className="border-t border-border/50">
                        <td className="px-2 py-1.5">{row.name}</td>
                        <td className="px-2 py-1.5 font-mono">{row.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {bulk.parsed.invalid.length > 0 ? (
              <ul className="max-h-24 overflow-auto rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-900 dark:text-amber-200">
                {bulk.parsed.invalid.slice(0, 8).map((item) => (
                  <li key={item.raw}>
                    {t("crm.bulkAdd.invalidLine", { line: item.raw })}
                  </li>
                ))}
              </ul>
            ) : null}

            {bulk.summary ? (
              <p className="rounded-md border border-border/70 px-3 py-2 text-[12px]">
                {bulk.summary}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              {t("crm.actions.cancel")}
            </Button>
            <Button
              type="button"
              disabled={bulk.busy || bulk.parsed.rows.length === 0}
              onClick={() => void submit()}
            >
              {bulk.busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("crm.bulkAdd.submit")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
