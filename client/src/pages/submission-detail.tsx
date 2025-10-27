import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, ArrowLeft, Share2, Trophy, User, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { ProEditModal } from "@/components/pro-edit/ProEditModal";
import { BlurredPrompt } from "@/components/BlurredPrompt";
import { PromptPurchaseModal } from "@/components/PromptPurchaseModal";

export default function SubmissionDetailPage() {
  const [match, params] = useRoute("/submission/:id");
  const submissionId = params?.id || "";
  const { data: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [proEditModalOpen, setProEditModalOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);

  // Fetch submission
  const { data: submission, isLoading } = useQuery({
    queryKey: ["/api/submissions", submissionId],
    enabled: !!submissionId,
    queryFn: async () => {
      const response = await fetch(`/api/submissions/${submissionId}`, {
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to fetch submission");
      return response.json();
    }
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/votes", { 
        submissionId: submission.id 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions", submissionId] });
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

  const handleVote = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to vote",
        variant: "destructive"
      });
      return;
    }
    voteMutation.mutate();
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    
    if (navigator.share) {
      navigator.share({
        title: submission.title,
        text: `Check out ${submission.title} by ${submission.user?.username || 'Unknown'}`,
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
        description: "Submission link copied to clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Error",
        description: "Failed to copy link.",
        variant: "destructive",
      });
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-dark via-purple-950/20 to-background-dark flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background-dark via-purple-950/20 to-background-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Submission not found</h1>
          <Link href="/">
            <a className="text-primary hover:text-primary/80">Go back home</a>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-purple-950/20 to-background-dark pb-32 md:pb-0">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back button */}
        <div className="mb-6">
          {submission.contest ? (
            <Link href={`/contest/${submission.contest.slug}`}>
              <a className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors" data-testid="link-back-contest">
                <ArrowLeft className="h-5 w-5" />
                Back to {submission.contest.title}
              </a>
            </Link>
          ) : (
            <Link href="/">
              <a className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors" data-testid="link-back-home">
                <ArrowLeft className="h-5 w-5" />
                Back to home
              </a>
            </Link>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Image/Video Section */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden shadow-2xl glow-border">
              {submission.type === "video" ? (
                <video
                  src={submission.mediaUrl}
                  controls
                  className="w-full h-auto max-h-[70vh] object-contain bg-black"
                  data-testid="video-submission"
                />
              ) : (
                <img
                  src={submission.mediaUrl}
                  alt={submission.title}
                  className="w-full h-auto max-h-[70vh] object-contain bg-black"
                  loading="lazy"
                  data-testid="img-submission"
                />
              )}
            </div>
          </div>

          {/* Info Section */}
          <div className="lg:col-span-1 space-y-6">
            {/* Title and Author */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 text-glow" data-testid="text-title">
                {submission.title}
              </h1>
              
              {submission.user && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-white/60">Created by</p>
                    <p className="text-lg font-semibold text-white" data-testid="text-author">
                      {submission.user.username}
                    </p>
                  </div>
                </div>
              )}

              {/* Description or Prompt Section */}
              {submission.description && (
                <div className="mt-4">
                  {submission.sellPrompt || submission.hasPromptAccess ? (
                    <div className="space-y-3">
                      <BlurredPrompt
                        prompt={submission.description}
                        isBlurred={submission.sellPrompt && !submission.hasPromptAccess}
                      />
                      
                      {submission.sellPrompt && !submission.hasPromptAccess && user && submission.promptPrice && submission.promptCurrency && (
                        <button
                          onClick={() => setPurchaseModalOpen(true)}
                          className="w-full py-3 px-4 rounded-lg font-semibold bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-violet-500/50"
                          data-testid="button-buy-prompt"
                        >
                          <Sparkles className="h-5 w-5" />
                          Buy Prompt for {submission.promptPrice} {submission.promptCurrency}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-white/80" data-testid="text-description">
                      {submission.description}
                    </p>
                  )}
                </div>
              )}

              {/* AI Tool Info */}
              {submission.aiTool && (
                <div className="mt-4 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-400" />
                    <span className="text-sm font-medium text-violet-300">
                      Generated with {submission.aiTool}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Contest Info */}
            {submission.contest && (
              <div className="p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  <p className="text-sm text-white/60">Contest Entry</p>
                </div>
                <Link href={`/contest/${submission.contest.slug}`}>
                  <a className="text-lg font-semibold text-primary hover:text-primary/80 transition-colors" data-testid="link-contest">
                    {submission.contest.title}
                  </a>
                </Link>
              </div>
            )}

            {/* Vote and Share Actions */}
            <div className="space-y-3">
              {/* Vote Button */}
              <button
                onClick={handleVote}
                disabled={voteMutation.isPending || submission.hasVoted}
                className={`w-full py-4 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-3 ${
                  submission.hasVoted
                    ? "bg-primary text-white cursor-not-allowed"
                    : "bg-white/10 text-white hover:bg-primary hover:scale-105 backdrop-blur-sm"
                }`}
                data-testid="button-vote"
              >
                <Heart className={`h-5 w-5 ${submission.hasVoted ? "fill-current" : ""}`} />
                <span>
                  {submission.hasVoted ? "Voted" : "Vote"} ({submission.voteCount})
                </span>
              </button>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="w-full py-4 px-6 rounded-lg font-semibold bg-white/10 text-white hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-sm"
                data-testid="button-share"
              >
                <Share2 className="h-5 w-5" />
                <span>Share</span>
              </button>

              {/* Pro Edit Button - Only for image submissions owned by user */}
              {user && submission.user?.id === user.id && submission.type === "image" && (
                <button
                  onClick={() => setProEditModalOpen(true)}
                  className="w-full py-4 px-6 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-purple-500/50 hover:scale-105"
                  data-testid="button-pro-edit"
                >
                  <Sparkles className="h-5 w-5" />
                  <span>Pro Edit</span>
                </button>
              )}
            </div>

            {/* Tags */}
            {submission.tags && submission.tags.length > 0 && (
              <div>
                <p className="text-sm text-white/60 mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {submission.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/80"
                      data-testid={`tag-${index}`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prompt Purchase Modal */}
      {purchaseModalOpen && user && submission?.promptPrice && submission?.promptCurrency && (
        <PromptPurchaseModal
          isOpen={purchaseModalOpen}
          onClose={() => setPurchaseModalOpen(false)}
          submissionId={submission.id}
          promptPrice={submission.promptPrice}
          promptCurrency={submission.promptCurrency}
          userBalance={{
            glory: user.gloryBalance || 0,
            sol: parseFloat(String(user.solBalance)) || 0,
            usdc: parseFloat(String(user.usdcBalance)) || 0
          }}
        />
      )}

      {/* Pro Edit Modal */}
      {submission && (
        <ProEditModal
          open={proEditModalOpen}
          onOpenChange={setProEditModalOpen}
          imageUrl={submission.mediaUrl}
          submissionId={submission.id}
        />
      )}
    </div>
  );
}
