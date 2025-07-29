import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function LiveLeaderboard() {
  const { data: teams, isLoading } = useQuery({
    queryKey: ["/api/teams"],
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  const { data: myTeam } = useQuery({
    queryKey: ["/api/teams/my-team"],
  });

  // Use WebSocket for real-time updates
  useWebSocket();

  const getSuccessRate = (team: any) => {
    if (team.totalAttempts === 0) return 0;
    return Math.round((team.successfulAttempts / team.totalAttempts) * 100);
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <i className="fas fa-crown text-yellow-400"></i>;
      case 1:
        return <i className="fas fa-medal text-gray-300"></i>;
      case 2:
        return <i className="fas fa-award text-yellow-600"></i>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <section className="mb-16">
        <div className="animate-pulse">
          <div className="h-8 bg-gaming-gray rounded w-1/3 mb-8"></div>
          <div className="conquest-card rounded-xl">
            <div className="bg-gaming-gray p-4">
              <div className="h-6 bg-gaming-light rounded w-full"></div>
            </div>
            <div className="space-y-4 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gaming-gray rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="leaderboard" className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-orbitron font-bold text-3xl text-electric-blue flex items-center">
          <i className="fas fa-trophy mr-3"></i>
          Live Leaderboard
        </h2>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
          <span>Live Updates</span>
        </div>
      </div>
      
      <div className="conquest-card rounded-xl overflow-hidden">
        <div className="bg-gaming-gray p-4 border-b border-gaming-light">
          <div className="grid grid-cols-5 gap-4 font-semibold text-gray-300">
            <div>Rank</div>
            <div>Team</div>
            <div>Score</div>
            <div>Conquered</div>
            <div>Success Rate</div>
          </div>
        </div>
        
        {teams && teams.length > 0 ? (
          <div>
            {teams.map((team: any, index: number) => {
              const isMyTeam = myTeam && myTeam.id === team.id;
              const successRate = getSuccessRate(team);
              
              return (
                <div
                  key={team.id}
                  className={`p-4 border-b border-gaming-light hover:bg-gaming-gray transition-colors ${
                    isMyTeam ? 'bg-gaming-light bg-opacity-30' : ''
                  }`}
                >
                  <div className="grid grid-cols-5 gap-4 items-center">
                    <div className="flex items-center space-x-3">
                      <span className={`font-orbitron font-bold text-xl ${
                        index === 0 ? 'text-yellow-400' : 
                        index === 1 ? 'text-gray-300' : 
                        index === 2 ? 'text-yellow-600' : 
                        isMyTeam ? 'text-electric-blue' : 'text-gray-300'
                      }`}>
                        #{index + 1}
                      </span>
                      {getRankIcon(index)}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="team-badge w-8 h-8 rounded-lg flex items-center justify-center">
                        <i className="fas fa-users text-white text-sm"></i>
                      </div>
                      <span className={`font-semibold ${isMyTeam ? 'text-electric-blue' : 'text-white'}`}>
                        {team.name}
                      </span>
                      {isMyTeam && (
                        <span className="text-xs text-electric-blue bg-electric-blue bg-opacity-20 px-2 py-1 rounded">
                          Your Team
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-neon-green text-lg">{team.score}</div>
                    <div className="font-semibold text-electric-purple">{team.websitesConquered}</div>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gaming-dark rounded-full h-2">
                        <div
                          className="bg-neon-green h-2 rounded-full progress-glow transition-all duration-300"
                          style={{ width: `${successRate}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{successRate}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <i className="fas fa-users text-gray-400 text-4xl mb-4"></i>
            <p className="text-gray-400">No teams found</p>
          </div>
        )}
      </div>
    </section>
  );
}
