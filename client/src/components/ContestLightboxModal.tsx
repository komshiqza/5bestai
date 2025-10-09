import { X, Heart, User, Calendar, Share2 } from "lucide-react";
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

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black"
      onClick={onClose}
      data-testid="lightbox-overlay"
    >
      {/* Full-screen image */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <img
          src={submission.mediaUrl}
          alt={submission.title}
          className="max-w-full max-h-full object-contain"
          data-testid="lightbox-image"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Top Left - Vote and Share Icons */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex gap-2 sm:gap-3 z-30">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleVote();
          }}
          className="p-2 sm:p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-primary/90 transition-all duration-300 border border-white/20"
          data-testid="button-vote-submission"
        >
          <Heart 
            className={`h-5 w-5 sm:h-6 sm:w-6 ${submission.hasVoted ? 'fill-current text-red-500' : ''}`}
          />
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleShare();
          }}
          className="p-2 sm:p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-primary/90 transition-all duration-300 border border-white/20"
          data-testid="button-share-submission"
        >
          <Share2 className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
      </div>

      {/* Top Right - Close Icon */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 sm:p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-red-500 transition-all duration-300 border border-white/20 z-30"
        data-testid="button-close-lightbox"
      >
        <X className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/* Bottom Info Bar (Optional - can be toggled) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 sm:p-6 z-20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg sm:text-2xl font-bold text-white mb-1 sm:mb-2" data-testid="text-submission-title">
            {submission.title}
          </h2>
          {submission.description && (
            <p className="text-gray-300 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2" data-testid="text-submission-description">
              {submission.description}
            </p>
          )}
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                <User className="h-4 w-4 text-violet-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm" data-testid="text-creator-username">
                  @{submission.user?.username || 'Unknown'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{new Date(submission.createdAt).toLocaleDateString()}</span>
              </div>
              {submission.voteCount !== undefined && (
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  <span>{submission.voteCount} votes</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
