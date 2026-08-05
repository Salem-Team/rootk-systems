import { delay } from "@/lib/utils";

/** Simulated network latency for local-mode services only. */
function randomLatency(): number {
  return Math.floor(Math.random() * (600 - 150 + 1)) + 150;
}

export async function simulateDelay(ms?: number): Promise<void> {
  await delay(ms ?? randomLatency());
}
