import { Calendar, Trophy, Share2, Users } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { formatPrizeAmount } from "@/lib/utils";

interface Contest {
  id: string;
  title: string;
  slug: string;
  description: string;
  rules: string;
  coverImageUrl?: string;
  topSubmissionImageUrl?: string;
  status: string;
  prizeGlory: number;
  startAt: string;
  endAt: string;
  createdAt: string;
}

interface ContestCardProps {
  contest: Contest;
}

export function ContestCard({ contest }: ContestCardProps) {
  const [, setLocation] = useLocation();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const { toast } = useToast();

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/contest/${contest.slug}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: contest.title,
          text: contest.description,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied!",
          description: "Contest link copied to clipboard",
        });
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        toast({
          title: "Error",
          description: "Could not copy link to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (contest.status === "ended") {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const endTime = new Date(contest.endAt).getTime();
      const now = new Date().getTime();
      const difference = endTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [contest.endAt, contest.status]);

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

  const defaultImage = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80";
  const coverImage = contest.topSubmissionImageUrl || contest.coverImageUrl || defaultImage;
  
  return (
    <div className="relative min-h-[600px] w-full overflow-hidden rounded-xl shadow-lg transition-all duration-300 hover:shadow-primary/20 hover:-translate-y-1 group border border-transparent hover:border-primary/50 hover:shadow-[0_0_30px_rgba(124,60,236,0.3)]">
      {/* Background image with smooth zoom on hover */}
      <img
        src={coverImage}
        alt={contest.title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />

      {/* Readability overlays (always on) */}
      {/* Soft dark veil that slightly increases on hover */}
      <div className="absolute inset-0 bg-black/25 transition-colors duration-500 group-hover:bg-black/35" />
      {/* Gradient from bottom for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#171121] via-[#171121]/70 to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-4 sm:p-6 text-center">
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
                {formatPrizeAmount(contest.prizeGlory)} {((contest as any).config?.currency) || 'GLORY'}
              </span>
            </div>
          </div>
        </div>

        {/* Title + Desc (top section) */}
        <div className="mt-12">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white drop-shadow mb-2">
            {contest.title}
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-white/85 max-w-md mx-auto line-clamp-2">
            {contest.description}
          </p>
        </div>

        {/* Bottom section: Countdown, Info, Actions, Share */}
        <div className="mt-auto space-y-4">
          {/* Countdown */}
          <div className="flex justify-center gap-1 sm:gap-2 lg:gap-3">
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

          {/* Info: Status | Prize | Participants */}
          <div className="flex flex-wrap justify-center gap-2">
            <div className="glassmorphism flex-grow rounded-lg p-2 sm:p-3 text-center min-w-[100px] sm:min-w-[120px] max-w-[140px] sm:max-w-[160px]">
              <p className="text-xs font-medium text-white/80">Status</p>
              <p className="text-xs sm:text-sm lg:text-lg font-bold text-primary mt-1 capitalize">
                {contest.status}
              </p>
            </div>

            {/* Prize tile removed */}

            <div className="glassmorphism flex-grow rounded-lg p-2 sm:p-3 text-center min-w-[100px] sm:min-w-[120px] max-w-[140px] sm:max-w-[160px]">
              <p className="text-xs font-medium text-white/80">Participants</p>
              <p className="text-xs sm:text-sm lg:text-lg font-bold text-white mt-1">
                {typeof (contest as any).submissionCount === 'number'
                  ? (contest as any).submissionCount.toLocaleString()
                  : ((contest as any).submissions ? (contest as any).submissions.length : 0)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center items-center">
            <GlassButton
              onClick={() => setLocation(`/contest/${contest.slug}`)}
              className="rounded-lg bg-background-dark/80 backdrop-blur-sm border border-primary/30 text-white font-bold transition-all duration-300 focus-ring hover:border-primary/50 glow-border px-6 py-3 text-base hover:bg-primary/20 w-full sm:w-auto min-w-[140px] sm:min-w-[160px] h-10 sm:h-12 px-4 sm:px-6 text-xs sm:text-sm tracking-wide hover:scale-105 flex items-center justify-center"
              data-testid={`button-join-contest-${contest.id}`}
            >
              {contest.status === "ended" ? (
                <>
                  <Trophy size={16} className="mr-2" />
                  <span className="truncate">View Results</span>
                </>
              ) : (
                <>
                  <Calendar size={16} className="mr-2" />
                  <span className="truncate">Join Contest</span>
                </>
              )}
            </GlassButton>
          </div>

          {/* Share */}
          <div className="flex justify-center items-center gap-3">
            <p className="text-xs font-medium text-white/75">Share:</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="group flex items-center justify-center rounded-full size-8 bg-primary/20 dark:bg-primary/30 hover:bg-primary/40 transition-colors"
                aria-label="Share contest"
              >
                <Share2 className="text-white" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
