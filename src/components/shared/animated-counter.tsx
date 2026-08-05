"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  suffix = "",
  decimals = 0,
  className,
}: AnimatedCounterProps) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);
  const spring = useSpring(0, {
    stiffness: 120,
    damping: 24,
    mass: 0.65,
  });
  const rounded = useTransform(spring, (latest) =>
    Number(latest.toFixed(decimals))
  );

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    spring.set(value);
    const unsubscribe = rounded.on("change", (v) => setDisplay(v));
    return unsubscribe;
  }, [value, spring, rounded, reduceMotion]);

  return (
    <motion.span className={className}>
      {display.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </motion.span>
  );
}
