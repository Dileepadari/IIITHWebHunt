import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuthPage() {
  const { toast } = useToast();
  const { user, loginMutation, registerMutation } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [registerData, setRegisterData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      window.location.href = "/";
    }
  }, [user]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.username || !loginData.password) return;
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData.username || !registerData.email || !registerData.password) return;
    if (registerData.password !== registerData.confirmPassword) return;
    
    const { confirmPassword, ...data } = registerData;
    registerMutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    toast({
        title: "No Google!",
        description: "The Support for Google Login is not available yet.",
        variant: "default",
      });
  };

  if (user) {
    return null; // Redirecting...
  }

  return (
    <div className="min-h-screen bg-gaming-dark flex flex-col md:flex-row">
      {/* Left Side - Auth Forms */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="font-orbitron font-black text-3xl md:text-4xl text-neon-green mb-2">
              Website Hunt
            </h1>
            <p className="text-gray-400 text-sm md:text-base">Join the IIIT Website Discovery Challenge</p>
          </div>

          <Card className="conquest-card border-gaming-light">
            <CardHeader>
              <CardTitle className="text-center text-electric-blue font-orbitron text-lg md:text-xl">
                Welcome Back
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={isLogin ? "login" : "register"} onValueChange={(value) => setIsLogin(value === "login")}>
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-gaming-gray">
                  <TabsTrigger value="login" className="data-[state=active]:bg-electric-blue data-[state=active]:text-white">
                    Login
                  </TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-electric-blue data-[state=active]:text-white">
                    Register
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-username" className="text-gray-300 text-sm md:text-base">Username</Label>
                      <Input
                        id="login-username"
                        type="text"
                        placeholder="Enter your username"
                        value={loginData.username}
                        onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                        className="mt-1 bg-gaming-dark border-gaming-light text-white text-sm md:text-base"
                        disabled={loginMutation.isPending}
                      />
                    </div>
                    <div>
                      <Label htmlFor="login-password" className="text-gray-300 text-sm md:text-base">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="Enter your password"
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className="mt-1 bg-gaming-dark border-gaming-light text-white text-sm md:text-base"
                        disabled={loginMutation.isPending}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loginMutation.isPending}
                      className="w-full bg-gradient-to-r from-electric-blue to-neon-green hover:opacity-90 text-white font-semibold text-sm md:text-base"
                    >
                      {loginMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Logging in...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-sign-in-alt mr-2"></i>
                          Login
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="register-firstName" className="text-gray-300 text-sm md:text-base">First Name</Label>
                        <Input
                          id="register-firstName"
                          type="text"
                          placeholder="First name"
                          value={registerData.firstName}
                          onChange={(e) => setRegisterData({ ...registerData, firstName: e.target.value })}
                          className="mt-1 bg-gaming-dark border-gaming-light text-white text-sm md:text-base"
                          disabled={registerMutation.isPending}
                        />
                      </div>
                      <div>
                        <Label htmlFor="register-lastName" className="text-gray-300 text-sm md:text-base">Last Name</Label>
                        <Input
                          id="register-lastName"
                          type="text"
                          placeholder="Last name"
                          value={registerData.lastName}
                          onChange={(e) => setRegisterData({ ...registerData, lastName: e.target.value })}
                          className="mt-1 bg-gaming-dark border-gaming-light text-white text-sm md:text-base"
                          disabled={registerMutation.isPending}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="register-username" className="text-gray-300 text-sm md:text-base">Username</Label>
                      <Input
                        id="register-username"
                        type="text"
                        placeholder="Choose a username"
                        value={registerData.username}
                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                        className="mt-1 bg-gaming-dark border-gaming-light text-white text-sm md:text-base"
                        disabled={registerMutation.isPending}
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-email" className="text-gray-300 text-sm md:text-base">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="Enter your email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        className="mt-1 bg-gaming-dark border-gaming-light text-white text-sm md:text-base"
                        disabled={registerMutation.isPending}
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-password" className="text-gray-300 text-sm md:text-base">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create a password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        className="mt-1 bg-gaming-dark border-gaming-light text-white text-sm md:text-base"
                        disabled={registerMutation.isPending}
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-confirm" className="text-gray-300 text-sm md:text-base">Confirm Password</Label>
                      <Input
                        id="register-confirm"
                        type="password"
                        placeholder="Confirm your password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        className="mt-1 bg-gaming-dark border-gaming-light text-white text-sm md:text-base"
                        disabled={registerMutation.isPending}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={registerMutation.isPending || registerData.password !== registerData.confirmPassword}
                      className="w-full bg-gradient-to-r from-electric-blue to-neon-green hover:opacity-90 text-white font-semibold text-sm md:text-base"
                    >
                      {registerMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Creating account...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user-plus mr-2"></i>
                          Register
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gaming-light"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-gaming-gray text-gray-400">Or continue with</span>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleGoogleLogin}
                  variant="outline"
                  className="w-full mt-4 border-gaming-light text-white hover:bg-gaming-light"
                  disabled={loginMutation.isPending || registerMutation.isPending}
                >
                  <i className="fab fa-google mr-2 text-red-400"></i>
                  Continue with Google
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side - Hero Section */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 bg-gradient-to-br from-gaming-gray to-gaming-darker">
        <div className="text-center max-w-lg">
          <div className="mb-6 md:mb-8">
            <i className="fas fa-search text-6xl md:text-8xl text-neon-green mb-4 md:mb-6 opacity-80"></i>
          </div>
          <h2 className="font-orbitron font-bold text-2xl md:text-3xl text-white mb-4 md:mb-6">
            Discover Hidden IIIT Websites
          </h2>
          <div className="space-y-3 md:space-y-4 text-gray-300 text-sm md:text-base">
            <div className="flex items-center space-x-2 md:space-x-3">
              <i className="fas fa-trophy text-electric-blue"></i>
              <span>Compete with teams to find secret IIIT domains</span>
            </div>
            <div className="flex items-center space-x-2 md:space-x-3">
              <i className="fas fa-bolt text-neon-green"></i>
              <span>Real-time leaderboard and live scoring</span>
            </div>
            <div className="flex items-center space-x-2 md:space-x-3">
              <i className="fas fa-users text-electric-purple"></i>
              <span>Team-based gameplay with strategy</span>
            </div>
            <div className="flex items-center space-x-2 md:space-x-3">
              <i className="fas fa-medal text-yellow-400"></i>
              <span>+100 points for discoveries, -25 for misses</span>
            </div>
          </div>
          <div className="mt-6 md:mt-8 p-3 md:p-4 bg-gaming-dark/50 rounded-lg border border-gaming-light">
            <p className="text-xs md:text-sm text-gray-400">
              Join the ultimate website discovery challenge designed exclusively for IIIT Hyderabad students and faculty.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}