import React, { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, FileText, Upload, Heart, Trophy, ChevronDown, ArrowLeft, Expand, Share2, X } from "lucide-react";
import { GlassButton } from "@/components/GlassButton";
import { ContestLightboxModal } from "@/components/ContestLightboxModal";
import { ContestRulesCard } from "@/components/ContestRulesCard";
import { UploadWizardModal } from "@/components/UploadWizardModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function ContestDetailPage() {
  const [match, params] = useRoute("/contest/:slug");
  const slug = params?.slug || "";
  const { data: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [showAllPrizesModal, setShowAllPrizesModal] = useState(false);
  const [sortBy, setSortBy] = useState("votes");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [isToolbarSticky, setIsToolbarSticky] = useState(false);
  const toolbarRef = React.useRef<HTMLDivElement>(null);

  // Fetch contest by slug
  const { data: contests = [], isLoading: contestsLoading } = useQuery<any[]>({
    queryKey: ["/api/contests"]
  });

  const contest = contests.find((c: any) => c.slug === slug);

  // Fetch submissions for this contest
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/submissions", contest?.id],
    enabled: !!contest?.id,
    queryFn: async () => {
      if (!contest?.id) {
        throw new Error("Contest ID is not available");
      }
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

  // Share functionality
  const handleShare = (submission: any) => {
    const shareUrl = `${window.location.origin}/submission/${submission.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: submission.title,
        text: `Check out this amazing submission: ${submission.title}`,
        url: shareUrl,
      }).catch((error) => {
        console.log('Error sharing:', error);
        fallbackShare(shareUrl);
      });
    } else {
      fallbackShare(shareUrl);
    }
  };

  const fallbackShare = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copied!",
        description: "Submission link has been copied to clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    });
  };

  const handleCardClick = (e: React.MouseEvent, submissionId: string) => {
    // Only toggle on mobile (below lg breakpoint)
    if (window.innerWidth < 1024) {
      e.stopPropagation();
      setActiveCardId(activeCardId === submissionId ? null : submissionId);
    }
  };

  // Handle browser back button for All Prizes Modal (Dialog handles Escape automatically)
  useEffect(() => {
    if (!showAllPrizesModal) return;

    const modalId = Date.now();

    // Push unique history state when modal opens
    window.history.pushState({ modal: 'allPrizes', modalId }, '');

    // Handle browser back button
    const handlePopState = () => {
      // Close modal when going back in history
      if (window.history.state?.modalId !== modalId) {
        setShowAllPrizesModal(false);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showAllPrizesModal]);

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

  // Sticky toolbar on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!toolbarRef.current) return;
      
      const toolbarTop = toolbarRef.current.getBoundingClientRect().top;
      const navbarHeight = 100; // navbar height
      
      // When toolbar reaches the top (navbar bottom), make it sticky
      if (toolbarTop <= navbarHeight) {
        setIsToolbarSticky(true);
      } else {
        setIsToolbarSticky(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Show loading state while contests are being fetched
  if (contestsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">Loading contest...</div>
          <div className="text-gray-400">Please wait</div>
        </div>
      </div>
    );
  }

  // Show not found if contests loaded but slug doesn't match
  if (!contest) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-2">Contest not found</div>
          <div className="text-gray-400 mb-6">The contest you're looking for doesn't exist or has been removed.</div>
          <Link href="/contests">
            <GlassButton variant="primary">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contests
            </GlassButton>
          </Link>
        </div>
      </div>
    );
  }

  // Process submissions with vote data
  const submissionsWithVotes = submissions.map((sub: any) => ({
    ...sub,
    voteCount: sub.votesCount || 0,
    hasVoted: userVotes.some((v: any) => v.submissionId === sub.id)
  }));

  // Top 5 submissions always sorted by votes (not affected by filters)
  const topSubmissions = [...submissionsWithVotes]
    .sort((a: any, b: any) => b.voteCount - a.voteCount)
    .slice(0, 5);

  // Other submissions (excluding top 5)
  const topSubmissionIds = new Set(topSubmissions.map(s => s.id));
  let otherSubmissions = submissionsWithVotes.filter((sub: any) => !topSubmissionIds.has(sub.id));

  // Filter other submissions (search applies only to non-top-5)
  if (searchTerm) {
    otherSubmissions = otherSubmissions.filter((sub: any) =>
      sub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  // Sort other submissions based on selected sort option
  const allSubmissions = [...otherSubmissions].sort((a: any, b: any) => {
    if (sortBy === "votes") return b.voteCount - a.voteCount;
    if (sortBy === "recent") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return 0;
  });

  // Combined filtered submissions for "no results" check
  const filteredSubmissions = [...topSubmissions, ...allSubmissions];

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
    setShowUploadWizard(true);
  };

  return (
    <>
      <div className="flex-1 px-4 py-6 pb-32 md:pb-6 sm:px-6 md:px-10 lg:px-20">
        <div className="mx-auto max-w-screen-xl">
          {/* Back Button */}
          <Link href="/contests" className="inline-flex items-center text-gray-400 hover:text-white mb-6 md:mb-8 transition-colors" data-testid="link-back-contests">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contests
          </Link>

          {/* Header Controls - Contest Type Selector, Timer, Prize Pool */}
          <div className="mb-8 md:mb-12 flex flex-col items-center justify-between gap-6 md:gap-8">
            {/* Contest Type Selector and Upload Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 w-full">
              <div className="w-full max-w-sm text-center">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-2" data-testid="text-contest-title">
                  {contest.title}
                </h1>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto">
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
                  variant="primary"
                  className="flex flex-shrink-0 items-center justify-center gap-2 px-6 py-3 text-base font-bold w-full sm:w-auto"
                  data-testid="button-show-rules"
                >
                  <FileText className="h-5 w-5" />
                  Contest Rules
                </GlassButton>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row w-full items-center justify-center gap-8">
              {/* Contest Timer */}
              <div className="w-full max-w-lg rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20 p-3 sm:p-4 text-center border border-primary/30 backdrop-blur-sm">
                <p className="text-sm font-medium text-primary text-glow mb-3">Contest Ends In:</p>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <div className="flex flex-col items-center">
                    <div className="bg-black/30 rounded-lg px-2 py-1 min-w-[40px] backdrop-blur-sm border border-primary/20">
                      <span className="text-lg sm:text-xl font-bold text-white text-glow">{String(timeLeft.days).padStart(2, '0')}</span>
                    </div>
                    <span className="text-xs text-gray-300 mt-1 font-medium">Days</span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold text-primary text-glow animate-pulse">:</span>
                  <div className="flex flex-col items-center">
                    <div className="bg-black/30 rounded-lg px-2 py-1 min-w-[40px] backdrop-blur-sm border border-primary/20">
                      <span className="text-lg sm:text-xl font-bold text-white text-glow">{String(timeLeft.hours).padStart(2, '0')}</span>
                    </div>
                    <span className="text-xs text-gray-300 mt-1 font-medium">Hours</span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold text-primary text-glow animate-pulse">:</span>
                  <div className="flex flex-col items-center">
                    <div className="bg-black/30 rounded-lg px-2 py-1 min-w-[40px] backdrop-blur-sm border border-primary/20">
                      <span className="text-lg sm:text-xl font-bold text-white text-glow">{String(timeLeft.minutes).padStart(2, '0')}</span>
                    </div>
                    <span className="text-xs text-gray-300 mt-1 font-medium">Minutes</span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold text-primary text-glow animate-pulse">:</span>
                  <div className="flex flex-col items-center">
                    <div className="bg-black/30 rounded-lg px-2 py-1 min-w-[40px] backdrop-blur-sm border border-primary/20">
                      <span className="text-lg sm:text-xl font-bold text-white text-glow">{String(timeLeft.seconds).padStart(2, '0')}</span>
                    </div>
                    <span className="text-xs text-gray-300 mt-1 font-medium">Seconds</span>
                  </div>
                </div>
              </div>

              {/* Prize Pool Section */}
              <div className="w-full max-w-lg rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-purple-600/10 p-3 sm:p-4 glow-border backdrop-blur-sm">
                <h3 className="mb-4 text-center text-xl sm:text-2xl font-bold text-white text-glow">
                  {contest.prizeGlory.toLocaleString()} GLORY
                </h3>
                
                {/* Dynamic Prize Distribution */}
                {contest.prizeDistribution && contest.prizeDistribution.length > 0 ? (
                  <>
                    <div className={`grid gap-2 sm:gap-3 text-center ${
                      contest.prizeDistribution.length <= 3 ? 'grid-cols-3' :
                      contest.prizeDistribution.length === 4 ? 'grid-cols-4' :
                      'grid-cols-5'
                    }`}>
                      {/* Show first 4 places if more than 5, otherwise show all up to 5 */}
                      {contest.prizeDistribution.slice(0, contest.prizeDistribution.length > 5 ? 4 : 5).map((prize: any, index: number) => {
                        const placeNumber = index + 1;
                        const badgeColor = 
                          placeNumber === 1 ? 'from-yellow-400 to-yellow-600' :
                          placeNumber === 2 ? 'from-gray-300 to-gray-500' :
                          placeNumber === 3 ? 'from-orange-400 to-orange-600' :
                          'from-blue-400 to-blue-600';
                        
                        return (
                          <div 
                            key={index}
                            className="flex flex-col items-center justify-center rounded-lg bg-primary/10 p-2 transition-all hover:bg-primary/20 hover:scale-105"
                          >
                            <div className={`w-6 h-6 rounded-full bg-gradient-to-r ${badgeColor} flex items-center justify-center mb-1`}>
                              <span className="text-xs font-bold text-black">
                                {placeNumber === 1 ? '1st' :
                                 placeNumber === 2 ? '2nd' :
                                 placeNumber === 3 ? '3rd' :
                                 `${placeNumber}th`}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-white mb-1">
                              {typeof prize.value === 'number' 
                                ? prize.value.toLocaleString()
                                : Math.floor(contest.prizeGlory * (prize.percentage / 100)).toLocaleString()
                              }
                            </p>
                            <p className="text-xs text-primary font-medium">GLORY</p>
                          </div>
                        );
                      })}
                      
                      {/* Show "+" indicator if more than 5 places */}
                      {contest.prizeDistribution.length > 5 && (
                        <button
                          onClick={() => setShowAllPrizesModal(true)}
                          className="flex flex-col items-center justify-center rounded-lg bg-primary/10 p-2 transition-all hover:bg-primary/20 hover:scale-105 cursor-pointer"
                          data-testid="button-view-all-prizes"
                        >
                          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 flex items-center justify-center mb-1">
                            <span className="text-xs font-bold text-white">+</span>
                          </div>
                          <p className="text-xs font-bold text-white mb-1">
                            {contest.prizeDistribution.length - 4}
                          </p>
                          <p className="text-xs text-primary font-medium">More</p>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  /* Fallback to default 3-place distribution */
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
                    {/* 1st Place - 50% */}
                    <div className="flex flex-col items-center justify-center rounded-lg bg-primary/10 p-2 transition-all hover:bg-primary/20 hover:scale-105">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center mb-1">
                        <span className="text-xs font-bold text-black">1st</span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-white mb-1">
                        {Math.floor(contest.prizeGlory * 0.5).toLocaleString()}
                      </p>
                      <p className="text-xs text-primary font-medium">GLORY</p>
                    </div>
                    
                    {/* 2nd Place - 30% */}
                    <div className="flex flex-col items-center justify-center rounded-lg bg-primary/10 p-2 transition-all hover:bg-primary/20 hover:scale-105">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-gray-300 to-gray-500 flex items-center justify-center mb-1">
                        <span className="text-xs font-bold text-black">2nd</span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-white mb-1">
                        {Math.floor(contest.prizeGlory * 0.3).toLocaleString()}
                      </p>
                      <p className="text-xs text-primary font-medium">GLORY</p>
                    </div>
                    
                    {/* 3rd Place - 20% */}
                    <div className="flex flex-col items-center justify-center rounded-lg bg-primary/10 p-2 transition-all hover:bg-primary/20 hover:scale-105">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center mb-1">
                        <span className="text-xs font-bold text-black">3rd</span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-white mb-1">
                        {Math.floor(contest.prizeGlory * 0.2).toLocaleString()}
                      </p>
                      <p className="text-xs text-primary font-medium">GLORY</p>
                    </div>
                  </div>
                )}
                
                {/* Prize Distribution Summary */}
                <div className="mt-3 pt-3 border-t border-primary/20">
                  <p className="text-xs text-center text-gray-300">
                    {contest.prizeDistribution ? contest.prizeDistribution.length : 3} Winners • Total Pool: {contest.prizeGlory.toLocaleString()} GLORY
                  </p>
                </div>
              </div>
            </div>
          </div>

          {submissionsLoading ? (
            <div className="text-center text-white py-12">Loading submissions...</div>
          ) : submissionsWithVotes.length === 0 ? (
            <div className="text-center text-gray-400 py-12 mt-12">
              <p>No submissions yet. Be the first to enter!</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center text-gray-400 py-12 mt-8">
              <p>No results found for "{searchTerm}"</p>
              <p className="text-sm mt-2">Try a different search term</p>
            </div>
          ) : (
            <>
              {/* Top 5 Most Liked - Expanded Layout */}
              {topSubmissions.length > 0 && (
                <div className="mt-12">
                  <h3 className="mb-8 text-center text-3xl font-bold text-white text-glow">
                    <Trophy className="inline-block h-8 w-8 text-yellow-400 mr-2" />
                    Top 5 Most Liked
                  </h3>
                  
                  {/* Expanded Layout */}
                  <div className="flex flex-col items-center gap-6">
                    {/* First Place - Top position */}
                    {topSubmissions[0] && (
                      <div className="w-full max-w-sm">
                        <div className="relative group" data-testid={`card-top-submission-${topSubmissions[0].id}`}>
                          {/* Rank Badge */}
                          <div className="absolute -top-3 -left-3 z-10 h-12 w-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-4 border-gray-900 flex items-center justify-center text-lg font-bold text-gray-900 glow">
                            1
                          </div>

                          <div className="rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-primary/20 hover:-translate-y-1">
                            <div className="relative overflow-hidden aspect-square" onClick={(e) => handleCardClick(e, topSubmissions[0].id)}>
                              <img
                                src={topSubmissions[0].mediaUrl}
                                alt={topSubmissions[0].title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              
                              {/* Dark Overlay */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                                {/* Action Buttons - Top Right */}
                                <div className={`absolute top-2 sm:top-3 right-2 sm:right-3 flex flex-col items-center gap-1 sm:gap-2 ${activeCardId === topSubmissions[0].id ? 'opacity-100 lg:opacity-0' : 'opacity-0'} lg:group-hover:opacity-100 transition-opacity duration-300`}>
                                  {/* Vote Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVote(topSubmissions[0].id);
                                    }}
                                    className={`p-2 rounded-full backdrop-blur-sm transition-all duration-300 ${
                                      topSubmissions[0].hasVoted 
                                        ? 'bg-primary/90 text-white' 
                                        : 'bg-black/50 text-white hover:bg-primary/90'
                                    }`}
                                    data-testid={`button-vote-${topSubmissions[0].id}`}
                                  >
                                    <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${topSubmissions[0].hasVoted ? 'fill-current' : ''}`} />
                                  </button>

                                  {/* Share Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShare(topSubmissions[0]);
                                    }}
                                    className="p-2 rounded-full bg-black/50 text-white hover:bg-primary/90 backdrop-blur-sm transition-all duration-300"
                                    data-testid={`button-share-${topSubmissions[0].id}`}
                                  >
                                    <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </button>

                                  {/* Expand Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSubmission(topSubmissions[0]);
                                      setIsLightboxOpen(true);
                                    }}
                                    className="p-2 rounded-full bg-black/50 text-white hover:bg-primary/90 backdrop-blur-sm transition-all duration-300"
                                    data-testid={`button-expand-${topSubmissions[0].id}`}
                                  >
                                    <Expand className="h-3 w-3 sm:h-4 sm:w-4" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Bottom Info Overlay */}
                              <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 sm:p-4 ${activeCardId === topSubmissions[0].id ? 'opacity-100 lg:opacity-0' : 'opacity-0'} lg:group-hover:opacity-100 transition-all duration-300 transform translate-y-0 lg:translate-y-2 lg:group-hover:translate-y-0`}>
                                <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                                  {topSubmissions[0].title}
                                </h3>
                                <p className="text-xs sm:text-sm text-white/80 mb-2">
                                  by {topSubmissions[0].user?.username || 'Unknown'}
                                </p>
                                
                                <div className="flex items-center gap-1 text-white/80">
                                  <Heart className={`h-3 w-3 ${topSubmissions[0].hasVoted ? 'fill-primary text-primary' : ''}`} />
                                  <span className="text-sm">{topSubmissions[0].voteCount} votes</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Places 2-5 - Bottom row */}
                    {topSubmissions.length > 1 && (
                      <div className="w-full max-w-5xl">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-center">
                          {topSubmissions.slice(1, 5).map((submission: any, index: number) => {
                            const placeNumber = index + 2;
                            const badgeColor = 
                              placeNumber === 2 ? 'from-gray-300 to-gray-500' :
                              placeNumber === 3 ? 'from-orange-400 to-orange-600' :
                              'from-blue-400 to-blue-600';

                            return (
                              <div key={submission.id} className="w-full">
                                <div className="relative group" data-testid={`card-top-submission-${submission.id}`}>
                                  {/* Rank Badge */}
                                  <div className="absolute -top-3 -left-3 z-10 h-10 w-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 border-3 border-gray-900 flex items-center justify-center text-sm font-bold text-gray-900 glow">
                                    {placeNumber}
                                  </div>

                                  <div className="rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-primary/20 hover:-translate-y-1">
                                    <div className="relative overflow-hidden aspect-square" onClick={(e) => handleCardClick(e, submission.id)}>
                                      <img
                                        src={submission.mediaUrl}
                                        alt={submission.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                      />
                                      
                                      {/* Dark Overlay */}
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                                        {/* Action Buttons - Top Right */}
                                        <div className={`absolute top-2 right-2 flex flex-col items-center gap-1 ${activeCardId === submission.id ? 'opacity-100 lg:opacity-0' : 'opacity-0'} lg:group-hover:opacity-100 transition-opacity duration-300`}>
                                          {/* Vote Button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleVote(submission.id);
                                            }}
                                            className={`p-1.5 rounded-full backdrop-blur-sm transition-all duration-300 ${
                                              submission.hasVoted 
                                                ? 'bg-primary/90 text-white' 
                                                : 'bg-black/50 text-white hover:bg-primary/90'
                                            }`}
                                            data-testid={`button-vote-${submission.id}`}
                                          >
                                            <Heart className={`h-3 w-3 ${submission.hasVoted ? 'fill-current' : ''}`} />
                                          </button>

                                          {/* Share Button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleShare(submission);
                                            }}
                                            className="p-1.5 rounded-full bg-black/50 text-white hover:bg-primary/90 backdrop-blur-sm transition-all duration-300"
                                            data-testid={`button-share-${submission.id}`}
                                          >
                                            <Share2 className="h-3 w-3" />
                                          </button>

                                          {/* Expand Button */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSelectedSubmission(submission);
                                              setIsLightboxOpen(true);
                                            }}
                                            className="p-1.5 rounded-full bg-black/50 text-white hover:bg-primary/90 backdrop-blur-sm transition-all duration-300"
                                            data-testid={`button-expand-${submission.id}`}
                                          >
                                            <Expand className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {/* Bottom Info Overlay */}
                                      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-2 sm:p-3 ${activeCardId === submission.id ? 'opacity-100 lg:opacity-0' : 'opacity-0'} lg:group-hover:opacity-100 transition-all duration-300 transform translate-y-0 lg:translate-y-2 lg:group-hover:translate-y-0`}>
                                        <h3 className="text-sm font-bold text-white mb-1 truncate">
                                          {submission.title}
                                        </h3>
                                        <p className="text-xs text-white/80 mb-1 truncate">
                                          by {submission.user?.username || 'Unknown'}
                                        </p>
                                        
                                        <div className="flex items-center gap-1 text-white/80">
                                          <Heart className={`h-2.5 w-2.5 ${submission.hasVoted ? 'fill-primary text-primary' : ''}`} />
                                          <span className="text-xs">{submission.voteCount} votes</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Filter Toolbar - Applies only to All Submissions */}
              {!submissionsLoading && allSubmissions.length > 0 && (
                <div 
                  ref={toolbarRef}
                  className={`mt-8 rounded-lg bg-background-dark/80 px-4 py-4 backdrop-blur-sm glow-border transition-all duration-200 ${
                    isToolbarSticky ? 'sticky top-[100px] z-40' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative w-full sm:w-auto">
                        <select 
                          value={
                            sortBy === "votes" ? "Most Voted" : 
                            sortBy === "recent" ? "Newest" : 
                            sortBy === "oldest" ? "Oldest" : "Most Voted"
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === "Most Voted") setSortBy("votes");
                            else if (value === "Newest") setSortBy("recent");
                            else if (value === "Oldest") setSortBy("oldest");
                          }}
                          className="w-full appearance-none rounded-lg border-white/30 py-2 pl-3 pr-8 text-sm text-white placeholder-white/60 transition-all focus:border-white focus:ring-1 focus:ring-white sm:w-auto"
                          style={{ backgroundColor: '#171121' }}
                        >
                          <option style={{ backgroundColor: '#171121', color: 'white' }}>Most Voted</option>
                          <option style={{ backgroundColor: '#171121', color: 'white' }}>Newest</option>
                          <option style={{ backgroundColor: '#171121', color: 'white' }}>Oldest</option>
                        </select>
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60">
                          <ChevronDown className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                    <div className="flex w-full items-center gap-4 sm:w-auto">
                      <div className="relative w-full flex-1 max-w-xs sm:w-auto">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                          <Search className="h-5 w-5" />
                        </span>
                        <input 
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full rounded-lg border-white/30 py-2 pl-10 pr-4 text-sm text-white placeholder-white/60 transition-all focus:border-white focus:ring-1 focus:ring-white" 
                          placeholder="Search entries..." 
                          type="search"
                          data-testid="input-search"
                          style={{ backgroundColor: '#171121' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* All Submissions */}
              {allSubmissions.length > 0 && (
                <div className="mt-8">
                  <h3 className="mb-6 text-2xl font-bold text-white">All Submissions</h3>
                  <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
                    {allSubmissions.map((submission: any) => (
                      <div
                        key={submission.id}
                        className="group break-inside-avoid mb-6"
                        data-testid={`card-submission-${submission.id}`}
                      >
                        <div className="rounded-xl overflow-hidden shadow-lg transition-all duration-300 hover:shadow-primary/20 hover:-translate-y-1">
                          <div className="relative overflow-hidden min-h-[240px]" onClick={(e) => handleCardClick(e, submission.id)}>
                            <img
                              src={submission.mediaUrl}
                              alt={submission.title}
                              className="w-full h-auto min-h-[240px] object-cover transition-transform duration-500 group-hover:scale-110"
                            />
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                              {/* Action Buttons */}
                              <div className={`absolute top-2 sm:top-3 right-2 sm:right-3 flex flex-col items-center gap-1 sm:gap-2 ${activeCardId === submission.id ? 'opacity-100 lg:opacity-0' : 'opacity-0'} lg:group-hover:opacity-100 transition-opacity duration-300`}>
                                {/* Vote Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVote(submission.id);
                                  }}
                                  className={`p-2 rounded-full transition-all duration-300 ${
                                    submission.hasVoted 
                                      ? 'bg-primary text-white shadow-lg' 
                                      : 'bg-black/50 text-white hover:bg-primary/90 backdrop-blur-sm'
                                  }`}
                                  data-testid={`button-vote-${submission.id}`}
                                >
                                  <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${submission.hasVoted ? 'fill-current' : ''}`} />
                                </button>
                                
                                {/* Share Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShare(submission);
                                  }}
                                  className="p-2 rounded-full bg-black/50 text-white hover:bg-primary/90 backdrop-blur-sm transition-all duration-300"
                                  data-testid={`button-share-${submission.id}`}
                                >
                                  <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                                
                                {/* Expand Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSubmission(submission);
                                    setIsLightboxOpen(true);
                                  }}
                                  className="p-2 rounded-full bg-black/50 text-white hover:bg-primary/90 backdrop-blur-sm transition-all duration-300"
                                  data-testid={`button-expand-${submission.id}`}
                                >
                                  <Expand className="h-3 w-3 sm:h-4 sm:w-4" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Bottom Info Overlay */}
                            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 sm:p-4 ${activeCardId === submission.id ? 'opacity-100 lg:opacity-0' : 'opacity-0'} lg:group-hover:opacity-100 transition-all duration-300 transform translate-y-0 lg:translate-y-2 lg:group-hover:translate-y-0`}>
                              <h3 className="text-base font-semibold text-white mb-1">
                                {submission.title}
                              </h3>
                              <p className="text-xs sm:text-sm text-white/80 mb-2">
                                by {submission.user?.username || 'Unknown'}
                              </p>
                              
                              <div className="flex items-center gap-1 text-white/80">
                                <Heart className={`h-3 w-3 ${submission.hasVoted ? 'fill-primary text-primary' : ''}`} />
                                <span className="text-sm">{submission.voteCount} votes</span>
                              </div>
                            </div>
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
        onClose={() => setIsLightboxOpen(false)}
        submission={selectedSubmission}
        onVote={(submissionId: string) => handleVote(submissionId)}
        onShare={() => selectedSubmission && handleShare(selectedSubmission)}
      />

      <ContestRulesCard
        isOpen={showRules}
        contest={contest}
        onClose={() => setShowRules(false)}
      />

      <UploadWizardModal
        isOpen={showUploadWizard}
        onClose={() => setShowUploadWizard(false)}
        preselectedContestId={contest.id}
      />

      {/* Prize Distribution Modal */}
      <Dialog open={showAllPrizesModal} onOpenChange={setShowAllPrizesModal}>
        <DialogContent className="bg-gradient-to-br from-slate-900/95 to-purple-900/95 border-primary/30 text-white max-w-md max-h-[80vh] overflow-hidden backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-white flex items-center justify-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-400" />
              Prize Distribution
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh] pr-2 space-y-2">
            {contest?.prizeDistribution?.map((prize: any, index: number) => {
              const placeNumber = index + 1;
              const badgeColor = 
                placeNumber === 1 ? 'from-yellow-400 to-yellow-600' :
                placeNumber === 2 ? 'from-gray-300 to-gray-500' :
                placeNumber === 3 ? 'from-orange-400 to-orange-600' :
                placeNumber === 4 ? 'from-blue-400 to-blue-600' :
                placeNumber === 5 ? 'from-green-400 to-green-600' :
                'from-purple-400 to-purple-600';

              return (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${badgeColor} flex items-center justify-center`}>
                      <span className="text-sm font-bold text-black">
                        {placeNumber === 1 ? '1st' :
                         placeNumber === 2 ? '2nd' :
                         placeNumber === 3 ? '3rd' :
                         `${placeNumber}th`}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-white/80">Place</span>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">
                      {typeof prize.value === 'number' 
                        ? prize.value.toLocaleString()
                        : Math.floor(contest.prizeGlory * (prize.percentage / 100)).toLocaleString()
                      }
                    </p>
                    <p className="text-xs text-primary font-medium">GLORY</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-primary/20 text-center">
            <p className="text-sm text-gray-300">
              Total Pool: <span className="font-bold text-white">{contest?.prizeGlory?.toLocaleString()}</span> GLORY
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

