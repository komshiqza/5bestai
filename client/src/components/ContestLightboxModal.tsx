import { useEffect } from "react";
import { X, Heart, User, Calendar, Share2, Tag, Sparkles, MessageSquare, ShoppingCart } from "lucide-react";
import { GlassButton } from "./GlassButton";

interface ContestLightboxModalProps {
  isOpen: boolean;
  submission: {
    id: string;
    title: string;
    description?: string;
    mediaUrl: string;
    userId: string;
    user?: {
      username: string;
    };
    createdAt: string;
    voteCount?: number;
    hasVoted?: boolean;
    category?: string | null;
    aiModel?: string | null;
    prompt?: string | null;
    tags?: string[] | null;
    promptForSale?: boolean;
    promptPrice?: string | null;
    promptCurrency?: string | null;
  } | null;
  onClose: () => void;
  onVote?: (submissionId: string) => void;
  onShare?: () => void;
  onBuyPrompt?: (submissionId: string) => void;
}

export function ContestLightboxModal({ 
  isOpen, 
  submission, 
  onClose, 
  onVote,
  onShare,
  onBuyPrompt
}: ContestLightboxModalProps) {
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

  const handleBuyPrompt = () => {
    if (onBuyPrompt && submission) {
      onBuyPrompt(submission.id);
    }
  };

  const formatPrice = (price: string | null | undefined): string => {
    if (!price) return "0";
    const num = parseFloat(price);
    if (isNaN(num)) return price || "0";
    return num.toString();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm"
      onClick={onClose}
      data-testid="lightbox-overlay"
    >
      {/* Desktop: Grid layout | Mobile: Stack layout */}
      <div className="h-full flex flex-col lg:grid lg:grid-cols-[1fr,350px] gap-0">
        
        {/* Image Section */}
        <div 
          className="relative flex-1 flex items-center justify-center p-4 lg:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={submission.mediaUrl}
            alt={submission.title}
            className="max-w-full max-h-full object-contain rounded-lg"
            data-testid="lightbox-image"
          />
          
          {/* Close button - top right on image */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-3 rounded-full bg-black/70 backdrop-blur-sm text-white hover:bg-red-500 transition-all duration-300 border border-white/20 z-10"
            data-testid="button-close-lightbox"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Info Panel - Right on desktop, Bottom on mobile */}
        <div 
          className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-l border-white/10 overflow-y-auto max-h-[50vh] lg:max-h-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 space-y-6">
            
            {/* Title & Description */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-2" data-testid="text-submission-title">
                {submission.title}
              </h2>
              {submission.description && (
                <p className="text-gray-300 text-sm leading-relaxed" data-testid="text-submission-description">
                  {submission.description}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleVote();
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold transition-all duration-300 shadow-lg shadow-violet-500/20"
                data-testid="button-vote-submission"
              >
                <Heart 
                  className={`h-5 w-5 ${submission.hasVoted ? 'fill-current' : ''}`}
                />
                <span>{submission.hasVoted ? 'Voted' : 'Vote'}</span>
                {submission.voteCount !== undefined && (
                  <span className="ml-1 text-white/80">({submission.voteCount})</span>
                )}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className="px-4 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-white transition-all duration-300 border border-white/10"
                data-testid="button-share-submission"
              >
                <Share2 className="h-5 w-5" />
              </button>
            </div>

            {/* Details Grid */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              
              {/* Category */}
              {submission.category && (
                <div className="flex items-start gap-3" data-testid="info-category">
                  <Tag className="h-5 w-5 text-violet-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Category</p>
                    <p className="text-white font-medium">{submission.category}</p>
                  </div>
                </div>
              )}

              {/* AI Model */}
              {submission.aiModel && (
                <div className="flex items-start gap-3" data-testid="info-ai-model">
                  <Sparkles className="h-5 w-5 text-violet-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">AI Model</p>
                    <p className="text-white font-medium">{submission.aiModel}</p>
                  </div>
                </div>
              )}

              {/* Prompt */}
              {submission.prompt && (
                <div className="flex flex-col gap-2" data-testid="info-prompt">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-violet-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Prompt</p>
                      <div className="relative">
                        <p 
                          className={`text-white text-sm leading-relaxed ${
                            submission.promptForSale ? 'filter blur-sm select-none pointer-events-none' : ''
                          }`}
                          data-testid="text-prompt-content"
                        >
                          {submission.prompt}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Buy Prompt Button */}
                  {submission.promptForSale && (
                    <GlassButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBuyPrompt();
                      }}
                      className="w-full flex items-center justify-center gap-2"
                      data-testid="button-buy-prompt"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      <span className="font-semibold">Buy Prompt</span>
                      {submission.promptPrice && submission.promptCurrency && (
                        <span className="ml-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm">
                          {formatPrice(submission.promptPrice)} {submission.promptCurrency}
                        </span>
                      )}
                    </GlassButton>
                  )}
                </div>
              )}

              {/* Tags */}
              {submission.tags && submission.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {submission.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Creator & Date */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Created by</p>
                    <p className="text-white font-semibold" data-testid="text-creator-username">
                      @{submission.user?.username || 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(submission.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
