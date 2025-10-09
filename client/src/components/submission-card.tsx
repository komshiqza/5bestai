import { Heart, User, Trophy, Play, Share2, Expand } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { GlassButton } from "./ui/glass-button";
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
  onExpand?: () => void;
}

export function SubmissionCard({
  submission,
  showVoting = true,
  rank,
  className = "",
  onExpand,
}: SubmissionCardProps) {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasVoted, setHasVoted] = useState(false);
  const [showActionsMobile, setShowActionsMobile] = useState(false);

  // Pinterest-style height variations based on submission ID
  const getCardHeight = () => {
    const variations = ['h-60', 'h-72', 'h-80', 'h-64', 'h-96', 'h-56'];
    const index = parseInt(submission.id.slice(-1), 16) % variations.length;
    return variations[index];
  };

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

  const handleShare = () => {
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

  const handleCardClick = (e: React.MouseEvent) => {
    // Only toggle on mobile (below lg breakpoint)
    if (window.innerWidth < 1024) {
      e.stopPropagation();
      setShowActionsMobile(!showActionsMobile);
    }
  };

  const displayUrl =
    submission.type === "video"
      ? submission.thumbnailUrl || submission.mediaUrl
      : submission.mediaUrl;

  return (
    <Card
      className={`group relative overflow-hidden hover:border-primary/50 transition-all duration-300 rounded-2xl shadow-lg hover:shadow-xl ${className}`}
      data-testid={`submission-card-${submission.id}`}
    >
      <div className={`relative overflow-hidden rounded-t-2xl ${getCardHeight()}`} onClick={handleCardClick}>
        <img
          src={displayUrl}
          alt={submission.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300">
          <div className={`absolute top-2 sm:top-3 right-2 sm:right-3 flex flex-row items-center gap-1 sm:gap-2 ${showActionsMobile ? 'opacity-100 lg:opacity-0' : 'opacity-0'} lg:group-hover:opacity-100 transition-opacity duration-300`}>
            <GlassButton 
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                handleVote();
              }}
              disabled={voteMutation.isPending || hasVoted}
              data-testid={`button-vote-${submission.id}`}
            >
              <Heart className={`h-3 w-3 sm:h-4 sm:w-4 ${hasVoted ? "fill-current" : ""}`} />
            </GlassButton>
            <GlassButton 
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
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
                if (onExpand) onExpand();
              }}
              data-testid={`button-expand-${submission.id}`}
            >
              <Expand className="h-3 w-3 sm:h-4 sm:w-4" />
            </GlassButton>
          </div>
        </div>

        {/* Rank badge */}
        {rank && (
          <div className="absolute top-3 left-3 z-10">
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

      <CardContent className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent ${showActionsMobile ? 'opacity-100 lg:opacity-0' : 'opacity-0'} lg:group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl`}>
        <h3
          className="font-semibold text-lg mb-2 line-clamp-1 text-white drop-shadow-lg"
          data-testid={`submission-title-${submission.id}`}
        >
          {submission.title}
        </h3>

        <div className="flex items-center justify-between text-sm mb-3">
          <div className="flex items-center space-x-2 text-gray-200">
            <User className="w-3 h-3" />
            <span data-testid={`submission-author-${submission.id}`}>
              @{submission.user.username}
            </span>
          </div>
        </div>

        {showVoting && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-gray-200 text-xs">
              <Trophy className="w-3 h-3" />
              <span className="truncate max-w-24">{submission.contest.title}</span>
            </div>

            <div className="flex items-center space-x-2 text-gray-200 text-xs bg-black/30 rounded-full px-2 py-1">
              <Heart className="w-3 h-3" />
              <span
                className="font-semibold"
                data-testid={`votes-count-${submission.id}`}
              >
                {submission.votesCount}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
