"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "@/hooks/use-translation";
import {
  asCountry,
  countryFlag,
  listPhoneCountries,
  nationalDigits,
  type PhoneCountryOption,
} from "@/lib/crm/intl-phone";
import { cn } from "@/lib/utils";
import { parsePhoneNumberFromString } from "libphonenumber-js";

interface CrmIntlPhoneInputProps {
  id?: string;
  value: string;
  country: string;
  onChange: (value: string) => void;
  onCountryChange: (country: string) => void;
  disabled?: boolean;
  className?: string;
}

/** Phone field with a country flag + calling code, then the national number. */
export function CrmIntlPhoneInput({
  id,
  value,
  country,
  onChange,
  onCountryChange,
  disabled = false,
  className,
}: CrmIntlPhoneInputProps) {
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const iso = asCountry(country);
  const countries = useMemo(
    () => listPhoneCountries(locale, query),
    [locale, query]
  );
  const selected = useMemo(
    () => listPhoneCountries(locale, "").find((row) => row.iso === iso),
    [locale, iso]
  );

  function pick(row: PhoneCountryOption) {
    onCountryChange(row.iso);
    setOpen(false);
    setQuery("");
  }

  function onNationalChange(raw: string) {
    const trimmed = raw.trim();
    const international = trimmed.startsWith("+")
      ? trimmed
      : trimmed.startsWith("00")
        ? `+${trimmed.slice(2)}`
        : "";
    if (international) {
      const parsed = parsePhoneNumberFromString(international);
      if (parsed?.country && parsed.nationalNumber) {
        onCountryChange(parsed.country);
        onChange(String(parsed.nationalNumber));
        return;
      }
    }
    onChange(nationalDigits(raw));
  }

  return (
    <div
      dir="ltr"
      className={cn(
        "flex h-11 w-full min-w-0 overflow-hidden rounded-xl border border-border/85 bg-card shadow-[0_1px_2px_rgba(11,20,36,0.03)] transition-[border-color,box-shadow] duration-150 sm:h-11 sm:rounded-xl",
        "hover:border-border focus-within:border-primary/45 focus-within:ring-[3px] focus-within:ring-ring/18",
        disabled && "cursor-not-allowed bg-muted/50 opacity-55",
        className
      )}
    >
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="flex h-full shrink-0 items-center gap-1 border-e border-border/80 bg-muted/55 px-2 text-[13px] font-semibold tabular-nums text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed"
            aria-label={t("crm.leadForm.country")}
          >
            <span className="text-base leading-none" aria-hidden>
              {selected?.flag || countryFlag(iso)}
            </span>
            <span>+{selected?.calling || ""}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="z-[90] w-[min(20rem,calc(100vw-2rem))] p-2"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("crm.leadForm.countrySearch")}
              className="h-9 w-full rounded-lg border border-border/70 bg-background ps-8 pe-2 text-sm outline-none focus-visible:border-primary/40"
              dir="auto"
            />
          </div>
          <ul className="mt-2 max-h-64 overflow-y-auto overscroll-contain">
            {countries.length === 0 ? (
              <li className="px-2 py-3 text-center text-[12px] text-muted-foreground">
                {t("crm.leadForm.countryEmpty")}
              </li>
            ) : (
              countries.map((row) => {
                const active = row.iso === iso;
                return (
                  <li key={row.iso}>
                    <button
                      type="button"
                      onClick={() => pick(row)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-[13px] transition-colors hover:bg-muted",
                        active && "bg-primary/10 text-primary"
                      )}
                    >
                      <span className="text-base leading-none" aria-hidden>
                        {row.flag}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{row.name}</span>
                      <span className="shrink-0 font-mono text-[12px] text-muted-foreground">
                        +{row.calling}
                      </span>
                      {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </PopoverContent>
      </Popover>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        aria-label={t("crm.leadForm.phone")}
        placeholder={t("crm.leadForm.phonePlaceholder")}
        value={value}
        onChange={(event) => onNationalChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent px-3 text-base tabular-nums outline-none placeholder:text-muted-foreground/55 disabled:cursor-not-allowed sm:text-sm"
      />
    </div>
  );
}
