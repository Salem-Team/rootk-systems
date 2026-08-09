import { motion } from "framer-motion";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Time12Input } from "@/components/ui/time-12-input";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import { cn } from "@/lib/utils";
import type { TranslationPath } from "@/i18n";
import type { ShiftDefinition } from "@/types/org";
import { timeToPercent } from "./shift-constants";

export function ShiftListItem({
  shift,
  busy,
  onUpdate,
  onSave,
  onDelete,
}: {
  shift: ShiftDefinition;
  busy: boolean;
  onUpdate: (updater: (s: ShiftDefinition) => ShiftDefinition) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const start = timeToPercent(shift.start);
  let end = timeToPercent(shift.end);
  const wraps = end <= start;
  if (wraps) end += 100;
  const width = Math.min(end - start, 100 - start);
  const label = shift.nameKey ? t(shift.nameKey as TranslationPath) : shift.name;

  return (
    <motion.li
      variants={fadeInUp}
      className={cn(
        "rounded-xl border border-border/70 bg-muted/15 p-3.5",
        !shift.active && "opacity-60"
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={shift.name}
            onChange={(e) =>
              onUpdate((s) => ({ ...s, name: e.target.value, nameKey: undefined }))
            }
            aria-label={t("common.name")}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Time12Input
              className="w-[13.5rem]"
              value={shift.start}
              onChange={(startTime) => onUpdate((s) => ({ ...s, start: startTime }))}
              aria-label={t("schedule.fromTime")}
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Time12Input
              className="w-[13.5rem]"
              value={shift.end}
              onChange={(endTime) => onUpdate((s) => ({ ...s, end: endTime }))}
              aria-label={t("schedule.toTime")}
            />
          </div>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={shift.active}
            onCheckedChange={(on) => onUpdate((s) => ({ ...s, active: on }))}
            aria-label={label}
          />
          <Button size="sm" variant="outline" disabled={busy} onClick={onSave}>
            {busy ? <Loader2 className="animate-spin" /> : <Save />}
            {t("common.save")}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={busy}
            onClick={onDelete}
            aria-label={t("common.delete")}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      <div
        className="relative h-3 overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${shift.start} to ${shift.end}`}
      >
        <span
          className={cn("absolute inset-y-0 rounded-full opacity-90", shift.color)}
          style={{ left: `${start}%`, width: `${width}%` }}
        />
      </div>
    </motion.li>
  );
}
