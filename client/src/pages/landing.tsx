import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gaming-darker text-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gaming-dark via-gaming-gray to-gaming-dark py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-orbitron font-black text-6xl md:text-8xl mb-6 bg-gradient-to-r from-electric-blue to-neon-green bg-clip-text text-transparent">
            WEBSITE HUNT
          </h1>
          <p className="text-2xl text-gray-300 max-w-4xl mx-auto mb-12">
            The ultimate competitive gaming platform for IIIT Hyderabad teams. 
            Discover, conquer, and dominate websites across the digital landscape to claim victory!
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="conquest-card">
              <CardContent className="p-8 text-center">
                <i className="fas fa-crosshairs text-electric-blue text-4xl mb-4"></i>
                <h3 className="font-orbitron font-bold text-xl text-electric-blue mb-3">Hunt & Conquer</h3>
                <p className="text-gray-400">Find and claim IIIT websites to earn points and climb the leaderboard</p>
              </CardContent>
            </Card>
            
            <Card className="conquest-card">
              <CardContent className="p-8 text-center">
                <i className="fas fa-users text-neon-green text-4xl mb-4"></i>
                <h3 className="font-orbitron font-bold text-xl text-neon-green mb-3">Team Competition</h3>
                <p className="text-gray-400">Form teams and compete against other groups in real-time battles</p>
              </CardContent>
            </Card>
            
            <Card className="conquest-card">
              <CardContent className="p-8 text-center">
                <i className="fas fa-trophy text-electric-purple text-4xl mb-4"></i>
                <h3 className="font-orbitron font-bold text-xl text-electric-purple mb-3">Live Leaderboard</h3>
                <p className="text-gray-400">Track your progress and see how you stack up against the competition</p>
              </CardContent>
            </Card>
          </div>
          
          <Button 
            onClick={() => window.location.href = "/api/login"}
            className="bg-gradient-to-r from-electric-blue to-neon-green hover:opacity-90 text-white font-bold py-4 px-8 text-lg glow-effect"
          >
            <i className="fas fa-play mr-3"></i>
            Enter the Hunt
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-orbitron font-bold text-4xl text-electric-blue mb-4">Game Features</h2>
            <p className="text-xl text-gray-400">Experience the thrill of competitive web hunting</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-electric-blue bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-bolt text-electric-blue text-xl"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-xl text-white mb-2">Real-time Scoring</h3>
                  <p className="text-gray-400">Get instant feedback with +100 points for successful conquests and -25 for wrong attempts</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-neon-green bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-shield-alt text-neon-green text-xl"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-xl text-white mb-2">Website Blocking</h3>
                  <p className="text-gray-400">Successfully conquered websites are blocked for other teams, adding strategic depth</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-electric-purple bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <i className="fas fa-cogs text-electric-purple text-xl"></i>
                </div>
                <div>
                  <h3 className="font-semibold text-xl text-white mb-2">Admin Controls</h3>
                  <p className="text-gray-400">Comprehensive management tools for teams, websites, and game sessions</p>
                </div>
              </div>
            </div>
            
            <Card className="conquest-card p-8">
              <h3 className="font-orbitron font-bold text-2xl text-electric-blue mb-6 text-center">Ready to Start?</h3>
              <div className="space-y-4 text-center">
                <div className="text-6xl">🎯</div>
                <p className="text-gray-300">Join the competition and show your web hunting skills!</p>
                <p className="text-sm text-gray-400">
                  <i className="fas fa-info-circle mr-2"></i>
                  IIIT Hyderabad exclusive gaming platform
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gaming-dark border-t border-gaming-light py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 mb-4">
            &copy; 2024 Website Hunt Championship - IIIT Hyderabad. Built for competitive web exploration.
          </p>
          <div className="flex justify-center space-x-6">
            <a href="#" className="text-gray-400 hover:text-electric-blue transition-colors">
              <i className="fab fa-github text-xl"></i>
            </a>
            <a href="#" className="text-gray-400 hover:text-electric-blue transition-colors">
              <i className="fab fa-discord text-xl"></i>
            </a>
            <a href="#" className="text-gray-400 hover:text-electric-blue transition-colors">
              <i className="fas fa-envelope text-xl"></i>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
