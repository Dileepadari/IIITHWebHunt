import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import TeamRegistrationModal from "./TeamRegistrationModal";
import { Team, Website, GameSession } from "@shared/schema";

interface GameStats {
  totalWebsites: number;
  conquered: number;
  discovered: number;
  activeTeams: number;
  totalAttempts: number;
}

type RejectedUrl = { url: string; reason: string };

type BulkAddResponse = {
  count: number;
  duplicates: number;
  rejected: RejectedUrl[];
  websites: Website[];
};

/** Server rejection codes, in the admin's language. */
const REJECTION_LABEL: Record<string, string> = {
  empty: "blank",
  malformed: "not a URL",
  not_a_hostname: "not a hostname",
  not_hunt_domain: "not an iiit.ac.in domain",
};

/**
 * Shared failure handling for every admin action.
 *
 * The five copies this replaces each redirected to "/api/login", which is not a
 * page - it is the POST endpoint - so an expired session sent admins to a blank
 * error instead of the sign-in form.
 */
function useAdminErrorHandler() {
  const { toast } = useToast();

  return (error: Error) => {
    if (isUnauthorizedError(error)) {
      toast({
        title: "Session expired",
        description: "Please sign in again.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/auth";
      }, 800);
      return;
    }
    toast({ title: "Error", description: error.message, variant: "destructive" });
  };
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("overview");
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [newGameDuration, setNewGameDuration] = useState("");
  const [bulkWebsites, setBulkWebsites] = useState("");
  const [rejectedUrls, setRejectedUrls] = useState<RejectedUrl[]>([]);
  const { toast } = useToast();
  const handleError = useAdminErrorHandler();

  // Queries
  const { data: stats } = useQuery<GameStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: websites } = useQuery<Website[]>({
    queryKey: ["/api/websites"],
  });

  const { data: gameSession } = useQuery<GameSession>({
    queryKey: ["/api/game/current"],
  });

  // Mutations
  const startGameMutation = useMutation({
    mutationFn: async (duration: number) => {
      const response = await apiRequest("POST", "/api/game/start", { duration });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Game Started! 🎮",
        description: "The Website Hunt has begun!",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/game/current"] });
      setNewGameDuration("");
    },
    onError: handleError,
  });

  const pauseGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/game/pause", {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Game Paused",
        description: "The game has been paused.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/game/current"] });
    },
    onError: handleError,
  });

  const resumeGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/game/resume", {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Game Resumed",
        description: "The game has been resumed.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/game/current"] });
    },
    onError: handleError,
  });

  const endGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/game/end", {});
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Game Ended",
        description: "The Website Hunt has ended.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/game/current"] });
    },
    onError: handleError,
  });

  const addWebsitesMutation = useMutation({
    mutationFn: async (websiteUrls: string[]) => {
      const response = await apiRequest("POST", "/api/websites/bulk", { urls: websiteUrls });
      return (await response.json()) as BulkAddResponse;
    },
    onSuccess: (data) => {
      // Report skipped lines rather than silently swallowing them, so an admin
      // pasting 40 URLs can see exactly which ones did not land.
      const notes = [
        data.duplicates > 0 ? `${data.duplicates} already listed` : null,
        data.rejected.length > 0 ? `${data.rejected.length} rejected` : null,
      ].filter(Boolean);

      toast({
        title: data.count > 0 ? "Websites Added" : "Nothing Added",
        description:
          `Added ${data.count} website${data.count === 1 ? "" : "s"}` +
          (notes.length > 0 ? ` (${notes.join(", ")}).` : "."),
        variant: data.count > 0 ? "default" : "destructive",
      });

      setRejectedUrls(data.rejected);
      queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      if (data.count > 0) setBulkWebsites("");
    },
    onError: handleError,
  });

  const handleStartGame = () => {
    const duration = parseInt(newGameDuration);
    if (!duration || duration <= 0) {
      toast({
        title: "Invalid Duration",
        description: "Please enter a valid game duration in minutes.",
        variant: "destructive",
      });
      return;
    }
    startGameMutation.mutate(duration);
  };

  const handleBulkAddWebsites = () => {
    if (!bulkWebsites.trim()) {
      toast({
        title: "No URLs Provided",
        description: "Please enter website URLs to add.",
        variant: "destructive",
      });
      return;
    }

    // Split on newlines *and* commas, and do not pre-filter: the server owns URL
    // validation, and dropping lines here just hid typos from the admin.
    const urls = bulkWebsites
      .split(/[\n,]/)
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urls.length === 0) {
      toast({
        title: "No URLs Provided",
        description: "Please enter at least one website URL.",
        variant: "destructive",
      });
      return;
    }

    setRejectedUrls([]);
    addWebsitesMutation.mutate(urls);
  };

  const getGameStatusColor = () => {
    switch (gameSession?.status) {
      case 'active': return 'text-neon-green';
      case 'paused': return 'text-yellow-400';
      case 'ended': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getGameStatusIcon = () => {
    switch (gameSession?.status) {
      case 'active': return 'fas fa-play';
      case 'paused': return 'fas fa-pause';
      case 'ended': return 'fas fa-stop';
      default: return 'fas fa-clock';
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: "fas fa-tachometer-alt" },
    { id: "game", label: "Game Control", icon: "fas fa-gamepad" },
    { id: "teams", label: "Teams", icon: "fas fa-users" },
    { id: "websites", label: "Websites", icon: "fas fa-globe" },
  ];

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="conquest-card rounded-xl p-2">
        <div className="flex space-x-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-neon-green to-electric-blue text-white font-semibold"
                  : "text-gray-400 hover:text-white hover:bg-gaming-gray"
              }`}
            >
              <i className={tab.icon}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="conquest-card border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-electric-blue flex items-center">
                <i className="fas fa-globe mr-2"></i>
                Total Websites
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-orbitron font-bold text-white">
                {stats?.totalWebsites || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="conquest-card border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-neon-green flex items-center">
                <i className="fas fa-flag mr-2"></i>
                Conquered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-orbitron font-bold text-white">
                {stats?.conquered || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="conquest-card border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-electric-purple flex items-center">
                <i className="fas fa-users mr-2"></i>
                Active Teams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-orbitron font-bold text-white">
                {stats?.activeTeams || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="conquest-card border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-yellow-400 flex items-center">
                <i className="fas fa-magnifying-glass-location mr-2"></i>
                Player-Discovered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-orbitron font-bold text-white">
                {stats?.discovered || 0}
              </div>
              <p className="text-xs text-gray-400 mt-1">Verified live and added automatically</p>
            </CardContent>
          </Card>

          <Card className="conquest-card border-none">
            <CardHeader className="pb-2">
              <CardTitle className={`flex items-center ${getGameStatusColor()}`}>
                <i className={`${getGameStatusIcon()} mr-2`}></i>
                Game Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-orbitron font-bold capitalize ${getGameStatusColor()}`}>
                {gameSession?.status || 'Not Started'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Game Control Tab */}
      {activeTab === "game" && (
        <div className="space-y-6">
          <Card className="conquest-card border-none">
            <CardHeader>
              <CardTitle className="text-neon-green flex items-center">
                <i className="fas fa-gamepad mr-3"></i>
                Game Session Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {!gameSession || gameSession.status === 'ended' ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="duration" className="text-gray-300">
                      Game Duration (minutes)
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      placeholder="60"
                      value={newGameDuration}
                      onChange={(e) => setNewGameDuration(e.target.value)}
                      className="mt-2 bg-gaming-dark border-gaming-light text-white"
                    />
                  </div>
                  <Button
                    onClick={handleStartGame}
                    disabled={startGameMutation.isPending}
                    className="bg-gradient-to-r from-neon-green to-electric-blue hover:opacity-90 text-white font-semibold"
                  >
                    {startGameMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Starting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-play mr-2"></i>
                        Start New Game
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {gameSession.status === 'active' && (
                    <>
                      <Button
                        onClick={() => pauseGameMutation.mutate()}
                        disabled={pauseGameMutation.isPending}
                        variant="outline"
                        className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black"
                      >
                        <i className="fas fa-pause mr-2"></i>
                        Pause Game
                      </Button>
                      <Button
                        onClick={() => endGameMutation.mutate()}
                        disabled={endGameMutation.isPending}
                        variant="outline"
                        className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                      >
                        <i className="fas fa-stop mr-2"></i>
                        End Game
                      </Button>
                    </>
                  )}
                  
                  {gameSession.status === 'paused' && (
                    <>
                      <Button
                        onClick={() => resumeGameMutation.mutate()}
                        disabled={resumeGameMutation.isPending}
                        className="bg-neon-green hover:bg-neon-green/80 text-black font-semibold"
                      >
                        <i className="fas fa-play mr-2"></i>
                        Resume Game
                      </Button>
                      <Button
                        onClick={() => endGameMutation.mutate()}
                        disabled={endGameMutation.isPending}
                        variant="outline"
                        className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                      >
                        <i className="fas fa-stop mr-2"></i>
                        End Game
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Teams Tab */}
      {activeTab === "teams" && (
        <div className="space-y-6">
          <Card className="conquest-card border-none">
            {/* Wraps: on a phone the title and the button are wider than the card
                together, and without this they overlap. */}
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-electric-blue flex items-center">
                <i className="fas fa-users mr-3"></i>
                Team Management
              </CardTitle>
              <Button
                onClick={() => setShowTeamModal(true)}
                className="bg-gradient-to-r from-electric-blue to-neon-green hover:opacity-90 text-white font-semibold"
              >
                <i className="fas fa-plus mr-2"></i>
                Add Team
              </Button>
            </CardHeader>
            <CardContent>
              {(!teams || teams.length === 0) ? (
                <div className="text-center py-12">
                  <i className="fas fa-users text-gray-400 text-6xl mb-4"></i>
                  <h3 className="font-orbitron font-bold text-xl text-gray-400 mb-4">No Teams Yet</h3>
                  <p className="text-gray-500">Add teams to get the competition started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teams.map((team) => (
                    <div 
                      key={team.id}
                      className="bg-gaming-gray rounded-lg p-4 border border-gaming-light"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-orbitron font-bold text-white">{team.name}</h3>
                        <span className="text-electric-blue font-bold">{team.score} pts</span>
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <div className="flex justify-between">
                          <span>Members:</span>
                          <span>{team.members.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Conquests:</span>
                          <span>{team.websitesConquered}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Websites Tab */}
      {activeTab === "websites" && (
        <div className="space-y-6">
          <Card className="conquest-card border-none">
            <CardHeader>
              <CardTitle className="text-electric-blue flex items-center">
                <i className="fas fa-globe mr-3"></i>
                Website Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="bulk-websites" className="text-gray-300 mb-2 block">
                  Add Websites (one URL per line)
                </Label>
                <Textarea
                  id="bulk-websites"
                  placeholder="https://example1.iiit.ac.in&#10;https://example2.iiit.ac.in&#10;https://example3.iiit.ac.in"
                  value={bulkWebsites}
                  onChange={(e) => setBulkWebsites(e.target.value)}
                  className="bg-gaming-dark border-gaming-light text-white min-h-[120px]"
                />
                {rejectedUrls.length > 0 && (
                  <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                    <p className="text-sm font-semibold text-yellow-400 mb-2">
                      Skipped {rejectedUrls.length} URL{rejectedUrls.length === 1 ? "" : "s"}
                    </p>
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                      {rejectedUrls.map((item, index) => (
                        <li key={`${item.url}-${index}`} className="text-xs text-gray-300 break-all">
                          <span className="text-gray-500">
                            {REJECTION_LABEL[item.reason] ?? item.reason}:
                          </span>{" "}
                          {item.url || "(blank line)"}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button
                  onClick={handleBulkAddWebsites}
                  disabled={addWebsitesMutation.isPending}
                  className="mt-4 bg-gradient-to-r from-electric-blue to-neon-green hover:opacity-90 text-white font-semibold"
                >
                  {addWebsitesMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-plus mr-2"></i>
                      Add Websites
                    </>
                  )}
                </Button>
              </div>

              <div className="border-t border-gaming-light pt-6">
                <h3 className="font-orbitron font-bold text-white mb-4">
                  Current Websites ({websites?.length || 0})
                </h3>
                {(!websites || websites.length === 0) ? (
                  <div className="text-center py-8">
                    <i className="fas fa-globe text-gray-400 text-4xl mb-4"></i>
                    <p className="text-gray-400">No websites added yet</p>
                    <p className="text-gray-500 text-sm">Add some IIIT websites to start the hunt!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {websites.map((website) => (
                      <div 
                        key={website.id}
                        className={`p-2 rounded text-sm ${
                          website.isConquered 
                            ? "bg-neon-green/20 border border-neon-green/30 text-neon-green" 
                            : "bg-gaming-gray border border-gaming-light text-gray-300"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <i className={`fas fa-${website.isConquered ? 'check-circle' : 'circle'} text-xs`}></i>
                          <span className="truncate flex-1">{website.url}</span>
                          {website.source === "discovered" && (
                            <span
                              className="text-[10px] uppercase tracking-wide text-yellow-400 shrink-0"
                              title="Found by a team and verified live"
                            >
                              found
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Registration Modal */}
      {showTeamModal && (
        <TeamRegistrationModal
          isOpen={showTeamModal}
          onClose={() => setShowTeamModal(false)}
        />
      )}
    </div>
  );
}