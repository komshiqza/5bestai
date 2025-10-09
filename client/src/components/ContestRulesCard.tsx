import { useEffect } from "react";
import { X, Trophy, Calendar, Users, FileText, Award, CheckSquare, Image, Shield } from "lucide-react";
import { GlassButton } from "./GlassButton";

interface ContestRulesCardProps {
  isOpen: boolean;
  contest: {
    title: string;
    description: string;
    rules: string;
    prizeGlory: number;
    startAt: string;
    endAt: string;
    config?: any;
  } | null;
  onClose: () => void;
}

export function ContestRulesCard({ isOpen, contest, onClose }: ContestRulesCardProps) {
  useEffect(() => {
    if (!isOpen) return;

    const modalId = Date.now();

    // Push unique history state when modal opens
    window.history.pushState({ modal: 'rules', modalId }, '');

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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

  if (!isOpen || !contest) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      data-testid="rules-overlay"
    >
      <div 
        className="relative max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-violet-600/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-600/20 border border-violet-500/30">
              <FileText className="h-6 w-6 text-violet-400" />
            </div>
            <h2 className="text-2xl font-bold text-white" data-testid="text-contest-title">
              Contest Rules
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-testid="button-close-rules"
          >
            <X className="h-6 w-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Contest Title */}
          <div>
            <h3 className="text-xl font-bold text-white mb-2">{contest.title}</h3>
            <p className="text-slate-300">{contest.description}</p>
          </div>

          {/* Key Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center gap-2 text-violet-400 mb-2">
                <Trophy className="h-5 w-5" />
                <span className="text-sm font-medium">Prize Pool</span>
              </div>
              <p className="text-2xl font-bold text-white" data-testid="text-prize-pool">
                {contest.prizeGlory.toLocaleString()} GLORY
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center gap-2 text-violet-400 mb-2">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-medium">Start Date</span>
              </div>
              <p className="text-lg font-semibold text-white">
                {new Date(contest.startAt).toLocaleDateString()}
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center gap-2 text-violet-400 mb-2">
                <Calendar className="h-5 w-5" />
                <span className="text-sm font-medium">End Date</span>
              </div>
              <p className="text-lg font-semibold text-white">
                {new Date(contest.endAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Prize Distribution */}
          {contest.config?.prizeDistribution && contest.config.prizeDistribution.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-violet-400" />
                Prize Distribution
              </h4>
              <div className="space-y-2">
                {contest.config.prizeDistribution.map((prize: any) => (
                  <div key={prize.place} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span className="text-slate-300 font-medium">{prize.place === 1 ? '🥇' : prize.place === 2 ? '🥈' : prize.place === 3 ? '🥉' : `${prize.place}th`} Place</span>
                    <span className="text-white font-bold">{prize.value.toLocaleString()} {contest.config.currency || 'GLORY'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Voting Rules */}
          {contest.config && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-violet-400" />
                Voting Rules
              </h4>
              <div className="space-y-2 text-slate-300">
                {contest.config.voteLimitPerPeriod && (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span>Votes per Period</span>
                    <span className="text-white font-semibold">{contest.config.voteLimitPerPeriod}</span>
                  </div>
                )}
                {contest.config.votePeriodHours && (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span>Period Duration</span>
                    <span className="text-white font-semibold">{contest.config.votePeriodHours} hours</span>
                  </div>
                )}
                {contest.config.totalVoteLimit !== undefined && (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span>Total Vote Limit</span>
                    <span className="text-white font-semibold">{contest.config.totalVoteLimit === 0 ? 'Unlimited' : contest.config.totalVoteLimit}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Participation Rules */}
          {contest.config && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-violet-400" />
                Participation Rules
              </h4>
              <div className="space-y-2 text-slate-300">
                {contest.config.maxSubmissions && (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span>Max Submissions per User</span>
                    <span className="text-white font-semibold">{contest.config.maxSubmissions}</span>
                  </div>
                )}
                {contest.config.allowedMediaTypes && (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span>Allowed Media Types</span>
                    <span className="text-white font-semibold">{contest.config.allowedMediaTypes.join(', ')}</span>
                  </div>
                )}
                {contest.config.fileSizeLimit && (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span>File Size Limit</span>
                    <span className="text-white font-semibold">{contest.config.fileSizeLimit}MB</span>
                  </div>
                )}
                {contest.config.eligibility && (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span>Eligibility</span>
                    <span className="text-white font-semibold capitalize">{contest.config.eligibility.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {contest.config.entryFee && contest.config.entryFeeAmount && (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span>Entry Fee</span>
                    <span className="text-white font-semibold">{contest.config.entryFeeAmount} {contest.config.currency || 'GLORY'}</span>
                  </div>
                )}
                {!contest.config.entryFee && (
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <span>Entry Fee</span>
                    <span className="text-green-400 font-semibold">Free to Enter</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rules */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
            <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-violet-400" />
              Contest Rules & Guidelines
            </h4>
            <div 
              className="prose prose-invert prose-sm max-w-none text-slate-300"
              dangerouslySetInnerHTML={{ __html: contest.rules.replace(/\n/g, '<br>') }}
              data-testid="text-contest-rules"
            />
          </div>

          {/* Close Button */}
          <GlassButton
            onClick={onClose}
            className="w-full py-3"
            data-testid="button-close-rules-bottom"
          >
            Close
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
