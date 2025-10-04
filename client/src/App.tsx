import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Contests from "@/pages/contests";
import ContestDetail from "@/pages/contest-detail";
import Upload from "@/pages/upload";
import Profile from "@/pages/profile";
import Leaderboard from "@/pages/leaderboard";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminContestDetail from "@/pages/admin/contest-detail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/contests" component={Contests} />
          <Route path="/contest/:slug" component={ContestDetail} />
          <Route path="/upload" component={Upload} />
          <Route path="/profile" component={Profile} />
          <Route path="/leaderboard" component={Leaderboard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/contest/:id" component={AdminContestDetail} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
