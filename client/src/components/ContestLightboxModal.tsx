import { X, Heart, User, Calendar } from "lucide-react";
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
}

export function ContestLightboxModal({ 
  isOpen, 
  submission, 
  onClose, 
  onVote 
}: ContestLightboxModalProps) {
  if (!isOpen || !submission) return null;

  const handleVote = () => {
    if (onVote) {
      onVote(submission.id);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
      data-testid="lightbox-overlay"
    >
      <div 
        className="relative max-w-6xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white hover:text-violet-400 transition-colors z-10"
          data-testid="button-close-lightbox"
        >
          <X className="h-8 w-8" />
        </button>

        <div className="flex flex-col lg:flex-row gap-6 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          {/* Image */}
          <div className="flex-1 flex items-center justify-center bg-black/30 p-8">
            <img
              src={submission.mediaUrl}
              alt={submission.title}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              data-testid="lightbox-image"
            />
          </div>

          {/* Info Panel */}
          <div className="lg:w-96 p-6 flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2" data-testid="text-submission-title">
                {submission.title}
              </h2>
              {submission.description && (
                <p className="text-slate-300 text-sm" data-testid="text-submission-description">
                  {submission.description}
                </p>
              )}
            </div>

            {/* Creator */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                <User className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400">Created by</p>
                <p className="text-white font-semibold" data-testid="text-creator-username">
                  {submission.user?.username || 'Unknown'}
                </p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Calendar className="h-4 w-4" />
              <span>{new Date(submission.createdAt).toLocaleDateString()}</span>
            </div>

            {/* Vote Button */}
            {onVote && (
              <GlassButton
                onClick={handleVote}
                variant="purple"
                className="w-full py-4 flex items-center justify-center gap-2"
                data-testid="button-vote-submission"
              >
                <Heart 
                  className={`h-5 w-5 ${submission.hasVoted ? 'fill-violet-400' : ''}`}
                />
                <span>
                  {submission.hasVoted ? 'Voted' : 'Vote'} 
                  {submission.voteCount ? ` (${submission.voteCount})` : ''}
                </span>
              </GlassButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
