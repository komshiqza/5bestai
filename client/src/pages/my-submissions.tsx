import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SubmissionWithUser } from "@shared/schema";
import { SubmissionCard } from "@/components/submission-card";

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
              <div key={submission.id} className="[&_>div>div:first-child]:!aspect-video [&_>div>div:first-child]:!h-auto">
                <SubmissionCard
                  submission={{
                    ...submission,
                    type: submission.type as "image" | "video",
                    thumbnailUrl: submission.thumbnailUrl ?? undefined
                  }}
                  showVoting={false}
                />
              </div>
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
