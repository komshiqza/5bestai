import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmissionCard } from "@/components/submission-card";
import { ContestLightboxModal } from "@/components/ContestLightboxModal";
import { GlassButton } from "@/components/GlassButton";
import { Trophy, Upload, ArrowRight, Users, Image as ImageIcon, Clock, Play } from "lucide-react";
import { useAuth, isAuthenticated, isApproved } from "@/lib/auth";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'images' | 'videos'>('all');

  const { data: contests = [] } = useQuery({
    queryKey: ["/api/contests", { status: "active" }],
    queryFn: async () => {
      const response = await fetch("/api/contests?status=active");
      if (!response.ok) throw new Error("Failed to fetch contests");
      return response.json();
    },
  });

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["/api/submissions", page],
    queryFn: async () => {
      const response = await fetch(`/api/submissions?status=approved&page=${page}&limit=8`);
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    },
  });

  // Update submissions when new data arrives
  useEffect(() => {
    if (submissions && submissions.length > 0) {
      if (page === 1) {
        setAllSubmissions(submissions);
      } else {
        setAllSubmissions(prev => [...prev, ...submissions]);
      }
      setHasMore(submissions.length === 8); // If we got less than 8, no more pages
      setIsLoadingMore(false);
    } else if (submissions && submissions.length === 0 && page > 1) {
      // No more submissions available
      setHasMore(false);
      setIsLoadingMore(false);
    }
  }, [submissions, page]);

  // Infinite scroll logic
  const handleScroll = useCallback(() => {
    if (isLoadingMore || !hasMore || allSubmissions.length < 8) return; // Don't scroll if less than 8 items
    
    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    
    if (scrollTop + clientHeight >= scrollHeight - 500) { // Reduced threshold to 500px
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
    }
  }, [isLoadingMore, hasMore, allSubmissions.length]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Vote mutation for modal
  const voteMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const response = await apiRequest("POST", "/api/votes", {
        submissionId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Vote recorded!",
        description: "Your vote has been counted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to vote. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle voting from modal
  const handleVoteFromModal = (submissionId: string) => {
    if (!isAuthenticated(user)) {
      toast({
        title: "Authentication required",
        description: "Please log in to vote on submissions.",
        variant: "destructive",
      });
      return;
    }

    if (!isApproved(user)) {
      toast({
        title: "Account approval required",
        description: "Your account must be approved to vote.",
        variant: "destructive",
      });
      return;
    }

    if (user.id === selectedSubmission?.user?.id) {
      toast({
        title: "Cannot vote",
        description: "You cannot vote on your own submission.",
        variant: "destructive",
      });
      return;
    }

    voteMutation.mutate(submissionId);
  };

  // Handle sharing from modal
  const handleShareFromModal = () => {
    if (selectedSubmission) {
      const shareUrl = `${window.location.origin}/submission/${selectedSubmission.id}`;
      
      if (navigator.share) {
        navigator.share({
          title: selectedSubmission.title,
          text: `Check out this amazing submission: ${selectedSubmission.title}`,
          url: shareUrl,
        }).catch((error) => {
          console.log('Error sharing:', error);
          fallbackShare(shareUrl);
        });
      } else {
        fallbackShare(shareUrl);
      }
    }
  };

  // Fallback share functionality
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

  // Handle opening submission modal
  const handleOpenSubmissionModal = (submission: any) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };

  // Handle closing submission modal
  const handleCloseSubmissionModal = () => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
  };

  const featuredContest = contests[0];

  // Filter submissions by media type (always sorted by newest)
  const filteredSubmissions = useMemo(() => {
    let filtered = [...allSubmissions];

    // Apply media filter
    if (mediaFilter === 'images') {
      filtered = filtered.filter((sub: any) => 
        sub.mediaUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      );
    } else if (mediaFilter === 'videos') {
      filtered = filtered.filter((sub: any) => 
        sub.mediaUrl?.match(/\.(mp4|webm|mov)$/i)
      );
    }

    // Always sort by newest (already sorted from API, but ensure consistency)
    filtered.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return filtered;
  }, [allSubmissions, mediaFilter]);

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
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 leading-tight gradient-text" data-testid="hero-title">
              Compete, Create, <br/>
              Win GLORY
            </h1>
            <p className="text-xl text-muted-foreground mb-8" data-testid="hero-description">
              Join creative contests, showcase your talent, and win rewards. Top 5 submissions win GLORY rewards.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/contests" data-testid="hero-button-contests">
                <GlassButton className="text-lg px-8 py-3">
                  Browse Contests
                </GlassButton>
              </Link>
              {isAuthenticated(user) ? (
                <Link href="/upload" data-testid="hero-button-upload">
                  <GlassButton className="text-lg px-8 py-3">
                    Submit Your Art
                  </GlassButton>
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
            
            {/* Media Type Filter */}
            <div className="flex items-center space-x-2">
              <Button 
                variant={mediaFilter === 'all' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setMediaFilter('all')}
                data-testid="filter-all"
              >
                All
              </Button>
              <Button 
                variant={mediaFilter === 'images' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setMediaFilter('images')}
                data-testid="filter-images"
              >
                <ImageIcon className="w-4 h-4 mr-1" />
                Images
              </Button>
              <Button 
                variant={mediaFilter === 'videos' ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => setMediaFilter('videos')}
                data-testid="filter-videos"
              >
                <Play className="w-4 h-4 mr-1" />
                Videos
              </Button>
            </div>
          </div>

          {filteredSubmissions.length > 0 ? (
            <>
              <div className="masonry-grid" data-testid="submissions-grid">
                {filteredSubmissions.map((submission: any) => (
                  <SubmissionCard 
                    key={submission.id}
                    submission={submission}
                    showVoting={true}
                    onExpand={() => handleOpenSubmissionModal(submission)}
                  />
                ))}
              </div>
              
              {/* Loading indicator for infinite scroll */}
              {isLoadingMore && (
                <div className="mt-8 text-center">
                  <div className="inline-flex items-center px-4 py-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                    Loading more submissions...
                  </div>
                </div>
              )}
              
              {/* End of content indicator */}
              {!hasMore && filteredSubmissions.length > 0 && allSubmissions.length < 8 && (
                <div className="mt-8 text-center">
                  <p className="text-sm text-muted-foreground">All submissions loaded 📚</p>
                </div>
              )}
              
              {!hasMore && filteredSubmissions.length > 0 && allSubmissions.length >= 8 && (
                <div className="mt-8 text-center">
                  <p className="text-sm text-muted-foreground">You've reached the end! 🎉</p>
                </div>
              )}
            </>
          ) : isLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center px-4 py-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                Loading submissions...
              </div>
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
                  <GlassButton>
                    Submit Your Art
                    <Upload className="ml-2 w-4 h-4" />
                  </GlassButton>
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Submission Lightbox Modal */}
      {isModalOpen && selectedSubmission && (
        <ContestLightboxModal
          isOpen={isModalOpen}
          submission={selectedSubmission}
          onClose={handleCloseSubmissionModal}
          onVote={handleVoteFromModal}
          onShare={handleShareFromModal}
        />
      )}
    </div>
  );
}
