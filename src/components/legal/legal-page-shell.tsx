import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { APP_SHORT, BRAND_NAVY, LOGO_SRC } from "@/constants";

export function LegalPageShell({
  title,
  children,
  dir = "rtl",
}: {
  title: string;
  children: ReactNode;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div
      dir={dir}
      className="min-h-dvh bg-[#f2f5fa] text-[#0a1220]"
      style={{ fontFamily: "var(--font-arabic), var(--font-display), sans-serif" }}
    >
      <header className="border-b border-[#d7e0ee] bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/login" className="inline-flex items-center gap-3 no-underline">
            <Image
              src={LOGO_SRC}
              alt={APP_SHORT}
              width={40}
              height={40}
              className="h-10 w-10 rounded-xl border border-[#d7e0ee] bg-white object-contain p-1"
            />
            <span className="text-sm font-semibold" style={{ color: BRAND_NAVY }}>
              {APP_SHORT}
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#334155]">
            <Link href="/privacy" className="hover:text-[#082868]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#082868]">
              Terms
            </Link>
            <Link href="/support" className="hover:text-[#082868]">
              Support
            </Link>
            <Link href="/account-deletion" className="hover:text-[#082868]">
              Account deletion
            </Link>
            <Link href="/app-review" className="hover:text-[#082868]">
              App review
            </Link>
            <Link href="/login" className="hover:text-[#082868]">
              Login
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <article className="rounded-3xl border border-[#d7e0ee] bg-white p-6 shadow-[0_20px_50px_rgba(8,40,104,0.08)] sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <div className="mt-6 space-y-4 text-sm leading-7 text-[#334155] sm:text-[15px]">
            {children}
          </div>
        </article>
      </main>
    </div>
  );
}
