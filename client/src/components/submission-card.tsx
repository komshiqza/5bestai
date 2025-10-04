import { Heart, User, Trophy, Play, Eye } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import { useAuth, isAuthenticated, isApproved } from "../lib/auth";
import { useToast } from "../hooks/use-toast";
import { useState } from "react";

interface SubmissionCardProps {
  submission: {
    id: string;
    title: string;
    type: "image" | "video";
    mediaUrl: string;
    thumbnailUrl?: string;
    votesCount: number;
    user: {
      id: string;
      username: string;
    };
    contest: {
      id: string;
      title: string;
    };
  };
  showVoting?: boolean;
  rank?: number;
  className?: string;
}

export function SubmissionCard({
  submission,
  showVoting = true,
  rank,
  className = "",
}: SubmissionCardProps) {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasVoted, setHasVoted] = useState(false);

  const voteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/votes", {
        submissionId: submission.id,
      });
      return response.json();
    },
    onSuccess: () => {
      setHasVoted(true);
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

  const handleVote = () => {
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

    if (user.id === submission.user.id) {
      toast({
        title: "Cannot vote",
        description: "You cannot vote on your own submission.",
        variant: "destructive",
      });
      return;
    }

    voteMutation.mutate();
  };

  const displayUrl =
    submission.type === "video"
      ? submission.thumbnailUrl || submission.mediaUrl
      : submission.mediaUrl;

  return (
    <Card
      className={`group relative overflow-hidden hover:border-primary/50 transition-all duration-300 ${className}`}
      data-testid={`submission-card-${submission.id}`}
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={displayUrl}
          alt={submission.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Type badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="text-xs">
            {submission.type === "image" ? (
              <>
                <Eye className="w-3 h-3 mr-1" />
                Image
              </>
            ) : (
              <>
                <Play className="w-3 h-3 mr-1" />
                Video
              </>
            )}
          </Badge>
        </div>

        {/* Rank badge */}
        {rank && (
          <div className="absolute top-3 left-3">
            <Badge
              className="gradient-glory text-xs font-bold text-white"
              data-testid={`rank-badge-${rank}`}
            >
              #{rank}
            </Badge>
          </div>
        )}

        {/* Video play overlay */}
        {submission.type === "video" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center">
              <Play className="w-6 h-6 text-white ml-1" />
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <h3
          className="font-semibold text-lg mb-2 line-clamp-1"
          data-testid={`submission-title-${submission.id}`}
        >
          {submission.title}
        </h3>

        <div className="flex items-center justify-between text-sm mb-3">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <User className="w-3 h-3" />
            <span data-testid={`submission-author-${submission.id}`}>
              @{submission.user.username}
            </span>
          </div>
        </div>

        {showVoting && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-muted-foreground text-xs">
              <Trophy className="w-3 h-3" />
              <span>{submission.contest.title}</span>
            </div>

            <Button
              variant={hasVoted ? "default" : "outline"}
              size="sm"
              onClick={handleVote}
              disabled={voteMutation.isPending || hasVoted}
              className={`flex items-center space-x-2 transition-all ${hasVoted ? "gradient-glory text-white" : ""}`}
              data-testid={`vote-button-${submission.id}`}
            >
              <Heart className={`w-4 h-4 ${hasVoted ? "fill-current" : ""}`} />
              <span
                className="font-semibold"
                data-testid={`votes-count-${submission.id}`}
              >
                {submission.votesCount}
              </span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
