import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Image, Share2, Expand, Trash2, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SubmissionWithUser } from "@shared/schema";
import { GlassButton } from "@/components/ui/glass-button";

export default function MySubmissions() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/submissions"] });
      toast({
        title: "Submission deleted",
        description: "Your submission has been permanently deleted.",
      });
    },
    onError: (error: any) => {
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
    // Open in new window/tab
    window.open(`/submission/${submission.id}`, '_blank');
  };

  const handleDelete = (submissionId: string) => {
    if (confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      deleteSubmissionMutation.mutate(submissionId);
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

  const filteredSubmissions = statusFilter === "all" 
    ? allSubmissions 
    : allSubmissions?.filter(s => s.status === statusFilter);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/20 to-gray-950">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent" data-testid="heading-my-submissions">
            My Gallery
          </h1>
          <p className="text-gray-400" data-testid="text-gallery-description">
            View all your uploaded creative works
          </p>
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-8">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <div className="relative overflow-hidden rounded-t-2xl aspect-square">
                  <img
                    src={submission.type === "video" ? submission.thumbnailUrl || submission.mediaUrl : submission.mediaUrl}
                    alt={submission.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                    <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex flex-row items-center gap-1 sm:gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300">
                      <GlassButton 
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full"
                        onClick={() => handleShare(submission)}
                        data-testid={`button-share-${submission.id}`}
                      >
                        <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </GlassButton>
                      <GlassButton 
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-full"
                        onClick={() => handleExpand(submission)}
                        data-testid={`button-expand-${submission.id}`}
                      >
                        <Expand className="h-3 w-3 sm:h-4 sm:w-4" />
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
                </div>

                <CardContent className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-1 text-white drop-shadow-lg">
                    {submission.title}
                  </h3>

                  <div className="flex items-center justify-between">
                    <div className="text-gray-200 text-xs truncate">
                      {submission.contest?.title || 'No contest'}
                    </div>

                    <GlassButton 
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full bg-red-500/20 hover:bg-red-500/40"
                      onClick={() => handleDelete(submission.id)}
                      disabled={deleteSubmissionMutation.isPending}
                      data-testid={`button-delete-${submission.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </GlassButton>
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
    </div>
  );
}
