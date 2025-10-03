import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { SubmissionCard } from "@/components/submission-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trophy, Users, Image as ImageIcon, Clock, Upload, Crown, Medal, Award } from "lucide-react";
import { useAuth, isAuthenticated, isApproved } from "@/lib/auth";

export default function ContestDetail() {
  const { id } = useParams();
  const { data: user } = useAuth();

  const { data: contest, isLoading } = useQuery({
    queryKey: ["/api/contests", id],
    queryFn: async () => {
      const response = await fetch(`/api/contests/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Contest not found");
        }
        throw new Error("Failed to fetch contest");
      }
      return response.json();
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["/api/submissions", { contestId: id }],
    queryFn: async () => {
      const response = await fetch(`/api/submissions?contestId=${id}&status=approved`);
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    },
    enabled: !!id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/20 text-success border-success/30";
      case "draft":
        return "bg-muted text-muted-foreground border-border";
      case "ended":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Contest ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const topSubmissions = submissions
    .sort((a: any, b: any) => b.votesCount - a.votesCount)
    .slice(0, 3);

  const getPodiumIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-500" />;
      default:
        return null;
    }
  };

  const getPodiumHeight = (rank: number) => {
    switch (rank) {
      case 1:
        return "h-32";
      case 2:
        return "h-24";
      case 3:
        return "h-20";
      default:
        return "h-16";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-16" data-testid="contest-detail-loading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-6 bg-muted rounded w-32 mb-4"></div>
            <div className="h-12 bg-muted rounded w-2/3 mb-8"></div>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="h-64 bg-muted rounded"></div>
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-20 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="min-h-screen py-16 flex items-center justify-center" data-testid="contest-not-found">
        <div className="text-center">
          <Trophy className="w-24 h-24 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Contest not found</h2>
          <p className="text-muted-foreground mb-6">
            The contest you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/contests" data-testid="back-to-contests">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Contests
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16" data-testid="contest-detail-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <Link href="/contests" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6" data-testid="back-link">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Contests
        </Link>

        {/* Contest Header */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Contest Cover */}
          <div className="relative rounded-2xl overflow-hidden aspect-video">
            {contest.coverImageUrl ? (
              <img 
                src={contest.coverImageUrl} 
                alt={contest.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center">
                <Trophy className="w-24 h-24 text-primary" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          </div>

          {/* Contest Info */}
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-4">
              <Badge className={getStatusColor(contest.status)} data-testid="contest-status">
                {contest.status === "active" && <div className="w-2 h-2 bg-current rounded-full mr-2 animate-pulse" />}
                {contest.status.charAt(0).toUpperCase() + contest.status.slice(1)}
              </Badge>
              <Badge variant="outline" className="text-primary border-primary">
                <Trophy className="w-3 h-3 mr-1" />
                {contest.prizeGlory.toLocaleString()} GLORY
              </Badge>
            </div>

            <h1 className="text-4xl font-black tracking-tight mb-4" data-testid="contest-title">
              {contest.title}
            </h1>
            
            <p className="text-muted-foreground text-lg mb-6" data-testid="contest-description">
              {contest.description}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="text-muted-foreground text-sm mb-1">Prize Pool</div>
                <div className="text-2xl font-bold text-primary" data-testid="prize-pool">
                  {contest.prizeGlory.toLocaleString()} GLORY
                </div>
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="text-muted-foreground text-sm mb-1">Time Status</div>
                <div className="text-2xl font-bold" data-testid="time-remaining">
                  {contest.status === "active" ? getTimeRemaining(contest.endAt) : 
                   contest.status === "ended" ? "Ended" : "Not started"}
                </div>
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="text-muted-foreground text-sm mb-1">Submissions</div>
                <div className="text-2xl font-bold" data-testid="submission-count">
                  {submissions.length}
                </div>
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="text-muted-foreground text-sm mb-1">Total Votes</div>
                <div className="text-2xl font-bold" data-testid="total-votes">
                  {submissions.reduce((sum: number, sub: any) => sum + sub.votesCount, 0)}
                </div>
              </div>
            </div>

            {/* Action Button */}
            {contest.status === "active" && isAuthenticated(user) && isApproved(user) && (
              <Link href="/upload" data-testid="submit-entry-button">
                <Button className="w-full gradient-glory hover:opacity-90 transition-opacity text-lg py-3">
                  <Upload className="w-5 h-5 mr-2" />
                  Submit Your Entry
                </Button>
              </Link>
            )}
            {!isAuthenticated(user) && contest.status === "active" && (
              <Link href="/login" data-testid="login-to-submit">
                <Button className="w-full gradient-glory hover:opacity-90 transition-opacity text-lg py-3">
                  Login to Submit Entry
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Contest Rules */}
        <Card className="mb-12">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center" data-testid="rules-title">
              <Trophy className="w-5 h-5 text-primary mr-2" />
              Contest Rules
            </h3>
            <div className="prose prose-sm max-w-none text-muted-foreground" data-testid="contest-rules">
              {contest.rules.split('\n').map((rule: string, index: number) => (
                <p key={index} className="mb-2">• {rule}</p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top 3 Podium */}
        {topSubmissions.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-8 text-center" data-testid="podium-title">
              Current Top 3
            </h2>
            <div className="flex items-end justify-center gap-4 max-w-4xl mx-auto">
              {[1, 0, 2].map((index) => {
                const submission = topSubmissions[index];
                const rank = index === 1 ? 1 : index === 0 ? 2 : 3;
                if (!submission) return null;
                
                return (
                  <div key={submission.id} className={`flex-1 flex flex-col items-center ${index === 1 ? 'order-2' : index === 0 ? 'order-1' : 'order-3'}`} data-testid={`podium-position-${rank}`}>
                    <div className="relative w-full mb-4">
                      <img 
                        src={submission.type === "video" ? submission.thumbnailUrl || submission.mediaUrl : submission.mediaUrl} 
                        alt={submission.title}
                        className={`w-full aspect-square object-cover rounded-xl border-4 ${rank === 1 ? 'border-primary' : 'border-muted'} shadow-lg`}
                      />
                      <div className="absolute -top-3 -right-3 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 flex items-center justify-center font-bold text-white text-xl shadow-lg">
                        {getPodiumIcon(rank) || rank}
                      </div>
                    </div>
                    <div className={`${getPodiumHeight(rank)} w-full rounded-t-xl flex flex-col items-center justify-center p-4 text-center ${
                      rank === 1 ? 'gradient-glory' : rank === 2 ? 'bg-gray-300' : 'bg-orange-400'
                    }`}>
                      <div className="text-white font-bold mb-1" data-testid={`podium-username-${rank}`}>
                        @{submission.user.username}
                      </div>
                      <div className="text-white/90 text-sm mb-2" data-testid={`podium-title-${rank}`}>
                        {submission.title}
                      </div>
                      <div className="flex items-center space-x-1 text-white text-lg font-bold">
                        <Trophy className="w-4 h-4" />
                        <span data-testid={`podium-votes-${rank}`}>{submission.votesCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Submissions */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold" data-testid="all-submissions-title">
              All Submissions ({submissions.length})
            </h2>
          </div>
          
          {submissions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="submissions-grid">
              {submissions.map((submission: any, index: number) => (
                <SubmissionCard 
                  key={submission.id}
                  submission={submission}
                  showVoting={contest.status === "active"}
                  rank={index + 1}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12" data-testid="no-submissions">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <ImageIcon className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No submissions yet</h3>
              <p className="text-muted-foreground mb-6">
                Be the first to submit your creative work to this contest!
              </p>
              {contest.status === "active" && isAuthenticated(user) && isApproved(user) && (
                <Link href="/upload" data-testid="first-submission-button">
                  <Button className="gradient-glory">
                    <Upload className="w-4 h-4 mr-2" />
                    Submit First Entry
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
