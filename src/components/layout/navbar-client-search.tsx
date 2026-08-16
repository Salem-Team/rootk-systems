"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavbarClientSearch } from "@/hooks/use-navbar-client-search";
import { useTranslation } from "@/hooks/use-translation";
import { displayCrmPhone } from "@/lib/crm/phone-links";
import { cn } from "@/lib/utils";

/** Global header search for CRM clients (name or phone). */
export function NavbarClientSearch() {
  const { t } = useTranslation();
  const search = useNavbarClientSearch();

  return (
    <div ref={search.rootRef} className="relative hidden max-w-sm flex-1 md:block">
      <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/80" />
      <Input
        value={search.query}
        onChange={(e) => search.onQueryChange(e.target.value)}
        onFocus={() => search.setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") search.setOpen(false);
        }}
        placeholder={t("common.search")}
        className="h-9 border-border/55 bg-muted/40 ps-8 shadow-none transition-colors placeholder:text-muted-foreground/55 hover:bg-muted/55 focus-visible:border-primary/30 focus-visible:bg-card focus-visible:shadow-sm"
        aria-label={t("common.searchAria")}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={!search.canSearch}
      />

      {search.showPanel ? (
        <div
          className={cn(
            "absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-border bg-popover shadow-[var(--shadow-card-hover)]"
          )}
          role="listbox"
          aria-label={t("common.searchClients")}
        >
          {search.query.trim().length < search.minQuery ? (
            <p className="px-3 py-2.5 text-[12px] text-muted-foreground">
              {t("common.searchHint")}
            </p>
          ) : search.loading && search.result.items.length === 0 ? (
            <p className="px-3 py-2.5 text-[12px] text-muted-foreground">
              {t("common.loading")}
            </p>
          ) : search.result.total === 0 ? (
            <p className="px-3 py-2.5 text-[12px] text-muted-foreground">
              {t("common.noResults")}
            </p>
          ) : (
            <>
              <ul className="max-h-72 overflow-y-auto p-1">
                {search.result.items.map((lead) => (
                  <li key={lead.id}>
                    <button
                      type="button"
                      role="option"
                      onClick={() => search.openLead(lead)}
                      className="flex w-full flex-col items-stretch rounded-lg px-2.5 py-2 text-start hover:bg-muted/70"
                    >
                      <span className="truncate text-[13px] font-semibold">
                        {lead.name}
                      </span>
                      <span className="truncate font-mono text-[11px] tabular-nums text-muted-foreground">
                        {displayCrmPhone(lead.phone, lead.phoneNormalized)}
                        {lead.companyName ? ` · ${lead.companyName}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {search.result.totalPages > 1 ? (
                <div className="flex items-center justify-between gap-2 border-t border-border/60 px-2.5 py-1.5">
                  <p className="text-[11px] text-muted-foreground">
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
        </div>
      ) : null}
    </div>
  );
}
