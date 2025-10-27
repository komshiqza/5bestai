import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmissionCard } from "@/components/submission-card";
import { ContestLightboxModal } from "@/components/ContestLightboxModal";
import { Image as ImageIcon, Play, Search, Loader2 } from "lucide-react";
import { useAuth, isAuthenticated, isApproved } from "@/lib/auth";
import { useState, useEffect, useCallback, useMemo } from "react";
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
  const [searchTag, setSearchTag] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Clear submissions cache on mount to ensure fresh data
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
    queryClient.removeQueries({ queryKey: ["/api/submissions"] });
    setAllSubmissions([]);
    setPage(1);
  }, [queryClient]);

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
        limit: '12'
      });
      if (searchTag) {
        params.append('tag', searchTag);
      }
      const response = await fetch(`/api/submissions?${params}`);
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    },
  });

  // Update submissions when new data arrives
  useEffect(() => {
    if (submissions) {
      if (page === 1) {
        setAllSubmissions(submissions);
      } else if (submissions.length > 0) {
        setAllSubmissions(prev => [...prev, ...submissions]);
      }
      // hasMore is true only if we got a full page (12 items)
      setHasMore(submissions.length === 12);
      setIsLoadingMore(false);
    }
  }, [submissions, page]);

  // Infinite scroll logic
  const handleScroll = useCallback(() => {
    if (isLoadingMore || !hasMore || allSubmissions.length < 12) return;
    
    const scrollTop = document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = document.documentElement.clientHeight;
    
    if (scrollTop + clientHeight >= scrollHeight - 500) {
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

    voteMutation.mutate(submissionId);
  };

  const handleOpenSubmissionModal = (submission: any) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };

  const handleCloseSubmissionModal = () => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      setPage(prev => prev + 1);
    }
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
            
            {/* Loading indicator for infinite scroll */}
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
