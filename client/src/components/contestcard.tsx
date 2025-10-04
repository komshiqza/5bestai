import { useState } from "react";
import { Calendar, Trophy, Share2 } from "lucide-react";
import { ContestRulesCard } from "./ContestRulesCard";
import { GlassButton } from "./GlassButton";

interface ContestCardProps {
  contest: {
    id: number;
    title: string;
    description: string;
    image: string;
    prizePool: string;
    timeLeft: {
      days: number;
      hours: number;
      minutes: number;
      seconds: number;
    };
    participants: number;
    status: "active" | "upcoming" | "ended";
  };
  onViewContest: (contest: any) => void;
}

export function ContestCard({ contest, onViewContest }: ContestCardProps) {
  const [showRules, setShowRules] = useState(false);

  // Use timeLeft directly from props (managed by parent component)
  const timeLeft = contest.timeLeft;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "upcoming":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "ended":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-primary/20 text-primary border-primary/30";
    }
  };

  return (
    <div className="relative min-h-[600px] w-full overflow-hidden rounded-xl shadow-lg transition-all duration-300 hover:shadow-primary/20 hover:-translate-y-1 group">
      {/* Background image with smooth zoom on hover */}
      <img
        src={contest.image}
        alt={contest.title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />

      {/* Readability overlays (always on) */}
      {/* Soft dark veil that slightly increases on hover */}
      <div className="absolute inset-0 bg-black/25 transition-colors duration-500 group-hover:bg-black/35" />
      {/* Gradient from bottom for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#171121] via-[#171121]/70 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full p-4 sm:p-6 text-center">
        {/* Status */}
        <div className="absolute top-4 left-4">
          <div
            className={`px-2 sm:px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-sm ${getStatusColor(contest.status)}`}
          >
            {contest.status.charAt(0).toUpperCase() + contest.status.slice(1)}
          </div>
        </div>

        {/* Prize */}
        <div className="absolute top-4 right-4">
          <div className="glassmorphism px-3 py-1 rounded-lg">
            <div className="flex items-center gap-1 text-yellow-400">
              <Trophy size={14} />
              <span className="text-xs sm:text-sm font-bold text-white">
                {contest.prizePool}
              </span>
            </div>
          </div>
        </div>

        {/* Title + Desc */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white drop-shadow mb-2">
            {contest.title}
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-white/85 max-w-md mx-auto line-clamp-2">
            {contest.description}
          </p>
        </div>

        {/* Countdown */}
        <div className="mb-6 flex justify-center gap-1 sm:gap-2 lg:gap-3">
          {[
            { label: "Days", val: String(timeLeft.days).padStart(2, "0") },
            { label: "Hours", val: String(timeLeft.hours).padStart(2, "0") },
            { label: "Min", val: String(timeLeft.minutes).padStart(2, "0") },
            {
              label: "Sec",
              val: String(timeLeft.seconds).padStart(2, "0"),
              pulse: true,
            },
          ].map(({ label, val, pulse }) => (
            <div key={label} className="flex flex-col items-center">
              <div className="glassmorphism flex h-10 w-10 sm:h-12 sm:w-12 lg:h-16 lg:w-16 items-center justify-center rounded-lg">
                <p
                  className={`text-sm sm:text-lg lg:text-2xl font-bold text-white ${pulse ? "animate-pulse" : ""}`}
                >
                  {val}
                </p>
              </div>
              <p className="mt-1 text-xs font-medium text-white/75 uppercase tracking-widest">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          <div className="glassmorphism flex-grow rounded-lg p-2 sm:p-3 text-center min-w-[70px] sm:min-w-[80px] max-w-[100px] sm:max-w-[120px]">
            <p className="text-xs font-medium text-white/80">Participants</p>
            <p className="text-xs sm:text-sm lg:text-lg font-bold text-white mt-1">
              {contest.participants}
            </p>
          </div>
          <div className="glassmorphism flex-grow rounded-lg p-2 sm:p-3 text-center min-w-[70px] sm:min-w-[80px] max-w-[100px] sm:max-w-[120px]">
            <p className="text-xs font-medium text-white/80">Status</p>
            <p className="text-xs sm:text-sm lg:text-lg font-bold text-primary mt-1 capitalize">
              {contest.status}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center items-center">
          <GlassButton
            onClick={() => {
              console.log("ContestCard: Explore clicked", contest);
              onViewContest(contest);
            }}
            className="rounded-lg bg-background-dark/80 backdrop-blur-sm border border-primary/30 text-white font-bold transition-all duration-300 focus-ring hover:border-primary/50 glow-border px-6 py-3 text-base hover:bg-primary/20 w-full sm:w-auto min-w-[140px] sm:min-w-[160px] h-10 sm:h-12 px-4 sm:px-6 text-xs sm:text-sm tracking-wide hover:scale-105 flex items-center justify-center"
          >
            <Calendar size={16} className="mr-2" />
            <span className="truncate">Join Contest</span>
          </GlassButton>
        </div>

        {/* Share */}
        <div className="mt-4 flex justify-center items-center gap-3">
          <p className="text-xs font-medium text-white/75">Share:</p>
          <div className="flex items-center gap-2">
            <button className="group flex items-center justify-center rounded-full size-8 bg-primary/20 dark:bg-primary/30 hover:bg-primary/40 transition-colors">
              <Share2 className="text-white" size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Contest Rules Modal */}
      {showRules && (
        <ContestRulesCard
          isModal={true}
          contestTitle={contest.title}
          onClose={() => setShowRules(false)}
        />
      )}
    </div>
  );
}
