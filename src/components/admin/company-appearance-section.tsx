import { motion } from "framer-motion";
import { Globe2, Moon, Palette, Sun } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import { fadeInUp } from "@/lib/animations";
import type { CompanySettings } from "@/types";

export function CompanyAppearanceSection({
  form,
  mounted,
  theme,
  onAppearanceChange,
  onLanguageChange,
}: {
  form: CompanySettings;
  mounted: boolean;
  theme: string | undefined;
  onAppearanceChange: (appearance: CompanySettings["appearance"]) => void;
  onLanguageChange: (language: CompanySettings["language"]) => void;
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
          <Palette className="h-3.5 w-3.5 text-primary" aria-hidden />
          {t("settings.appearance")}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t("settings.appearanceDesc")}
          {mounted ? ` · ${theme ?? t("common.system")}` : ""}
        </p>
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
          {t("admin.companyDefaultsHint")}
        </p>
      </div>
      <div className="panel-body grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("settings.theme")}</Label>
          <Select
            value={form.appearance}
            onValueChange={(v) =>
              onAppearanceChange(v as CompanySettings["appearance"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="system">
                <span className="inline-flex items-center gap-2">
                  <Globe2 className="h-4 w-4" /> {t("common.system")}
                </span>
              </SelectItem>
              <SelectItem value="light">
                <span className="inline-flex items-center gap-2">
                  <Sun className="h-4 w-4" /> {t("common.light")}
                </span>
              </SelectItem>
              <SelectItem value="dark">
                <span className="inline-flex items-center gap-2">
                  <Moon className="h-4 w-4" /> {t("common.dark")}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("settings.languageSection")}</Label>
          <Select
            value={form.language}
            onValueChange={(v) =>
              onLanguageChange(v as CompanySettings["language"])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t("common.english")}</SelectItem>
              <SelectItem value="ar">{t("common.arabic")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.section>
  );
}
