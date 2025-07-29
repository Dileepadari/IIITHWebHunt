import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import GameHero from "@/components/GameHero";
import TeamDashboard from "@/components/TeamDashboard";
import LiveLeaderboard from "@/components/LiveLeaderboard";
import ConquestHistory from "@/components/ConquestHistory";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gaming-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 font-orbitron">Loading Website Hunt...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // This should not happen as routing handles it, but just in case
  }

  return (
    <div className="min-h-screen bg-gaming-dark">
      <Navigation />
      
      {/* Main Content */}
      <main className="pt-32">
        <GameHero />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <TeamDashboard />
          <LiveLeaderboard />
          <ConquestHistory />
        </div>
      </main>
    </div>
  );
}