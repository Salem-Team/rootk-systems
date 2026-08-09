"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BRAND_NAVY } from "@/constants";

export function LoginBackground() {
  const reduceMotion = useReducedMotion();

  return (
    <>
      {/* Full-bleed brand atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 100% 80% at 15% 20%, rgba(40, 92, 180, 0.45), transparent 55%),
            radial-gradient(ellipse 80% 70% at 90% 85%, rgba(8, 40, 104, 0.9), transparent 55%),
            radial-gradient(ellipse 50% 40% at 55% 40%, rgba(140, 185, 240, 0.08), transparent 70%),
            linear-gradient(165deg, #01060f 0%, #041428 28%, ${BRAND_NAVY} 58%, #061830 100%)
          `,
        }}
      />

      {!reduceMotion ? (
        <>
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -start-32 top-[-10%] h-[36rem] w-[36rem] rounded-full bg-[#2a6cc4]/20 blur-[120px]"
            animate={{ y: [0, 36, 0], x: [0, 18, 0], opacity: [0.55, 0.85, 0.55] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -end-24 bottom-[-5%] h-[28rem] w-[28rem] rounded-full bg-[#0a327c]/55 blur-[110px]"
            animate={{ y: [0, -30, 0], opacity: [0.45, 0.7, 0.45] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute start-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-[#7eb0ef]/10 blur-[90px]"
            animate={{ scale: [1, 1.18, 1], opacity: [0.25, 0.45, 0.25] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      ) : null}

      {/* Fine grain + vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(1,4,12,0.72)_100%)]"
      />
    </>
  );
}
