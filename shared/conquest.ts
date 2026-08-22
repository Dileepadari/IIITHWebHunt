/**
 * The vocabulary of conquest results, shared so that the server decides the
 * outcome and the client only decides how to render it.
 */

import type { Conquest, Team, Website } from "./schema";

export type ConquestOutcome =
  /** Valid, unclaimed target - points awarded. */
  | "conquered"
  /** Your own team already claimed this - no points, no penalty, no new attempt. */
  | "already_yours"
  /** Another team got here first - no points, no penalty. */
  | "already_taken"
  /** You already guessed this exact URL and it was wrong - not penalised again. */
  | "repeat_miss"
  /** Reachable-looking iiit.ac.in host we could not verify right now - no penalty. */
  | "unverified"
  /** Provably wrong: the host does not exist, or is not an iiit.ac.in host. */
  | "wrong";

/** Outcomes that must never move a team's score. */
export const NEUTRAL_OUTCOMES: readonly ConquestOutcome[] = [
  "already_yours",
  "already_taken",
  "repeat_miss",
  "unverified",
];

/** Identifies the team holding a website, for "already taken" replies. */
export type Conqueror = { id: string; name: string };

export type ConquestResult = {
  outcome: ConquestOutcome;
  /** Points applied to the team's score for this submission (0 for neutral outcomes). */
  points: number;
  isSuccessful: boolean;
  /** Canonical form of what the player submitted, for display. */
  url: string;
  /** True when this guess added a brand-new website to the hunt. */
  discovered: boolean;
  /**
   * Who holds this website. Populated whenever the guess was correct but the
   * site was already claimed, so the player learns which team beat them to it
   * rather than just being told "taken".
   */
  conqueredBy?: Conqueror;
  /** Present when the submission was recorded in history. */
  conquest?: Conquest;
  team?: Team;
  website?: Website;
};

/** Everything a result message may need to render. */
export type PresentationContext = {
  /** Already-signed points value from the server. */
  points: number;
  /** Name of the team holding the site, when one holds it. */
  conqueredBy?: string;
};

type Presentation = {
  title: string;
  body: (context: PresentationContext) => string;
  tone: "success" | "neutral" | "error";
};

export const CONQUEST_PRESENTATION: Record<ConquestOutcome, Presentation> = {
  conquered: {
    title: "Conquest Successful!",
    body: ({ points }) => `You earned ${points} points.`,
    tone: "success",
  },
  already_yours: {
    title: "Already done",
    body: () => "Your team has already conquered this website. No points changed.",
    tone: "neutral",
  },
  already_taken: {
    title: "Already taken",
    body: ({ conqueredBy }) =>
      conqueredBy
        ? `${conqueredBy} conquered this website first. No points lost.`
        : "Another team conquered this website first. No points lost.",
    tone: "neutral",
  },
  repeat_miss: {
    title: "Already tried",
    body: () => "You have already guessed this URL and it was wrong. No extra penalty.",
    tone: "neutral",
  },
  unverified: {
    title: "Could not verify",
    body: () =>
      "We could not reach that site from here, so nothing was scored and nothing was lost. " +
      "If it is an internal IIIT site, try again from the campus network.",
    tone: "neutral",
  },
  wrong: {
    title: "Wrong Guess",
    body: ({ points }) => `That is not a live IIIT website. You lost ${Math.abs(points)} points.`,
    tone: "error",
  },
};

/** True when the outcome means "stop submitting this, it is settled". */
export function isSettled(outcome: ConquestOutcome): boolean {
  return outcome === "already_yours" || outcome === "already_taken" || outcome === "conquered";
}
