import {
  Bookmark,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

export function ReportFiltersActions({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation();

  function uiExport(kind: string) {
    toast.success(t("analytics.exportQueued", { kind }));
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          {t("analytics.resetFilters")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => toast.success(t("analytics.viewSaved"))}
        >
          <Bookmark className="h-3.5 w-3.5" />
          {t("analytics.savedViews")}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => uiExport("CSV")}>
          <FileSpreadsheet className="h-3.5 w-3.5" />
          CSV
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => uiExport("Excel")}>
          <FileText className="h-3.5 w-3.5" />
          Excel
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => uiExport("PDF")}>
          <Download className="h-3.5 w-3.5" />
          PDF
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => uiExport("Print")}>
          <Printer className="h-3.5 w-3.5" />
          {t("analytics.print")}
        </Button>
      </div>
    </div>
  );
}
