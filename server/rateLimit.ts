/**
 * Per-team submission throttle.
 *
 * The client also disables its submit button for the cooldown window, but that
 * is a courtesy, not a control: a held-down Enter key, a double-click that
 * outruns React, or a hand-rolled script all bypass it. This is the real limit.
 *
 * State is per-process, which is correct for the single-instance deployment this
 * app ships as. Running multiple app containers would need a shared store.
 */

import { SUBMISSION_COOLDOWN_MS } from "@shared/url";

type Attempt = { lastAt: number };

const attempts = new Map<string, Attempt>();

/** Drop entries nobody has touched for a while so the map cannot grow forever. */
const RETENTION_MS = 10 * 60 * 1000;
let lastSweep = 0;

function sweep(now: number): void {
  if (now - lastSweep < RETENTION_MS) return;
  lastSweep = now;
  for (const [key, attempt] of attempts) {
    if (now - attempt.lastAt > RETENTION_MS) attempts.delete(key);
  }
}

export type CooldownCheck =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

/**
 * Registers a submission attempt. When it returns `allowed: false` the caller
 * must reject the request without scoring it; the clock is not restarted by a
 * blocked attempt, so hammering cannot extend anyone's own lockout.
 */
export function checkCooldown(
  teamId: string,
  cooldownMs: number = SUBMISSION_COOLDOWN_MS,
): CooldownCheck {
  const now = Date.now();
  sweep(now);

  const previous = attempts.get(teamId);
  if (previous) {
    const elapsed = now - previous.lastAt;
    if (elapsed < cooldownMs) {
      return { allowed: false, retryAfterMs: cooldownMs - elapsed };
    }
  }

  attempts.set(teamId, { lastAt: now });
  return { allowed: true };
}

/** Test hook: forget all recorded cooldowns. */
export function clearCooldowns(): void {
  attempts.clear();
}
