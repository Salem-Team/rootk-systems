"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/hooks/use-translation";
import type { TargetTemplateItem, TargetType } from "@/types/targets";
import { TemplateItemRow } from "./catalog-template-item-row";

export function TemplateItemsEditor({
  items,
  types,
  typeMap,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: TargetTemplateItem[];
  types: TargetType[];
  typeMap: Map<string, TargetType>;
  onAdd: () => void;
  onUpdate: (index: number, patch: Partial<TargetTemplateItem>) => void;
  onRemove: (index: number) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t("targets.catalog.templateItems")}</Label>
        <Button size="sm" variant="outline" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          {t("targets.catalog.addItem")}
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/70 px-3 py-4 text-center text-[12px] text-muted-foreground">
          {t("targets.catalog.noItems")}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <TemplateItemRow
              key={item.id}
              item={item}
              types={types}
              typeMap={typeMap}
              onUpdate={(patch) => onUpdate(index, patch)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
