"use client";

import { motion } from "framer-motion";
import type { Palette } from "lucide-react";
import type { PrefSection } from "@/components/settings/use-settings-form";

export function SettingsNav({
  navItems,
  section,
  setSection,
  navLabel,
  eyebrow,
  title,
}: {
  navItems: { id: PrefSection; label: string; icon: typeof Palette }[];
  section: PrefSection;
  setSection: (section: PrefSection) => void;
  navLabel: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <nav aria-label={navLabel} className="surface-panel overflow-hidden">
      <div className="hidden border-b border-border/60 px-4 py-3 lg:block">
        <p className="section-label text-primary/70">{eyebrow}</p>
        <p className="mt-1 text-sm font-semibold tracking-tight">{title}</p>
      </div>
      <ul className="scroll-x flex gap-1 p-2 [scrollbar-width:none] lg:grid lg:gap-0.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = section === item.id;
          return (
            <li key={item.id} className="shrink-0 lg:w-full">
              <button
                type="button"
                onClick={() => setSection(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "relative flex min-h-11 w-full items-center gap-2.5 rounded-xl bg-primary/[0.08] px-3 py-2.5 text-start text-[13px] font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:rounded-lg lg:px-2.5 lg:py-2"
                    : "flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-[13px] font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:rounded-lg lg:px-2.5 lg:py-2"
                }
              >
                {isActive ? (
                  <motion.span
                    layoutId="emp-settings-nav"
                    className="absolute inset-y-1 start-0 hidden w-0.5 rounded-full bg-primary lg:block"
                    transition={{
                      type: "spring",
                      stiffness: 420,
                      damping: 34,
                    }}
                  />
                ) : null}
                <span
                  className={
                    isActive
                      ? "flex h-8 w-8 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 lg:h-7 lg:w-7 lg:rounded-md"
                      : "flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-muted/40 lg:h-7 lg:w-7 lg:rounded-md"
                  }
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
