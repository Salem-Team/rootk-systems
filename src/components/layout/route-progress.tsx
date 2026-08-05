"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export function RouteProgress() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    setKey((k) => k + 1);
    setActive(true);
    const done = window.setTimeout(() => setActive(false), 700);
    return () => window.clearTimeout(done);
  }, [pathname, reduceMotion]);

  if (reduceMotion) return null;

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          key={key}
          className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[2px] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.05 } }}
        >
          <motion.div
            className="h-full origin-left bg-gradient-to-r from-primary via-[#1a4a9e] to-sky-400 shadow-[0_0_12px_rgba(8,40,104,0.35)]"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: [0, 0.68, 1] }}
            transition={{
              duration: 0.78,
              times: [0, 0.62, 1],
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{ transformOrigin: "left center" }}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
