"use client";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type {
  TargetHealth,
  TargetPriority,
  TargetRiskLevel,
  TargetStatus,
} from "@/types/targets";

type Variant = NonNullable<BadgeProps["variant"]>;

const STATUS_VARIANT: Record<TargetStatus, Variant> = {
  draft: "secondary",
  assigned: "info",
  in_progress: "info",
  on_track: "success",
  behind_schedule: "warning",
  delayed: "danger",
  completed: "success",
  cancelled: "outline",
  archived: "outline",
};

const PRIORITY_VARIANT: Record<TargetPriority, Variant> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "secondary",
};

const HEALTH_VARIANT: Record<TargetHealth, Variant> = {
  excellent: "success",
  good: "success",
  average: "secondary",
  warning: "warning",
  critical: "danger",
  delayed: "danger",
};

const RISK_VARIANT: Record<TargetRiskLevel, Variant> = {
  low: "success",
  medium: "info",
  high: "warning",
  critical: "danger",
};

interface TargetBadgeProps {
  className?: string;
}

export function TargetStatusBadge({
  status,
  className,
}: TargetBadgeProps & { status: TargetStatus }) {
  const { t } = useTranslation();
  return (
    <Badge variant={STATUS_VARIANT[status]} className={cn(className)}>
      {t(`targets.status.${status}`)}
    </Badge>
  );
}

export function TargetPriorityBadge({
  priority,
  className,
}: TargetBadgeProps & { priority: TargetPriority }) {
  const { t } = useTranslation();
  return (
    <Badge variant={PRIORITY_VARIANT[priority]} className={cn(className)}>
      {t(`targets.priority.${priority}`)}
    </Badge>
  );
}

export function TargetHealthBadge({
  health,
  className,
}: TargetBadgeProps & { health: TargetHealth }) {
  const { t } = useTranslation();
  return (
    <Badge variant={HEALTH_VARIANT[health]} className={cn(className)}>
      {t(`targets.health.${health}`)}
    </Badge>
  );
}

export function TargetRiskBadge({
  risk,
  className,
}: TargetBadgeProps & { risk: TargetRiskLevel }) {
  const { t } = useTranslation();
  return (
    <Badge variant={RISK_VARIANT[risk]} className={cn(className)}>
      {t(`targets.risk.${risk}`)}
    </Badge>
  );
}
