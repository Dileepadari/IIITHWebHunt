import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { User } from "@shared/schema";

export default function Navigation() {
  const { user, isAuthenticated, isLoading, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <>
      {/* Top Header Bar */}
      <div className="bg-gaming-darker border-b border-electric-blue border-opacity-30 py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm">
            <span className="text-electric-blue font-medium">IIIT Hyderabad</span>
            <div className="flex items-center space-x-4">
              {!isLoading && !user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-gray-400 hidden sm:inline">Join the Hunt:</span>
                  <Button
                    onClick={() => (window.location.href = "/auth")}
                    size="sm"
                    className="bg-electric-blue hover:bg-electric-blue/80 text-white font-medium"
                  >
                    Login as Participant
                  </Button>
                  <Button
                    onClick={() => (window.location.href = "/auth")}
                    size="sm"
                    variant="outline"
                    className="border-neon-green text-neon-green hover:bg-neon-green hover:text-black font-medium"
                  >
                    Admin Login
                  </Button>
                </div>
              ) : user?.isAdmin ? (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
                  <span className="text-neon-green font-medium">Admin Mode Active</span>
                </div>
              ) : user ? (
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
      <nav className="bg-gaming-dark border-b border-gaming-light sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-electric-blue to-neon-green rounded-lg flex items-center justify-center">
                <i className="fas fa-search text-white text-lg"></i>
              </div>
              <div>
                <h1 className="font-orbitron font-black text-xl text-white">WEBSITE HUNT</h1>
                <p className="text-xs text-gray-400 -mt-1">IIIT Championship</p>
              </div>
            </Link>

            {/* Hamburger Menu */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-gray-400 hover:text-white focus:outline-none"
            >
              <i className={`fas ${menuOpen ? "fa-times" : "fa-bars"} text-xl`}></i>
            </button>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              {user && (
                <>
                  <Link
                    to="/home"
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                      location === "/home"
                        ? "bg-electric-blue bg-opacity-20 text-electric-blue border border-electric-blue border-opacity-30"
                        : "text-gray-300 hover:text-electric-blue hover:bg-gaming-gray"
                    }`}
                  >
                    <i className="fas fa-home text-white"></i>
                    <span className="text-white">Game Dashboard</span>
                  </Link>
                  {user.isAdmin && (
                    <Link
                      to="/admin"
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                        location === "/admin"
                          ? "bg-neon-green bg-opacity-20 text-neon-green border border-neon-green border-opacity-30"
                          : "text-gray-300 hover:text-neon-green hover:bg-gaming-gray"
                      }`}
                    >
                      <i className="fas fa-cog"></i>
                      <span>Admin Panel</span>
                    </Link>
                  )}
                  <div className="flex items-center space-x-2 px-3 py-2 text-gray-400">
                    <i className="fas fa-globe"></i>
                    <span className="text-sm">Live Game</span>
                    <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
                  </div>
                </>
              )}
            </div>

            {/* User Info */}
            <div className="hidden md:flex items-center space-x-4">
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gaming-gray rounded-full animate-pulse"></div>
                  <div className="w-20 h-4 bg-gaming-gray rounded animate-pulse"></div>
                </div>
              ) : user ? (
                <>
                  <div className="flex items-center space-x-3">
                    <img
                      src={
                        user.profileImageUrl ||
                        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=32&h=32"
                      }
                      alt="User avatar"
                      className="w-9 h-9 rounded-full object-cover border-2 border-electric-blue border-opacity-50"
                    />
                    <div className="hidden sm:block">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-white">
                          {user.firstName} {user.lastName}
                        </span>
                        {user.isAdmin && (
                          <span className="text-xs text-neon-green bg-neon-green bg-opacity-20 px-2 py-1 rounded-full border border-neon-green border-opacity-30">
                            <i className="fas fa-crown mr-1"></i>Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-gaming-gray"
                    disabled={logoutMutation.isPending}
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    <span className="ml-2 hidden sm:inline">
                      {logoutMutation.isPending ? "Logging out..." : "Logout"}
                    </span>
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => (window.location.href = "/auth")}
                  className="bg-gradient-to-r from-electric-blue to-neon-green hover:opacity-90 text-white font-medium glow-effect"
                >
                  <i className="fas fa-rocket mr-2"></i>
                  Join Hunt
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && user && (
          <div className="md:hidden px-4 pb-4 bg-gaming-dark space-y-2">
            <div className="flex items-center text-sm text-gray-400">
              <i className="fas fa-globe mr-2"></i>Live Game
              <div className="w-2 h-2 bg-neon-green rounded-full ml-2 animate-pulse"></div>
            </div>
            <Link
              to="/home"
              className="block text-gray-400 hover:text-electric-blue pt-2"
              onClick={() => setMenuOpen(false)}
            >
              <i className="fas fa-home mr-2"></i>Game Dashboard
            </Link>
            {user.isAdmin && (
              <Link
                to="/admin"
                className="block text-gray-400 hover:text-neon-green"
                onClick={() => setMenuOpen(false)}
              >
                <i className="fas fa-cog mr-2"></i>Admin Panel
              </Link>
            )}
            {/* Logout */}
            {isAuthenticated &&
            (
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-gaming-gray px-1"
              disabled={logoutMutation.isPending}
            >
              <i className="fas fa-sign-out-alt"></i>
              <span className="ml-2 sm:inline">
                {logoutMutation.isPending ? "Logging out..." : "Logout"}
              </span>
            </Button>
            )}
          </div>
        )}
      </nav>
    </>
  );
}
