import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { User } from "@shared/schema";

export default function Navigation() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  return (
    <>
      {/* Top Header Bar */}
      <div className="bg-gaming-darker border-b border-electric-blue border-opacity-30 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-electric-blue font-medium">IIIT Hyderabad</span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-300">Website Hunt Championship 2024</span>
            </div>
            <div className="flex items-center space-x-4">
              {!isLoading && !isAuthenticated ? (
                <div className="flex items-center space-x-3">
                  <span className="text-gray-400">Join the Hunt:</span>
                  <Button
                    onClick={() => window.location.href = "/api/login"}
                    size="sm"
                    className="bg-electric-blue hover:bg-electric-blue/80 text-white font-medium"
                  >
                    Login as Participant
                  </Button>
                  <Button
                    onClick={() => window.location.href = "/api/login"}
                    size="sm"
                    variant="outline"
                    className="border-neon-green text-neon-green hover:bg-neon-green hover:text-black font-medium"
                  >
                    Admin Login
                  </Button>
                </div>
              ) : isAuthenticated && (user as User)?.isAdmin ? (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
                  <span className="text-neon-green font-medium">Admin Mode Active</span>
                </div>
              ) : isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-electric-blue rounded-full animate-pulse"></div>
                  <span className="text-electric-blue font-medium">Participant Mode</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="bg-gaming-dark border-b border-gaming-light fixed w-full top-10 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-electric-blue to-neon-green rounded-lg flex items-center justify-center shadow-neon">
                  <i className="fas fa-crosshairs text-white text-xl"></i>
                </div>
                <div>
                  <h1 className="font-orbitron font-bold text-xl text-white">WEBSITE HUNT</h1>
                  <p className="text-xs text-gray-400 -mt-1">Competitive Web Discovery</p>
                </div>
              </div>
            </div>
            
            {/* Navigation Links */}
            {isAuthenticated && (
              <div className="hidden md:flex items-center space-x-8">
                <Link href="/">
                  <a className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                    location === "/" 
                      ? "bg-electric-blue bg-opacity-20 text-electric-blue border border-electric-blue border-opacity-30" 
                      : "text-gray-300 hover:text-electric-blue hover:bg-gaming-gray"
                  }`}>
                    <i className="fas fa-tachometer-alt"></i>
                    <span>Dashboard</span>
                  </a>
                </Link>
                
                {(user as User)?.isAdmin && (
                  <Link href="/admin">
                    <a className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                      location === "/admin" 
                        ? "bg-neon-green bg-opacity-20 text-neon-green border border-neon-green border-opacity-30" 
                        : "text-gray-300 hover:text-neon-green hover:bg-gaming-gray"
                    }`}>
                      <i className="fas fa-cog"></i>
                      <span>Admin Panel</span>
                    </a>
                  </Link>
                )}
                
                <div className="flex items-center space-x-2 px-3 py-2 text-gray-400">
                  <i className="fas fa-globe"></i>
                  <span className="text-sm">Live Game</span>
                  <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
                </div>
              </div>
            )}

            {/* User Section */}
            <div className="flex items-center space-x-4">
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gaming-gray rounded-full animate-pulse"></div>
                  <div className="w-20 h-4 bg-gaming-gray rounded animate-pulse"></div>
                </div>
              ) : isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  {/* User Info */}
                  <div className="flex items-center space-x-3">
                    <img 
                      src={(user as User)?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=32&h=32"} 
                      alt="User avatar" 
                      className="w-9 h-9 rounded-full object-cover border-2 border-electric-blue border-opacity-50"
                    />
                    <div className="hidden sm:block">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-white">
                          {(user as User)?.firstName} {(user as User)?.lastName}
                        </span>
                        {(user as User)?.isAdmin && (
                          <span className="text-xs text-neon-green bg-neon-green bg-opacity-20 px-2 py-1 rounded-full border border-neon-green border-opacity-30">
                            <i className="fas fa-crown mr-1"></i>Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{(user as User)?.email}</p>
                    </div>
                  </div>
                  
                  {/* Logout Button */}
                  <Button
                    onClick={() => window.location.href = "/api/logout"}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-gaming-gray"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    <span className="ml-2 hidden sm:inline">Logout</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Button
                    onClick={() => window.location.href = "/api/login"}
                    className="bg-gradient-to-r from-electric-blue to-neon-green hover:opacity-90 text-white font-medium glow-effect"
                  >
                    <i className="fas fa-play mr-2"></i>
                    Join Hunt
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isAuthenticated && (
          <div className="md:hidden border-t border-gaming-light bg-gaming-gray">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex items-center justify-around">
                <Link href="/">
                  <a className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg ${
                    location === "/" ? "text-electric-blue" : "text-gray-400"
                  }`}>
                    <i className="fas fa-tachometer-alt"></i>
                    <span className="text-xs">Dashboard</span>
                  </a>
                </Link>
                
                {(user as User)?.isAdmin && (
                  <Link href="/admin">
                    <a className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg ${
                      location === "/admin" ? "text-neon-green" : "text-gray-400"
                    }`}>
                      <i className="fas fa-cog"></i>
                      <span className="text-xs">Admin</span>
                    </a>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}