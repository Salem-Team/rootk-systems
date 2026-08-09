import { motion } from "framer-motion";
import { Database, Loader2, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import type { useDemoData } from "@/hooks/use-demo-data";

export function CompanyDemoDataSection({
  demo,
}: {
  demo: ReturnType<typeof useDemoData>;
}) {
  const { t } = useTranslation();

  return (
    <motion.section
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className="surface-panel overflow-hidden"
    >
      <div className="panel-header">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold">
          <Database className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("settings.demoData")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("settings.demoDataDesc")}
        </p>
      </div>
      <div className="panel-body flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          variant="outline"
          className="border-primary/20"
          disabled={demo.busy !== null}
          onClick={() => {
            if (window.confirm(t("settings.resetDemoConfirm"))) {
              void demo.resetDemoData();
            }
          }}
        >
          {demo.busy === "reset" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RotateCcw />
          )}
          {t("settings.resetDemo")}
        </Button>
        <Button
          variant="outline"
          disabled={demo.busy !== null}
          onClick={() => void demo.generateSampleData()}
        >
          {demo.busy === "generate" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Sparkles />
          )}
          {t("settings.generateSample")}
        </Button>
        <Button
          variant="outline"
          className="border-destructive/30 text-destructive hover:bg-destructive/10"
          disabled={demo.busy !== null}
          onClick={() => {
            if (window.confirm(t("settings.clearDataConfirm"))) {
              void demo.clearData();
            }
          }}
        >
          {demo.busy === "clear" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Trash2 />
          )}
          {t("settings.clearData")}
        </Button>
      </div>
    </motion.section>
  );
}
