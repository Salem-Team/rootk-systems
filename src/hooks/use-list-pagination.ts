"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LIST_PAGE_SIZE_OPTIONS,
  paginateItems,
  type ListPageSize,
  type PaginatedSlice,
} from "@/lib/list-pagination";

/**
 * Client pagination that resets to page 1 when the source list fingerprint changes
 * (filters, search, tab switch).
 */
export function useListPagination<T>(
  items: T[],
  opts?: {
    pageSize?: ListPageSize;
    fingerprint?: string;
  }
): {
  page: number;
  setPage: (page: number) => void;
  pageSize: ListPageSize;
  setPageSize: (size: ListPageSize) => void;
  slice: PaginatedSlice<T>;
} {
  const initialSize = opts?.pageSize ?? LIST_PAGE_SIZE_OPTIONS[0];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<ListPageSize>(initialSize);
  const fingerprint = opts?.fingerprint ?? String(items.length);

  useEffect(() => {
    setPage(1);
  }, [fingerprint, pageSize]);

  const slice = useMemo(
    () => paginateItems(items, page, pageSize),
    [items, page, pageSize]
  );

  useEffect(() => {
    if (page !== slice.page) setPage(slice.page);
  }, [page, slice.page]);

  function setPageSize(size: ListPageSize) {
    setPageSizeState(size);
  }

  return { page, setPage, pageSize, setPageSize, slice };
}
