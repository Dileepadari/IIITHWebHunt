/**
 * Canonical URL handling shared by the client and the server.
 *
 * Players type target URLs by hand, so the same site arrives in a dozen shapes:
 * "HTTPS://Students.IIIT.ac.in/ ", "students .iiit.ac.in", "www.students.iiit.ac.in/#about".
 * Everything below funnels those into one comparison key so a correct guess is
 * never rejected over cosmetics.
 */

/** Root domain every huntable website must live under. */
export const HUNT_DOMAIN = "iiit.ac.in";

/** Points a website is worth when nothing more specific is configured. */
export const DEFAULT_WEBSITE_POINTS = 100;

/** Points deducted for a guess we can positively prove is wrong. */
export const WRONG_GUESS_PENALTY = -25;

/** Minimum gap between two conquest submissions from the same team. */
export const SUBMISSION_COOLDOWN_MS = 2000;

export type UrlRejection =
  | "empty"
  | "malformed"
  | "not_a_hostname"
  | "not_hunt_domain";

export type ParsedUrl = {
  ok: true;
  /** Comparison key: lowercase "host/path", no scheme, no "www.", no trailing slash. */
  key: string;
  /** Lowercase hostname, e.g. "students.iiit.ac.in". */
  host: string;
  /** Path without a trailing slash; "" for the site root. */
  path: string;
  /** Canonical https URL, safe to store and to ping. */
  href: string;
  /** True when the host is iiit.ac.in or any subdomain of it. */
  isHuntDomain: boolean;
};

export type ParseFailure = { ok: false; reason: UrlRejection };

export type UrlParseResult = ParsedUrl | ParseFailure;

/**
 * Strips every kind of whitespace, not just ASCII spaces: pasted URLs routinely
 * carry non-breaking spaces, zero-width joiners and soft hyphens that are
 * invisible in the input box but break an exact-match lookup.
 */
function stripInvisible(input: string): string {
  return input
    .replace(/[\s\u00a0\u1680\u180e\u2000-\u200f\u202f\u205f\u2060\u3000\ufeff\u00ad]/g, "")
    .replace(/^[<"'([]+/, "")
    .replace(/[>"')\]]+$/, "");
}

/** A hostname must have at least two dot-separated labels of legal characters. */
const HOSTNAME_PATTERN = /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/**
 * Parses whatever the player typed into a canonical form.
 *
 * Deliberately lenient about scheme, case, "www.", ports, trailing slashes,
 * query strings and fragments, and strict about the hostname itself - the
 * hostname is the only part we can verify, so it is the only part we insist on.
 */
export function parseHuntUrl(input: string): UrlParseResult {
  const cleaned = stripInvisible(String(input ?? "")).toLowerCase();
  if (!cleaned) return { ok: false, reason: "empty" };

  // Drop the scheme (and any protocol-relative "//" prefix) before parsing, so
  // that "students.iiit.ac.in" and "https://students.iiit.ac.in" take one path.
  const withoutScheme = cleaned.replace(/^[a-z][a-z0-9+.-]*:\/\//, "").replace(/^\/\//, "");
  if (!withoutScheme) return { ok: false, reason: "malformed" };

  let parsed: URL;
  try {
    parsed = new URL(`https://${withoutScheme}`);
  } catch {
    return { ok: false, reason: "malformed" };
  }

  // Credentials in the authority ("user@host") are never part of a target.
  const host = parsed.hostname.replace(/^www\./, "").replace(/\.+$/, "");
  if (!HOSTNAME_PATTERN.test(host)) return { ok: false, reason: "not_a_hostname" };

  // Query strings and fragments are navigation state, not identity.
  const path = parsed.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/, "");

  const key = `${host}${path}`;
  return {
    ok: true,
    key,
    host,
    path,
    href: `https://${host}${path || "/"}`,
    isHuntDomain: host === HUNT_DOMAIN || host.endsWith(`.${HUNT_DOMAIN}`),
  };
}

/**
 * Comparison key for a URL, or null when it cannot be parsed. Use this anywhere
 * two URLs need to be compared - never compare raw input.
 */
export function urlKey(input: string): string | null {
  const parsed = parseHuntUrl(input);
  return parsed.ok ? parsed.key : null;
}

/** Human-readable explanation for each rejection reason. */
export const URL_REJECTION_MESSAGE: Record<UrlRejection, string> = {
  empty: "Please enter a website URL.",
  malformed: "That does not look like a URL. Check for typos and try again.",
  not_a_hostname: "That does not look like a website address (expected something like site.iiit.ac.in).",
  not_hunt_domain: `Only ${HUNT_DOMAIN} websites count in this hunt.`,
};
