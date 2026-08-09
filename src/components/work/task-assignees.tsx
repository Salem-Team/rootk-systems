import { Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";
import { initials } from "./employee-avatar-initials";

/** Named assignee chips — click to filter; overflow opens a picker. */
export function TaskAssignees({
  employees,
  ids,
  selectedId,
  onSelect,
  maxVisible = 3,
  label,
  pickLabel,
}: {
  employees: Map<string, Employee>;
  ids: string[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  maxVisible?: number;
  label?: string;
  pickLabel?: string;
}) {
  const interactive = Boolean(onSelect);
  const shown = ids.slice(0, maxVisible);
  const overflow = ids.slice(maxVisible);

  function handleSelect(id: string) {
    if (!onSelect) return;
    onSelect(selectedId === id ? "" : id);
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {label ? (
        <span className="text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
      ) : null}
      {shown.map((id) => {
        const emp = employees.get(id);
        const name = emp?.name ?? id;
        const active = selectedId === id;
        const className = cn(
          "inline-flex max-w-[11rem] items-center gap-1.5 rounded-full border px-1.5 py-0.5 text-[12px] transition-colors",
          active
            ? "border-primary/30 bg-primary/[0.1] font-medium text-primary"
            : "border-border/70 bg-muted/30 text-foreground/85",
          interactive &&
            !active &&
            "hover:border-border hover:bg-muted/60 hover:text-foreground",
          interactive && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        );

        const content = (
          <>
            <Avatar className="h-5 w-5 shrink-0 border border-background">
              <AvatarFallback className="text-[8px]">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{name}</span>
          </>
        );

        if (!interactive) {
          return (
            <span key={id} className={className} title={name}>
              {content}
            </span>
          );
        }

        return (
          <button
            key={id}
            type="button"
            onClick={() => handleSelect(id)}
            className={className}
            title={name}
            aria-pressed={active}
          >
            {content}
          </button>
        );
      })}

      {overflow.length > 0 ? (
        interactive ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border/80 bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
              >
                <Users className="h-3 w-3" aria-hidden />
                +{overflow.length}
                {pickLabel ? (
                  <span className="hidden sm:inline">{pickLabel}</span>
                ) : null}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <p className="mb-1.5 px-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {label ?? pickLabel}
              </p>
              <ul className="max-h-56 space-y-0.5 overflow-y-auto">
                {ids.map((id) => {
                  const emp = employees.get(id);
                  const name = emp?.name ?? id;
                  const active = selectedId === id;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-[13px] transition-colors",
                          active
                            ? "bg-primary/[0.1] font-medium text-primary"
                            : "hover:bg-muted/60"
                        )}
                        aria-pressed={active}
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[9px]">
                            {initials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1 truncate">{name}</span>
                        {emp?.department ? (
                          <span className="truncate text-[11px] text-muted-foreground">
                            {emp.department}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </Popover>
        ) : (
          <span className="text-[11px] font-medium text-muted-foreground">
            +{overflow.length}
          </span>
        )
      ) : null}
    </div>
  );
}
