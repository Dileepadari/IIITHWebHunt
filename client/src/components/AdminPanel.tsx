import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TeamRegistrationModal from "./TeamRegistrationModal";

export default function AdminPanel() {
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const { toast } = useToast();

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 30000,
  });

  const { data: gameSession } = useQuery({
    queryKey: ["/api/game/current"],
  });

  const { data: teams } = useQuery({
    queryKey: ["/api/teams"],
  });

  // Game control mutations
  const startGameMutation = useMutation({
    mutationFn: async (duration: number) => {
      const response = await apiRequest("POST", "/api/game/start", { duration });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Game Started",
        description: "The website hunt has begun!",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/game/current"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pauseGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/game/${gameSession?.id}`, { status: "paused" });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Game Paused",
        description: "The game has been paused",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/game/current"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const endGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/game/${gameSession?.id}`, { 
        status: "ended",
        endTime: new Date().toISOString()
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Game Ended",
        description: "The website hunt has ended",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/game/current"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Website management
  const addWebsiteMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const promises = urls.map(url => {
        const domain = new URL(url).hostname;
        return apiRequest("POST", "/api/websites", { url, domain });
      });
      return await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Websites Added",
        description: "New websites have been added to the database",
        variant: "default",
      });
      setNewWebsiteUrl("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddWebsites = () => {
    if (!newWebsiteUrl.trim()) {
      toast({
        title: "URLs Required",
        description: "Please enter at least one website URL",
        variant: "destructive",
      });
      return;
    }

    const urls = newWebsiteUrl
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0)
      .filter(url => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      });

    if (urls.length === 0) {
      toast({
        title: "Invalid URLs",
        description: "Please enter valid website URLs",
        variant: "destructive",
      });
      return;
    }

    addWebsiteMutation.mutate(urls);
  };

  return (
    <section id="admin" className="mb-16">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-orbitron font-bold text-3xl text-electric-blue flex items-center">
          <i className="fas fa-cog mr-3"></i>
          Admin Control Panel
        </h2>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-electric-blue rounded-full"></div>
          <span className="text-sm text-gray-400">Admin Access</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Game Controls */}
        <div className="conquest-card rounded-xl p-6">
          <h3 className="font-semibold text-lg text-electric-blue mb-6 flex items-center">
            <i className="fas fa-play-circle mr-2"></i>
            Game Controls
          </h3>
          
          <div className="space-y-4">
            <Button
              onClick={() => startGameMutation.mutate(180)}
              disabled={gameSession?.status === 'active' || startGameMutation.isPending}
              className="w-full bg-neon-green hover:bg-opacity-80 text-white font-semibold glow-effect"
            >
              <i className="fas fa-play mr-2"></i>
              {startGameMutation.isPending ? "Starting..." : "Start Game"}
            </Button>
            
            <Button
              onClick={() => pauseGameMutation.mutate()}
              disabled={gameSession?.status !== 'active' || pauseGameMutation.isPending}
              className="w-full bg-yellow-500 hover:bg-opacity-80 text-white font-semibold glow-effect"
            >
              <i className="fas fa-pause mr-2"></i>
              {pauseGameMutation.isPending ? "Pausing..." : "Pause Game"}
            </Button>
            
            <Button
              onClick={() => endGameMutation.mutate()}
              disabled={!gameSession || gameSession.status === 'ended' || endGameMutation.isPending}
              className="w-full bg-danger-red hover:bg-opacity-80 text-white font-semibold glow-effect"
            >
              <i className="fas fa-stop mr-2"></i>
              {endGameMutation.isPending ? "Ending..." : "End Game"}
            </Button>

            <div className="mt-4 p-3 bg-gaming-dark rounded-lg">
              <p className="text-sm text-gray-400">Current Status:</p>
              <p className={`font-semibold ${
                gameSession?.status === 'active' ? 'text-neon-green' :
                gameSession?.status === 'paused' ? 'text-yellow-400' :
                gameSession?.status === 'ended' ? 'text-danger-red' :
                'text-gray-400'
              }`}>
                {gameSession?.status ? gameSession.status.toUpperCase() : 'NO ACTIVE SESSION'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Team Management */}
        <div className="conquest-card rounded-xl p-6">
          <h3 className="font-semibold text-lg text-electric-blue mb-6 flex items-center">
            <i className="fas fa-users-cog mr-2"></i>
            Team Management
          </h3>
          
          <div className="space-y-4 max-h-60 overflow-y-auto">
            {teams && teams.length > 0 ? (
              teams.map((team: any) => (
                <div key={team.id} className="flex items-center justify-between p-3 bg-gaming-dark rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{team.name}</p>
                    <p className="text-xs text-gray-400">{team.members.length} members • Score: {team.score}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button className="text-electric-blue hover:text-neon-green transition-colors">
                      <i className="fas fa-edit"></i>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <i className="fas fa-users text-gray-400 text-2xl mb-2"></i>
                <p className="text-gray-400 text-sm">No teams found</p>
              </div>
            )}
          </div>
          
          <Button
            onClick={() => setShowTeamModal(true)}
            className="w-full mt-4 bg-electric-blue hover:bg-opacity-80 text-white font-semibold glow-effect"
          >
            <i className="fas fa-plus mr-2"></i>
            Add New Team
          </Button>
        </div>
        
        {/* Website Database */}
        <div className="conquest-card rounded-xl p-6">
          <h3 className="font-semibold text-lg text-electric-blue mb-6 flex items-center">
            <i className="fas fa-database mr-2"></i>
            Website Database
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-gaming-dark p-3 rounded-lg">
                <p className="text-2xl font-bold text-neon-green">{stats?.totalWebsites || 0}</p>
                <p className="text-xs text-gray-400">Total Sites</p>
              </div>
              <div className="bg-gaming-dark p-3 rounded-lg">
                <p className="text-2xl font-bold text-danger-red">{stats?.conquered || 0}</p>
                <p className="text-xs text-gray-400">Conquered</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <Label htmlFor="new-websites" className="text-sm font-medium text-gray-300">
                Add Websites (one per line)
              </Label>
              <Textarea
                id="new-websites"
                placeholder="https://students.iiit.ac.in&#10;https://research.iiit.ac.in&#10;https://library.iiit.ac.in"
                value={newWebsiteUrl}
                onChange={(e) => setNewWebsiteUrl(e.target.value)}
                className="bg-gaming-dark border border-gaming-light text-white placeholder-gray-500 min-h-[100px]"
              />
              <Button
                onClick={handleAddWebsites}
                disabled={addWebsiteMutation.isPending}
                className="w-full bg-neon-green hover:bg-opacity-80 text-white font-semibold glow-effect"
              >
                <i className="fas fa-plus mr-2"></i>
                {addWebsiteMutation.isPending ? "Adding..." : "Add Websites"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Team Registration Modal */}
      <TeamRegistrationModal 
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
      />
    </section>
  );
}
