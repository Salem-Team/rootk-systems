"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { LOGO_SRC } from "@/constants";
import { useTranslation } from "@/hooks/use-translation";
import { easeOutExpo, fadeInUp, staggerContainer } from "@/lib/animations";

export function LoginBrandHero() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      variants={reduceMotion ? undefined : staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="relative hidden lg:flex lg:min-h-[28rem] lg:items-center"
      aria-label={t("app.short")}
    >
      {/* Soft brand glow behind lockup */}
      <div
        aria-hidden
        className="pointer-events-none absolute start-1/2 top-1/2 h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4d8fdc]/18 blur-[90px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute start-[42%] top-[48%] h-[14rem] w-[14rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.07] blur-[60px]"
      />

      <div
        dir="ltr"
        className="relative flex flex-col items-start gap-7 xl:gap-8"
      >
        <motion.div
          variants={reduceMotion ? undefined : fadeInUp}
          className="relative"
        >
          {/* Outer ring */}
          <div
            aria-hidden
            className="absolute -inset-4 rounded-[2rem] border border-white/[0.08]"
          />
          <div
            aria-hidden
            className="absolute -inset-8 rounded-[2.5rem] border border-white/[0.04]"
          />

          <motion.div
            animate={
              reduceMotion
                ? undefined
                : { y: [0, -6, 0], rotate: [0, -1.2, 1.2, 0] }
            }
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="relative flex h-[6.25rem] w-[6.25rem] items-center justify-center overflow-hidden rounded-[1.55rem] border border-white/30 bg-white shadow-[0_28px_70px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.12)_inset] xl:h-[7rem] xl:w-[7rem] xl:rounded-[1.75rem]"
          >
            <Image
              src={LOGO_SRC}
              alt=""
              width={112}
              height={112}
              className="h-full w-full object-contain p-2"
              priority
            />
          </motion.div>
        </motion.div>

        <motion.div
          variants={reduceMotion ? undefined : fadeInUp}
          className="relative"
        >
          <h1
            className="font-[family-name:var(--font-display)] text-[clamp(4.75rem,9.2vw,7.5rem)] font-extrabold leading-[0.86] tracking-[-0.055em]"
            style={{
              backgroundImage:
                "linear-gradient(180deg, #ffffff 0%, #e8f1ff 38%, #b7d0f2 72%, #7ea8dc 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              filter:
                "drop-shadow(0 18px 40px rgba(0,0,0,0.35)) drop-shadow(0 2px 0 rgba(255,255,255,0.08))",
            }}
          >
            {t("app.short")}
          </h1>

          {/* Brand underline accent */}
          <motion.div
            aria-hidden
            initial={reduceMotion ? false : { scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{
              delay: 0.35,
              duration: 0.7,
              ease: easeOutExpo,
            }}
            className="mt-5 h-[3px] w-[min(100%,14rem)] origin-left rounded-full"
            style={{
              backgroundImage: `linear-gradient(90deg, #ffffff 0%, #8fb4e4 45%, transparent 100%)`,
            }}
          />
        </motion.div>
      </div>
    </motion.section>
  );
}
