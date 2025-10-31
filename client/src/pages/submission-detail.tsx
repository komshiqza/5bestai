import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart, ArrowLeft, Share2, Trophy, User, Sparkles, Tag, MessageSquare, ShoppingCart, Copy, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMemo, useState, useEffect } from "react";
import { GlassButton } from "@/components/GlassButton";
import { PromptPaymentModal } from "@/components/PromptPaymentModal";
import { formatPrizeAmount } from "@/lib/utils";
export default function SubmissionDetailPage() {
  const [match, params] = useRoute("/submission/:id");
  const submissionId = params?.id || "";
  const { data: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Deep-link purchase success detection (e.g., wallet redirects back with params)
  // Supports: ?purchased=1, ?purchase=success, or ?tx=<signature>
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const purchased = sp.get("purchased") === "1" || sp.get("purchase") === "success";
    const hasTx = !!sp.get("tx");
    if (purchased || hasTx) {
      toast({
        title: "Prompt Purchased!",
        description: "Your payment has been processed and the prompt is now visible.",
      });
      // Clean the URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Refresh submission to reflect unlocked prompt
      queryClient.invalidateQueries({ queryKey: ["/api/submissions", submissionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts/purchased/submissions"] });
    }
  }, [submissionId, queryClient, toast]);

  // Purchased prompts (global) - used to determine if prompt is unlocked
  const { data: purchasedSubmissions = [] } = useQuery({
    queryKey: ["/api/prompts/purchased/submissions"],
    enabled: !!user && !!submission?.promptForSale,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await fetch("/api/prompts/purchased/submissions", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch purchased prompts");
      return response.json();
    }
  });

  const isCreator = useMemo(() => {
    if (!user || !submission) return false;
    return user.id === submission.userId;
  }, [user, submission]);

  const hasPurchasedGlobal = useMemo(() => {
    if (!submission || !purchasedSubmissions) return false;
    return purchasedSubmissions.some((p: any) => p.id === submission.id);
  }, [purchasedSubmissions, submission]);

  const hasPurchased = !!submission?.hasPurchasedPrompt || hasPurchasedGlobal;
  const shouldBlur = !!submission?.promptForSale && !hasPurchased && !isCreator;

  // Prompt purchase modal state
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleBuyPrompt = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please log in to purchase prompts",
        variant: "destructive"
      });
      return;
    }
    setShowPromptModal(true);
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
            <Link
              href={`/contest/${submission.contest.slug}`}
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              data-testid="link-back-contest"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to {submission.contest.title}</span>
            </Link>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              data-testid="link-back-home"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to home</span>
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
            {/* Vote & Share at top, side-by-side like lightboxes */}
            <div className="flex gap-3">
              <button
                onClick={handleVote}
                disabled={voteMutation.isPending || submission.hasVoted}
                className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/20 ${submission.hasVoted ? 'opacity-80' : ''}`}
                data-testid="button-vote"
              >
                <Heart className={`h-5 w-5 ${submission.hasVoted ? "fill-current" : ""}`} />
                <span>
                  {submission.hasVoted ? "Voted" : "Vote"} ({submission.voteCount})
                </span>
              </button>
              <button
                onClick={handleShare}
                className="px-4 py-3 rounded-xl font-semibold bg-slate-700/50 text-white hover:bg-slate-600/50 transition-all duration-300 flex items-center justify-center gap-2 border border-white/10"
                data-testid="button-share"
              >
                <Share2 className="h-5 w-5" />
                <span>Share</span>
              </button>
            </div>

            {/* Contest Entry next */}
            {submission.contest && (
              <div className="p-4 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  <p className="text-sm text-white/60">Contest Entry</p>
                </div>
                <Link
                  href={`/contest/${submission.contest.slug}`}
                  className="text-lg font-semibold text-primary hover:text-primary/80 transition-colors"
                  data-testid="link-contest"
                >
                  {submission.contest.title}
                </Link>
              </div>
            )}

            {/* Name (Title) and Description */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 text-glow" data-testid="text-title">
                {submission.title}
              </h1>

              {submission.description && (
                <p className="text-white/80 mt-4" data-testid="text-description">
                  {submission.description}
                </p>
              )}
            </div>

            {/* Details: Category and AI Model side by side, then Tags */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {submission.category && (
                  <div className="flex items-start gap-3" data-testid="info-category">
                    <Tag className="h-5 w-5 text-violet-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-white/60 uppercase tracking-wide mb-1">Category</p>
                      <p className="text-white font-medium">{submission.category}</p>
                    </div>
                  </div>
                )}
                {submission.aiModel && (
                  <div className="flex items-start gap-3" data-testid="info-ai-model">
                    <Sparkles className="h-5 w-5 text-violet-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-white/60 uppercase tracking-wide mb-1">AI Model</p>
                      <p className="text-white font-medium">{submission.aiModel}</p>
                    </div>
                  </div>
                )}
              </div>

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

            {/* Contest Info moved to top above */}

            {/* Prompt content and Buy CTA */}
              {submission.prompt && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-violet-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-white/60 uppercase tracking-wide">Prompt</p>
                        {!shouldBlur && (
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(submission.prompt || "");
                                setCopied(true);
                                toast({ title: "Copied!", description: "Prompt copied to clipboard." });
                                setTimeout(() => setCopied(false), 1500);
                              } catch (err) {
                                toast({ title: "Copy failed", description: "Couldn't copy the prompt.", variant: "destructive" });
                              }
                            }}
                            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-white/20 text-white/90 hover:bg-white/10 transition text-[11px]"
                            title="Copy prompt"
                            data-testid="button-copy-prompt"
                          >
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copied ? "Copied" : "Copy"}</span>
                          </button>
                        )}
                      </div>
                      <p
                        className={`text-white text-sm leading-relaxed ${shouldBlur ? 'filter blur-sm select-none pointer-events-none' : ''}`}
                        data-testid="text-prompt-content"
                      >
                        {submission.prompt}
                      </p>
                    </div>
                  </div>

                  {/* Buy Prompt Button - only for sale, not purchased, not creator */}
                  {submission.promptForSale && !hasPurchased && !isCreator && (
                    <GlassButton
                      onClick={handleBuyPrompt}
                      className="w-full flex items-center justify-center gap-2"
                      data-testid="button-buy-prompt"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      <span className="font-semibold">Buy Prompt</span>
                      {submission.promptPrice && submission.promptCurrency && (
                        <span className="ml-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm">
                          {formatPrizeAmount(submission.promptPrice)} {submission.promptCurrency}
                        </span>
                      )}
                    </GlassButton>
                  )}
                </div>
              )}

            {/* Created by and Date (moved here after prompt) */}
            <div className="space-y-3">
              {submission.user && (
                <div className="flex items-center gap-3">
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
              <div className="text-white/60 text-sm">
                <span>Date: </span>
                <span>{submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : '—'}</span>
              </div>
            </div>

            {/* Vote & Share were moved to the top */}

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

      {/* Prompt Payment Modal */}
      {submission && (
        <PromptPaymentModal
          isOpen={showPromptModal}
          onClose={() => setShowPromptModal(false)}
          submission={{
            id: submission.id,
            title: submission.title,
            promptPrice: submission.promptPrice,
            promptCurrency: submission.promptCurrency,
            promptForSale: submission.promptForSale,
          }}
          onSuccess={() => {
            queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "/api/submissions" });
          }}
        />
      )}

    </div>
  );
}
