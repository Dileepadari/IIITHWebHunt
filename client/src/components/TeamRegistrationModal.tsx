import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "@shared/schema";

interface TeamRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Sentinel for "no captain"; an empty string is not a legal Select value. */
const NO_CAPTAIN = "__none__";

function displayName(user: User): string {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || user.username || user.email || user.id;
}

export default function TeamRegistrationModal({ isOpen, onClose }: TeamRegistrationModalProps) {
  const [teamName, setTeamName] = useState("");
  const [captainId, setCaptainId] = useState(NO_CAPTAIN);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users ?? [];
    return (users ?? []).filter((user) =>
      [user.firstName, user.lastName, user.username, user.email]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle)),
    );
  }, [users, search]);

  const reset = () => {
    setTeamName("");
    setCaptainId(NO_CAPTAIN);
    setMemberIds([]);
    setSearch("");
  };

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
      reset();
      onClose();
    },
    onError: (error: Error) => {
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
    },
  });

  const toggleMember = (userId: string) => {
    setMemberIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const name = teamName.trim();
    if (!name) {
      toast({
        title: "Team Name Required",
        description: "Please enter a team name.",
        variant: "destructive",
      });
      return;
    }

    // Membership must be user ids: the server resolves a player's team by
    // looking their own id up in this array. The previous free-text name fields
    // could never match, so every player saw "No Team Found".
    const members = [...new Set(memberIds)];
    if (captainId !== NO_CAPTAIN && !members.includes(captainId)) members.push(captainId);

    if (members.length === 0) {
      toast({
        title: "Members Required",
        description: "Select at least one registered user for this team.",
        variant: "destructive",
      });
      return;
    }

    createTeamMutation.mutate({
      name,
      captainId: captainId === NO_CAPTAIN ? undefined : captainId,
      members,
    });
  };

  const handleClose = () => {
    if (createTeamMutation.isPending) return;
    reset();
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
            <Label className="text-gray-300">Team Captain (Optional)</Label>
            <Select
              value={captainId}
              onValueChange={setCaptainId}
              disabled={createTeamMutation.isPending}
            >
              <SelectTrigger className="mt-2 bg-gaming-dark border-gaming-light text-white">
                <SelectValue placeholder="Select a captain from registered users" />
              </SelectTrigger>
              <SelectContent className="conquest-card border-gaming-light">
                <SelectItem value={NO_CAPTAIN}>No captain selected</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {displayName(user)}
                    {user.email ? ` (${user.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-gray-500">
              The captain is added to the team automatically.
            </p>
          </div>

          <div>
            <Label className="text-gray-300 mb-2 block">
              Team Members {memberIds.length > 0 && `(${memberIds.length} selected)`}
            </Label>
            <Input
              type="text"
              placeholder="Search registered users"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 bg-gaming-dark border-gaming-light text-white"
              disabled={createTeamMutation.isPending}
            />

            <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-gaming-light p-2">
              {usersLoading ? (
                <p className="text-sm text-gray-500 p-2">Loading users...</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-sm text-gray-500 p-2">
                  {users?.length ? "No users match that search." : "No registered users yet."}
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center space-x-3 rounded p-2 hover:bg-gaming-gray cursor-pointer"
                  >
                    <Checkbox
                      checked={memberIds.includes(user.id)}
                      onCheckedChange={() => toggleMember(user.id)}
                      disabled={createTeamMutation.isPending}
                    />
                    <span className="text-sm text-white truncate">
                      {displayName(user)}
                      {user.email && (
                        <span className="text-gray-500 ml-1 text-xs">{user.email}</span>
                      )}
                    </span>
                  </label>
                ))
              )}
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
