import { useEffect, useState } from "react";
import { X, Heart, User, Calendar, Share2, Sparkles, Tag } from "lucide-react";
import { GlassButton } from "./GlassButton";
import { BlurredPrompt } from "./BlurredPrompt";
import { PromptPurchaseModal } from "./PromptPurchaseModal";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/currency";

interface ContestLightboxModalProps {
  isOpen: boolean;
  submission: {
    id: string;
    title: string;
    description?: string;
    tags?: string[];
    mediaUrl: string;
    userId: string;
    user?: {
      username: string;
    };
    createdAt: string;
    voteCount?: number;
    hasVoted?: boolean;
    sellPrompt?: boolean;
    promptPrice?: string;
    promptCurrency?: string;
    hasPromptAccess?: boolean;
    aiTool?: string;
  } | null;
  onClose: () => void;
  onVote?: (submissionId: string) => void;
  onShare?: () => void;
}

export function ContestLightboxModal({ 
  isOpen, 
  submission, 
  onClose, 
  onVote,
  onShare
}: ContestLightboxModalProps) {
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const { data: user } = useAuth();

  useEffect(() => {
    if (!isOpen) return;

    const modalId = Date.now();

    // Push unique history state when modal opens
    window.history.pushState({ modal: 'lightbox', modalId }, '');

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Remove focus/hover state to prevent visual artifacts
        (document.activeElement as HTMLElement)?.blur();
        onClose();
      }
    };

    // Handle browser back button
    const handlePopState = () => {
      // Close modal when going back in history
      if (window.history.state?.modalId !== modalId) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !submission) return null;

  const handleVote = () => {
    if (onVote) {
      onVote(submission.id);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      // Fallback share functionality if no onShare prop provided
      const shareUrl = `${window.location.origin}/submission/${submission.id}`;
      
      if (navigator.share) {
        navigator.share({
          title: submission.title,
          text: `Check out this amazing submission: ${submission.title}`,
          url: shareUrl,
        }).catch(() => {
          navigator.clipboard.writeText(shareUrl);
        });
      } else {
        navigator.clipboard.writeText(shareUrl);
      }
    }
  };

  const showPromptSection = submission.description && (submission.sellPrompt || submission.hasPromptAccess);
  const needsPurchase = submission.sellPrompt && !submission.hasPromptAccess;

  return (
    <>
      <div 
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm"
        onClick={onClose}
        data-testid="lightbox-overlay"
      >
        {/* 2-Column Layout for Desktop, Stack for Mobile */}
        <div className="flex flex-col lg:flex-row h-full" onClick={(e) => e.stopPropagation()}>
          {/* Left Column - Image (Desktop) / Top (Mobile) */}
          <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
            <img
              src={submission.mediaUrl}
              alt={submission.title}
              className="max-w-full max-h-[60vh] lg:max-h-full object-contain rounded-lg"
              data-testid="lightbox-image"
            />
          </div>

          {/* Right Column - Info Panel (Desktop) / Bottom (Mobile) */}
          <div className="w-full lg:w-[360px] bg-white dark:bg-slate-900 overflow-y-auto">
            {/* Header with Close Button */}
            <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-300/60 dark:border-slate-700/60 px-4 py-3 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200" data-testid="text-submission-title">
                {submission.title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                data-testid="button-close-lightbox"
              >
                <X className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Author Info */}
              {submission.user && (
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Created by</p>
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200" data-testid="text-creator-username">
                      @{submission.user.username}
                    </p>
                  </div>
                </div>
              )}

              {/* Description - always show if present */}
              {submission.description && !showPromptSection && (
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed" data-testid="text-submission-description">
                    {submission.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {submission.tags && submission.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {submission.tags.map((tag, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      data-testid={`tag-${index}`}
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </div>
                  ))}
                </div>
              )}

              {/* AI Tool Info */}
              {submission.aiTool && (
                <div className="p-2.5 rounded-lg bg-violet-50/50 dark:bg-violet-950/20 border border-violet-300/60 dark:border-violet-700/60">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    <span className="text-sm font-medium text-violet-900 dark:text-violet-100">
                      {submission.aiTool}
                    </span>
                  </div>
                </div>
              )}

              {/* Prompt Section */}
              {showPromptSection && (
                <div className="space-y-2.5">
                  <BlurredPrompt
                    prompt={submission.description || ""}
                    isBlurred={!!needsPurchase}
                  />
                  
                  {needsPurchase && user && submission.promptPrice && submission.promptCurrency && (
                    <button
                      onClick={() => setPurchaseModalOpen(true)}
                      className="w-full py-2.5 px-4 rounded-lg font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-all flex items-center justify-center gap-2 text-sm"
                      data-testid="button-buy-prompt"
                    >
                      <Sparkles className="h-4 w-4" />
                      Buy Prompt for {formatPrice(submission.promptPrice, submission.promptCurrency)}
                    </button>
                  )}
                </div>
              )}

              {/* Date */}
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Calendar className="h-4 w-4" />
                <span>{new Date(submission.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={handleVote}
                  className={`flex-1 py-2.5 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm ${
                    submission.hasVoted
                      ? "bg-primary text-white cursor-not-allowed"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-primary hover:text-white"
                  }`}
                  disabled={submission.hasVoted}
                  data-testid="button-vote-submission"
                >
                  <Heart className={`h-4 w-4 ${submission.hasVoted ? 'fill-current' : ''}`} />
                  {submission.hasVoted ? 'Voted' : 'Vote'}
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 py-2.5 px-3 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2 text-sm"
                  data-testid="button-share-submission"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {purchaseModalOpen && user && submission.promptPrice && submission.promptCurrency && (
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
    </>
  );
}
