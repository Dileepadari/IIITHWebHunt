import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TeamDashboard() {
  const [conquestUrl, setConquestUrl] = useState("");
  const [urlValidated, setUrlValidated] = useState(false);
  const { toast } = useToast();

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["/api/teams/my-team"],
  });

  const { data: teamConquests } = useQuery({
    queryKey: ["/api/conquests/team", team?.id],
    enabled: !!team?.id,
  });

  const conquestMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/conquests", { url });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.isSuccessful) {
        toast({
          title: "Conquest Successful! 🎉",
          description: `You earned ${data.points} points!`,
          variant: "default",
        });
      } else {
        toast({
          title: "Conquest Failed",
          description: `Wrong guess. You lost ${Math.abs(data.points)} points.`,
          variant: "destructive",
        });
      }
      setConquestUrl("");
      setUrlValidated(false);
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams/my-team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conquests"] });
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

  const validateUrl = () => {
    if (conquestUrl && conquestUrl.includes('iiit.ac.in')) {
      setUrlValidated(true);
      setTimeout(() => setUrlValidated(false), 3000);
    } else {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid IIIT Hyderabad website URL",
        variant: "destructive",
      });
    }
  };

  const handleConquest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conquestUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a website URL",
        variant: "destructive",
      });
      return;
    }
    conquestMutation.mutate(conquestUrl);
  };

  const getSuccessRate = () => {
    if (!team || team.totalAttempts === 0) return 0;
    return Math.round((team.successfulAttempts / team.totalAttempts) * 100);
  };

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
          <p className="text-gray-500">You are not part of any team yet. Contact an admin to join a team.</p>
        </div>
      </section>
    );
  }

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
                <span className="font-bold text-electric-purple text-xl">{team.websitesConquered}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Success Rate</span>
                <span className="font-bold text-neon-green text-xl">{getSuccessRate()}%</span>
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
                <Label htmlFor="conquest-url" className="block text-sm font-medium text-gray-300 mb-2">
                  Website URL
                </Label>
                <div className="relative">
                  <Input
                    id="conquest-url"
                    type="url"
                    placeholder="https://example.iiit.ac.in"
                    value={conquestUrl}
                    onChange={(e) => setConquestUrl(e.target.value)}
                    className="w-full bg-gaming-dark border border-gaming-light text-white placeholder-gray-500 focus:border-electric-blue pr-12"
                  />
                  <button
                    type="button"
                    onClick={validateUrl}
                    className="absolute right-3 top-3 text-gray-400 hover:text-electric-blue transition-colors"
                  >
                    <i className="fas fa-search"></i>
                  </button>
                </div>
              </div>
              
              {/* URL Validation Status */}
              {urlValidated && (
                <div className="bg-neon-green bg-opacity-10 border border-neon-green border-opacity-30 rounded-lg p-3">
                  <div className="flex items-center text-neon-green">
                    <i className="fas fa-check-circle mr-2"></i>
                    <span className="text-sm">URL validated successfully!</span>
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  <i className="fas fa-info-circle mr-2 text-electric-blue"></i>
                  Correct guess: +100 points | Wrong guess: -25 points
                </div>
                <Button
                  type="submit"
                  disabled={conquestMutation.isPending}
                  className="bg-gradient-to-r from-electric-blue to-neon-green hover:opacity-90 text-white font-semibold glow-effect"
                >
                  {conquestMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Processing...
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
