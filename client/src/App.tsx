import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { SolanaWalletProvider } from "@/lib/wallet-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { PrivateModeGuard } from "@/components/PrivateModeGuard";
import { PrivateModeProvider, usePrivateMode } from "@/lib/private-mode-context";
import { useAuth } from "@/lib/auth";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Contests from "@/pages/contests";
import ContestDetail from "@/pages/contest-detail";
import SubmissionDetail from "@/pages/submission-detail";
import Upload from "@/pages/upload";
import Profile from "@/pages/profile";
import MySubmissions from "@/pages/my-submissions";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminContestDetail from "@/pages/admin/contest-detail";
import AdminSettings from "@/pages/admin/settings";
import AdminSubscriptionTiers from "@/pages/admin/subscription-tiers";
import RoadmapPage from "@/pages/roadmap";
import AiGeneratorPage from "@/pages/ai-generator";
import ImageEditor from "@/pages/image-editor";
import PricingPage from "@/pages/pricing";
import SubscriptionPage from "@/pages/subscription";
import NotFound from "@/pages/not-found";

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  return null;
}

function Router() {
  const { data: user } = useAuth();
  const { privateMode } = usePrivateMode();
  const [location] = useLocation();

  // Show Footer and BottomNav when: Private Mode is OFF OR user is logged in
  const showFooterAndBottomNav = !privateMode || !!user;
  
  // Hide navbar on AI Studio pages (they have their own sidebar)
  const hideNavbar = location === '/ai-generator' || location.startsWith('/image-editor/');

  return (
    <div className="min-h-screen flex flex-col">
      {!hideNavbar && <Navbar />}
      <main className="flex-1 pb-16">
        <ScrollToTop />
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route>
            <PrivateModeGuard>
              <Switch>
                <Route path="/" component={Home} />
                <Route path="/roadmap" component={RoadmapPage} />
                <Route path="/pricing" component={PricingPage} />
                <Route path="/subscription" component={SubscriptionPage} />
                <Route path="/ai-generator" component={AiGeneratorPage} />
                <Route path="/image-editor/:id" component={ImageEditor} />
                <Route path="/contests" component={Contests} />
                <Route path="/contest/:slug" component={ContestDetail} />
                <Route path="/submission/:id" component={SubmissionDetail} />
                <Route path="/upload" component={Upload} />
                <Route path="/profile" component={Profile} />
                <Route path="/my-submissions" component={MySubmissions} />
                <Route path="/admin" component={AdminDashboard} />
                <Route path="/admin/dashboard" component={AdminDashboard} />
                <Route path="/admin/settings" component={AdminSettings} />
                <Route path="/admin/subscription-tiers" component={AdminSubscriptionTiers} />
                <Route path="/admin/contest/:id" component={AdminContestDetail} />
                <Route component={NotFound} />
              </Switch>
            </PrivateModeGuard>
          </Route>
        </Switch>
      </main>
      {showFooterAndBottomNav && <Footer />}
      {showFooterAndBottomNav && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SolanaWalletProvider>
          <PrivateModeProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </PrivateModeProvider>
        </SolanaWalletProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
