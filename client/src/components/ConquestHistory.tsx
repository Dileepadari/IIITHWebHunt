import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/useAuth";
import { Conquest } from "@shared/schema";

export default function ConquestHistory() {
  const { user } = useAuth();
  
  const { data: conquests, isLoading } = useQuery<Conquest[]>({
    queryKey: ["/api/conquests/recent"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: myTeamConquests } = useQuery<Conquest[]>({
    queryKey: ["/api/conquests/team", (user as any)?.id],
    enabled: !!(user as any)?.id,
  });

  // Use WebSocket for real-time updates
  useWebSocket();

  if (isLoading) {
    return (
      <section className="mb-16">
        <h2 className="font-orbitron font-bold text-3xl text-electric-blue mb-8 flex items-center">
          <i className="fas fa-history mr-3"></i>
          Recent Conquests
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="conquest-card rounded-xl p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gaming-gray rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gaming-gray rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-gaming-gray rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="conquest-card rounded-xl p-6">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-gaming-gray rounded"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gaming-gray rounded w-2/3 mb-2"></div>
                    <div className="h-3 bg-gaming-gray rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  const recentConquests = conquests ? conquests.slice(0, 5) : [];
  const myRecentConquests = myTeamConquests ? myTeamConquests.slice(0, 5) : [];

  return (
    <section id="history" className="mb-16">
      <h2 className="font-orbitron font-bold text-3xl text-electric-blue mb-8 flex items-center">
        <i className="fas fa-history mr-3"></i>
        Recent Conquests
        <div className="ml-3 w-3 h-3 bg-electric-blue rounded-full animate-pulse"></div>
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Global Recent Conquests */}
        <div className="conquest-card rounded-xl p-6">
          <h3 className="font-orbitron font-bold text-xl text-neon-green mb-6 flex items-center">
            <i className="fas fa-globe mr-3"></i>
            Global Activity
          </h3>
          
          {(!conquests || conquests.length === 0) ? (
            <div className="text-center py-8">
              <i className="fas fa-clock text-gray-400 text-4xl mb-4"></i>
              <p className="text-gray-400">No conquest attempts yet</p>
              <p className="text-gray-500 text-sm">Be the first to make a conquest!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentConquests.map((conquest, index) => (
                <div 
                  key={index}
                  className={`flex items-center space-x-4 p-3 rounded-lg ${
                    conquest.isSuccessful 
                      ? "bg-neon-green/10 border border-neon-green/30" 
                      : "bg-red-500/10 border border-red-500/30"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    conquest.isSuccessful 
                      ? "bg-neon-green text-black" 
                      : "bg-red-500 text-white"
                  }`}>
                    <i className={`fas fa-${conquest.isSuccessful ? 'check' : 'times'} text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white truncate">
                        {conquest.teamName}
                      </span>
                      <span className={`text-sm font-bold ${
                        conquest.isSuccessful ? "text-neon-green" : "text-red-400"
                      }`}>
                        {conquest.points > 0 ? '+' : ''}{conquest.points}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {new Date(conquest.attemptedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* My Team's Recent Conquests */}
        <div className="conquest-card rounded-xl p-6">
          <h3 className="font-orbitron font-bold text-xl text-electric-purple mb-6 flex items-center">
            <i className="fas fa-users mr-3"></i>
            My Team Activity
          </h3>
          
          {(!myTeamConquests || myTeamConquests.length === 0) ? (
            <div className="text-center py-8">
              <i className="fas fa-user-clock text-gray-400 text-4xl mb-4"></i>
              <p className="text-gray-400">No team conquests yet</p>
              <p className="text-gray-500 text-sm">Start hunting to see your progress!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myRecentConquests.map((conquest, index) => (
                <div 
                  key={index}
                  className={`flex items-center space-x-4 p-3 rounded-lg ${
                    conquest.isSuccessful 
                      ? "bg-electric-blue/10 border border-electric-blue/30" 
                      : "bg-yellow-500/10 border border-yellow-500/30"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    conquest.isSuccessful 
                      ? "bg-electric-blue text-white" 
                      : "bg-yellow-500 text-black"
                  }`}>
                    <i className={`fas fa-${conquest.isSuccessful ? 'trophy' : 'exclamation'} text-sm`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white text-sm">
                        {conquest.isSuccessful ? 'Successful conquest' : 'Failed attempt'}
                      </span>
                      <span className={`text-sm font-bold ${
                        conquest.isSuccessful ? "text-electric-blue" : "text-yellow-400"
                      }`}>
                        {conquest.points > 0 ? '+' : ''}{conquest.points}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(conquest.attemptedAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}