"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableRow,
} from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/hooks/use-translation";
import { filterAndPaginateClientCallRows } from "@/lib/crm/interaction-analytics";
import { displayCrmPhone } from "@/lib/crm/phone-links";
import type { CrmClientCallRow } from "@/types/crm";

interface CrmInteractionByClientProps {
  rows: CrmClientCallRow[];
  onOpenCalls: (row: CrmClientCallRow, answered: boolean) => void;
}

function ClientIdentity({ row }: { row: CrmClientCallRow }) {
  const phone = displayCrmPhone(row.phone, row.phoneNormalized);
  return (
    <div className="min-w-0">
      <p className="truncate text-[13px] font-semibold">{row.leadName}</p>
      {row.phone ? (
        <p className="truncate font-mono text-[11px] tabular-nums text-muted-foreground">
          {phone}
        </p>
      ) : null}
      {row.ownerEmployeeName ? (
        <p className="truncate text-[11px] text-muted-foreground">
          {row.ownerEmployeeName}
        </p>
      ) : null}
    </div>
  );
}

/** Searchable, paginated by-client interaction table. */
export function CrmInteractionByClient({
  rows,
  onOpenCalls,
}: CrmInteractionByClientProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const sourceKey = `${rows.length}:${rows[0]?.leadId ?? ""}:${rows.at(-1)?.leadId ?? ""}`;

  useEffect(() => {
    setPage(1);
  }, [query, sourceKey]);

  const paged = useMemo(
    () => filterAndPaginateClientCallRows(rows, query, page),
    [rows, query, page]
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("crm.interactions.searchClients")}
            className="h-9 w-full ps-8"
            aria-label={t("crm.interactions.searchClientsAria")}
          />
        </div>
        <p className="shrink-0 text-[12px] text-muted-foreground">
          {t("crm.interactions.resultsCount", {
            shown: String(paged.items.length),
            total: String(paged.total),
          })}
        </p>
      </div>

      {paged.total === 0 ? (
        <div className="p-6">
          <EmptyState compact title={t("crm.interactions.noSearchResults")} />
        </div>
      ) : (
        <>
          <ul className="grid gap-2 p-3 md:hidden">
            {paged.items.map((row) => (
              <li
                key={`${row.leadId}-${row.date}-${row.ownerEmployeeId}`}
                className="rounded-xl border border-border/70 bg-card px-3 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <ClientIdentity row={row} />
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {row.date}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                  <div>
                    <p>{t("crm.interactions.colThatDay")}</p>
                    <p className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
                      {row.contactsThatDay}
                    </p>
                  </div>
                  <div>
                    <p>{t("crm.interactions.colTotal")}</p>
                    <p className="font-mono text-[13px] font-semibold tabular-nums text-foreground">
                      {row.contactsTotal}
                    </p>
                  </div>
                  <div>
                    <p>{t("crm.performance.colActiveCalls")}</p>
                    {row.activeCalls > 0 ? (
                      <button
                        type="button"
                        onClick={() => onOpenCalls(row, true)}
                        className="min-h-9 min-w-9 font-mono text-[13px] font-semibold tabular-nums text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
                      >
                        {row.activeCalls}
                      </button>
                    ) : (
                      <p className="font-mono text-[13px] font-semibold tabular-nums text-emerald-700/50">
                        0
                      </p>
                    )}
                  </div>
                  <div>
                    <p>{t("crm.performance.colInactiveCalls")}</p>
                    {row.inactiveCalls > 0 ? (
                      <button
                        type="button"
                        onClick={() => onOpenCalls(row, false)}
                        className="min-h-9 min-w-9 font-mono text-[13px] font-semibold tabular-nums text-rose-700 underline-offset-2 hover:underline dark:text-rose-400"
                      >
                        {row.inactiveCalls}
                      </button>
                    ) : (
                      <p className="font-mono text-[13px] font-semibold tabular-nums text-rose-700/50">
                        0
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <DataTable>
              <DataTableHeader>
                <DataTableHeaderRow>
                  <DataTableHead>
                    {t("crm.interactions.colClient")}
                  </DataTableHead>
                  <DataTableHead>{t("crm.interactions.colDate")}</DataTableHead>
                  <DataTableHead className="text-end">
                    {t("crm.interactions.colThatDay")}
                  </DataTableHead>
                  <DataTableHead className="text-end">
                    {t("crm.interactions.colTotal")}
                  </DataTableHead>
                  <DataTableHead className="text-end">
                    {t("crm.performance.colActiveCalls")}
                  </DataTableHead>
                  <DataTableHead className="text-end">
                    {t("crm.performance.colInactiveCalls")}
                  </DataTableHead>
                  <DataTableHead className="text-end">
                    {t("crm.interactions.meetings")}
                  </DataTableHead>
                </DataTableHeaderRow>
              </DataTableHeader>
              <DataTableBody>
                {paged.items.map((row) => (
                  <DataTableRow
                    key={`${row.leadId}-${row.date}-${row.ownerEmployeeId}`}
                  >
                    <DataTableCell>
                      <ClientIdentity row={row} />
                    </DataTableCell>
                    <DataTableCell className="font-mono text-[12px] tabular-nums">
                      {row.date}
                    </DataTableCell>
                    <DataTableCell className="text-end font-mono tabular-nums">
                      {row.contactsThatDay}
                    </DataTableCell>
                    <DataTableCell className="text-end font-mono tabular-nums">
                      {row.contactsTotal}
                    </DataTableCell>
                    <DataTableCell className="text-end">
                      {row.activeCalls > 0 ? (
                        <button
                          type="button"
                          onClick={() => onOpenCalls(row, true)}
                          className="min-h-9 min-w-9 px-1 font-mono tabular-nums text-emerald-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-emerald-400"
                          aria-label={`${t("crm.performance.colActiveCalls")}: ${row.activeCalls}`}
                        >
                          {row.activeCalls}
                        </button>
                      ) : (
                        <span className="font-mono tabular-nums text-emerald-700/50 dark:text-emerald-400/50">
                          0
                        </span>
                      )}
                    </DataTableCell>
                    <DataTableCell className="text-end">
                      {row.inactiveCalls > 0 ? (
                        <button
                          type="button"
                          onClick={() => onOpenCalls(row, false)}
                          className="min-h-9 min-w-9 px-1 font-mono tabular-nums text-rose-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-rose-400"
                          aria-label={`${t("crm.performance.colInactiveCalls")}: ${row.inactiveCalls}`}
                        >
                          {row.inactiveCalls}
                        </button>
                      ) : (
                        <span className="font-mono tabular-nums text-rose-700/50 dark:text-rose-400/50">
                          0
                        </span>
                      )}
                    </DataTableCell>
                    <DataTableCell className="text-end font-mono tabular-nums">
                      {row.meetings}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </div>

          {paged.totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-2.5">
              <p className="text-[12px] text-muted-foreground">
                {t("crm.leads.pageOf", {
                  page: String(paged.page),
                  total: String(paged.totalPages),
                })}
              </p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={paged.page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  {t("crm.leads.prev")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={paged.page >= paged.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {t("crm.leads.next")}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
