import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Primary CTA shown full-width under the title on small screens. */
  mobileActions?: React.ReactNode;
  /** Optional class for the mobile actions row (overrides default wrap styles). */
  mobileActionsClassName?: string;
  eyebrow?: string;
  showBreadcrumbs?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  mobileActions,
  mobileActionsClassName,
  eyebrow,
  showBreadcrumbs = true,
  className,
}: PageHeaderProps) {
  const mobileSlot = mobileActions ?? actions;
  const mobileRowClass = cn(
    "mt-3 flex w-full max-w-full flex-wrap gap-2 sm:hidden [&>*]:w-full [&>*]:max-w-full [&>*]:min-w-0 [&_a]:min-h-11 [&_a]:touch-manipulation [&_button]:min-h-11 [&_button]:max-w-full [&_button]:touch-manipulation [&_[role=combobox]]:min-h-11 [&_[role=combobox]]:!w-full [&_[role=combobox]]:max-w-full",
    mobileActionsClassName ??
      "[&_a]:flex-1 [&_button]:min-w-[calc(50%-0.25rem)] [&_button]:flex-1"
  );

  return (
    <header className={cn("ui-stagger mb-4 sm:mb-7", className)}>
      {showBreadcrumbs ? (
        <div className="ui-enter-up mb-3.5 hidden sm:block">
          <Breadcrumbs />
        </div>
      ) : null}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1 sm:space-y-2">
          {eyebrow ? (
            <p className="ui-enter-up type-eyebrow hidden sm:block">{eyebrow}</p>
          ) : null}
          <h1 className="ui-enter-up type-title">{title}</h1>
          {description ? (
            <p className="ui-enter-up type-subtitle line-clamp-2 sm:line-clamp-none">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="ui-enter-up hidden w-full flex-wrap items-center gap-2 sm:flex sm:w-auto sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
      {mobileSlot ? (
        <div className={cn("ui-enter-up", mobileRowClass)}>{mobileSlot}</div>
      ) : null}
      <div
        className="ui-enter-scale soft-divider mt-3.5 hidden sm:mt-5 sm:block"
        aria-hidden
      />
    </header>
  );
}
