/**
 * The scoring engine: decides what a submitted URL is worth.
 *
 * Two rules drive every branch below.
 *
 *  1. Only penalise a guess we can *prove* is wrong. A host that does not exist,
 *     or a domain outside the hunt, is provably wrong. A site we merely failed
 *     to reach is not, and scores nothing either way.
 *
 *  2. Never charge a team twice for the same submission. Re-sending a URL -
 *     whether it succeeded, was taken, or was already judged wrong - is a no-op,
 *     so an impatient double-click can never drain a team's score.
 */

import { storage } from "./storage";
import { verifyHuntHost } from "./discovery";
import {
  parseHuntUrl,
  DEFAULT_WEBSITE_POINTS,
  WRONG_GUESS_PENALTY,
  URL_REJECTION_MESSAGE,
  type UrlRejection,
} from "@shared/url";
import type { ConquestOutcome, Conqueror } from "@shared/conquest";
import type { Team, Website } from "@shared/schema";

/**
 * Whether an unreachable iiit.ac.in host counts as a wrong guess.
 *
 * Leave this off unless the game server sits on the campus network and can
 * resolve intranet hosts; otherwise internal-only sites - which are legitimate
 * targets - would cost players points for being correct.
 */
const PENALISE_UNVERIFIED_IIIT = process.env.PENALISE_UNVERIFIED_IIIT === "true";

export type ConquestDecision =
  | { kind: "rejected"; reason: UrlRejection; message: string }
  | {
      kind: "scored";
      outcome: ConquestOutcome;
      points: number;
      isSuccessful: boolean;
      /** Whether this attempt should be written to the conquest history. */
      record: boolean;
      /** Whether this attempt should move the team's score and counters. */
      score: boolean;
      url: string;
      /** Canonical key this attempt is filed under; the lookup key for repeats. */
      key: string;
      /** The team holding this website, when it is already claimed. */
      conqueredBy?: Conqueror;
      website?: Website;
      discovered: boolean;
    };

function scored(
  outcome: ConquestOutcome,
  url: string,
  key: string,
  overrides: Partial<Extract<ConquestDecision, { kind: "scored" }>> = {},
): ConquestDecision {
  return {
    kind: "scored",
    outcome,
    points: 0,
    isSuccessful: false,
    record: false,
    score: false,
    discovered: false,
    url,
    key,
    ...overrides,
  };
}

/**
 * Evaluates one submission for one team.
 *
 * Pure decision-making plus the website claim itself; persisting the attempt and
 * updating the leaderboard is the caller's job, so routes stay in charge of
 * broadcasting.
 */
export async function evaluateConquest(rawUrl: string, team: Team): Promise<ConquestDecision> {
  const parsed = parseHuntUrl(rawUrl);
  if (!parsed.ok) {
    return { kind: "rejected", reason: parsed.reason, message: URL_REJECTION_MESSAGE[parsed.reason] };
  }

  const { key, host, href } = parsed;
  const prior = await storage.getTeamAttempt(team.id, key);
  /** True when this team has already been penalised for this exact URL. */
  const alreadyPenalised = prior?.outcome === "wrong";

  // A domain outside the hunt is wrong on its face - no network check needed,
  // and none wanted: probing arbitrary hosts on a player's say-so would turn the
  // game server into an open request proxy.
  if (!parsed.isHuntDomain) {
    return alreadyPenalised
      ? scored("repeat_miss", href, key)
      : scored("wrong", href, key, { points: WRONG_GUESS_PENALTY, record: true, score: true });
  }

  let website = await storage.findWebsiteForGuess(key, host);
  let discovered = false;

  if (!website) {
    // Unknown host. Admins cannot seed every site on campus, so ask the network
    // whether this one is real before judging it.
    const verdict = await verifyHuntHost(host);

    if (verdict === "unreachable") {
      // Inconclusive: could be our network, a slow origin, or a site behind the
      // campus VPN. Costs nothing, records nothing - the player can retry.
      return scored("unverified", href, key);
    }

    if (verdict === "absent") {
      // An iiit.ac.in host that does not resolve is only *provably* wrong when
      // we are on a network that can see the whole estate. Plenty of campus
      // sites are intranet-only and vanish from public DNS, so off-campus this
      // verdict is about our vantage point, not about the guess.
      //
      // Penalising is therefore opt-in (PENALISE_UNVERIFIED_IIIT=true), and the
      // default is to score nothing rather than risk taking points for a site
      // that is real but not visible from here.
      if (!PENALISE_UNVERIFIED_IIIT) return scored("unverified", href, key);

      return alreadyPenalised
        ? scored("repeat_miss", href, key)
        : scored("wrong", href, key, { points: WRONG_GUESS_PENALTY, record: true, score: true });
    }

    // Live and previously unknown: it joins the hunt and is worth points, since
    // finding an unlisted site is exactly the skill the game rewards.
    website = await storage.createWebsiteFromUrl(href, DEFAULT_WEBSITE_POINTS, "discovered");
    if (!website) return scored("unverified", href, key);
    discovered = website.source === "discovered" && !website.isConquered;
  }

  if (website.isConquered) {
    if (website.conqueredBy === team.id) {
      return scored("already_yours", href, key, { website });
    }
    return scored("already_taken", href, key, {
      website,
      record: !prior,
      conqueredBy: await holderOf(website),
    });
  }

  const claimed = await storage.claimWebsite(website.id, team.id);
  if (!claimed) {
    // Another team won the race between our read and our write.
    const current = await storage.findWebsiteForGuess(key, host);
    if (current?.conqueredBy === team.id) {
      return scored("already_yours", href, key, { website: current });
    }
    return scored("already_taken", href, key, {
      website: current ?? website,
      record: !prior,
      conqueredBy: await holderOf(current ?? website),
    });
  }

  return scored("conquered", href, key, {
    points: website.points,
    isSuccessful: true,
    record: true,
    score: true,
    website: { ...website, isConquered: true, conqueredBy: team.id },
    discovered,
  });
}

/**
 * Looks up the team currently holding a website.
 *
 * Returned to the losing player so "already taken" can name the team that got
 * there first, which is far more useful than an anonymous rejection.
 */
async function holderOf(website: Website): Promise<Conqueror | undefined> {
  if (!website.conqueredBy) return undefined;
  const holder = await storage.getTeamById(website.conqueredBy);
  return holder ? { id: holder.id, name: holder.name } : undefined;
}

/** The normalized key for a raw submission, for callers that only need matching. */
export function submissionKey(rawUrl: string): string | null {
  const parsed = parseHuntUrl(rawUrl);
  return parsed.ok ? parsed.key : null;
}
