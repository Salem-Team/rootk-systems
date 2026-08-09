import type { ReactNode } from "react";

export function ChartPanel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="surface-panel overflow-hidden">
      <div className="panel-header">
        <h4 className="text-[0.95rem] font-semibold tracking-tight">{title}</h4>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      <div
        className="panel-body h-[260px] sm:h-[280px]"
        role="img"
        aria-label={title}
      >
        {children}
      </div>
    </section>
  );
}
