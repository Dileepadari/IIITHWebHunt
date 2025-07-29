import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TeamRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeamRegistrationModal({ isOpen, onClose }: TeamRegistrationModalProps) {
  const [teamName, setTeamName] = useState("");
  const [teamSize, setTeamSize] = useState("4");
  const [captainId, setCaptainId] = useState("");
  const [members, setMembers] = useState<string[]>(["", "", "", ""]);
  const { toast } = useToast();

  const createTeamMutation = useMutation({
    mutationFn: async (teamData: any) => {
      const response = await apiRequest("POST", "/api/teams", teamData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Team Created Successfully! 🎉",
        description: "The new team has been registered",
        variant: "default",
      });
      resetForm();
      onClose();
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
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

  const resetForm = () => {
    setTeamName("");
    setTeamSize("4");
    setCaptainId("");
    setMembers(["", "", "", ""]);
  };

  const handleTeamSizeChange = (size: string) => {
    setTeamSize(size);
    const newMembers = Array(parseInt(size)).fill("").map((_, index) => members[index] || "");
    setMembers(newMembers);
  };

  const handleMemberChange = (index: number, value: string) => {
    const newMembers = [...members];
    newMembers[index] = value;
    setMembers(newMembers);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamName.trim()) {
      toast({
        title: "Team Name Required",
        description: "Please enter a team name",
        variant: "destructive",
      });
      return;
    }

    if (!captainId.trim()) {
      toast({
        title: "Captain ID Required",
        description: "Please enter the captain's user ID",
        variant: "destructive",
      });
      return;
    }

    const filteredMembers = members.filter(member => member.trim().length > 0);
    
    if (filteredMembers.length === 0) {
      toast({
        title: "Team Members Required",
        description: "Please add at least one team member",
        variant: "destructive",
      });
      return;
    }

    createTeamMutation.mutate({
      name: teamName.trim(),
      captainId: captainId.trim(),
      members: filteredMembers,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="conquest-card border-electric-blue border-opacity-30 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-orbitron font-bold text-2xl text-electric-blue flex items-center">
            <i className="fas fa-users mr-3"></i>
            Team Registration
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="team-name" className="block text-sm font-medium text-gray-300 mb-2">
              Team Name
            </Label>
            <Input
              id="team-name"
              type="text"
              placeholder="Enter team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full bg-gaming-dark border border-gaming-light text-white placeholder-gray-500 focus:border-electric-blue"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="team-size" className="block text-sm font-medium text-gray-300 mb-2">
                Team Size
              </Label>
              <Select value={teamSize} onValueChange={handleTeamSizeChange}>
                <SelectTrigger className="w-full bg-gaming-dark border border-gaming-light text-white">
                  <SelectValue placeholder="Select team size" />
                </SelectTrigger>
                <SelectContent className="bg-gaming-dark border border-gaming-light">
                  <SelectItem value="3">3 Members</SelectItem>
                  <SelectItem value="4">4 Members</SelectItem>
                  <SelectItem value="5">5 Members</SelectItem>
                  <SelectItem value="6">6 Members</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="captain-id" className="block text-sm font-medium text-gray-300 mb-2">
                Captain User ID
              </Label>
              <Input
                id="captain-id"
                type="text"
                placeholder="Captain's user ID"
                value={captainId}
                onChange={(e) => setCaptainId(e.target.value)}
                className="w-full bg-gaming-dark border border-gaming-light text-white placeholder-gray-500 focus:border-electric-blue"
              />
            </div>
          </div>
          
          <div>
            <Label className="block text-sm font-medium text-gray-300 mb-4">
              Team Members (User IDs)
            </Label>
            <div className="space-y-3">
              {members.map((member, index) => (
                <Input
                  key={index}
                  type="text"
                  placeholder={`Member ${index + 1} user ID`}
                  value={member}
                  onChange={(e) => handleMemberChange(index, e.target.value)}
                  className="w-full bg-gaming-dark border border-gaming-light text-white placeholder-gray-500 focus:border-electric-blue"
                />
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              onClick={() => {
                resetForm();
                onClose();
              }}
              variant="outline"
              className="px-6 py-3 bg-gaming-light text-white border-gaming-light hover:bg-opacity-80"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTeamMutation.isPending}
              className="px-6 py-3 bg-gradient-to-r from-electric-blue to-neon-green text-white font-semibold glow-effect"
            >
              {createTeamMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fas fa-plus mr-2"></i>
                  Register Team
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
