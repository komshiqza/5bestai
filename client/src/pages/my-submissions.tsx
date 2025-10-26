import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Image, Share2, Expand, Trash2, Play, X, User, Calendar, Pencil, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SubmissionWithUser } from "@shared/schema";
import { GlassButton } from "@/components/ui/glass-button";
import { ProEditModal } from "@/components/pro-edit/ProEditModal";

export default function MySubmissions() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithUser | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Pro Edit modal state
  const [proEditModalOpen, setProEditModalOpen] = useState(false);
  const [proEditImageUrl, setProEditImageUrl] = useState<string>("");
  const [proEditSubmissionId, setProEditSubmissionId] = useState<string | null>(null);

  // Handle browser back button and Escape key for lightbox modal
  useEffect(() => {
    if (!selectedSubmission) return;

    const modalId = Date.now();

    // Push unique history state when modal opens
    window.history.pushState({ modal: 'galleryLightbox', modalId }, '');

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Remove focus/hover state to prevent visual artifacts
        (document.activeElement as HTMLElement)?.blur();
        setSelectedSubmission(null);
      }
    };

    // Handle browser back button
    const handlePopState = () => {
      // Close modal when going back in history
      if (window.history.state?.modalId !== modalId) {
        setSelectedSubmission(null);
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [selectedSubmission]);

  // Always fetch all submissions for accurate counts
  const { data: allSubmissions, isLoading } = useQuery<SubmissionWithUser[]>({
    queryKey: ["/api/me/submissions"],
    queryFn: async () => {
      const response = await fetch(`/api/me/submissions`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    }
  });

  const deleteSubmissionMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const response = await apiRequest("DELETE", `/api/submissions/${submissionId}`);
      if (!response.ok) throw new Error("Failed to delete submission");
      return await response.json();
    },
    onMutate: async (submissionId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/me/submissions"] });
      
      // Snapshot previous value
      const previousSubmissions = queryClient.getQueryData(["/api/me/submissions"]);
      
      // Optimistically update - immediately remove from UI
      queryClient.setQueryData<SubmissionWithUser[]>(["/api/me/submissions"], (old) => 
        old?.filter(s => s.id !== submissionId) || []
      );
      
      return { previousSubmissions };
    },
    onSuccess: () => {
      // Invalidate all submissions caches to remove deleted submission everywhere
      queryClient.invalidateQueries({ queryKey: ["/api/me/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Submission deleted",
        description: "Your submission has been permanently deleted.",
      });
    },
    onError: (error: any, _variables, context) => {
      // Rollback on error
      if (context?.previousSubmissions) {
        queryClient.setQueryData(["/api/me/submissions"], context.previousSubmissions);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete submission.",
        variant: "destructive",
      });
    },
  });

  const handleShare = (submission: SubmissionWithUser) => {
    const shareUrl = `${window.location.origin}/submission/${submission.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: submission.title,
        text: `Check out this amazing submission: ${submission.title}`,
        url: shareUrl,
      }).catch(() => {
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

  const handleExpand = (submission: SubmissionWithUser) => {
    setSelectedSubmission(submission);
  };

  const handleDownload = async (submission: SubmissionWithUser) => {
    try {
      const response = await fetch(submission.mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Extract file extension from URL or use default based on type
      const urlPath = submission.mediaUrl.split('?')[0];
      const extension = urlPath.split('.').pop() || (submission.type === 'video' ? 'mp4' : 'jpg');
      a.download = `${submission.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${extension}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: "Your file is being downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (submissionId: string) => {
    if (confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      deleteSubmissionMutation.mutate(submissionId);
    }
  };

  const handleCardClick = (e: React.MouseEvent, submissionId: string) => {
    // Only toggle on mobile (below lg breakpoint)
    if (window.innerWidth < 1024) {
      e.stopPropagation();
      setActiveCardId(activeCardId === submissionId ? null : submissionId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const statusCounts = {
    all: allSubmissions?.length || 0,
    pending: allSubmissions?.filter(s => s.status === "pending").length || 0,
    approved: allSubmissions?.filter(s => s.status === "approved").length || 0,
    rejected: allSubmissions?.filter(s => s.status === "rejected").length || 0
  };

  const filteredSubmissions = (statusFilter === "all" 
    ? allSubmissions 
    : allSubmissions?.filter(s => s.status === statusFilter))?.filter(s => s.mediaUrl);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950 pb-32 md:pb-0">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent" data-testid="heading-my-submissions">
            My Gallery
          </h1>
          <p className="text-sm md:text-base text-gray-400" data-testid="text-gallery-description">
            View all your uploaded creative works
          </p>
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-6 md:mb-8">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="all" data-testid="tab-all">
              All ({statusCounts.all})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({statusCounts.pending})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Approved ({statusCounts.approved})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              Rejected ({statusCounts.rejected})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-white/5 border-white/10">
                <CardContent className="p-0">
                  <Skeleton className="w-full h-64" />
                  <div className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredSubmissions && filteredSubmissions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubmissions.map((submission) => (
              <Card
                key={submission.id}
                className="group relative overflow-hidden hover:border-primary/50 transition-all duration-300 rounded-2xl shadow-lg hover:shadow-xl"
                data-testid={`submission-card-${submission.id}`}
              >
                <div className="relative overflow-hidden rounded-t-2xl aspect-square" onClick={(e) => handleCardClick(e, submission.id)}>
                  <img
                    src={submission.type === "video" ? submission.thumbnailUrl || submission.mediaUrl : submission.mediaUrl}
                    alt={submission.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23334155" width="400" height="400"/%3E%3Ctext fill="%239ca3af" font-family="system-ui" font-size="48" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E%3Ctspan x="50%25" dy="-20"%3E' + (submission.type === 'video' ? '🎬' : '🖼️') + '%3C/tspan%3E%3Ctspan x="50%25" dy="60" font-size="16"%3EImage not available%3C/tspan%3E%3C/text%3E%3C/svg%3E';
                      target.onerror = null;
                    }}
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                    <div className={`absolute top-2 sm:top-3 right-2 sm:right-3 flex flex-row items-center gap-1 sm:gap-2 ${activeCardId === submission.id ? 'opacity-100 lg:opacity-0' : 'opacity-0'} lg:group-hover:opacity-100 transition-opacity duration-300`}>
                      <GlassButton 
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(submission);
                        }}
                        data-testid={`button-share-${submission.id}`}
                      >
                        <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </GlassButton>
                      <GlassButton 
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExpand(submission);
                        }}
                        data-testid={`button-expand-${submission.id}`}
                      >
                        <Expand className="h-3 w-3 sm:h-4 sm:w-4" />
                      </GlassButton>
                      
                      {/* Edit (Pro Edit) - only for image submissions */}
                      {submission.type === "image" && (
                        <GlassButton 
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProEditImageUrl(submission.mediaUrl);
                            setProEditSubmissionId(submission.id);
                            setProEditModalOpen(true);
                          }}
                          title="Edit"
                          data-testid={`button-edit-${submission.id}`}
                        >
                          <Pencil className="h-3 w-3 sm:h-4 sm:w-4 text-purple-300" />
                        </GlassButton>
                      )}
                      
                      {/* Download button */}
                      <GlassButton 
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(submission);
                        }}
                        title="Download"
                        data-testid={`button-download-${submission.id}`}
                      >
                        <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                      </GlassButton>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="absolute top-3 left-3 z-10">
                    {getStatusBadge(submission.status)}
                  </div>

                  {/* Video play overlay */}
                  {submission.type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                      <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white ml-1" />
                      </div>
                    </div>
                  )}

                  {/* Delete button */}
                  <div className={`absolute bottom-2 sm:bottom-3 right-2 sm:right-3 z-10 ${activeCardId === submission.id ? 'opacity-100 lg:opacity-0' : 'opacity-0'} lg:group-hover:opacity-100 transition-opacity duration-300`}>
                    <GlassButton 
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-red-500/80 hover:bg-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(submission.id);
                      }}
                      disabled={deleteSubmissionMutation.isPending}
                      data-testid={`button-delete-${submission.id}`}
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                    </GlassButton>
                  </div>
                </div>

                <CardContent className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent ${activeCardId === submission.id ? 'opacity-100 lg:opacity-0' : 'opacity-0'} lg:group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl`}>
                  <h3 className="font-semibold text-lg mb-2 line-clamp-1 text-white drop-shadow-lg">
                    {submission.title}
                  </h3>

                  <div className="text-gray-200 text-xs truncate">
                    {submission.contest?.title || submission.contestName || 'Contest deleted'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="inline-block p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl mb-4">
              <Image className="w-16 h-16 text-purple-400 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white" data-testid="text-no-submissions">
              No submissions yet
            </h3>
            <p className="text-gray-400" data-testid="text-no-submissions-description">
              {statusFilter === "all" 
                ? "Start creating and uploading your work to contests!"
                : `You don't have any ${statusFilter} submissions.`}
            </p>
          </div>
        )}
      </div>

      {/* Fullscreen Lightbox Modal */}
      {selectedSubmission && (
        <div 
          className="fixed inset-0 z-50 bg-black"
          onClick={() => setSelectedSubmission(null)}
          data-testid="lightbox-overlay"
        >
          {/* Full-screen image */}
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <img
              src={selectedSubmission.type === "video" ? selectedSubmission.thumbnailUrl || selectedSubmission.mediaUrl : selectedSubmission.mediaUrl}
              alt={selectedSubmission.title}
              className="max-w-full max-h-full object-contain"
              data-testid="lightbox-image"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Top Left - Share and Delete Icons */}
          <div className="absolute top-6 left-6 flex gap-3 z-30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare(selectedSubmission);
              }}
              className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-primary/90 transition-all duration-300 border border-white/20"
              data-testid="button-share-lightbox"
            >
              <Share2 className="h-6 w-6" />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSubmission(null);
                handleDelete(selectedSubmission.id);
              }}
              className="p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-red-500 transition-all duration-300 border border-white/20"
              data-testid="button-delete-lightbox"
            >
              <Trash2 className="h-6 w-6" />
            </button>
          </div>

          {/* Top Right - Close Icon */}
          <button
            onClick={() => setSelectedSubmission(null)}
            className="absolute top-6 right-6 p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-red-500 transition-all duration-300 border border-white/20 z-30"
            data-testid="button-close-lightbox"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Bottom Info Bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-6 z-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-2" data-testid="text-submission-title">
                {selectedSubmission.title}
              </h2>
              {selectedSubmission.description && (
                <p className="text-gray-300 text-sm mb-3" data-testid="text-submission-description">
                  {selectedSubmission.description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                    <User className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm" data-testid="text-creator-username">
                      @{selectedSubmission.user?.username || 'You'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(selectedSubmission.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Badge className={
                      selectedSubmission.status === "approved" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                      selectedSubmission.status === "pending" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                      "bg-red-500/20 text-red-400 border-red-500/30"
                    }>
                      {selectedSubmission.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pro Edit Modal */}
      <ProEditModal
        open={proEditModalOpen}
        onOpenChange={setProEditModalOpen}
        imageUrl={proEditImageUrl}
        submissionId={proEditSubmissionId || undefined}
      />
    </div>
  );
}
