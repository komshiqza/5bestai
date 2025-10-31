import { useQuery } from "@tanstack/react-query";
import { ContestCard } from "@/components/contest-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trophy, Search, Filter, Calendar, Users } from "lucide-react";
import { useState } from "react";
import { formatPrizeAmount } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";

function ContestsContent() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contests = [], isLoading } = useQuery({
    queryKey: ["/api/contests"],
    queryFn: async () => {
      const response = await fetch("/api/contests");
      if (!response.ok) throw new Error("Failed to fetch contests");
      return response.json();
    },
  });

  const filteredContests = contests.filter((contest: any) => {
    const matchesStatus = statusFilter === "all"
      ? (contest.status === "active" || contest.status === "ended")
      : contest.status === statusFilter;
    const matchesSearch = contest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contest.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusCounts = () => {
    const active = contests.filter((c: any) => c.status === "active").length;
    const ended = contests.filter((c: any) => c.status === "ended").length;
    return {
      all: active + ended,
      active,
      ended,
    };
  };

  const statusCounts = getStatusCounts();
  const { isCollapsed } = useSidebar();

  if (isLoading) {
    return (
      <div className={`min-h-screen py-16 transition-all duration-300 ${isCollapsed ? 'md:ml-[90px]' : 'md:ml-64'}`} data-testid="contests-loading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-2/3 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-8 pb-32 md:py-16 md:pb-16 transition-all duration-300 ${isCollapsed ? 'md:ml-[90px]' : 'md:ml-64'}`} data-testid="contests-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white tracking-tight" data-testid="contests-title">
            AI Art Contests
          </h2>
          <p className="mt-3 md:mt-4 text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4">
            Participate in exciting AI art contests and showcase your creativity to win amazing prizes.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={statusFilter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className={statusFilter === "all" ? "gradient-glory" : ""}
              data-testid="filter-all"
            >
              All ({statusCounts.all})
            </Button>
            <Button
              variant={statusFilter === "active" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("active")}
              className={statusFilter === "active" ? "bg-success text-success-foreground hover:bg-success/90" : ""}
              data-testid="filter-active"
            >
              Active ({statusCounts.active})
            </Button>
            <Button
              variant={statusFilter === "ended" ? "default" : "ghost"}
              size="sm"
              onClick={() => setStatusFilter("ended")}
              className={statusFilter === "ended" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              data-testid="filter-ended"
            >
              Ended ({statusCounts.ended})
            </Button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-contests"
            />
          </div>
        </div>

        {/* Contests Grid */}
        {filteredContests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="contests-grid">
            {filteredContests.map((contest: any) => (
              <ContestCard key={contest.id} contest={contest} />
            ))}
          </div>
        ) : contests.length === 0 ? (
          <div className="text-center py-12" data-testid="contests-empty">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Trophy className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No contests yet</h3>
            <p className="text-muted-foreground">
              Check back soon for exciting creative competitions!
            </p>
          </div>
        ) : (
          <div className="text-center py-12" data-testid="contests-no-results">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Filter className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No contests match your filters</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filter criteria
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter("all");
                setSearchQuery("");
              }}
              data-testid="clear-filters"
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mt-8 md:mt-12">
          <div className="bg-background-light dark:bg-gray-900/40 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-800" data-testid="stat-total-prizes">
            <Trophy className="text-primary mx-auto mb-3" size={32} />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatPrizeAmount(contests.reduce((total: number, contest: any) => total + (Number(contest.prizeGlory) || 0), 0))}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">$GLORY in Prizes</p>
          </div>
          <div className="bg-background-light dark:bg-gray-900/40 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-800" data-testid="stat-active-contests">
            <Calendar className="text-primary mx-auto mb-3" size={32} />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {statusCounts.active}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Active Contests</p>
          </div>
          <div className="bg-background-light dark:bg-gray-900/40 rounded-xl p-6 text-center border border-gray-200 dark:border-gray-800" data-testid="stat-total-participants">
            <Users className="text-primary mx-auto mb-3" size={32} />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {contests.reduce((total: number, contest: any) => total + (Number((contest as any).submissionCount) || 0), 0).toLocaleString()}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">Total Participants</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Contests() {
  return (
    <SidebarProvider>
      <Sidebar />
      <ContestsContent />
    </SidebarProvider>
  );
}
