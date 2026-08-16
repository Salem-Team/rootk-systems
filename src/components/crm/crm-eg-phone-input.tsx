"use client";

import { cn } from "@/lib/utils";
import { EG_DIAL_CODE, egyptianMobileLocalDigits } from "@/lib/crm/eg-phone-input";
import { useTranslation } from "@/hooks/use-translation";

interface CrmEgPhoneInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

/** Egyptian mobile field with a locked +20 prefix so the user never types the country code. */
export function CrmEgPhoneInput({
  id,
  value,
  onChange,
  disabled = false,
  className,
  placeholder,
}: CrmEgPhoneInputProps) {
  const { t } = useTranslation();
  const local = egyptianMobileLocalDigits(value);

  return (
    <div
      dir="ltr"
      className={cn(
        "flex h-9 w-full overflow-hidden rounded-lg border border-border/85 bg-card shadow-[0_1px_2px_rgba(11,20,36,0.03)] transition-[border-color,box-shadow] duration-150",
        "hover:border-border focus-within:border-primary/45 focus-within:ring-[3px] focus-within:ring-ring/18",
        disabled && "cursor-not-allowed bg-muted/50 opacity-55",
        className
      )}
    >
      <span className="flex shrink-0 items-center border-e border-border/80 bg-muted/55 px-2.5 text-[13px] font-semibold tabular-nums text-muted-foreground">
        {EG_DIAL_CODE}
      </span>
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        disabled={disabled}
        aria-label={t("crm.leadForm.phone")}
        placeholder={placeholder ?? t("crm.leadForm.phonePlaceholder")}
        value={local}
        onChange={(event) => onChange(egyptianMobileLocalDigits(event.target.value))}
        className="min-w-0 flex-1 bg-transparent px-3 text-sm tabular-nums outline-none placeholder:text-muted-foreground/55 disabled:cursor-not-allowed"
      />
    </div>
  );
}
