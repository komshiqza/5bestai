import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmissionCard } from "@/components/submission-card";
import { Trophy, Upload, ArrowRight, Users, Image as ImageIcon, Clock, Play } from "lucide-react";
import { useAuth, isAuthenticated } from "@/lib/auth";

export default function Home() {
  const { data: user } = useAuth();

  const { data: contests = [] } = useQuery({
    queryKey: ["/api/contests", { status: "active" }],
    queryFn: async () => {
      const response = await fetch("/api/contests?status=active");
      if (!response.ok) throw new Error("Failed to fetch contests");
      return response.json();
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["/api/submissions"],
    queryFn: async () => {
      const response = await fetch("/api/submissions?status=approved");
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    },
  });

  const featuredContest = contests[0];

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 border-b border-border">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight" data-testid="hero-title">
              Compete, Create, <br/>
              <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">Win GLORY</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8" data-testid="hero-description">
              Join creative contests, showcase your talent, and climb the leaderboard. Top 5 submissions win GLORY rewards.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contests" data-testid="hero-button-contests">
                <Button size="lg" className="gradient-glory hover:opacity-90 transition-opacity text-lg px-8 py-3">
                  Browse Contests
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              {isAuthenticated(user) ? (
                <Link href="/upload" data-testid="hero-button-upload">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                    <Upload className="mr-2 w-5 h-5" />
                    Submit Your Work
                  </Button>
                </Link>
              ) : (
                <Link href="/register" data-testid="hero-button-register">
                  <Button size="lg" variant="outline" className="text-lg px-8 py-3">
                    Join Now
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Featured Contest */}
          {featuredContest && (
            <div className="mt-16 glass-effect rounded-2xl p-8 max-w-4xl mx-auto" data-testid="featured-contest">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
                    <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                    LIVE NOW
                  </Badge>
                  <h2 className="text-2xl font-bold" data-testid="featured-contest-title">
                    {featuredContest.title}
                  </h2>
                </div>
                <div className="flex items-center space-x-2 text-primary">
                  <Trophy className="w-5 h-5" />
                  <span className="font-mono text-xl font-bold" data-testid="featured-contest-prize">
                    {featuredContest.prizeGlory.toLocaleString()}
                  </span>
                  <span className="text-sm">GLORY</span>
                </div>
              </div>
              
              <p className="text-muted-foreground mb-6" data-testid="featured-contest-description">
                {featuredContest.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center space-x-3 bg-secondary/50 rounded-lg p-4">
                  <Users className="text-primary text-xl" />
                  <div>
                    <div className="text-sm text-muted-foreground">Participants</div>
                    <div className="text-xl font-bold" data-testid="featured-contest-participants">
                      {featuredContest.participantCount}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 bg-secondary/50 rounded-lg p-4">
                  <ImageIcon className="text-primary text-xl" />
                  <div>
                    <div className="text-sm text-muted-foreground">Submissions</div>
                    <div className="text-xl font-bold" data-testid="featured-contest-submissions">
                      {featuredContest.submissionCount}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 bg-secondary/50 rounded-lg p-4">
                  <Clock className="text-primary text-xl" />
                  <div>
                    <div className="text-sm text-muted-foreground">Time Left</div>
                    <div className="text-xl font-bold font-mono text-primary" data-testid="featured-contest-time-left">
                      2d 14h
                    </div>
                  </div>
                </div>
              </div>

              <Link href={`/contests/${featuredContest.id}`} data-testid="featured-contest-link">
                <Button className="w-full gradient-glory hover:opacity-90 transition-opacity font-semibold py-3">
                  View Contest Details
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Latest Submissions */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-2" data-testid="submissions-section-title">
                Latest Submissions
              </h2>
              <p className="text-muted-foreground">Discover amazing work from our community</p>
            </div>
            
            <div className="hidden md:flex items-center space-x-2">
              <Button variant="outline" size="sm" className="bg-primary text-primary-foreground" data-testid="filter-all">
                All
              </Button>
              <Button variant="ghost" size="sm" data-testid="filter-images">
                Images
              </Button>
              <Button variant="ghost" size="sm" data-testid="filter-videos">
                Videos
              </Button>
            </div>
          </div>

          {submissions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="submissions-grid">
              {submissions.slice(0, 8).map((submission: any) => (
                <SubmissionCard 
                  key={submission.id}
                  submission={submission}
                  showVoting={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No submissions yet</h3>
              <p className="text-muted-foreground mb-6">Be the first to submit your creative work!</p>
              {isAuthenticated(user) && (
                <Link href="/upload" data-testid="empty-state-upload-link">
                  <Button className="gradient-glory">
                    <Upload className="mr-2 w-4 h-4" />
                    Submit Your Work
                  </Button>
                </Link>
              )}
            </div>
          )}

          {submissions.length > 8 && (
            <div className="mt-12 text-center">
              <Link href="/contests" data-testid="view-all-submissions-link">
                <Button variant="outline" size="lg">
                  View All Submissions
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
