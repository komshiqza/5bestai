import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Image, Video, Calendar, Award } from "lucide-react";
import type { SubmissionWithUser } from "@shared/schema";

export default function MySubmissions() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: submissions, isLoading } = useQuery<SubmissionWithUser[]>({
    queryKey: ["/api/me/submissions", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      const response = await fetch(`/api/me/submissions?${params.toString()}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    }
  });

  const statusCounts = {
    all: submissions?.length || 0,
    pending: submissions?.filter(s => s.status === "pending").length || 0,
    approved: submissions?.filter(s => s.status === "approved").length || 0,
    rejected: submissions?.filter(s => s.status === "rejected").length || 0
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30" data-testid={`badge-status-approved`}>Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30" data-testid={`badge-status-pending`}>Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30" data-testid={`badge-status-rejected`}>Rejected</Badge>;
      default:
        return <Badge data-testid={`badge-status-${status}`}>{status}</Badge>;
    }
  };

  const filteredSubmissions = statusFilter === "all" 
    ? submissions 
    : submissions?.filter(s => s.status === statusFilter);

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
                className="group bg-white/5 backdrop-blur-xl border border-white/10 hover:border-purple-500/50 transition-all duration-300 overflow-hidden"
                data-testid={`card-submission-${submission.id}`}
              >
                <CardContent className="p-0">
                  <div className="relative aspect-video bg-gradient-to-br from-purple-500/10 to-pink-500/10">
                    {submission.type === "image" ? (
                      <img
                        src={submission.mediaUrl}
                        alt={submission.title}
                        className="w-full h-full object-cover"
                        data-testid={`img-submission-${submission.id}`}
                      />
                    ) : (
                      <video
                        src={submission.mediaUrl}
                        className="w-full h-full object-cover"
                        controls
                        data-testid={`video-submission-${submission.id}`}
                      />
                    )}
                    <div className="absolute top-3 right-3 flex gap-2">
                      {getStatusBadge(submission.status)}
                      <Badge variant="outline" className="bg-black/50 backdrop-blur-sm border-white/20">
                        {submission.type === "image" ? <Image className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                      </Badge>
                    </div>
                    {submission.votesCount > 0 && (
                      <div className="absolute bottom-3 left-3">
                        <Badge className="bg-purple-500/80 backdrop-blur-sm border-purple-400/30" data-testid={`badge-votes-${submission.id}`}>
                          <Award className="w-3 h-3 mr-1" />
                          {submission.votesCount} votes
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1 text-white" data-testid={`text-title-${submission.id}`}>
                      {submission.title}
                    </h3>
                    {submission.description && (
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2" data-testid={`text-description-${submission.id}`}>
                        {submission.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      <span data-testid={`text-date-${submission.id}`}>
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {submission.contest && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <p className="text-xs text-gray-400" data-testid={`text-contest-${submission.id}`}>
                          Contest: <span className="text-purple-400">{submission.contest.title}</span>
                        </p>
                      </div>
                    )}
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
