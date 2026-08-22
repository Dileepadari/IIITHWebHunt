import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { Team } from "@shared/schema";

export default function LiveLeaderboard() {
  const { data: teams, isLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    // Backstop only: the websocket pushes these updates as they happen.
    // Polling exists to recover from a missed event, not to drive the UI.
    refetchInterval: 60000,
  });

  // Use WebSocket for real-time updates
  useWebSocket();

  if (isLoading) {
    return (
      <section className="mb-16">
        <h2 className="font-orbitron font-bold text-3xl text-electric-blue mb-8 flex items-center">
          <i className="fas fa-trophy mr-3"></i>
          Live Leaderboard
        </h2>
        <div className="conquest-card rounded-xl p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gaming-gray rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gaming-gray rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gaming-gray rounded w-1/4"></div>  
                </div>
                <div className="h-6 bg-gaming-gray rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const sortedTeams = teams ? [...teams].sort((a, b) => b.score - a.score) : [];

  return (
    <section id="leaderboard" className="mb-16">
      <h2 className="font-orbitron font-bold text-3xl text-electric-blue mb-8 flex items-center">
        <i className="fas fa-trophy mr-3"></i>
        Live Leaderboard
        <div className="ml-3 w-3 h-3 bg-neon-green rounded-full animate-pulse"></div>
      </h2>
      
      <div className="conquest-card rounded-xl p-6">
        {!teams || teams.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-users text-gray-400 text-6xl mb-4"></i>
            <h3 className="font-orbitron font-bold text-xl text-gray-400 mb-4">No Teams Yet</h3>
            <p className="text-gray-500">Teams will appear here once they start participating in the hunt.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedTeams.map((team, index) => {
              const getRankIcon = (rank: number) => {
                switch (rank) {
                  case 0: return { icon: "fas fa-crown", color: "text-yellow-400", bg: "bg-yellow-400" };
                  case 1: return { icon: "fas fa-medal", color: "text-gray-300", bg: "bg-gray-300" };
                  case 2: return { icon: "fas fa-award", color: "text-yellow-600", bg: "bg-yellow-600" };
                  default: return { icon: "fas fa-hashtag", color: "text-gray-400", bg: "bg-gray-400" };
                }
              };

              const rankStyle = getRankIcon(index);

              return (
                <div 
                  key={team.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all hover:scale-101 ${
                    index === 0 
                      ? "bg-gradient-to-r from-yellow-400/10 to-yellow-600/10 border border-yellow-400/30 glow-effect" 
                      : index === 1 
                      ? "bg-gradient-to-r from-gray-300/10 to-gray-500/10 border border-gray-300/30"
                      : index === 2
                      ? "bg-gradient-to-r from-yellow-600/10 to-yellow-800/10 border border-yellow-600/30"
                      : "bg-gaming-gray/50 border border-gaming-light/30"
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      index < 3 ? `bg-gradient-to-br from-${rankStyle.bg}/20 to-${rankStyle.bg}/10 border border-${rankStyle.bg}/30` : "bg-gaming-dark"
                    }`}>
                      <i className={`${rankStyle.icon} ${rankStyle.color} text-xl`}></i>
                    </div>
                    <div>
                      <h3 className="font-orbitron font-bold text-lg text-white">
                        {team.name}
                        {index === 0 && <i className="fas fa-star text-yellow-400 ml-2 animate-pulse"></i>}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {team.members.length} members • {team.websitesConquered} conquests
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className={`font-orbitron font-black text-2xl ${
                      index === 0 ? "text-yellow-400" : 
                      index === 1 ? "text-gray-300" : 
                      index === 2 ? "text-yellow-600" : "text-electric-blue"
                    }`}>
                      {team.score}
                    </div>
                    <div className="text-xs text-gray-400">points</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}