"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import type { TargetTemplateItem, TargetType } from "@/types/targets";

export function TemplateItemRow({
  item,
  types,
  typeMap,
  onUpdate,
  onRemove,
}: {
  item: TargetTemplateItem;
  types: TargetType[];
  typeMap: Map<string, TargetType>;
  onUpdate: (patch: Partial<TargetTemplateItem>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-2 rounded-lg border border-border/70 bg-muted/15 p-2.5">
      <div className="grid grid-cols-3 gap-2">
        <Select
          value={item.typeId}
          onValueChange={(typeId) => {
            const ty = typeMap.get(typeId);
            onUpdate({ typeId, unit: ty?.unit ?? item.unit });
          }}
        >
          <SelectTrigger className="h-9 col-span-3 sm:col-span-1">
            <SelectValue placeholder={t("targets.assign.selectType")} />
          </SelectTrigger>
          <SelectContent>
            {types.map((ty) => (
              <SelectItem key={ty.id} value={ty.id}>
                {ty.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          min={1}
          className="h-9"
          value={item.quantity}
          placeholder={t("targets.assign.fieldQuantity")}
          onChange={(e) => onUpdate({ quantity: Number(e.target.value) || 1 })}
        />
        <Input
          type="number"
          min={0}
          className="h-9"
          value={item.weight}
          placeholder={t("targets.catalog.fieldWeight")}
          onChange={(e) => onUpdate({ weight: Number(e.target.value) || 0 })}
        />
      </div>
      <Button size="icon-sm" variant="ghost" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}
