/**
 * Verification of iiit.ac.in hosts we have never been told about.
 *
 * Admins cannot realistically seed every website on campus, so a guess for an
 * unknown host is not automatically wrong. We check whether the host is real
 * before deciding, and we are careful to distinguish "this host does not exist"
 * (provably wrong, penalise) from "we could not reach it right now" (our
 * problem, never penalise the player for it).
 */

import { lookup } from "dns/promises";
import { HUNT_DOMAIN } from "@shared/url";

export type HostVerdict =
  /** The host exists and served an HTTP response. */
  | "live"
  /** DNS says this host does not exist. Safe to call the guess wrong. */
  | "absent"
  /** DNS resolved but we could not complete an HTTP request. Inconclusive. */
  | "unreachable";

/** How long a probe may take before we give up on it. */
const DNS_TIMEOUT_MS = 5000;
const HTTP_TIMEOUT_MS = 5000;

/**
 * Cache TTLs. "live" is cached generously because a site that exists keeps
 * existing; "absent" is cached briefly so a newly published site becomes
 * discoverable quickly; "unreachable" is barely cached at all because it is the
 * verdict most likely to be a transient blip.
 */
const TTL_MS: Record<HostVerdict, number> = {
  live: 10 * 60 * 1000,
  absent: 60 * 1000,
  unreachable: 15 * 1000,
};

type CacheEntry = { verdict: HostVerdict; expiresAt: number };

const cache = new Map<string, CacheEntry>();
/** Collapses concurrent probes of the same host into a single network call. */
const inFlight = new Map<string, Promise<HostVerdict>>();

function isHuntHost(host: string): boolean {
  return host === HUNT_DOMAIN || host.endsWith(`.${HUNT_DOMAIN}`);
}

async function resolves(host: string): Promise<boolean | "error"> {
  try {
    await Promise.race([
      lookup(host),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("dns timeout")), DNS_TIMEOUT_MS),
      ),
    ]);
    return true;
  } catch (error: any) {
    // ENOTFOUND / EAI_AGAIN are the only codes that mean "no such host"; every
    // other failure (timeout, no network, resolver down) is inconclusive.
    if (error?.code === "ENOTFOUND" || error?.code === "ENODATA") return false;
    return "error";
  }
}

/**
 * A single HTTP probe. Any response at all proves the host is serving, so a 401,
 * 403 or even a 404 on the root still counts as live - plenty of real campus
 * sites are access-controlled or have no index page.
 */
async function probe(url: string, method: "HEAD" | "GET"): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      headers: { "user-agent": "WebsiteHunt/1.0 (+campus game verification)" },
    });
    // 5xx means the origin is up but broken, which still proves it exists.
    return response.status > 0;
  } catch {
    return false;
  }
}

async function runVerification(host: string): Promise<HostVerdict> {
  // Probe over HTTP first. fetch() resolves the name itself, so a success here
  // proves the host exists without needing a separate DNS answer - and it is the
  // fast path for the common case.
  //
  // Try the cheap request first, then fall back: some servers reject HEAD, and
  // some campus hosts are http-only.
  for (const attempt of [
    { url: `https://${host}/`, method: "HEAD" as const },
    { url: `https://${host}/`, method: "GET" as const },
    { url: `http://${host}/`, method: "GET" as const },
  ]) {
    if (await probe(attempt.url, attempt.method)) return "live";
  }

  // Nothing answered. DNS decides whether that means "no such host" or "we just
  // could not get there" - a distinction that governs whether a player is
  // penalised, so it is worth the extra lookup.
  const dns = await resolves(host);
  return dns === false ? "absent" : "unreachable";
}

/**
 * Determines whether a host is a real, reachable IIIT website.
 *
 * Non-IIIT hosts short-circuit to "absent" without any network call: they are
 * out of scope for the hunt regardless of whether they exist, and probing them
 * would let players use the game as an arbitrary request proxy.
 */
export async function verifyHuntHost(host: string): Promise<HostVerdict> {
  if (!isHuntHost(host)) return "absent";

  const cached = cache.get(host);
  if (cached && cached.expiresAt > Date.now()) return cached.verdict;

  const existing = inFlight.get(host);
  if (existing) return existing;

  const pending = runVerification(host)
    .then((verdict) => {
      cache.set(host, { verdict, expiresAt: Date.now() + TTL_MS[verdict] });
      return verdict;
    })
    .finally(() => {
      inFlight.delete(host);
    });

  inFlight.set(host, pending);
  return pending;
}

/** Test/admin hook: forget everything we have probed. */
export function clearVerificationCache(): void {
  cache.clear();
}
