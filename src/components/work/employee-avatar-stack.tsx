import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Employee } from "@/types";
import { initials } from "./employee-avatar-initials";

export function EmployeeAvatarStack({
  employees,
  ids,
  max = 4,
}: {
  employees: Map<string, Employee>;
  ids: string[];
  max?: number;
}) {
  const shown = ids.slice(0, max);
  const extra = ids.length - shown.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2 rtl:space-x-reverse">
        {shown.map((id) => {
          const emp = employees.get(id);
          return (
            <Avatar
              key={id}
              className="h-6 w-6 border-2 border-card"
              title={emp?.name ?? id}
            >
              <AvatarFallback className="text-[9px]">
                {initials(emp?.name ?? id)}
              </AvatarFallback>
            </Avatar>
          );
        })}
      </div>
      {extra > 0 ? (
        <span className="ms-1.5 text-[11px] font-medium text-muted-foreground">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
