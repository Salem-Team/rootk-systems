"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Building2,
  ClipboardList,
  Loader2,
  Save,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { BidiText } from "@/components/shared/bidi-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "@/hooks/use-translation";
import {
  composeCrmBudget,
  composeCrmRequest,
  CRM_BUDGET_TIERS,
  CRM_REQUEST_INDUSTRIES,
  CRM_REQUEST_PRODUCTS,
  parseCrmBudget,
  parseCrmRequest,
  type CrmBudgetTier,
  type CrmRequestIndustry,
  type CrmRequestProduct,
} from "@/lib/crm/request-budget-presets";
import { duration, easeOutExpo, snappySpring, staggerDense } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { updateCrmLead } from "@/services/crm.service";
import type { CrmLead } from "@/types/crm";

function toggleValue<T extends string>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Chip({
  selected,
  onClick,
  children,
  reduceMotion,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      transition={snappySpring}
      className={cn(
        "inline-flex min-h-10 touch-manipulation items-center justify-center rounded-xl border px-3 text-[12.5px] font-semibold transition-colors duration-200 sm:min-h-9 sm:rounded-lg sm:px-2.5 sm:text-[12px]",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border/80 bg-background/80 text-foreground hover:border-primary/35 hover:bg-primary/[0.06]"
      )}
      aria-pressed={selected}
    >
      {children}
    </motion.button>
  );
}

