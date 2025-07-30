import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { GameSession } from "@shared/schema";

interface GameStats {
  totalWebsites: number;
  conquered: number;
  activeTeams: number;
}

export default function GameHero() {
  const { data: stats } = useQuery<GameStats>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: gameSession } = useQuery<GameSession>({
    queryKey: ["/api/game/current"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Use WebSocket for real-time updates
  useWebSocket();

  const getTimeRemaining = () => {
    if (!gameSession?.startTime || !gameSession?.duration) {
      return "00:00:00";
    }
    
    const startTime = new Date(gameSession.startTime).getTime();
    const duration = gameSession.duration * 60 * 1000; // Convert minutes to milliseconds
    const endTime = startTime + duration;
    const now = Date.now();
    const remaining = Math.max(0, endTime - now);
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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