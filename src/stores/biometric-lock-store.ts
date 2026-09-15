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
  setUnlocked: (value: boolean) => void;
  markSkipNextAutoPrompt: () => void;
  consumeSkipNextAutoPrompt: () => boolean;
  reset: () => void;
}

export const useBiometricLockStore = create<BiometricLockState>((set, get) => ({
  unlocked: false,
  skipNextAutoPrompt: false,
  setUnlocked: (value) => set({ unlocked: value }),
  markSkipNextAutoPrompt: () => set({ skipNextAutoPrompt: true }),
  consumeSkipNextAutoPrompt: () => {
    const skip = get().skipNextAutoPrompt;
    if (skip) set({ skipNextAutoPrompt: false });
    return skip;
  },
  reset: () => set({ unlocked: false, skipNextAutoPrompt: false }),
}));
