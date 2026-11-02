"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
} from "framer-motion";

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
  const spring = useSpring(value, {
    stiffness: 120,
    damping: 24,
    mass: 0.65,
  });
  const [display, setDisplay] = useState(value);

  useMotionValueEvent(spring, "change", (latest) => {
    setDisplay(Number(latest.toFixed(decimals)));
  });

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      spring.jump(value);
      return;
    }
    spring.set(value);
  }, [value, spring, reduceMotion]);

  useEffect(() => {
    setDisplay(Number(value.toFixed(decimals)));
  }, [decimals, value]);

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
