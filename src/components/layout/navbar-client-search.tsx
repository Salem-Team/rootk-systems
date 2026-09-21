"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavbarClientSearch } from "@/hooks/use-navbar-client-search";
import { useTranslation } from "@/hooks/use-translation";
import { displayCrmPhone } from "@/lib/crm/phone-links";
import { cn } from "@/lib/utils";
import type { CrmLead } from "@/types/crm";
import { BidiText } from "@/components/shared/bidi-text";

/** Global header search for CRM clients (name or phone). */
export function NavbarClientSearch() {
  const { t } = useTranslation();
  const search = useNavbarClientSearch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const id = window.setTimeout(() => mobileInputRef.current?.focus(), 30);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  function closeMobile() {
    setMobileOpen(false);
    search.setOpen(false);
  }

  function pickLead(lead: CrmLead) {
    search.openLead(lead);
    setMobileOpen(false);
  }

  const results = (
    <>
      {search.query.trim().length < search.minQuery ? (
        <p className="px-3 py-3 text-sm text-muted-foreground md:py-2.5 md:text-[12px]">
          {t("common.searchHint")}
        </p>
      ) : search.loading && search.result.items.length === 0 ? (
        <p className="px-3 py-3 text-sm text-muted-foreground md:py-2.5 md:text-[12px]">
          {t("common.loading")}
        </p>
      ) : search.result.total === 0 ? (
        <p className="px-3 py-3 text-sm text-muted-foreground md:py-2.5 md:text-[12px]">
          {t("common.noResults")}
        </p>
      ) : (
        <>
          <ul className="overflow-y-auto p-1.5 md:max-h-72 md:p-1">
            {search.result.items.map((lead) => (
              <li key={lead.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => pickLead(lead)}
                  className="flex w-full flex-col items-stretch rounded-xl px-3 py-3 text-start hover:bg-muted/70 active:bg-muted md:rounded-lg md:px-2.5 md:py-2"
                >
                  <span className="truncate text-[15px] font-semibold md:text-[13px]">
                    <BidiText text={lead.name} />
                  </span>
                  <span className="mt-0.5 truncate font-mono text-[13px] tabular-nums text-muted-foreground md:text-[11px]">
                    {displayCrmPhone(lead.phone, lead.phoneNormalized)}
                    {lead.companyName ? ` · ${lead.companyName}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {search.result.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2 md:px-2.5 md:py-1.5">
              <p className="text-xs text-muted-foreground md:text-[11px]">
                {t("crm.leads.pageOf", {
                  page: String(search.result.page),
                  total: String(search.result.totalPages),
                })}
              </p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  disabled={search.result.page <= 1}
                  onClick={() => search.setPage((p) => Math.max(1, p - 1))}
                  aria-label={t("crm.leads.prev")}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  disabled={search.result.page >= search.result.totalPages}
                  onClick={() => search.setPage((p) => p + 1)}
                  aria-label={t("crm.leads.next")}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </>
  );

  const inputProps = {
    value: search.query,
    onChange: (e: ChangeEvent<HTMLInputElement>) =>
      search.onQueryChange(e.target.value),
    onFocus: () => search.setOpen(true),
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        if (mobileOpen) closeMobile();
        else search.setOpen(false);
      }
    },
    placeholder: t("common.search"),
    "aria-label": t("common.searchAria"),
    "aria-autocomplete": "list" as const,
    autoComplete: "off" as const,
    disabled: !search.canSearch,
  };

  return (
    <>
      {/* Mobile: icon opens full-width search sheet */}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={() => {
          setMobileOpen(true);
          search.setOpen(true);
        }}
        aria-label={t("common.searchAria")}
        disabled={!search.canSearch}
      >
        <Search className="h-4 w-4" />
      </Button>

      {mobileOpen ? (
        <div
          ref={search.rootRef}
          className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t("common.searchClients")}
        >
          <div className="flex h-[3.25rem] shrink-0 items-center gap-2 border-b border-border/70 px-2.5 chrome-bar sm:h-[3.4rem]">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/80" />
              <Input
                ref={mobileInputRef}
                {...inputProps}
                className="h-10 border-border/55 bg-muted/40 ps-10 text-base shadow-none placeholder:text-muted-foreground/55 focus-visible:border-primary/30 focus-visible:bg-card"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={closeMobile}
              aria-label={t("common.close")}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto"
            role="listbox"
            aria-label={t("common.searchClients")}
          >
            {search.showPanel || search.query.trim().length > 0 ? (
              results
            ) : (
              <p className="px-4 py-4 text-sm text-muted-foreground">
                {t("common.searchHint")}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* Desktop / tablet: inline search */}
      <div
        ref={mobileOpen ? undefined : search.rootRef}
        className="relative hidden min-w-0 w-full flex-1 md:block"
      >
        <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/80" />
        <Input
          {...inputProps}
          className="h-9 w-full border-border/55 bg-muted/40 ps-8 shadow-none transition-colors placeholder:text-muted-foreground/55 hover:bg-muted/55 focus-visible:border-primary/30 focus-visible:bg-card focus-visible:shadow-sm"
        />

        {search.showPanel ? (
          <div
            className={cn(
              "absolute inset-x-0 top-[calc(100%+6px)] z-50 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--shadow-card-hover)]"
            )}
            role="listbox"
            aria-label={t("common.searchClients")}
          >
            {results}
          </div>
        ) : null}
      </div>
    </>
  );
}
