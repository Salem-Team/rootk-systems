import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import type { Employee } from "@/types";
import type { PerformanceTarget, TargetPenaltyType } from "@/types/targets";

export const PENALTY_TYPES: TargetPenaltyType[] = [
  "written_warning",
  "performance_note",
  "salary_deduction",
  "bonus_reduction",
  "manager_review",
  "custom",
];

export type WarningFormState = {
  targetId: string;
  employeeId: string;
  reason: string;
  managerNotes: string;
  requiredAction: string;
  penaltyType: TargetPenaltyType;
  penaltyNote: string;
};

export function emptyWarningForm(): WarningFormState {
  return {
    targetId: "",
    employeeId: "",
    reason: "",
    managerNotes: "",
    requiredAction: "",
    penaltyType: "written_warning",
    penaltyNote: "",
  };
}

export function WarningSendSheet({
  open,
  onOpenChange,
  targets,
  employees,
  form,
  setForm,
  onTargetChange,
  saving,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: PerformanceTarget[];
  employees: Map<string, Employee>;
  form: WarningFormState;
  setForm: (updater: (f: WarningFormState) => WarningFormState) => void;
  onTargetChange: (targetId: string) => void;
  saving: boolean;
  onSend: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const selectedTarget = targets.find((tg) => tg.id === form.targetId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("targets.warnings.send")}</SheetTitle>
          <SheetDescription>{t("targets.warnings.sendDesc")}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-3.5 py-4">
          <div className="space-y-1.5">
            <Label>{t("targets.warnings.target")}</Label>
            <Select value={form.targetId} onValueChange={onTargetChange}>
              <SelectTrigger>
                <SelectValue placeholder={t("targets.warnings.target")} />
              </SelectTrigger>
              <SelectContent>
                {targets.map((tg) => (
                  <SelectItem key={tg.id} value={tg.id}>
                    {tg.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("targets.warnings.employee")}</Label>
            <Select
              value={form.employeeId}
              onValueChange={(employeeId) => setForm((f) => ({ ...f, employeeId }))}
              disabled={!selectedTarget}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("targets.warnings.employee")} />
              </SelectTrigger>
              <SelectContent>
                {(selectedTarget?.assigneeIds ?? []).map((id) => (
                  <SelectItem key={id} value={id}>
                    {employees.get(id)?.name ?? id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("targets.warnings.reason")}</Label>
            <Textarea
              rows={3}
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("targets.warnings.managerNotes")}</Label>
            <Textarea
              rows={2}
              value={form.managerNotes}
              onChange={(e) => setForm((f) => ({ ...f, managerNotes: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("targets.warnings.requiredAction")}</Label>
            <Input
              value={form.requiredAction}
              onChange={(e) => setForm((f) => ({ ...f, requiredAction: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label>{t("targets.warnings.penaltyType")}</Label>
              <Select
                value={form.penaltyType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, penaltyType: v as TargetPenaltyType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PENALTY_TYPES.map((pt) => (
                    <SelectItem key={pt} value={pt}>
                      {t(`targets.warnings.penaltyTypes.${pt}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("targets.warnings.penaltyNote")}</Label>
              <Input
                value={form.penaltyNote}
                onChange={(e) => setForm((f) => ({ ...f, penaltyNote: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <div className="mt-auto flex justify-end gap-2 border-t border-border/60 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button disabled={saving} onClick={() => void onSend()}>
            {saving ? <Loader2 className="animate-spin" /> : <Send className="h-4 w-4" />}
            {t("targets.warnings.send")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
