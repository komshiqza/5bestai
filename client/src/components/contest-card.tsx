import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Image, Clock } from "lucide-react";
import { Link } from "wouter";

interface ContestCardProps {
  contest: {
    id: string;
    title: string;
    description: string;
    status: string;
    prizeGlory: number;
    startAt: string;
    endAt: string;
    submissionCount: number;
    participantCount: number;
    totalVotes: number;
  };
  className?: string;
}

export function ContestCard({ contest, className = "" }: ContestCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/20 text-success border-success/30";
      case "draft":
        return "bg-muted text-muted-foreground border-border";
      case "ended":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Ended";
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h left`;
    }
    return `${hours}h left`;
  };

  return (
    <Card className={`group hover:border-primary/50 transition-all duration-300 ${className}`} data-testid={`contest-card-${contest.id}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold mb-2" data-testid={`contest-title-${contest.id}`}>
              {contest.title}
            </h3>
            <p className="text-muted-foreground text-sm line-clamp-2" data-testid={`contest-description-${contest.id}`}>
              {contest.description}
            </p>
          </div>
          <Badge className={getStatusColor(contest.status)} data-testid={`contest-status-${contest.id}`}>
            {contest.status === "active" && <div className="w-2 h-2 bg-current rounded-full mr-2 animate-pulse" />}
            {contest.status.charAt(0).toUpperCase() + contest.status.slice(1)}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary" data-testid={`contest-prize-${contest.id}`}>
              {contest.prizeGlory.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">GLORY Prize</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" data-testid={`contest-submissions-${contest.id}`}>
              {contest.submissionCount}
            </div>
            <div className="text-xs text-muted-foreground">Submissions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" data-testid={`contest-participants-${contest.id}`}>
              {contest.participantCount}
            </div>
            <div className="text-xs text-muted-foreground">Participants</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold" data-testid={`contest-votes-${contest.id}`}>
              {contest.totalVotes}
            </div>
            <div className="text-xs text-muted-foreground">Total Votes</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span data-testid={`contest-time-remaining-${contest.id}`}>
                {contest.status === "active" ? getTimeRemaining(contest.endAt) : contest.status === "ended" ? "Ended" : "Not started"}
              </span>
            </div>
          </div>
          
          <Link href={`/contests/${contest.id}`} data-testid={`contest-view-link-${contest.id}`}>
            <Button className="gradient-glory hover:opacity-90 transition-opacity">
              View Contest
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