/** Quick request + budget editor on the lead sheet overview. */
export function CrmLeadRequestBudgetEditor({
  lead,
  onSaved,
  className,
}: {
  lead: CrmLead;
  onSaved?: () => void;
  className?: string;
}) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const lang = locale === "ar" ? "ar" : "en";

  const [products, setProducts] = useState<CrmRequestProduct[]>([]);
  const [industries, setIndustries] = useState<CrmRequestIndustry[]>([]);
  const [notes, setNotes] = useState("");
  const [budgetTier, setBudgetTier] = useState<CrmBudgetTier | null>(null);
  const [budgetCustom, setBudgetCustom] = useState("");
  const [budgetMode, setBudgetMode] = useState<"tier" | "custom">("tier");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const parsedReq = parseCrmRequest(lead.request ?? "");
    const parsedBud = parseCrmBudget(lead.budget ?? "");
    setProducts(parsedReq.products);
    setIndustries(parsedReq.industries);
    setNotes(parsedReq.notes);
    setBudgetTier(parsedBud.tier);
    setBudgetCustom(parsedBud.custom);
    setBudgetMode(parsedBud.tier ? "tier" : parsedBud.custom ? "custom" : "tier");
  }, [lead.id, lead.request, lead.budget]);

  const composedRequest = useMemo(
    () =>
      composeCrmRequest(
        products,
        industries,
        notes,
        lang,
        (id) => t(`crm.requestBudget.products.${id}`),
        (id) => t(`crm.requestBudget.industries.${id}`)
      ),
    [products, industries, notes, lang, t]
  );

  const composedBudget = useMemo(() => {
    if (budgetMode === "custom") return budgetCustom.trim();
    return composeCrmBudget(budgetTier, "", (tier) =>
      t(`crm.requestBudget.budgetTiers.${tier}`)
    );
  }, [budgetMode, budgetCustom, budgetTier, t]);

  const dirty =
    composedRequest.trim() !== (lead.request ?? "").trim() ||
    composedBudget.trim() !== (lead.budget ?? "").trim();

  const hasRequest =
    products.length > 0 || industries.length > 0 || notes.trim().length > 0;
  const hasBudget =
    budgetMode === "tier" ? budgetTier != null : budgetCustom.trim().length > 0;

  /** Allow saving when something changed and at least request or budget is filled. */
  const canSave = dirty && (hasRequest || hasBudget);

  async function save() {
    if (!canSave) return;
    setSaving(true);
    const res = await updateCrmLead(lead.id, {
      request: composedRequest.trim(),
      budget: composedBudget.trim(),
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    toast.success(t("crm.toast.leadUpdated"));
    onSaved?.();
  }

  function selectTier(tier: CrmBudgetTier) {
    setBudgetMode("tier");
    setBudgetTier(tier);
    setBudgetCustom("");
  }

  function selectCustomBudget() {
    setBudgetMode("custom");
    setBudgetTier(null);
  }

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.base, ease: easeOutExpo }}
      className={cn(
        "overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/[0.07] to-primary/[0.02] sm:rounded-xl",
        className
      )}
    >
      <div className="border-b border-primary/15 px-3.5 py-3 sm:px-4 sm:py-3">
        <h3 className="flex items-center gap-2 text-[0.95rem] font-semibold tracking-tight text-primary sm:text-[13px]">
          <ClipboardList className="h-4 w-4 shrink-0" aria-hidden />
          {t("crm.leadForm.requestBudgetSection")}
        </h3>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground sm:text-[11.5px]">
          {t("crm.leadSheet.requestBudgetHint")}
        </p>
      </div>

      <div className="grid gap-4 p-3.5 sm:gap-4 sm:p-4 lg:gap-5">
        {/* Products */}
        <motion.div
          className="grid gap-2"
          variants={staggerDense}
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
        >
          <Label className="flex items-center gap-1.5 text-[13px] font-medium">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {t("crm.requestBudget.productsLabel")}
          </Label>
          <p className="text-[11.5px] text-muted-foreground">
            {t("crm.requestBudget.productsHint")}
          </p>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={t("crm.requestBudget.productsLabel")}
          >
            {CRM_REQUEST_PRODUCTS.map((id) => (
              <Chip
                key={id}
                selected={products.includes(id)}
                reduceMotion={reduceMotion}
                onClick={() => setProducts((prev) => toggleValue(prev, id))}
              >
                {t(`crm.requestBudget.products.${id}`)}
              </Chip>
            ))}
          </div>
        </motion.div>

        {/* Industries */}
        <div className="grid gap-2">
          <Label className="flex items-center gap-1.5 text-[13px] font-medium">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {t("crm.requestBudget.industriesLabel")}
          </Label>
          <p className="text-[11.5px] text-muted-foreground">
            {t("crm.requestBudget.industriesHint")}
          </p>
          <div className="flex flex-wrap gap-2">
            {CRM_REQUEST_INDUSTRIES.map((id) => (
              <Chip
                key={id}
                selected={industries.includes(id)}
                reduceMotion={reduceMotion}
                onClick={() => setIndustries((prev) => toggleValue(prev, id))}
              >
                {t(`crm.requestBudget.industries.${id}`)}
              </Chip>
            ))}
          </div>
        </div>

        {/* Custom notes */}
        <div className="grid gap-1.5">
          <Label
            htmlFor={`crm-rb-notes-${lead.id}`}
            className="text-[13px] font-medium"
          >
            {t("crm.requestBudget.notesLabel")}
          </Label>
          <Textarea
            id={`crm-rb-notes-${lead.id}`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t("crm.requestBudget.notesPlaceholder")}
            className="min-h-[5.5rem] rounded-xl border-border/80 bg-background/90 text-base leading-relaxed transition-[box-shadow,border-color] duration-200 focus-visible:border-primary/40 focus-visible:ring-primary/20 sm:min-h-[4.75rem] sm:rounded-lg sm:text-sm"
          />
        </div>

        {/* Budget */}
        <div className="grid gap-2">
          <Label className="flex items-center gap-1.5 text-[13px] font-medium">
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {t("crm.leadForm.budget")}
          </Label>
          <p className="text-[11.5px] text-muted-foreground">
            {t("crm.requestBudget.budgetHint")}
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {CRM_BUDGET_TIERS.map((tier) => {
              const selected = budgetMode === "tier" && budgetTier === tier;
              return (
                <motion.button
                  key={tier}
                  type="button"
                  onClick={() => selectTier(tier)}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  transition={snappySpring}
                  className={cn(
                    "flex min-h-[3.25rem] touch-manipulation flex-col items-start justify-center rounded-xl border px-3 py-2 text-start transition-all duration-200 sm:min-h-[3rem] sm:rounded-lg",
                    selected
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-border/80 bg-background/90 hover:border-primary/35 hover:bg-primary/[0.05]"
                  )}
                  aria-pressed={selected}
                >
                  <span className="text-[12.5px] font-semibold leading-snug sm:text-[12px]">
                    <BidiText text={t(`crm.requestBudget.budgetTiers.${tier}`)} />
                  </span>
                </motion.button>
              );
            })}

            <motion.button
              type="button"
              onClick={selectCustomBudget}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              transition={snappySpring}
              className={cn(
                "flex min-h-[3.25rem] touch-manipulation flex-col items-start justify-center rounded-xl border px-3 py-2 text-start transition-all duration-200 sm:min-h-[3rem] sm:rounded-lg",
                budgetMode === "custom"
                  ? "border-primary bg-primary text-primary-foreground shadow-md"
                  : "border-dashed border-border bg-background/60 hover:border-primary/40 hover:bg-primary/[0.05]"
              )}
              aria-pressed={budgetMode === "custom"}
            >
              <span className="text-[12.5px] font-semibold leading-snug sm:text-[12px]">
                {t("crm.requestBudget.budgetCustom")}
              </span>
            </motion.button>
          </div>

          <AnimatePresence initial={false}>
            {budgetMode === "custom" ? (
              <motion.div
                key="budget-custom"
                initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                transition={{ duration: duration.fast, ease: easeOutExpo }}
                className="overflow-hidden"
              >
                <Input
                  id={`crm-rb-budget-${lead.id}`}
                  value={budgetCustom}
                  onChange={(e) => setBudgetCustom(e.target.value)}
                  placeholder={t("crm.requestBudget.budgetCustomPlaceholder")}
                  className="mt-2 h-12 rounded-xl text-base transition-[box-shadow,border-color] duration-200 focus-visible:border-primary/40 sm:h-10 sm:rounded-lg sm:text-sm"
                  enterKeyHint="done"
                  autoFocus
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <Button
          type="button"
          size="sm"
          className={cn(
            "h-12 min-h-12 w-full touch-manipulation rounded-xl text-[0.95rem] transition-all duration-200 sm:h-10 sm:min-h-10 sm:rounded-lg sm:text-sm",
            canSave
              ? "shadow-sm hover:shadow-md"
              : "opacity-55"
          )}
          disabled={!canSave || saving}
          onClick={() => void save()}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t("crm.leadSheet.saveRequestBudget")}
        </Button>
      </div>
    </motion.section>
  );
}
