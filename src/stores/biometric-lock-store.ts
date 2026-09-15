"use client";

import { create } from "zustand";

/**
 * In-memory app unlock for biometric gate.
 * Never persisted — cold start / long background always re-locks when biometric is enabled.
 */
interface BiometricLockState {
  unlocked: boolean;
  /** Skip auto-prompt once (e.g. right after password login / opt-in). */
  skipNextAutoPrompt: boolean;
  /** Show enable dialog after we land in the authenticated shell. */
  pendingOptIn: boolean;
  setUnlocked: (value: boolean) => void;
  markSkipNextAutoPrompt: () => void;
  consumeSkipNextAutoPrompt: () => boolean;
  requestOptIn: () => void;
  clearPendingOptIn: () => void;
  reset: () => void;
}

export const useBiometricLockStore = create<BiometricLockState>((set, get) => ({
  unlocked: false,
  skipNextAutoPrompt: false,
  pendingOptIn: false,
  setUnlocked: (value) => set({ unlocked: value }),
  markSkipNextAutoPrompt: () => set({ skipNextAutoPrompt: true }),
  consumeSkipNextAutoPrompt: () => {
    const skip = get().skipNextAutoPrompt;
    if (skip) set({ skipNextAutoPrompt: false });
    return skip;
  },
  requestOptIn: () => set({ pendingOptIn: true }),
  clearPendingOptIn: () => set({ pendingOptIn: false }),
  reset: () =>
    set({ unlocked: false, skipNextAutoPrompt: false, pendingOptIn: false }),
}));
