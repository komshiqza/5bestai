import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/GlassButton";
import { Trophy, ArrowRight, Search, Coins, Users, Star, HelpCircle, ChevronDown } from "lucide-react";
import { useAuth, isAuthenticated } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { ContestCard } from "@/components/contest-card";
import { useState, useEffect } from "react";

export default function Home() {
  const { data: user } = useAuth();
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Featured contest
  const { data: featuredContest } = useQuery({
    queryKey: ["/api/contests/featured"],
    queryFn: async () => {
      const response = await fetch("/api/contests/featured");
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch featured contest");
      }
      return response.json();
    },
  });

  // Trending contests (short grid)
  const { data: trendingContests } = useQuery({
    queryKey: ["/api/contests", "trending", 6],
    queryFn: async () => {
      const res = await fetch("/api/contests?sort=trending&limit=6");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Community stats
  const { data: stats } = useQuery({
    queryKey: ["/api/stats/overview"],
    queryFn: async () => {
      const res = await fetch("/api/stats/overview");
      if (!res.ok) {
        return {
          creators: 0,
          submissions: 0,
          votes: 0,
        };
      }
      return res.json();
    },
  });

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      setLocation(`/ai-generator?prompt=${encodeURIComponent(prompt.trim())}`);
    }
  };

  const FaqItem = ({
    id,
    question,
    answer,
  }: {
    id: string;
    question: string;
    answer: string;
  }) => {
    const open = openFaq === id;
    return (
      <div className="border border-white/10 rounded-2xl p-4 sm:p-5 bg-black/20 backdrop-blur transition-all">
        <button
          className="w-full flex items-center justify-between text-left"
          onClick={() => setOpenFaq(open ? null : id)}
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold">{question}</span>
          </div>
          <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <div
          className={`grid transition-all ${open ? "grid-rows-[1fr] mt-3" : "grid-rows-[0fr]"} overflow-hidden`}
        >
          <div className="text-sm text-muted-foreground min-h-0">
            {answer}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div data-testid="home-page">
      {/* Hero Section */}
      <section className="min-h-screen container mx-auto flex flex-col items-center justify-center px-4 sm:px-6 text-center">
        <div className="flex max-w-4xl flex-col items-center gap-6 sm:gap-8 relative">
          <div className={`flex flex-col gap-4 ${isVisible ? 'animate-fade-in-up animation-delay-100' : 'opacity-0'}`}>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter gradient-text animate-pulse-slow leading-tight" data-testid="hero-title">
              Where Prompts<br className="sm:hidden" /> Become Glory
            </h1>
            <h2 className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground" data-testid="hero-description">
              The world's first AI Art Contest platform powered by the $GLORY token.
            </h2>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground" data-testid="text-hero-subline">
              Upload your AI creations. Vote. Win crypto rewards.
            </p>
          </div>

          {/* Prompt Bar */}
<div
  className={`w-full max-w-2xl px-4 sm:px-0 ${
    isVisible ? "animate-fade-in-scale animation-delay-300" : "opacity-0"
  }`}
>
  <form onSubmit={handlePromptSubmit} className="prompt-bar relative flex items-center">
    <input
      type="text"
      placeholder="Describe your vision..."
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      className="glass w-full rounded-full py-3 sm:py-4 pl-6 pr-14 text-white placeholder-gray-400 focus:outline-none focus:rounded-none transition-all duration-300 text-sm sm:text-base"
      data-testid="input-prompt-search"
    />
    <button
  type="submit"
  title="Generate AI Art"
  className="absolute right-2 sm:right-3 flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-transparent hover:bg-white/5 transition-all duration-300"
>
  {/* Artistic glowing icon */}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 sm:h-6 sm:w-6 text-white/60 hover:text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.6)] transition-all duration-300"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.6}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 3l3.59 7.26L16 10l-4.59 4.74L13 21l-8-5 1.82-5.74L5 3z"
    />
  </svg>
</button>

  </form>
</div>



          {/* CTAs */}
          <div className={`w-full px-4 sm:px-0 max-w-md ${isVisible ? 'animate-fade-in-up animation-delay-400' : 'opacity-0'}`}>
            <div className="flex flex-row gap-2 w-full">
              <Link href="/explore" data-testid="hero-button-explore" className="flex-1 min-w-0">
                <GlassButton className="w-full flex items-center justify-center px-2 py-2 sm:px-3 sm:py-3 text-xs sm:text-sm font-bold whitespace-nowrap truncate">
                  Explore
                </GlassButton>
              </Link>
              <Link href="/contests" data-testid="hero-button-contests" className="flex-1 min-w-0">
                <GlassButton className="w-full flex items-center justify-center px-2 py-2 sm:px-3 sm:py-3 text-xs sm:text-sm font-bold whitespace-nowrap truncate">
                  Contests
                </GlassButton>
              </Link>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-primary/10 rounded-full blur-xl animate-pulse-slow animation-delay-200"></div>
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-cyan-400/10 rounded-full blur-xl animate-pulse-slow animation-delay-500"></div>
          <div className="absolute top-1/2 -right-20 w-16 h-16 bg-pink-400/10 rounded-full blur-xl animate-pulse-slow animation-delay-300"></div>
        </div>
      </section>

{/* Featured Contest */}
      {featuredContest && (
        <section className="py-16 md:py-20">
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

      {/* How It Works */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 gradient-text">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
                title: "1) Upload",
                text: "Post your best AI artworks into active contests or your gallery."
              },
              {
                icon: <Trophy className="h-8 w-8 text-white" />,
                title: "2) Vote & Share",
                text: "Vote on entries you love. Sharing brings more votes & visibility."
              },
              {
                icon: <Coins className="h-8 w-8 text-white" />,
                title: "3) Win Rewards",
                text: "Top 5 entries earn GLORY/USDC prizes and platform perks."
              }
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-glory flex items-center justify-center">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/rules">
              <Button variant="outline" className="gap-2">
                See Rules <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid (kept) */}
      <section className="py-16 md:py-24">
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

      {/* Glory Token & Rewards */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl p-8 md:p-12 border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-12">
              <div className="w-20 h-20 rounded-full gradient-glory flex items-center justify-center shrink-0">
                <Coins className="h-10 w-10 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl md:text-3xl font-bold gradient-text mb-3">GLORY Token — power & rewards</h3>
                <ul className="text-muted-foreground space-y-2 text-sm md:text-base list-disc pl-5">
                  <li>Win GLORY/USDC by placing in the Top 5.</li>
                  <li>Unlock access to exclusive contests & perks.</li>
                  <li><strong>Buyback Flywheel:</strong> 5% of platform profits allocated to GLORY buybacks.</li>
                </ul>
              </div>
              <div>
                <Link href="/glory-token">
                  <Button variant="outline" className="gap-2">Learn more <ArrowRight className="h-4 w-4" /></Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Community & Trust */}
      <section className="py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 gradient-text">Community & Trust</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: <Users className="h-7 w-7 text-white" />, label: "Creators", value: stats?.creators ?? 0 },
              { icon: <Star className="h-7 w-7 text-white" />, label: "Submissions", value: stats?.submissions ?? 0 },
              { icon: <Trophy className="h-7 w-7 text-white" />, label: "Votes", value: stats?.votes ?? 0 },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-white/10 p-6 bg-black/20 backdrop-blur text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full gradient-glory flex items-center justify-center">
                  {s.icon}
                </div>
                <div className="text-3xl font-extrabold">{Intl.NumberFormat().format(s.value)}</div>
                <div className="text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 mt-10">
            <Link href="https://x.com/GloryToken5best">
              <Button variant="outline" size="sm">Twitter / X</Button>
            </Link>
            <Link href="https://t.me/ComunityGloryToken">
              <Button variant="outline" size="sm">Telegram</Button>
            </Link>
            <Link href="/discord">
              <Button variant="outline" size="sm">Discord</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Mini FAQ */}
      <section className="py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-8 gradient-text">FAQ</h2>
          <div className="space-y-4">
            <FaqItem
              id="who-can-join"
              question="Who can join?"
              answer="Anyone with AI-generated artwork can participate. Some contests may have specific themes or requirements—check the Rules on each contest page."
            />
            <FaqItem
              id="how-are-winners-picked"
              question="How are winners selected?"
              answer="Winners are determined by the community vote and/or additional criteria depending on the contest. The Top 5 are rewarded each round."
            />
            <FaqItem
              id="what-is-glory"
              question="What is GLORY?"
              answer="GLORY is the platform’s utility/reward token. It fuels contest rewards, unlocks exclusive contests and perks, and benefits from buyback allocations."
            />
            <FaqItem
              id="fees"
              question="Are there fees?"
              answer="Basic participation is free. Some advanced features or special contests may require holding GLORY or a subscription tier—details on the Pricing page."
            />
          </div>
        </div>
      </section>

      {/* CTA Section (kept) */}
      {!isAuthenticated(user) && (
        <section className="py-16 md:py-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to Start Winning?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of creators competing for GLORY rewards
            </p>
            <div className="w-full px-4 sm:px-0 max-w-md mx-auto">
              <div className="flex flex-row gap-2 w-full">
                <Link href="/register" data-testid="cta-button-register" className="flex-1 min-w-0">
                  <GlassButton className="w-full flex items-center justify-center px-2 py-2 sm:px-3 sm:py-3 text-xs sm:text-sm font-bold whitespace-nowrap truncate">
                    Sign Up Now
                  </GlassButton>
                </Link>
                <Link href="/pricing" data-testid="cta-button-pricing" className="flex-1 min-w-0">
                  <Button size="lg" variant="outline" className="w-full flex items-center justify-center px-2 py-2 sm:px-3 sm:py-3 text-xs sm:text-sm font-bold whitespace-nowrap truncate">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
