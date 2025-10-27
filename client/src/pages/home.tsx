import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/GlassButton";
import { Trophy, ArrowRight, Search } from "lucide-react";
import { useAuth, isAuthenticated } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { ContestCard } from "@/components/contest-card";
import { useState } from "react";

export default function Home() {
  const { data: user } = useAuth();
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");

  // Fetch featured contest
  const { data: featuredContest } = useQuery({
    queryKey: ["/api/contests/featured"],
    queryFn: async () => {
      const response = await fetch("/api/contests/featured");
      if (!response.ok) {
        if (response.status === 404) return null; // No featured contest
        throw new Error("Failed to fetch featured contest");
      }
      return response.json();
    },
  });

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      setLocation(`/ai-generator?prompt=${encodeURIComponent(prompt.trim())}`);
    }
  };

  return (
    <div className="min-h-screen pb-32 md:pb-0" data-testid="home-page">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex max-w-4xl mx-auto flex-col items-center gap-8 text-center">
            <div className="flex flex-col gap-4">
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter gradient-text" data-testid="hero-title">
                Where Prompts Become Glory
              </h1>
              <h2 className="text-lg md:text-xl text-muted-foreground" data-testid="hero-description">
                The world's first AI Art Contest platform powered by the $GLORY token.
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground" data-testid="text-hero-subline">
                Upload your AI creations. Vote. Win crypto rewards.
              </p>
            </div>

            {/* Prompt Search Bar */}
            <div className="w-full max-w-2xl">
              <form onSubmit={handlePromptSubmit}>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full rounded-full border border-primary/30 bg-background-dark/50 py-4 pl-12 pr-4 text-white placeholder-gray-400 backdrop-blur-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Describe your vision..."
                    data-testid="input-prompt-search"
                  />
                </div>
              </form>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/contests" data-testid="hero-button-contests">
                <GlassButton className="text-lg px-8 py-3">
                  <Trophy className="mr-2 h-5 w-5" />
                  Browse Contests
                </GlassButton>
              </Link>
              <Link href="/explore" data-testid="hero-button-explore">
                <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                  Explore Submissions
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Contest */}
      {featuredContest && (
        <section className="py-16 md:py-20 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2 gradient-text">Featured Contest</h2>
              <p className="text-muted-foreground">Don't miss out on this exclusive competition</p>
            </div>
            <div className="max-w-5xl mx-auto">
              <ContestCard contest={featuredContest} />
            </div>
          </div>
        </section>
      )}

      {/* Features Grid */}
      <section className="py-16 md:py-24 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Why Join 5best?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-glory flex items-center justify-center">
                <Trophy className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Compete & Win</h3>
              <p className="text-muted-foreground">
                Enter creative contests and earn GLORY rewards. Top 5 submissions get rewarded.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-glory flex items-center justify-center">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Showcase Talent</h3>
              <p className="text-muted-foreground">
                Display your creative work to a vibrant community of artists and creators.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-glory flex items-center justify-center">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">Join Community</h3>
              <p className="text-muted-foreground">
                Connect with fellow creators, vote on submissions, and grow together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated(user) && (
        <section className="py-16 md:py-24 border-t border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Start Winning?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of creators competing for GLORY rewards
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" data-testid="cta-button-register">
                <GlassButton className="text-lg px-8 py-3">
                  Sign Up Now
                </GlassButton>
              </Link>
              <Link href="/pricing" data-testid="cta-button-pricing">
                <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
