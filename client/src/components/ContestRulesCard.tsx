import { X, Trophy, Calendar, Users, FileText } from "lucide-react";
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
