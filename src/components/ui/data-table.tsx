import { cn } from "@/lib/utils";

export function DataTable({
  className,
  embedded = false,
  ...props
}: React.HTMLAttributes<HTMLTableElement> & { embedded?: boolean }) {
  const table = (
    <div
      className={cn(
        "table-scroll overflow-x-auto overscroll-x-contain",
        !embedded && "-mx-px"
      )}
    >
      <table
        className={cn(
          "w-full min-w-[36rem] text-start text-sm sm:min-w-[640px]",
          className
        )}
        {...props}
      />
    </div>
  );

  if (embedded) return table;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      {table}
    </div>
  );
}

export function DataTableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-[1] bg-muted/80 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground backdrop-blur",
        className
      )}
      {...props}
    />
  );
}

export function DataTableHeaderRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-border", className)} {...props} />;
}

export function DataTableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-10 px-3.5 text-start font-medium first:ps-4 last:pe-4",
        className
      )}
      {...props}
    />
  );
}

export function DataTableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("bg-card", className)} {...props} />;
}

export function DataTableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-border/60 last:border-0 transition-colors duration-150 hover:bg-muted/40 data-[state=selected]:bg-primary/[0.04]",
        className
      )}
      {...props}
    />
  );
}

export function DataTableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-3.5 py-3 first:ps-4 last:pe-4", className)}
      {...props}
    />
  );
}
