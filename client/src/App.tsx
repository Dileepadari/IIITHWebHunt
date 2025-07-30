import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import AuthPage from "@/pages/auth";
import { Redirect } from "wouter";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null; // Or return a loading spinner

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/">
        {user ? <Redirect to="/home" /> : <Landing />}
      </Route>
      <Route path="/auth">
        {user ? <Redirect to="/home" /> : <AuthPage />}
      </Route>

      {/* Protected routes */}
      <Route path="/home">
        {user ? <Home /> : <Redirect to="/auth" />}
      </Route>
      <Route path="/admin">
        {user ? <Admin /> : <Redirect to="/auth" />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
