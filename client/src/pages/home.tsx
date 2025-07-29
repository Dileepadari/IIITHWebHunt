import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import GameHero from "@/components/GameHero";
import TeamDashboard from "@/components/TeamDashboard";
import LiveLeaderboard from "@/components/LiveLeaderboard";
import ConquestHistory from "@/components/ConquestHistory";

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gaming-darker text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-electric-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-electric-blue font-orbitron">Loading Game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gaming-darker text-white font-inter">
      <Navigation />
      <div className="pt-16">
        <GameHero />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TeamDashboard />
          <LiveLeaderboard />
          <ConquestHistory />
        </div>
      </div>
    </div>
  );
}
