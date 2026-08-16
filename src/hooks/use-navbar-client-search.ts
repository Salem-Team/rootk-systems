"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { canCrm } from "@/lib/crm-policies";
import { ensurePaginatedLeads } from "@/lib/crm-normalize";
import { emitCrmOpenLead } from "@/lib/events";
import { getCrmLeads } from "@/services/crm.service";
import { useSessionStore } from "@/stores/session-store";
import type { CrmLead, PaginatedLeads } from "@/types/crm";

const PAGE_SIZE = 8;
const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;

const EMPTY_PAGE: PaginatedLeads = {
  items: [],
  total: 0,
  page: 1,
  pageSize: PAGE_SIZE,
  totalPages: 1,
};

/** Header search for CRM clients by name or phone, scoped to the actor's grant. */
export function useNavbarClientSearch() {
  const router = useRouter();
  const role = useSessionStore((s) => s.role);
  const permissions = useSessionStore((s) =>
    s.authenticated ? s.permissions : undefined
  );
  const canSearch = canCrm(role, "view", permissions);

  const rootRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PaginatedLeads>(EMPTY_PAGE);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!canSearch) {
      setResult(EMPTY_PAGE);
      setLoading(false);
      return;
    }
    const q = query.trim();
    if (q.length < MIN_QUERY) {
      requestId.current += 1;
      setResult(EMPTY_PAGE);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void getCrmLeads({
        search: q,
        page,
        pageSize: PAGE_SIZE,
        sort: "updatedAt",
        order: "desc",
      }).then((res) => {
        if (id !== requestId.current) return;
        setResult(ensurePaginatedLeads(res.data));
        setLoading(false);
      }).catch(() => {
        if (id !== requestId.current) return;
        setResult(EMPTY_PAGE);
        setLoading(false);
      });
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [canSearch, query, page]);

  function onQueryChange(value: string) {
    setQuery(value);
    setPage(1);
    setOpen(true);
  }

  function openLead(lead: CrmLead) {
    emitCrmOpenLead(lead.id);
    router.push(`/crm?lead=${encodeURIComponent(lead.id)}`);
    setOpen(false);
  }

  const trimmed = query.trim();
  const showPanel = canSearch && open && (trimmed.length > 0 || loading);

  return {
    canSearch,
    rootRef,
    query,
    onQueryChange,
    open,
    setOpen,
    showPanel,
    loading,
    result,
    minQuery: MIN_QUERY,
    setPage,
    openLead,
  };
}
