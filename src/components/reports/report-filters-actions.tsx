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
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 touch-manipulation sm:min-h-9"
          onClick={onReset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {t("analytics.resetFilters")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 touch-manipulation sm:min-h-9"
          onClick={() => toast.success(t("analytics.viewSaved"))}
        >
          <Bookmark className="h-3.5 w-3.5" />
          {t("analytics.savedViews")}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 touch-manipulation sm:min-h-9"
          onClick={() => uiExport("CSV")}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          CSV
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 touch-manipulation sm:min-h-9"
          onClick={() => uiExport("Excel")}
        >
          <FileText className="h-3.5 w-3.5" />
          Excel
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 touch-manipulation sm:min-h-9"
          onClick={() => uiExport("PDF")}
        >
          <Download className="h-3.5 w-3.5" />
          PDF
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11 touch-manipulation sm:min-h-9"
          onClick={() => uiExport("Print")}
        >
          <Printer className="h-3.5 w-3.5" />
          {t("analytics.print")}
        </Button>
      </div>
    </div>
  );
}
