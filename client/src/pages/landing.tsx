import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gaming-dark">
      
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-gaming-dark via-gaming-gray to-gaming-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <h1 className="font-orbitron font-black text-6xl md:text-8xl mb-6 bg-gradient-to-r from-electric-blue to-neon-green bg-clip-text text-transparent">
              WEBSITE HUNT
            </h1>
            <p className="text-2xl text-gray-300 max-w-4xl mx-auto mb-8">
              The ultimate competitive web discovery challenge for IIIT Hyderabad teams. 
              Hunt, conquer, and dominate the digital landscape!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Button
              onClick={() => window.location.href = "/auth"}
              size="lg"
              className="bg-gradient-to-r from-electric-blue to-neon-green hover:opacity-90 text-white font-bold px-8 py-4 text-lg glow-effect"
            >
              <i className="fas fa-rocket mr-3"></i>
              Start Hunting
            </Button>
            
            <Button
              onClick={() => window.location.href = "/auth"}
              size="lg"
              variant="outline"
              className="border-2 border-neon-green text-neon-green hover:bg-neon-green hover:text-black font-bold px-8 py-4 text-lg"
            >
              <i className="fas fa-cog mr-3"></i>
              Admin Portal
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gaming-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-orbitron font-bold text-4xl text-electric-blue mb-4">
              Game Features
            </h2>
            <p className="text-xl text-gray-300">
              Everything you need for an epic web hunting competition
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="conquest-card rounded-xl p-8 text-center glow-effect">
              <div className="w-16 h-16 bg-gradient-to-br from-electric-blue to-neon-green rounded-xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-users text-white text-2xl"></i>
              </div>
              <h3 className="font-orbitron font-bold text-xl text-electric-blue mb-4">
                Team Competition
              </h3>
              <p className="text-gray-300">
                Form teams and compete against other IIIT groups. Custom team sizes with flexible member management.
              </p>
            </div>

            <div className="conquest-card rounded-xl p-8 text-center glow-effect">
              <div className="w-16 h-16 bg-gradient-to-br from-electric-blue to-neon-green rounded-xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-crosshairs text-white text-2xl"></i>
              </div>
              <h3 className="font-orbitron font-bold text-xl text-electric-blue mb-4">
                Smart Scoring
              </h3>
              <p className="text-gray-300">
                Earn +100 points for correct website discoveries. Strategic penalty of -25 points for wrong guesses.
              </p>
            </div>

            <div className="conquest-card rounded-xl p-8 text-center glow-effect">
              <div className="w-16 h-16 bg-gradient-to-br from-electric-blue to-neon-green rounded-xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-bolt text-white text-2xl"></i>
              </div>
              <h3 className="font-orbitron font-bold text-xl text-electric-blue mb-4">
                Real-time Updates
              </h3>
              <p className="text-gray-300">
                Live leaderboard updates, instant conquest notifications, and real-time game state changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gaming-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-orbitron font-bold text-4xl text-neon-green mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-300">
              Simple rules, maximum excitement
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-electric-blue rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="font-orbitron font-bold text-lg text-white mb-2">
                Join a Team
              </h3>
              <p className="text-gray-400">
                Get assigned to a team or create one with your friends
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-neon-green rounded-full flex items-center justify-center mx-auto mb-4 text-black text-2xl font-bold">
                2
              </div>
              <h3 className="font-orbitron font-bold text-lg text-white mb-2">
                Hunt Websites
              </h3>
              <p className="text-gray-400">
                Discover and guess IIIT Hyderabad website URLs
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-electric-purple rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="font-orbitron font-bold text-lg text-white mb-2">
                Earn Points
              </h3>
              <p className="text-gray-400">
                Gain points for correct guesses, lose some for wrong ones
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 text-black text-2xl font-bold">
                4
              </div>
              <h3 className="font-orbitron font-bold text-lg text-white mb-2">
                Win Glory
              </h3>
              <p className="text-gray-400">
                Climb the leaderboard and claim victory!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gaming-darker border-t border-gaming-light py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-electric-blue to-neon-green rounded-lg flex items-center justify-center">
              <i className="fas fa-crosshairs text-white"></i>
            </div>
            <h3 className="font-orbitron font-bold text-xl text-white">WEBSITE HUNT</h3>
          </div>
          <p className="text-gray-400 mb-2">
            A competitive web discovery platform for IIIT Hyderabad
          </p>
          <p className="text-gray-500 text-sm">
            © 2024 Website Hunt Championship. Built for the digital hunters.
          </p>
        </div>
      </footer>
    </div>
  );
}