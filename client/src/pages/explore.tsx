import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmissionCard } from "@/components/submission-card";
import { ContestLightboxModal } from "@/components/ContestLightboxModal";
import { PromptPaymentModal } from "@/components/PromptPaymentModal";
import { Image as ImageIcon, Play, Search, Loader2 } from "lucide-react";
import { useAuth, isAuthenticated, isApproved } from "@/lib/auth";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";

function ExploreContent() {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [searchTag, setSearchTag] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const prevSubmissionsRef = useRef<any[]>([]);

  // Clear submissions cache on mount to ensure fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
    queryClient.removeQueries({ queryKey: ["/api/submissions"] });
    setAllSubmissions([]);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Reset pagination when search tag changes
  useEffect(() => {
    setAllSubmissions([]);
    setPage(1);
    setHasMore(true);
  }, [searchTag]);

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["/api/submissions", page, searchTag],
    queryFn: async () => {
      const params = new URLSearchParams({
        status: 'approved',
        page: page.toString(),
        limit: '30'
      });
      if (searchTag) {
        params.append('tag', searchTag);
      }
      const response = await fetch(`/api/submissions?${params}`);
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    },
    staleTime: 30000, // Cache for 30 seconds to prevent unnecessary re-fetches
  });

  // Update submissions when new data arrives
  useEffect(() => {
    if (!submissions) return;
    
    // Check if data actually changed by comparing IDs
    const currentIds = submissions.map((s: any) => s.id).join(',');
    const prevIds = prevSubmissionsRef.current.map((s: any) => s.id).join(',');
    
    if (currentIds === prevIds && submissions.length === prevSubmissionsRef.current.length) {
      return; // Data hasn't actually changed
    }
    
    // Only update if submissions actually changed
    if (page === 1) {
      setAllSubmissions(submissions);
    } else if (submissions.length > 0) {
      setAllSubmissions(prev => {
        // Check if this data is already in the array to prevent duplicates
        const existingIds = new Set(prev.map(s => s.id));
        const newSubmissions = submissions.filter((s: any) => !existingIds.has(s.id));
        if (newSubmissions.length === 0) return prev;
        return [...prev, ...newSubmissions];
      });
    }
    
    // hasMore is true only if we got a full page (30 items)
    setHasMore(submissions.length === 30);
    setIsLoadingMore(false);
    
    // Update ref with current data
    prevSubmissionsRef.current = submissions;
  }, [submissions, page]);

  // Load More button handler (no infinite scroll)
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setPage(prev => prev + 1);
  }, [isLoadingMore, hasMore]);

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

    voteMutation.mutate(submissionId);
  };

  // Buy prompt mutation for modal
  const buyPromptMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const response = await apiRequest("POST", `/api/prompts/purchase/${submissionId}`, {});
      return response.json();
    },
    onSuccess: async (data, submissionId) => {
      // Optimistically update selected submission immediately
      if (selectedSubmission && selectedSubmission.id === submissionId) {
        const updatedSubmission = {
          ...selectedSubmission,
          hasPurchasedPrompt: true
        };
        setSelectedSubmission(updatedSubmission);
      }
      
      // Invalidate ALL submissions queries across ALL pages using wildcard
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey[0] === "/api/submissions";
        }
      });
      
      // Also invalidate purchased prompts and user data
      queryClient.invalidateQueries({ queryKey: ["/api/prompts/purchased/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      
      toast({
        title: "Prompt purchased!",
        description: "The prompt is now visible to you.",
      });
    },
    onError: (error: any) => {
      // If already purchased, treat as success and update UI
      if (error.message && error.message.includes("already purchased")) {
        if (selectedSubmission && selectedSubmission.id) {
          setSelectedSubmission({
            ...selectedSubmission,
            hasPurchasedPrompt: true
          });
        }
        
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            return query.queryKey[0] === "/api/submissions";
          }
        });
        
        toast({
          title: "Prompt already purchased",
          description: "The prompt is now visible to you.",
        });
      } else {
        toast({
          title: "Purchase failed",
          description: error.message || "Failed to purchase prompt. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Handle buying prompt from modal - opens payment selection modal
  const handleBuyPromptFromModal = (submissionId: string) => {
    if (!isAuthenticated(user)) {
      toast({
        title: "Authentication required",
        description: "Please log in to purchase prompts.",
        variant: "destructive",
      });
      return;
    }

    if (!isApproved(user)) {
      toast({
        title: "Account approval required",
        description: "Your account must be approved to make purchases.",
        variant: "destructive",
      });
      return;
    }

    // Open payment modal instead of directly purchasing
    setIsPaymentModalOpen(true);
  };

  // Handle successful payment
  const handlePaymentSuccess = () => {
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        return query.queryKey[0] === "/api/submissions";
      }
    });
    queryClient.invalidateQueries({ queryKey: ["/api/prompts/purchased/submissions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    
    // Update selected submission
    if (selectedSubmission) {
      setSelectedSubmission({
        ...selectedSubmission,
        hasPurchasedPrompt: true
      });
    }
    
    // Close payment modal
    setIsPaymentModalOpen(false);
  };

  const handleOpenSubmissionModal = (submission: any) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };

  const handleCloseSubmissionModal = () => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTag(searchInput.trim());
  };

  const { isCollapsed } = useSidebar();

  return (
    <div className={`min-h-screen transition-all duration-300 ${isCollapsed ? 'md:ml-[90px]' : 'md:ml-64'}`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by tag (e.g., nature, portrait, abstract...)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
              data-testid="input-search-tag"
            />
          </div>
          <Button type="submit" data-testid="button-search">
            Search
          </Button>
          {searchTag && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearchInput('');
                setSearchTag('');
              }}
              data-testid="button-clear-search"
            >
              Clear
            </Button>
          )}
        </form>

        {/* Submissions Grid */}
        {allSubmissions.length > 0 ? (
          <>
            <div className="masonry-grid" data-testid="submissions-grid">
              {allSubmissions.map((submission: any) => (
                <SubmissionCard 
                  key={submission.id}
                  submission={submission}
                  showVoting={true}
                  onExpand={() => handleOpenSubmissionModal(submission)}
                />
              ))}
            </div>
            
            {/* Load More Button */}
            {hasMore && !isLoadingMore && (
              <div className="mt-8 text-center">
                <Button
                  onClick={handleLoadMore}
                  variant="outline"
                  size="lg"
                  className="min-w-[200px]"
                >
                  Load More
                </Button>
              </div>
            )}
            
            {/* Loading indicator */}
            {isLoadingMore && (
              <div className="mt-8 text-center">
                <div className="inline-flex items-center px-4 py-2 text-sm text-muted-foreground">
                  <Loader2 className="animate-spin rounded-full h-4 w-4 mr-2" />
                  Loading more submissions...
                </div>
              </div>
            )}
            
            {/* End of content indicator */}
            {!hasMore && allSubmissions.length > 0 && (
              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchTag ? "No more results" : "You've reached the end! 🎉"}
                </p>
              </div>
            )}
          </>
        ) : isLoading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center px-4 py-2 text-sm text-muted-foreground">
              <Loader2 className="animate-spin rounded-full h-4 w-4 mr-2" />
              Loading submissions...
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {searchTag ? `No submissions found for "${searchTag}"` : "No submissions available"}
            </p>
          </div>
        )}
      </div>

      {/* Submission Lightbox Modal */}
      {selectedSubmission && (
        <ContestLightboxModal
          submission={selectedSubmission}
          isOpen={isModalOpen}
          onClose={handleCloseSubmissionModal}
          onVote={handleVoteFromModal}
          onBuyPrompt={handleBuyPromptFromModal}
        />
      )}

      {/* Payment Selection Modal */}
      {selectedSubmission && (
        <PromptPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          submission={selectedSubmission}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}

export default function Explore() {
  return (
    <SidebarProvider>
      <Sidebar />
      <ExploreContent />
    </SidebarProvider>
  );
}
