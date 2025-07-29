import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";

export default function Navigation() {
  const { user } = useAuth();
  const [location] = useLocation();

  return (
    <nav className="bg-gaming-dark border-b border-gaming-light fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <i className="fas fa-trophy text-electric-blue text-2xl"></i>
            <h1 className="font-orbitron font-bold text-xl text-electric-blue">Website Hunt</h1>
            <span className="text-sm text-gray-400">IIIT Hyderabad</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/">
              <a className={`transition-colors ${
                location === "/" ? "text-electric-blue" : "text-gray-300 hover:text-electric-blue"
              }`}>Dashboard</a>
            </Link>
            {user?.isAdmin && (
              <Link href="/admin">
                <a className={`transition-colors ${
                  location === "/admin" ? "text-electric-blue" : "text-gray-300 hover:text-electric-blue"
                }`}>Admin</a>
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <img 
                src={user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=32&h=32"} 
                alt="User avatar" 
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="hidden sm:block">
                <span className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </span>
                {user?.isAdmin && (
                  <span className="text-xs text-electric-blue ml-2 bg-electric-blue bg-opacity-20 px-2 py-1 rounded">
                    Admin
                  </span>
                )}
              </div>
            </div>
            <button 
              onClick={() => window.location.href = "/api/logout"}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
