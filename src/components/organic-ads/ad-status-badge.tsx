"use client";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import type { AdStatus, AdValidationStatus } from "@/types/organic-ads";

type Variant = NonNullable<BadgeProps["variant"]>;

const STATUS_VARIANT: Record<AdStatus, Variant> = {
  active: "success",
  inactive: "secondary",
  needs_review: "warning",
  duplicate: "danger",
};

const VALIDATION_VARIANT: Record<AdValidationStatus, Variant> = {
  valid: "success",
  invalid: "danger",
  broken: "warning",
  unsupported: "warning",
  pending: "secondary",
};

export function AdStatusBadge({
  status,
  className,
}: {
  status: AdStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Badge variant={STATUS_VARIANT[status]} className={cn(className)}>
      {t(`organicAds.status.${status}`)}
    </Badge>
  );
}

export function AdValidationBadge({
  status,
  className,
}: {
  status: AdValidationStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <Badge variant={VALIDATION_VARIANT[status]} className={cn(className)}>
      {t(`organicAds.validationStatus.${status}`)}
    </Badge>
  );
}
