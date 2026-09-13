"use client";

import { useEffect, useState } from "react";
import { fetchHealthLive } from "@/api/health.api";
import { env } from "@/lib/env";

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

/**
 * Blocks the UI when this browser is talking to a stale CRM edge
 * (e.g. DNS still pinned to a decommissioned VPS).
 */
export function EdgeGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GuardState>({ status: "checking" });
  const localDev =
    typeof window !== "undefined"
      ? isLocalHost(window.location.hostname) || isLocalApiBase(env.apiBaseUrl)
      : isLocalApiBase(env.apiBaseUrl);

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        const res = await fetchHealthLive();
        const edgeId =
          typeof res.data?.edgeId === "string" ? res.data.edgeId : null;

        if (cancelled) return;

        if (!edgeId || edgeId === "unknown") {
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
          // Network blip — don't hard-block; CRM may still work offline briefly.
          setState({ status: "ok", edgeId: "unreachable" });
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "checking") {
    return children;
  }

  if (state.status === "stale") {
    const officialHref = `${OFFICIAL_CRM}?edge=${EXPECTED_EDGE}&t=${Date.now()}`;

    return (
      <div
        dir="rtl"
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
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
            {!localDev ? (
              <a
                href={officialHref}
                style={{
                  background: "#38bdf8",
                  color: "#0b1220",
                  padding: "10px 16px",
                  borderRadius: 10,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                فتح النسخة الرسمية
              </a>
            ) : null}
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
                    .then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
                }
                const reloadTo = localDev
                  ? `${window.location.origin}${window.location.pathname}?t=${Date.now()}`
                  : officialHref;
                window.location.replace(reloadTo);
              }}
              style={{
                background: localDev ? "#38bdf8" : "transparent",
                color: localDev ? "#0b1220" : "#f8fafc",
                border: localDev ? "none" : "1px solid #334155",
                padding: "10px 16px",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: localDev ? 700 : 400,
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
