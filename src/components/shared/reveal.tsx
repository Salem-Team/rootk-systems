import { cn } from "@/lib/utils";

type RevealPreset = "up" | "scale" | "left" | "right";

const PRESET_CLASS: Record<RevealPreset, string> = {
  up: "ui-enter-up",
  scale: "ui-enter-scale",
  left: "ui-enter-left",
  right: "ui-enter-right",
};

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  preset?: RevealPreset;
  delay?: number;
  /** Kept for API compat — CSS enter runs on mount. */
  inView?: boolean;
}

export function Reveal({
  children,
  className,
  preset = "up",
  delay = 0,
}: RevealProps) {
  return (
    <div
      className={cn(PRESET_CLASS[preset], className)}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
