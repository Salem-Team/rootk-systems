"use client";

import { DateTime12Field } from "@/components/shared/datetime-12-field";

interface CrmDateTimeFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}

/** CRM follow-up scheduling — shared 12h Tailwind date/time picker. */
export function CrmDateTimeField({
  id,
  value,
  onChange,
  label,
  className,
}: CrmDateTimeFieldProps) {
  return (
    <DateTime12Field
      id={id}
      value={value}
      onChange={onChange}
      label={label}
      className={className}
      disablePast
      triggerClassName="h-12 sm:h-10"
    />
  );
}
