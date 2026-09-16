"use client";

import { useEffect, useState } from "react";
import { fetchHealthLive } from "@/api/health.api";
import { env } from "@/lib/env";
import { isNativeApp } from "@/lib/native/platform";

const EXPECTED_EDGE = env.expectedEdgeId;
const OFFICIAL_CRM = "https://system.rootk-eg.com/crm";

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".local")
  );
}

function isLocalApiBase(url: string): boolean {
  try {
    return isLocalHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

type GuardState =
  | { status: "checking" }
  | { status: "ok"; edgeId: string }
  | { status: "stale"; edgeId: string | null; reason: string };

async function readLiveEdge(): Promise<{
  ok: boolean;
  edgeId: string | null;
}> {
  const res = await fetchHealthLive();
  if (!res.success) {
    return { ok: false, edgeId: null };
  }
  const edgeId =
    typeof res.data?.edgeId === "string" ? res.data.edgeId : null;
  return { ok: true, edgeId };
}

/**
 * Blocks the UI when this browser is talking to a stale CRM edge
 * (e.g. DNS still pinned to a decommissioned VPS).
 *
 * Local / transient failures must NOT brick the app — only a successful
 * health response from the wrong (or unmarked remote) edge does.
 */
export function EdgeGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GuardState>({ status: "checking" });
  const native = typeof window !== "undefined" ? isNativeApp() : false;
  const localDev =
    typeof window !== "undefined"
      ? isLocalHost(window.location.hostname) || isLocalApiBase(env.apiBaseUrl)
      : isLocalApiBase(env.apiBaseUrl);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        let result = await readLiveEdge();
        // One quick retry — boot races with HttpClient / Nest watch restart.
        if (!result.ok || !result.edgeId || result.edgeId === "unknown") {
          await new Promise((r) => window.setTimeout(r, 400));
          if (cancelled) return;
          result = await readLiveEdge();
        }

        if (cancelled) return;

        if (!result.ok) {
          // Network / parse failure — never treat as a stale edge.
          setState({ status: "ok", edgeId: "unreachable" });
          return;
        }

        const { edgeId } = result;

        if (!edgeId || edgeId === "unknown") {
          // Local unmarked API: allow through (dev DX). Remote unmarked = stale VPS.
          if (localDev) {
            setState({ status: "ok", edgeId: edgeId || "local-unset" });
            return;
          }
          setState({
            status: "stale",
            edgeId,
            reason:
              "هذا المتصفح متصل بنسخة قديمة من النظام (بدون edgeId). البيانات قد تكون ناقصة أو قديمة.",
          });
          return;
        }

        if (edgeId !== EXPECTED_EDGE) {
          setState({
            status: "stale",
            edgeId,
            reason: `تم اكتشاف سيرفر خاطئ (${edgeId}). المتوقع: ${EXPECTED_EDGE}.`,
          });
          return;
        }

        setState({ status: "ok", edgeId });
      } catch {
        if (!cancelled) {
          setState({ status: "ok", edgeId: "unreachable" });
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [localDev]);

  if (state.status === "checking") {
    return children;
  }

  if (state.status === "stale") {
    const inAppReload = `${typeof window !== "undefined" ? window.location.origin : ""}${typeof window !== "undefined" ? window.location.pathname : "/"}?t=${Date.now()}`;
    const officialHref = `${OFFICIAL_CRM}?edge=${EXPECTED_EDGE}&t=${Date.now()}`;
    // Native WebView must stay inside the app — never bounce to the browser.
    const primaryHref = native || localDev ? inAppReload : officialHref;

    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          paddingTop: "max(24px, env(safe-area-inset-top))",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
          background: "#0b1220",
          color: "#f8fafc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: 520, textAlign: "right", lineHeight: 1.7 }}>
          <h1 style={{ fontSize: 22, margin: "0 0 12px" }}>
            نسخة النظام غير محدّثة
          </h1>
          <p style={{ margin: "0 0 12px", opacity: 0.9 }}>{state.reason}</p>
          <p style={{ margin: "0 0 20px", opacity: 0.75, fontSize: 14 }}>
            {localDev
              ? "أنت على بيئة محلية — تأكد أن ROOTK_EDGE_ID مضبوط في backend/.env ثم أعد التشغيل."
              : native
                ? "حدّث التطبيق أو أعد تحميل الصفحة داخل التطبيق."
                : "افتح الرابط الرسمي بعد مسح الكاش، أو استخدم نافذة خاصة (Incognito)."}
            <br />
            API: <code style={{ direction: "ltr" }}>{env.apiBaseUrl}</code>
            {state.edgeId ? (
              <>
                <br />
                edge: <code style={{ direction: "ltr" }}>{state.edgeId}</code>
              </>
            ) : null}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a
              href={primaryHref}
              style={{
                background: "#38bdf8",
                color: "#0b1220",
                padding: "10px 16px",
                borderRadius: 10,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {native || localDev
                ? "إعادة المحاولة داخل التطبيق"
                : "فتح النسخة الرسمية"}
            </a>
            <button
              type="button"
              onClick={() => {
                if ("serviceWorker" in navigator) {
                  void navigator.serviceWorker
                    .getRegistrations()
                    .then((regs) =>
                      Promise.all(regs.map((r) => r.unregister())),
                    );
                }
                if ("caches" in window) {
                  void caches
                    .keys()
                    .then((keys) =>
                      Promise.all(keys.map((k) => caches.delete(k))),
                    );
                }
                window.location.replace(primaryHref);
              }}
              style={{
                background: "transparent",
                color: "#f8fafc",
                border: "1px solid #334155",
                padding: "10px 16px",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 400,
              }}
            >
              مسح الكاش وإعادة التحميل
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
