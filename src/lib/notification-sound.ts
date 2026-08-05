/**
 * In-app notification chime (Web Audio).
 * Clear two-tone ring — no external assets, works offline.
 */

type AudioContextCtor = typeof AudioContext;

let sharedCtx: AudioContext | null = null;
let unlockBound = false;
let lastPlayedAt = 0;

const DEBOUNCE_MS = 450;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext ||
    null
  );
}

function getContext(): AudioContext | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

function tone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  peakGain: number
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "sine";
  osc.frequency.setValueAtTime(frequency, start);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(3200, start);
  filter.Q.setValueAtTime(0.7, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(peakGain * 0.55, start + duration * 0.45);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/**
 * Unlock audio after a user gesture (required by browsers).
 * Safe to call repeatedly.
 */
export function unlockNotificationAudio(): void {
  const ctx = getContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => undefined);
  }
}

/** Bind one-time listeners so the first click/key unlocks audio. */
export function bindNotificationAudioUnlock(): () => void {
  if (typeof window === "undefined" || unlockBound) {
    return () => undefined;
  }
  unlockBound = true;

  const unlock = () => {
    unlockNotificationAudio();
  };

  window.addEventListener("pointerdown", unlock, { once: true, passive: true });
  window.addEventListener("keydown", unlock, { once: true });

  return () => {
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
}

/**
 * Play a short, clear notification ringtone.
 * Debounced so burst emits (e.g. multi-assignee) ring once.
 */
export function playNotificationChime(force = false): void {
  if (typeof window === "undefined") return;

  const now = Date.now();
  if (!force && now - lastPlayedAt < DEBOUNCE_MS) return;
  lastPlayedAt = now;

  try {
    const ctx = getContext();
    if (!ctx) return;

    const start = () => {
      const t0 = ctx.currentTime + 0.02;
      // Clear ascending chime (A5 → C#6 → E6)
      tone(ctx, 880, t0, 0.14, 0.22);
      tone(ctx, 1108.73, t0 + 0.11, 0.15, 0.2);
      tone(ctx, 1318.51, t0 + 0.22, 0.22, 0.18);
    };

    if (ctx.state === "suspended") {
      void ctx.resume().then(start).catch(() => undefined);
      return;
    }
    start();
  } catch {
    // Audio unavailable — silent fail
  }
}
