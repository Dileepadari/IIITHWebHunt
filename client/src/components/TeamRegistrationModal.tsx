import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@shared/schema";

interface TeamRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeamRegistrationModal({ isOpen, onClose }: TeamRegistrationModalProps) {
  const [teamName, setTeamName] = useState("");
  const [captainId, setCaptainId] = useState("");
  const [members, setMembers] = useState([""]);
  const { toast } = useToast();

  // Fetch all users for captain selection
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  const createTeamMutation = useMutation({
    mutationFn: async (teamData: { name: string; captainId?: string; members: string[] }) => {
      const response = await apiRequest("POST", "/api/teams", teamData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Team Created! 🎉",
        description: "The team has been successfully created.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setTeamName("");
      setCaptainId("");
      setMembers([""]);
      onClose();
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

  const addMemberField = () => {
    setMembers([...members, ""]);
  };

  const removeMemberField = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const updateMember = (index: number, value: string) => {
    const updatedMembers = [...members];
    updatedMembers[index] = value;
    setMembers(updatedMembers);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamName.trim()) {
      toast({
        title: "Team Name Required",
        description: "Please enter a team name.",
        variant: "destructive",
      });
      return;
    }

    const validMembers = members.filter(member => member.trim().length > 0);
    if (validMembers.length === 0) {
      toast({
        title: "Members Required",
        description: "Please add at least one team member.",
        variant: "destructive",
      });
      return;
    }

    createTeamMutation.mutate({
      name: teamName.trim(),
      captainId: captainId || undefined,
      members: validMembers.map(member => member.trim()),
    });
  };

  const handleClose = () => {
    if (createTeamMutation.isPending) return;
    setTeamName("");
    setCaptainId("");
    setMembers([""]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="conquest-card border border-gaming-light max-w-md">
        <DialogHeader>
          <DialogTitle className="text-neon-green flex items-center">
            <i className="fas fa-users mr-3"></i>
            Create New Team
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="team-name" className="text-gray-300">
              Team Name
            </Label>
            <Input
              id="team-name"
              type="text"
              placeholder="Enter team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="mt-2 bg-gaming-dark border-gaming-light text-white"
              disabled={createTeamMutation.isPending}
            />
          </div>

          <div>
            <Label className="text-gray-300">
              Team Captain (Optional)
            </Label>
            <Select value={captainId} onValueChange={setCaptainId} disabled={createTeamMutation.isPending}>
              <SelectTrigger className="mt-2 bg-gaming-dark border-gaming-light text-white">
                <SelectValue placeholder="Select a captain from registered users" />
              </SelectTrigger>
              <SelectContent className="conquest-card border-gaming-light">
                <SelectItem value="none">No captain selected</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName} (${user.email})`
                      : user.email || `User ${user.id}`
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-300 mb-3 block">
              Team Members
            </Label>
            <div className="space-y-3">
              {members.map((member, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    type="text"
                    placeholder={`Member ${index + 1} name`}
                    value={member}
                    onChange={(e) => updateMember(index, e.target.value)}
                    className="flex-1 bg-gaming-dark border-gaming-light text-white"
                    disabled={createTeamMutation.isPending}
                  />
                  {members.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => removeMemberField(index)}
                      variant="outline"
                      size="sm"
                      className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                      disabled={createTeamMutation.isPending}
                    >
                      <i className="fas fa-times"></i>
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                onClick={addMemberField}
                variant="outline"
                size="sm"
                className="border-electric-blue text-electric-blue hover:bg-electric-blue hover:text-white"
                disabled={createTeamMutation.isPending}
              >
                <i className="fas fa-plus mr-2"></i>
                Add Member
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="border-gray-400 text-gray-400 hover:bg-gray-400 hover:text-white"
              disabled={createTeamMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTeamMutation.isPending}
              className="bg-gradient-to-r from-electric-blue to-neon-green hover:opacity-90 text-white font-semibold"
            >
              {createTeamMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <i className="fas fa-check mr-2"></i>
                  Create Team
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}