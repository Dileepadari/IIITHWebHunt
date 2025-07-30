import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Navigation from "@/components/Navigation";
import AdminPanel from "@/components/AdminPanel";
import { User } from "@shared/schema";

export default function Admin() {
  const { toast } = useToast();
  const { user, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {    
    if (!isLoading && !(user as User)?.isAdmin) {
      toast({
        title: "Access Denied",
        description: "Admin access required for this page.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
  }, [isLoading, user, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gaming-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neon-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300 font-orbitron">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  if (!(user as User)?.isAdmin) {
    return null; // Redirect handling is in useEffect
  }

  return (
    <div className="min-h-screen bg-gaming-dark">
      <Navigation />
      
      {/* Main Content */}
      <main className="pt-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="font-orbitron font-black text-4xl text-neon-green mb-4 flex items-center">
              <i className="fas fa-crown mr-4"></i>
              Admin Control Center
            </h1>
            <p className="text-xl text-gray-300">
              Manage teams, websites, and game sessions for the Website Hunt championship.
            </p>
          </div>
          
          <AdminPanel />
        </div>
      </main>
    </div>
  );
}