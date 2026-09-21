"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Building2, Sparkles, Wallet } from "lucide-react";
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
import { duration, easeOutExpo, snappySpring } from "@/lib/animations";
import { cn } from "@/lib/utils";

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

/** Product, industry, notes, and budget chips. Writes composed request/budget strings up. */
export function CrmRequestBudgetFields({
  request,
  budget,
  onRequestChange,
  onBudgetChange,
  notesId = "crm-rb-notes",
  budgetId = "crm-rb-budget",
}: {
  request: string;
  budget: string;
  onRequestChange: (value: string) => void;
  onBudgetChange: (value: string) => void;
  notesId?: string;
  budgetId?: string;
}) {
  const { t, locale } = useTranslation();
  const reduceMotion = useReducedMotion();
  const lang = locale === "ar" ? "ar" : "en";
  const emittedRequest = useRef(request);
  const emittedBudget = useRef(budget);

  const [products, setProducts] = useState<CrmRequestProduct[]>(
    () => parseCrmRequest(request).products
  );
  const [industries, setIndustries] = useState<CrmRequestIndustry[]>(
    () => parseCrmRequest(request).industries
  );
  const [notes, setNotes] = useState(() => parseCrmRequest(request).notes);
  const [budgetTier, setBudgetTier] = useState<CrmBudgetTier | null>(
    () => parseCrmBudget(budget).tier
  );
  const [budgetCustom, setBudgetCustom] = useState(
    () => parseCrmBudget(budget).custom
  );
  const [budgetMode, setBudgetMode] = useState<"tier" | "custom">(() => {
    const parsed = parseCrmBudget(budget);
    return parsed.tier ? "tier" : parsed.custom ? "custom" : "tier";
  });

  function applyRequest(raw: string) {
    const parsed = parseCrmRequest(raw);
    setProducts(parsed.products);
    setIndustries(parsed.industries);
    setNotes(parsed.notes);
  }

  function applyBudget(raw: string) {
    const parsed = parseCrmBudget(raw);
    setBudgetTier(parsed.tier);
    setBudgetCustom(parsed.custom);
    setBudgetMode(parsed.tier ? "tier" : parsed.custom ? "custom" : "tier");
  }

  useEffect(() => {
    if (request === emittedRequest.current) return;
    emittedRequest.current = request;
    applyRequest(request);
  }, [request]);

  useEffect(() => {
    if (budget === emittedBudget.current) return;
    emittedBudget.current = budget;
    applyBudget(budget);
  }, [budget]);

  function publishRequest(
    nextProducts: CrmRequestProduct[],
    nextIndustries: CrmRequestIndustry[],
    nextNotes: string
  ) {
    const next = composeCrmRequest(
      nextProducts,
      nextIndustries,
      nextNotes,
      lang,
      (id) => t(`crm.requestBudget.products.${id}`),
      (id) => t(`crm.requestBudget.industries.${id}`)
    );
    if (next === emittedRequest.current) return;
    emittedRequest.current = next;
    onRequestChange(next);
  }

  function publishBudget(
    mode: "tier" | "custom",
    tier: CrmBudgetTier | null,
    custom: string
  ) {
    const next =
      mode === "custom"
        ? custom.trim()
        : composeCrmBudget(tier, "", (id) => t(`crm.requestBudget.budgetTiers.${id}`));
    if (next === emittedBudget.current) return;
    emittedBudget.current = next;
    onBudgetChange(next);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label className="flex items-center gap-1.5 text-[13px] font-medium">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          {t("crm.requestBudget.productsLabel")}
        </Label>
        <p className="text-[11.5px] text-muted-foreground">
          {t("crm.requestBudget.productsHint")}
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-multiselectable="true">
          {CRM_REQUEST_PRODUCTS.map((id) => (
            <Chip
              key={id}
              selected={products.includes(id)}
              reduceMotion={reduceMotion}
              onClick={() => {
                const next = toggleValue(products, id);
                setProducts(next);
                publishRequest(next, industries, notes);
              }}
            >
              {t(`crm.requestBudget.products.${id}`)}
            </Chip>
          ))}
        </div>
      </div>

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
              onClick={() => {
                const next = toggleValue(industries, id);
                setIndustries(next);
                publishRequest(products, next, notes);
              }}
            >
              {t(`crm.requestBudget.industries.${id}`)}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor={notesId} className="text-[13px] font-medium">
          {t("crm.requestBudget.notesLabel")}
        </Label>
        <Textarea
          id={notesId}
          value={notes}
          onChange={(e) => {
            const next = e.target.value;
            setNotes(next);
            publishRequest(products, industries, next);
          }}
          rows={3}
          placeholder={t("crm.requestBudget.notesPlaceholder")}
          className="min-h-[5.5rem] rounded-xl border-border/80 bg-background/90 text-base leading-relaxed transition-[box-shadow,border-color] duration-200 focus-visible:border-primary/40 focus-visible:ring-primary/20 sm:min-h-[4.75rem] sm:rounded-lg sm:text-sm"
        />
      </div>

      <div className="grid gap-2">
        <Label className="flex items-center gap-1.5 text-[13px] font-medium">
          <Wallet className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          {t("crm.leadForm.budget")}
        </Label>
        <p className="text-[11.5px] text-muted-foreground">
          {t("crm.requestBudget.budgetHint")}
        </p>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {CRM_BUDGET_TIERS.map((tier) => {
            const selected = budgetMode === "tier" && budgetTier === tier;
            return (
              <motion.button
                key={tier}
                type="button"
                onClick={() => {
                  setBudgetMode("tier");
                  setBudgetTier(tier);
                  setBudgetCustom("");
                  publishBudget("tier", tier, "");
                }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                transition={snappySpring}
                className={cn(
                  "flex min-h-[3.25rem] touch-manipulation items-center rounded-xl border px-3 py-2 text-start transition-all duration-200 sm:min-h-[3rem] sm:rounded-lg",
                  selected
                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                    : "border-border/80 bg-background/90 hover:border-primary/35 hover:bg-primary/[0.05]"
                )}
                aria-pressed={selected}
              >
                <span className="text-[12.5px] font-semibold leading-snug sm:text-[12px]">
                  {t(`crm.requestBudget.budgetTiers.${tier}`)}
                </span>
              </motion.button>
            );
          })}
          <motion.button
            type="button"
            onClick={() => {
              setBudgetMode("custom");
              setBudgetTier(null);
              publishBudget("custom", null, budgetCustom);
            }}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            transition={snappySpring}
            className={cn(
              "flex min-h-[3.25rem] touch-manipulation items-center rounded-xl border px-3 py-2 text-start transition-all duration-200 sm:min-h-[3rem] sm:rounded-lg",
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
                id={budgetId}
                value={budgetCustom}
                onChange={(e) => {
                  const next = e.target.value;
                  setBudgetCustom(next);
                  publishBudget("custom", null, next);
                }}
                placeholder={t("crm.requestBudget.budgetCustomPlaceholder")}
                className="mt-2 h-12 rounded-xl text-base transition-[box-shadow,border-color] duration-200 focus-visible:border-primary/40 sm:h-10 sm:rounded-lg sm:text-sm"
                enterKeyHint="done"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
