import { motion } from "framer-motion";
import { EmptyState } from "@/components/shared/empty-state";
import { LeaveCard } from "@/components/leave/leave-card";
import { staggerContainer } from "@/lib/animations";
import type { Employee, LeaveRequest } from "@/types";

export function LeaveRequestGrid({
  requests,
  employeeMap,
  showActions,
  onUpdated,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  className = "grid gap-4 sm:grid-cols-2",
}: {
  requests: LeaveRequest[];
  employeeMap: Map<string, Employee>;
  showActions?: boolean | ((request: LeaveRequest) => boolean);
  onUpdated: (updated: LeaveRequest) => void;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  className?: string;
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
      />
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {requests.map((request) => (
        <LeaveCard
          key={request.id}
          request={request}
          employee={employeeMap.get(request.employeeId)}
          showActions={
            typeof showActions === "function"
              ? showActions(request)
              : showActions
          }
          onUpdated={onUpdated}
        />
      ))}
    </motion.div>
  );
}
