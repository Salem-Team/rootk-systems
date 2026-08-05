import type { Transition, Variants } from "framer-motion";

/** Premium product easing — Stripe / Linear / Vercel feel */
export const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const easeOutQuart: [number, number, number, number] = [0.25, 1, 0.5, 1];
export const easeInOutSoft: [number, number, number, number] = [0.65, 0, 0.35, 1];

/** Duration tokens (seconds) — keep in sync with --duration-* in globals.css */
export const duration = {
  instant: 0.12,
  fast: 0.2,
  base: 0.36,
  slow: 0.52,
  page: 0.45,
} as const;

export const spring: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 32,
  mass: 0.8,
};

export const softSpring: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 26,
  mass: 0.85,
};

export const snappySpring: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 36,
  mass: 0.7,
};

export const layoutSpring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 34,
  mass: 0.85,
};

/** Route enter/exit — keep opacity on THIS node only (never nest another opacity layer). */
export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    y: 16,
    filter: "blur(4px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: duration.page,
      ease: easeOutExpo,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: "blur(2px)",
    transition: { duration: duration.fast, ease: easeInOutSoft },
  },
};

/** Same as pageTransition without blur (safer on low-end / reduced motion callers). */
export const pageTransitionSoft: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.994 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: duration.page,
      ease: easeOutExpo,
      opacity: { duration: 0.32, ease: easeOutQuart },
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    scale: 0.996,
    transition: { duration: 0.18, ease: easeInOutSoft },
  },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easeOutExpo },
  },
};

/** Transform-only enter — safe as nested children under AppShell opacity. */
export const riseIn: Variants = {
  hidden: { y: 12, opacity: 0.01 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: easeOutExpo },
  },
};

/** Dense list / table rows — shorter travel, faster settle. */
export const listItemIn: Variants = {
  hidden: { y: 8, opacity: 0.01 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: duration.fast, ease: easeOutExpo },
  },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeOutExpo },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.35, ease: easeOutQuart },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: softSpring,
  },
};

export const scaleInSoft: Variants = {
  hidden: { opacity: 0, scale: 0.98, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: softSpring,
  },
};

/**
 * Parent for staggered children.
 * Do NOT set opacity on the container — nested opacity under AppShell
 * can leave content stuck invisible.
 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.03,
    },
  },
};

export const staggerFast: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.035, delayChildren: 0.015 },
  },
};

export const staggerSlow: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.075, delayChildren: 0.05 },
  },
};

/** Extra-tight for filter chips / dense toolbars. */
export const staggerDense: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.025, delayChildren: 0.01 },
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: softSpring,
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: softSpring,
  },
};

export const sidebarItem: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.32, ease: easeOutExpo },
  },
};

export const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -3,
    transition: snappySpring,
  },
  tap: { scale: 0.985, transition: { duration: 0.1 } },
};

export const pressable = {
  whileHover: { scale: 1.01, y: -1.5 },
  whileTap: { scale: 0.982 },
  transition: snappySpring,
};

/** Panel enter — transform only (safe under AppShell / page-cascade opacity). */
export const surfaceEnter = {
  initial: { y: 12, scale: 0.985 },
  animate: { y: 0, scale: 1 },
};

export const iconPop = {
  rest: { scale: 1, rotate: 0 },
  hover: {
    scale: 1.1,
    rotate: -6,
    transition: snappySpring,
  },
};

export const revealViewport = {
  once: true,
  amount: 0.15,
  margin: "0px 0px -32px 0px",
} as const;
