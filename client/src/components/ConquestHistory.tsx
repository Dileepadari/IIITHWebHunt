import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function ConquestHistory() {
  const { data: myTeam } = useQuery({
    queryKey: ["/api/teams/my-team"],
  });

  const { data: teamConquests } = useQuery({
    queryKey: ["/api/conquests/team", myTeam?.id],
    enabled: !!myTeam?.id,
  });

  const { data: recentConquests } = useQuery({
    queryKey: ["/api/conquests/recent"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Use WebSocket for real-time updates
  useWebSocket();

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  const getDomainFromUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain;
    } catch {
      return url;
    }
  };

  return (
    <section id="conquest" className="mb-16">
      <h2 className="font-orbitron font-bold text-3xl text-electric-blue mb-8 flex items-center">
        <i className="fas fa-history mr-3"></i>
        Recent Conquest Activity
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Your Team's Conquests */}
        <div className="conquest-card rounded-xl p-6">
          <h3 className="font-semibold text-lg text-neon-green mb-4 flex items-center">
            <i className="fas fa-flag mr-2"></i>
            Your Team's Conquests
          </h3>
          
          <div className="space-y-4">
            {teamConquests && teamConquests.length > 0 ? (
              teamConquests.slice(0, 5).map((conquest: any) => (
                <div key={conquest.id} className="flex items-center justify-between p-3 bg-gaming-dark rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      conquest.isSuccessful 
                        ? 'bg-neon-green bg-opacity-20' 
                        : 'bg-danger-red bg-opacity-20'
                    }`}>
                      <i className={`fas ${
                        conquest.isSuccessful ? 'fa-check text-neon-green' : 'fa-times text-danger-red'
                      }`}></i>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{getDomainFromUrl(conquest.url)}</p>
                      <p className="text-xs text-gray-400">{formatTimeAgo(conquest.attemptedAt)}</p>
                    </div>
                  </div>
                  <span className={`font-bold ${
                    conquest.points > 0 ? 'text-neon-green' : 'text-danger-red'
                  }`}>
                    {conquest.points > 0 ? '+' : ''}{conquest.points}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <i className="fas fa-flag text-gray-400 text-3xl mb-3"></i>
                <p className="text-gray-400">No conquest attempts yet</p>
                <p className="text-sm text-gray-500 mt-2">Start conquering websites to see your history here!</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Global Activity Feed */}
        <div className="conquest-card rounded-xl p-6">
          <h3 className="font-semibold text-lg text-electric-purple mb-4 flex items-center">
            <i className="fas fa-globe-americas mr-2"></i>
            Global Activity Feed
          </h3>
          
          <div className="space-y-4">
            {recentConquests && recentConquests.length > 0 ? (
              recentConquests.slice(0, 5).map((activity: any) => (
                <div 
                  key={activity.id} 
                  className={`flex items-center justify-between p-3 bg-gaming-dark rounded-lg border-l-4 ${
                    activity.isSuccessful ? 'border-neon-green' : 'border-danger-red'
                  }`}
                >
                  <div>
                    <p className="font-medium text-sm">
                      <span className="text-electric-purple">{activity.team.name}</span>
                      {activity.isSuccessful ? ' conquered ' : ' failed attempt on '}
                      <span className={activity.isSuccessful ? 'text-neon-green' : 'text-danger-red'}>
                        {activity.website ? getDomainFromUrl(activity.website.url) : getDomainFromUrl(activity.url)}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">{formatTimeAgo(activity.attemptedAt)}</p>
                  </div>
                  <span className={`font-bold ${
                    activity.points > 0 ? 'text-neon-green' : 'text-danger-red'
                  }`}>
                    {activity.points > 0 ? '+' : ''}{activity.points}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <i className="fas fa-globe-americas text-gray-400 text-3xl mb-3"></i>
                <p className="text-gray-400">No recent activity</p>
                <p className="text-sm text-gray-500 mt-2">Global conquest activity will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
