import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, FileText, Upload, Heart, Trophy, ChevronDown, ArrowLeft } from "lucide-react";
import { GlassButton } from "@/components/GlassButton";
import { ContestLightboxModal } from "@/components/ContestLightboxModal";
import { ContestRulesCard } from "@/components/ContestRulesCard";
import { UploadSelectionModal } from "@/components/UploadSelectionModal";
import { UploadCard } from "@/components/UploadCard";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ContestDetailPage() {
  const [match, params] = useRoute("/contest/:slug");
  const slug = params?.slug;
  const { data: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showUploadSelection, setShowUploadSelection] = useState(false);
  const [showUploadCard, setShowUploadCard] = useState(false);
  const [sortBy, setSortBy] = useState("votes");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch contest by slug
  const { data: contests = [] } = useQuery({
    queryKey: ["/api/contests"]
  });

  const contest = contests.find((c: any) => c.slug === slug);

  // Fetch submissions for this contest
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/submissions", contest?.id],
    enabled: !!contest?.id,
    queryFn: async () => {
      const response = await fetch(`/api/submissions?contestId=${contest.id}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    }
  });

  // Fetch user's votes
  const { data: userVotes = [] } = useQuery({
    queryKey: ["/api/votes/user"],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch("/api/votes/user", { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const response = await apiRequest("POST", "/api/votes", { submissionId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions", contest?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/votes/user"] });
      toast({
        title: "Vote recorded!",
        description: "Your vote has been counted"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Vote failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!contest?.endAt) return;

    const calculateTimeLeft = () => {
      if (contest.status === "ended") {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      const difference = new Date(contest.endAt).getTime() - Date.now();
      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);

    return () => clearInterval(timer);
  }, [contest]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!contest) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-4">
        <h2 className="text-2xl font-bold text-white mb-4">Contest not found</h2>
        <Link href="/contests">
          <GlassButton>Back to Contests</GlassButton>
        </Link>
      </div>
    );
  }

  // Process submissions with vote data
  const submissionsWithVotes = submissions.map((sub: any) => ({
    ...sub,
    voteCount: sub.votesCount || 0,
    hasVoted: userVotes.some((v: any) => v.submissionId === sub.id)
  }));

  // Filter submissions
  let filteredSubmissions = submissionsWithVotes;
  if (searchTerm) {
    filteredSubmissions = filteredSubmissions.filter((sub: any) =>
      sub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Sort submissions based on selected sort option
  const sortedSubmissions = [...filteredSubmissions].sort((a: any, b: any) => {
    if (sortBy === "votes") return b.voteCount - a.voteCount;
    if (sortBy === "recent") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return 0;
  });

  // Top 5 submissions from sorted list
  const topSubmissions = sortedSubmissions.slice(0, 5);
  const otherSubmissions = sortedSubmissions.slice(5);

  const handleVote = (submissionId: string) => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to vote",
        variant: "destructive"
      });
      return;
    }
    voteMutation.mutate(submissionId);
  };

  const handleShowUpload = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login to submit",
        variant: "destructive"
      });
      return;
    }
    setShowUploadSelection(true);
  };

  return (
    <>
      <div className="flex-1 px-4 py-8 sm:px-6 md:px-10 lg:px-20">
        <div className="mx-auto max-w-screen-xl">
          {/* Back Button */}
          <Link href="/contests" className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors" data-testid="link-back-contests">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contests
          </Link>

          {/* Header */}
          <div className="mb-12 flex flex-col items-center justify-between gap-8">
            {/* Title and Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
              <div className="w-full max-w-sm text-center">
                <h1 className="text-2xl font-bold text-white mb-2" data-testid="text-contest-title">
                  {contest.title}
                </h1>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <GlassButton
                  onClick={handleShowUpload}
                  className="flex flex-shrink-0 items-center justify-center gap-2 px-6 py-3 text-base font-bold w-full sm:w-auto"
                  data-testid="button-upload"
                >
                  <Upload className="h-5 w-5" />
                  Upload
                </GlassButton>
                <GlassButton
                  onClick={() => setShowRules(true)}
                  variant="purple"
                  className="flex flex-shrink-0 items-center justify-center gap-2 px-6 py-3 text-base font-bold w-full sm:w-auto"
                  data-testid="button-show-rules"
                >
                  <FileText className="h-5 w-5" />
                  Contest Rules
                </GlassButton>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row w-full items-center justify-center gap-8">
              {/* Timer */}
              <div className="w-full max-w-lg rounded-xl bg-gradient-to-br from-violet-600/20 to-purple-600/20 p-3 sm:p-4 text-center border border-violet-500/30 backdrop-blur-sm">
                <p className="text-sm font-medium text-violet-300 mb-3">Contest Ends In:</p>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <div className="flex flex-col items-center">
                    <div className="bg-black/30 rounded-lg px-2 py-1 min-w-[40px] backdrop-blur-sm border border-violet-500/20">
                      <span className="text-lg sm:text-xl font-bold text-white">{String(timeLeft.days).padStart(2, '0')}</span>
                    </div>
                    <span className="text-xs text-slate-300 mt-1 font-medium">Days</span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold text-violet-400 animate-pulse">:</span>
                  <div className="flex flex-col items-center">
                    <div className="bg-black/30 rounded-lg px-2 py-1 min-w-[40px] backdrop-blur-sm border border-violet-500/20">
                      <span className="text-lg sm:text-xl font-bold text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
                    </div>
                    <span className="text-xs text-slate-300 mt-1 font-medium">Hours</span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold text-violet-400 animate-pulse">:</span>
                  <div className="flex flex-col items-center">
                    <div className="bg-black/30 rounded-lg px-2 py-1 min-w-[40px] backdrop-blur-sm border border-violet-500/20">
                      <span className="text-lg sm:text-xl font-bold text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
                    </div>
                    <span className="text-xs text-slate-300 mt-1 font-medium">Minutes</span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold text-violet-400 animate-pulse">:</span>
                  <div className="flex flex-col items-center">
                    <div className="bg-black/30 rounded-lg px-2 py-1 min-w-[40px] backdrop-blur-sm border border-violet-500/20">
                      <span className="text-lg sm:text-xl font-bold text-white">{String(timeLeft.seconds).padStart(2, '0')}</span>
                    </div>
                    <span className="text-xs text-slate-300 mt-1 font-medium">Seconds</span>
                  </div>
                </div>
              </div>

              {/* Prize Pool */}
              <div className="w-full max-w-sm rounded-xl bg-gradient-to-br from-yellow-600/20 to-orange-600/20 p-4 text-center border border-yellow-500/30 backdrop-blur-sm">
                <p className="text-sm font-medium text-yellow-300 mb-2">Prize Pool</p>
                <div className="flex items-center justify-center gap-2">
                  <Trophy className="h-6 w-6 text-yellow-400" />
                  <span className="text-2xl font-bold text-white" data-testid="text-prize-pool">
                    {contest.prizeGlory.toLocaleString()} GLORY
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Sort */}
          <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search submissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder:text-slate-400 focus:outline-none focus:border-violet-500/50"
                data-testid="input-search"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg text-white focus:outline-none focus:border-violet-500/50"
                data-testid="select-sort"
              >
                <option value="votes">Most Voted</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>
          </div>

          {submissionsLoading ? (
            <div className="text-center text-white py-12">Loading submissions...</div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
              <p>No submissions yet. Be the first to enter!</p>
            </div>
          ) : (
            <>
              {/* Top 5 Submissions */}
              {topSubmissions.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Trophy className="h-7 w-7 text-yellow-400" />
                    Top Submissions
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {topSubmissions.map((submission: any, index: number) => (
                      <div
                        key={submission.id}
                        className="relative group cursor-pointer"
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setIsLightboxOpen(true);
                        }}
                        data-testid={`card-top-submission-${submission.id}`}
                      >
                        {/* Rank Badge */}
                        <div className="absolute -top-3 -left-3 z-10 h-12 w-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-4 border-slate-900 flex items-center justify-center text-lg font-bold text-slate-900">
                          {index + 1}
                        </div>

                        <div className="overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 group-hover:border-violet-500/50 transition-all group-hover:scale-[1.02]">
                          <div className="aspect-square relative">
                            <img
                              src={submission.mediaUrl}
                              alt={submission.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-4">
                            <h3 className="text-lg font-bold text-white mb-1 truncate">
                              {submission.title}
                            </h3>
                            <p className="text-sm text-slate-400 mb-3">
                              by {submission.user?.username || 'Unknown'}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVote(submission.id);
                              }}
                              className="flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors"
                              data-testid={`button-vote-${submission.id}`}
                            >
                              <Heart className={`h-5 w-5 ${submission.hasVoted ? 'fill-violet-400' : ''}`} />
                              <span className="font-semibold">{submission.voteCount}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Other Submissions */}
              {otherSubmissions.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">All Submissions</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {otherSubmissions.map((submission: any) => (
                      <div
                        key={submission.id}
                        className="group cursor-pointer"
                        onClick={() => {
                          setSelectedSubmission(submission);
                          setIsLightboxOpen(true);
                        }}
                        data-testid={`card-submission-${submission.id}`}
                      >
                        <div className="overflow-hidden rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 group-hover:border-violet-500/50 transition-all group-hover:scale-[1.02]">
                          <div className="aspect-square relative">
                            <img
                              src={submission.mediaUrl}
                              alt={submission.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-4">
                            <h3 className="text-base font-semibold text-white mb-1 truncate">
                              {submission.title}
                            </h3>
                            <p className="text-sm text-slate-400 mb-3 truncate">
                              by {submission.user?.username || 'Unknown'}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVote(submission.id);
                              }}
                              className="flex items-center gap-2 text-violet-400 hover:text-violet-300 transition-colors"
                              data-testid={`button-vote-${submission.id}`}
                            >
                              <Heart className={`h-4 w-4 ${submission.hasVoted ? 'fill-violet-400' : ''}`} />
                              <span className="font-semibold">{submission.voteCount}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <ContestLightboxModal
        isOpen={isLightboxOpen}
        submission={selectedSubmission}
        onClose={() => {
          setIsLightboxOpen(false);
          setSelectedSubmission(null);
        }}
        onVote={handleVote}
      />

      <ContestRulesCard
        isOpen={showRules}
        contest={contest}
        onClose={() => setShowRules(false)}
      />

      <UploadSelectionModal
        isOpen={showUploadSelection}
        onClose={() => setShowUploadSelection(false)}
        onSelectExisting={() => {
          setShowUploadSelection(false);
          toast({
            title: "Coming soon",
            description: "Gallery selection will be available soon"
          });
        }}
        onUploadNew={() => {
          setShowUploadSelection(false);
          setShowUploadCard(true);
        }}
      />

      <UploadCard
        isOpen={showUploadCard}
        contestId={contest.id}
        onClose={() => setShowUploadCard(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/submissions", contest.id] });
        }}
      />
    </>
  );
}
