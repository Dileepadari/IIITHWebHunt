import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, ApiError } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Team } from "@shared/schema";
import { parseHuntUrl, SUBMISSION_COOLDOWN_MS, HUNT_DOMAIN } from "@shared/url";
import {
  CONQUEST_PRESENTATION,
  isSettled,
  type ConquestResult,
} from "@shared/conquest";

/** Ticks down a deadline, so the button can show the remaining wait. */
function useCountdown(until: number | null): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (until === null) {
      setRemaining(0);
      return;
    }

    const tick = () => setRemaining(Math.max(0, until - Date.now()));
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [until]);

  return remaining;
}

export default function TeamDashboard() {
  const [conquestUrl, setConquestUrl] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{
    outcome: ConquestResult["outcome"];
    url: string;
    points: number;
    conqueredBy?: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const cooldownRemaining = useCountdown(cooldownUntil);
  const onCooldown = cooldownRemaining > 0;

  const { data: team, isLoading: teamLoading } = useQuery<Team | null>({
    queryKey: ["/api/teams/my-team"],
  });

  /**
   * Starts the post-submission lockout.
   *
   * Applied on every settled outcome, success or failure, so that a rapid second
   * press can never reach the server - and honours the server's own Retry-After
   * when it is the one telling us to wait.
   */
  const startCooldown = useCallback((ms: number = SUBMISSION_COOLDOWN_MS) => {
    setCooldownUntil(Date.now() + ms);
  }, []);

  const conquestMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/conquests", { url });
      return (await response.json()) as ConquestResult;
    },
    onSuccess: (data) => {
      const presentation = CONQUEST_PRESENTATION[data.outcome];
      const discoveredNote = data.discovered
        ? " You found a site that was not even on our list."
        : "";

      const context = { points: data.points, conqueredBy: data.conqueredBy?.name };

      toast({
        title: presentation.title,
        description: presentation.body(context) + discoveredNote,
        variant: presentation.tone === "error" ? "destructive" : "default",
      });

      setLastResult({
        outcome: data.outcome,
        url: data.url,
        points: data.points,
        conqueredBy: data.conqueredBy?.name,
      });

      // Clear the box only once the URL is settled. A guess that scored nothing
      // because we could not verify it stays put, ready to retry.
      if (isSettled(data.outcome)) setConquestUrl("");

      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my-team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conquests/my-team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conquests/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "Please sign in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/auth";
        }, 800);
        return;
      }

      if (error instanceof ApiError && error.status === 429) {
        // The server is the authority on the cooldown; adopt its timing.
        startCooldown(Number(error.payload?.retryAfterMs) || SUBMISSION_COOLDOWN_MS);
      }

      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Runs after both branches, so the lockout is never skipped.
      setCooldownUntil((current) => {
        const next = Date.now() + SUBMISSION_COOLDOWN_MS;
        return current && current > next ? current : next;
      });
    },
  });

  /** Live feedback on what the player has typed, using the same parser the server uses. */
  const urlPreview = useMemo(() => {
    const trimmed = conquestUrl.trim();
    if (!trimmed) return null;

    const parsed = parseHuntUrl(trimmed);
    if (!parsed.ok) {
      return { valid: false as const, message: "That does not look like a website address yet." };
    }
    if (!parsed.isHuntDomain) {
      return {
        valid: false as const,
        message: `Only ${HUNT_DOMAIN} websites count - this one would cost you points.`,
      };
    }
    return { valid: true as const, message: `Will be submitted as ${parsed.href}` };
  }, [conquestUrl]);

  const handleConquest = (e: React.FormEvent) => {
    e.preventDefault();

    if (conquestMutation.isPending || onCooldown) return;

    const url = conquestUrl.trim();
    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter a website URL.",
        variant: "destructive",
      });
      inputRef.current?.focus();
      return;
    }

    conquestMutation.mutate(url);
  };

  const successRate = useMemo(() => {
    if (!team || team.totalAttempts === 0) return 0;
    return Math.round((team.successfulAttempts / team.totalAttempts) * 100);
  }, [team]);

  if (teamLoading) {
    return (
      <section className="mb-16">
        <div className="animate-pulse">
          <div className="h-8 bg-gaming-gray rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="h-64 bg-gaming-gray rounded-xl"></div>
            <div className="lg:col-span-2 h-64 bg-gaming-gray rounded-xl"></div>
          </div>
        </div>
      </section>
    );
  }

  if (!team) {
    return (
      <section className="mb-16">
        <h2 className="font-orbitron font-bold text-3xl text-electric-blue mb-8 flex items-center">
          <i className="fas fa-tachometer-alt mr-3"></i>
          Team Dashboard
        </h2>
        <div className="conquest-card rounded-xl p-8 text-center">
          <i className="fas fa-users text-gray-400 text-6xl mb-4"></i>
          <h3 className="font-orbitron font-bold text-xl text-gray-400 mb-4">No Team Found</h3>
          <p className="text-gray-500">
            You are not part of any team yet. Contact an admin to join a team.
          </p>
        </div>
      </section>
    );
  }

  const submitDisabled = conquestMutation.isPending || onCooldown;

  return (
    <section id="dashboard" className="mb-16">
      <h2 className="font-orbitron font-bold text-3xl text-electric-blue mb-8 flex items-center">
        <i className="fas fa-tachometer-alt mr-3"></i>
        Team Dashboard
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Team Info Card */}
        <div className="lg:col-span-1">
          <div className="conquest-card rounded-xl p-6">
            <div className="flex items-center mb-6">
              <div className="team-badge w-12 h-12 rounded-lg flex items-center justify-center mr-4">
                <i className="fas fa-users text-white text-xl"></i>
              </div>
              <div>
                <h3 className="font-orbitron font-bold text-xl">{team.name}</h3>
                <p className="text-gray-400">{team.members.length} members</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Total Score</span>
                <span className="font-bold text-electric-blue text-xl">{team.score}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Websites Conquered</span>
                <span className="font-bold text-electric-purple text-xl">
                  {team.websitesConquered}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Success Rate</span>
                <span className="font-bold text-neon-green text-xl">{successRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Conquest Form */}
        <div className="lg:col-span-2">
          <div className="conquest-card rounded-xl p-6">
            <h3 className="font-orbitron font-bold text-xl text-electric-blue mb-6 flex items-center">
              <i className="fas fa-crosshairs mr-3"></i>
              Quick Conquest
            </h3>

            <form onSubmit={handleConquest} className="space-y-6">
              <div>
                <Label
                  htmlFor="conquest-url"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Website URL
                </Label>
                <Input
                  ref={inputRef}
                  id="conquest-url"
                  // Deliberately not type="url": the browser's own validation
                  // rejects "students.iiit.ac.in" for lacking a scheme, which the
                  // server accepts perfectly well.
                  type="text"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="students.iiit.ac.in"
                  value={conquestUrl}
                  onChange={(e) => setConquestUrl(e.target.value)}
                  className="w-full bg-gaming-dark border border-gaming-light text-white placeholder-gray-500 focus:border-electric-blue"
                />
                {urlPreview && (
                  <p
                    className={`mt-2 text-xs ${
                      urlPreview.valid ? "text-neon-green" : "text-yellow-400"
                    }`}
                  >
                    <i
                      className={`fas ${
                        urlPreview.valid ? "fa-check-circle" : "fa-exclamation-circle"
                      } mr-2`}
                    ></i>
                    {urlPreview.message}
                  </p>
                )}
              </div>

              {lastResult && (
                <div
                  className={`rounded-lg p-3 border ${
                    CONQUEST_PRESENTATION[lastResult.outcome].tone === "success"
                      ? "bg-neon-green/10 border-neon-green/30 text-neon-green"
                      : CONQUEST_PRESENTATION[lastResult.outcome].tone === "error"
                        ? "bg-red-500/10 border-red-500/30 text-red-400"
                        : "bg-electric-blue/10 border-electric-blue/30 text-electric-blue"
                  }`}
                >
                  <div className="text-sm font-semibold">
                    {CONQUEST_PRESENTATION[lastResult.outcome].title}
                  </div>
                  <div className="text-xs opacity-90 break-all">
                    {lastResult.url} -{" "}
                    {CONQUEST_PRESENTATION[lastResult.outcome].body({
                      points: lastResult.points,
                      conqueredBy: lastResult.conqueredBy,
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-gray-400">
                  <i className="fas fa-info-circle mr-2 text-electric-blue"></i>
                  Correct guess: +points | Provably wrong: -25 | Repeat or already taken: 0
                </div>
                <Button
                  type="submit"
                  disabled={submitDisabled}
                  className="bg-gradient-to-r from-electric-blue to-neon-green hover:opacity-90 text-white font-semibold glow-effect disabled:opacity-60"
                >
                  {conquestMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
                    </>
                  ) : onCooldown ? (
                    <>
                      <i className="fas fa-hourglass-half mr-2"></i>
                      Wait {(cooldownRemaining / 1000).toFixed(1)}s
                    </>
                  ) : (
                    <>
                      <i className="fas fa-flag mr-2"></i>
                      Conquer Website
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
