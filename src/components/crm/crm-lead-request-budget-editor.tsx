"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Building2,
  ChevronRight,
  ClipboardList,
  Loader2,
  Save,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { BidiText } from "@/components/shared/bidi-text";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function readLead(lead: CrmLead) {
  const parsedReq = parseCrmRequest(lead.request ?? "");
  const parsedBud = parseCrmBudget(lead.budget ?? "");
  return {
    products: parsedReq.products,
    industries: parsedReq.industries,
    notes: parsedReq.notes,
    budgetTier: parsedBud.tier,
    budgetCustom: parsedBud.custom,
    budgetMode: (parsedBud.tier
      ? "tier"
      : parsedBud.custom
        ? "custom"
        : "tier") as "tier" | "custom",
  };
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
        "inline-flex min-h-10 touch-manipulation items-center justify-center rounded-full border px-3.5 text-[13px] font-semibold transition-colors duration-200 sm:min-h-9 sm:text-[12.5px]",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border/80 bg-background text-foreground hover:border-primary/40 hover:bg-primary/[0.06]"
      )}
      aria-pressed={selected}
    >
      {children}
    </motion.button>
  );
}

/** Compact request + budget summary. Editing opens a dialog. */
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

  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<CrmRequestProduct[]>([]);
  const [industries, setIndustries] = useState<CrmRequestIndustry[]>([]);
  const [notes, setNotes] = useState("");
  const [budgetTier, setBudgetTier] = useState<CrmBudgetTier | null>(null);
  const [budgetCustom, setBudgetCustom] = useState("");
  const [budgetMode, setBudgetMode] = useState<"tier" | "custom">("tier");
  const [saving, setSaving] = useState(false);

  const saved = useMemo(() => readLead(lead), [lead]);

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
  const canSave = dirty && (hasRequest || hasBudget);

  const previewProducts = saved.products.slice(0, 5);
  const hiddenProducts = Math.max(0, saved.products.length - previewProducts.length);
  const budgetLabel = (lead.budget ?? "").trim();
  const hasSummary =
    saved.products.length > 0 ||
    saved.industries.length > 0 ||
    saved.notes.trim().length > 0 ||
    budgetLabel.length > 0;

  function openDialog() {
    const next = readLead(lead);
    setProducts(next.products);
    setIndustries(next.industries);
    setNotes(next.notes);
    setBudgetTier(next.budgetTier);
    setBudgetCustom(next.budgetCustom);
    setBudgetMode(next.budgetMode);
    setOpen(true);
  }

  async function save() {
    if (!canSave || saving) return;
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
    setOpen(false);
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
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-haspopup="dialog"
        className={cn(
          "group w-full overflow-hidden rounded-2xl border border-border/70 bg-card text-start shadow-sm transition-all duration-200",
          "hover:border-primary/35 hover:shadow-md",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          className
        )}
      >
        <div className="flex items-start gap-3 px-3.5 py-3.5 sm:px-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="text-[0.98rem] font-semibold tracking-tight text-foreground">
                {t("crm.leadForm.requestBudgetSection")}
              </span>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180"
                aria-hidden
              />
            </span>
            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-muted-foreground">
              {t("crm.leadSheet.requestBudgetHint")}
            </span>
          </span>
        </div>

        <div className="border-t border-border/60 bg-muted/20 px-3.5 py-3 sm:px-4">
          {hasSummary ? (
            <span className="grid gap-2">
              {previewProducts.length > 0 ? (
                <span className="flex flex-wrap gap-1.5">
                  {previewProducts.map((id) => (
                    <span
                      key={id}
                      className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-semibold text-primary"
                    >
                      {id === "ai" ? (
                        <Sparkles className="me-1 h-3 w-3" aria-hidden />
                      ) : null}
                      {t(`crm.requestBudget.products.${id}`)}
                    </span>
                  ))}
                  {hiddenProducts > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[12px] font-semibold text-muted-foreground">
                      +{hiddenProducts}
                    </span>
                  ) : null}
                </span>
              ) : saved.notes.trim() ? (
                <span className="line-clamp-2 text-[13px] leading-relaxed text-foreground">
                  {saved.notes.trim()}
                </span>
              ) : null}

              {saved.industries.length > 0 ? (
                <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="truncate">
                    {saved.industries
                      .map((id) => t(`crm.requestBudget.industries.${id}`))
                      .join(lang === "ar" ? "، " : ", ")}
                  </span>
                </span>
              ) : null}

              {budgetLabel ? (
                <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-foreground">
                  <Wallet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <BidiText text={budgetLabel} />
                </span>
              ) : null}
            </span>
          ) : (
            <span className="block text-[12.5px] text-muted-foreground">
              {t("crm.leadSheet.requestBudgetEmpty")}
            </span>
          )}
        </div>
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (saving) return;
          setOpen(next);
        }}
      >
        <DialogContent
          overlayClassName="z-[70]"
          className="z-[70] flex max-h-[min(92dvh,920px)] flex-col gap-0 overflow-hidden p-0 pt-3 sm:max-w-2xl sm:pt-0"
        >
          <DialogHeader className="shrink-0 border-b border-border/60 bg-gradient-to-b from-primary/[0.08] to-transparent px-4 pb-4 pt-2 sm:px-6 sm:pb-5 sm:pt-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <ClipboardList className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1">
                <DialogTitle>{t("crm.leadForm.requestBudgetSection")}</DialogTitle>
                <DialogDescription className="text-[13px] leading-relaxed">
                  {t("crm.leadSheet.requestBudgetDialogHint")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogBody className="grid gap-4 px-4 py-4 sm:gap-5 sm:px-6 sm:py-5">
            <section className="grid gap-2.5 rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <Label className="flex items-center gap-1.5 text-[13px] font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {t("crm.requestBudget.productsLabel")}
                </Label>
                {products.length > 0 ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                    {t("crm.requestBudget.selectedCount", { count: products.length })}
                  </span>
                ) : null}
              </div>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {t("crm.requestBudget.productsHint")}
              </p>
              <motion.div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={t("crm.requestBudget.productsLabel")}
                variants={staggerDense}
                initial={reduceMotion ? false : "hidden"}
                animate="visible"
              >
                {CRM_REQUEST_PRODUCTS.map((id) => (
                  <Chip
                    key={id}
                    selected={products.includes(id)}
                    reduceMotion={reduceMotion}
                    onClick={() => setProducts((prev) => toggleValue(prev, id))}
                  >
                    {id === "ai" ? (
                      <Sparkles className="me-1 h-3.5 w-3.5" aria-hidden />
                    ) : null}
                    {t(`crm.requestBudget.products.${id}`)}
                  </Chip>
                ))}
              </motion.div>
            </section>

            <section className="grid gap-2.5 rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm sm:p-4">
              <Label className="flex items-center gap-1.5 text-[13px] font-semibold">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {t("crm.requestBudget.industriesLabel")}
              </Label>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
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
            </section>

            <section className="grid gap-2 rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm sm:p-4">
              <Label
                htmlFor={`crm-rb-notes-${lead.id}`}
                className="text-[13px] font-semibold"
              >
                {t("crm.requestBudget.notesLabel")}
              </Label>
              <Textarea
                id={`crm-rb-notes-${lead.id}`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={t("crm.requestBudget.notesPlaceholder")}
                className="min-h-[5.5rem] rounded-xl border-border/80 bg-background text-base leading-relaxed focus-visible:border-primary/40 focus-visible:ring-primary/20 sm:text-sm"
              />
            </section>

            <section className="grid gap-2.5 rounded-2xl border border-border/70 bg-card p-3.5 shadow-sm sm:p-4">
              <Label className="flex items-center gap-1.5 text-[13px] font-semibold">
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                {t("crm.leadForm.budget")}
              </Label>
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                {t("crm.requestBudget.budgetHint")}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                        "flex min-h-12 touch-manipulation items-center rounded-xl border px-3 py-2 text-start transition-all duration-200",
                        selected
                          ? "border-primary bg-primary text-primary-foreground shadow-md"
                          : "border-border/80 bg-background hover:border-primary/35 hover:bg-primary/[0.05]"
                      )}
                      aria-pressed={selected}
                    >
                      <span className="text-[12.5px] font-semibold leading-snug">
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
                    "flex min-h-12 touch-manipulation items-center rounded-xl border px-3 py-2 text-start transition-all duration-200",
                    budgetMode === "custom"
                      ? "border-primary bg-primary text-primary-foreground shadow-md"
                      : "border-dashed border-border bg-background/70 hover:border-primary/40 hover:bg-primary/[0.05]"
                  )}
                  aria-pressed={budgetMode === "custom"}
                >
                  <span className="text-[12.5px] font-semibold leading-snug">
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
                      className="h-12 rounded-xl text-base focus-visible:border-primary/40 sm:h-11 sm:text-sm"
                      enterKeyHint="done"
                      autoFocus
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </section>
          </DialogBody>

          <DialogFooter className="flex-col gap-2 border-border/60 bg-card px-4 py-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6 sm:pb-4">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl sm:h-10"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              className="h-11 rounded-xl sm:h-10 sm:min-w-44"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
