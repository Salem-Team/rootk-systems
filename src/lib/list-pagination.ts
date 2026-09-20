/** Client-side list paging helpers shared by tables and card lists. */

export const LIST_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
export type ListPageSize = (typeof LIST_PAGE_SIZE_OPTIONS)[number];

export interface PaginatedSlice<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
}

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number
): PaginatedSlice<T> {
  const total = items.length;
  const size = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(total / size) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * size;
  return {
    items: items.slice(start, start + size),
    page: safePage,
    pageSize: size,
    total,
    totalPages,
    from: total === 0 ? 0 : start + 1,
    to: Math.min(start + size, total),
  };
}

/** Compact page numbers with ellipsis for long lists. */
export function pageWindow(
  page: number,
  totalPages: number,
  radius = 1
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let i = page - radius; i <= page + radius; i += 1) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) out.push("ellipsis");
    out.push(n);
    prev = n;
  }
  return out;
}
