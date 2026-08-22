import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { GameSession } from "@shared/schema";

interface GameStats {
  totalWebsites: number;
  conquered: number;
  discovered: number;
  activeTeams: number;
  totalAttempts: number;
}

/** The session as the API returns it: with an absolute deadline attached. */
type CurrentGame = GameSession & { endsAt: string | null; serverTime: string };

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function GameHero() {
  const { data: stats } = useQuery<GameStats>({
    queryKey: ["/api/admin/stats"],
    // Backstop only: the websocket pushes these updates as they happen.
    // Polling exists to recover from a missed event, not to drive the UI.
    refetchInterval: 60000,
  });

  const { data: gameSession } = useQuery<CurrentGame | null>({
    queryKey: ["/api/game/current"],
    // Polled faster than the rest: this carries the clock and the pause
    // state, and a stale copy changes whether submissions are accepted.
    refetchInterval: 15000,
  });

  // Use WebSocket for real-time updates
  useWebSocket();

  // The clock has to tick on its own. Previously the countdown only recomputed
  // when the query refetched, so it visibly jumped in 10-second steps.
  const [now, setNow] = useState(() => Date.now());
  const isRunning = gameSession?.status === "active";

  useEffect(() => {
    if (!isRunning) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  /**
   * Offset between this browser's clock and the server's, sampled whenever the
   * session is refetched. Without it, a device with a badly set clock shows a
   * countdown that disagrees with everyone else's.
   */
  const skewRef = useRef(0);
  const serverTime = gameSession?.serverTime;
  useEffect(() => {
    if (serverTime) skewRef.current = Date.parse(serverTime) - Date.now();
  }, [serverTime]);

  const getTimeRemaining = () => {
    if (!gameSession?.endsAt || gameSession.status === "ended") return "00:00:00";
    return formatDuration(new Date(gameSession.endsAt).getTime() - (now + skewRef.current));
  };

  return (
    <section className="bg-gradient-to-br from-gaming-dark via-gaming-gray to-gaming-dark py-16 mt-26">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="font-orbitron text-white text-5xl md:text-7xl mb-4 bg-gradient-to-r from-electric-blue to-neon-green bg-clip-text">
            WEBSITE HUNT
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Compete with teams to conquer websites across IIIT Hyderabad's digital landscape. 
            Find, claim, and dominate to climb the leaderboard!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="conquest-card rounded-xl p-6 text-center glow-effect">
            <i className="fas fa-globe text-electric-blue text-3xl mb-3"></i>
            <h3 className="font-orbitron font-bold text-2xl text-electric-blue">
              {stats?.totalWebsites || 0}
            </h3>
            <p className="text-gray-400">Total Websites</p>
          </div>
          
          <div className="conquest-card rounded-xl p-6 text-center glow-effect">
            <i className="fas fa-flag text-neon-green text-3xl mb-3"></i>
            <h3 className="font-orbitron font-bold text-2xl text-neon-green">
              {stats?.conquered || 0}
            </h3>
            <p className="text-gray-400">Conquered</p>
          </div>
          
          <div className="conquest-card rounded-xl p-6 text-center glow-effect">
            <i className="fas fa-users text-electric-purple text-3xl mb-3"></i>
            <h3 className="font-orbitron font-bold text-2xl text-electric-purple">
              {stats?.activeTeams || 0}
            </h3>
            <p className="text-gray-400">Active Teams</p>
          </div>
          
          <div className="conquest-card rounded-xl p-6 text-center glow-effect">
            <i className="fas fa-clock text-yellow-400 text-3xl mb-3"></i>
            <h3 className="font-orbitron font-bold text-2xl text-yellow-400">
              {getTimeRemaining()}
            </h3>
            <p className="text-gray-400">
              {gameSession?.status === 'active' ? 'Time Left' : 
               gameSession?.status === 'paused' ? 'Paused' : 
               gameSession?.status === 'ended' ? 'Game Ended' : 'Waiting'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}