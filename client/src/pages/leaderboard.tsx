import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Crown, Medal, Award, Users, TrendingUp } from "lucide-react";

export default function Leaderboard() {
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["/api/leaderboard"],
    queryFn: async () => {
      const response = await fetch("/api/leaderboard");
      if (!response.ok) throw new Error("Failed to fetch leaderboard");
      return response.json();
    },
  });

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-500" />;
      default:
        return null;
    }
  };

  const getPodiumStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "gradient-glory border-primary shadow-2xl transform scale-105";
      case 2:
        return "bg-gradient-to-br from-gray-300 to-gray-500 border-gray-400";
      case 3:
        return "bg-gradient-to-br from-orange-400 to-orange-600 border-orange-500";
      default:
        return "";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-16" data-testid="leaderboard-loading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-12 bg-muted rounded w-1/2 mx-auto mb-8"></div>
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-muted rounded-xl"></div>
              ))}
            </div>
            <div className="h-96 bg-muted rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const topThree = leaderboard.slice(0, 3);
  const restOfLeaderboard = leaderboard.slice(3);

  return (
    <div className="min-h-screen py-16" data-testid="leaderboard-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black tracking-tight mb-4 flex items-center justify-center" data-testid="leaderboard-title">
            <Trophy className="w-10 h-10 text-primary mr-3" />
            Global Leaderboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Top creators ranked by GLORY earned
          </p>
        </div>

        {/* Top 3 Podium */}
        {topThree.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
            {/* 2nd Place */}
            {topThree[1] && (
              <div className="order-2 md:order-1" data-testid="podium-second">
                <Card className={`${getPodiumStyle(2)} p-6 text-center text-white`}>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-600 mx-auto mb-4 flex items-center justify-center border-4 border-white/30">
                    {getRankIcon(2)}
                  </div>
                  <div className="text-3xl font-black mb-2">2</div>
                  <Avatar className="w-16 h-16 mx-auto mb-3">
                    <AvatarFallback className="bg-secondary text-secondary-foreground font-bold text-lg">
                      {getInitials(topThree[1].username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="font-bold mb-1" data-testid="podium-username-2">
                    {topThree[1].username}
                  </div>
                  <div className="text-white/90 text-sm mb-2">
                    {topThree[1].submissionCount} submissions
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-lg py-2 px-4 inline-block">
                    <span className="font-bold text-xl" data-testid="podium-glory-2">
                      {topThree[1].gloryBalance.toLocaleString()}
                    </span>
                    <span className="text-white/90 text-sm ml-1">GLORY</span>
                  </div>
                </Card>
              </div>
            )}

            {/* 1st Place (Champion) */}
            {topThree[0] && (
              <div className="order-1 md:order-2" data-testid="podium-first">
                <Card className={`${getPodiumStyle(1)} p-6 text-center text-white`}>
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 mx-auto mb-4 flex items-center justify-center border-4 border-white/30">
                    {getRankIcon(1)}
                  </div>
                  <div className="text-4xl font-black mb-2">1</div>
                  <Avatar className="w-20 h-20 mx-auto mb-3">
                    <AvatarFallback className="bg-secondary text-secondary-foreground font-bold text-2xl">
                      {getInitials(topThree[0].username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="font-bold text-lg mb-1" data-testid="podium-username-1">
                    {topThree[0].username}
                  </div>
                  <div className="text-white/90 text-sm mb-2">
                    {topThree[0].submissionCount} submissions
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-lg py-3 px-4 inline-block">
                    <span className="font-black text-2xl" data-testid="podium-glory-1">
                      {topThree[0].gloryBalance.toLocaleString()}
                    </span>
                    <span className="text-white/90 text-sm ml-1">GLORY</span>
                  </div>
                </Card>
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div className="order-3" data-testid="podium-third">
                <Card className={`${getPodiumStyle(3)} p-6 text-center text-white`}>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 mx-auto mb-4 flex items-center justify-center border-4 border-white/30">
                    {getRankIcon(3)}
                  </div>
                  <div className="text-3xl font-black mb-2">3</div>
                  <Avatar className="w-16 h-16 mx-auto mb-3">
                    <AvatarFallback className="bg-secondary text-secondary-foreground font-bold text-lg">
                      {getInitials(topThree[2].username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="font-bold mb-1" data-testid="podium-username-3">
                    {topThree[2].username}
                  </div>
                  <div className="text-white/90 text-sm mb-2">
                    {topThree[2].submissionCount} submissions
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-lg py-2 px-4 inline-block">
                    <span className="font-bold text-xl" data-testid="podium-glory-3">
                      {topThree[2].gloryBalance.toLocaleString()}
                    </span>
                    <span className="text-white/90 text-sm ml-1">GLORY</span>
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}

        {/* Full Leaderboard Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="leaderboard-table">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Creator
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Submissions
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Votes
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      GLORY
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {/* Top 3 in table format */}
                  {topThree.map((user: any, index: number) => (
                    <tr 
                      key={user.id} 
                      className={`hover:bg-muted/30 transition-colors ${index < 3 ? 'bg-primary/5' : ''}`}
                      data-testid={`leaderboard-row-${index + 1}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex items-center space-x-2">
                            {getRankIcon(index + 1)}
                            <span className={`text-2xl font-black ${index === 0 ? 'text-primary' : ''}`}>
                              {index + 1}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback className="gradient-glory text-white font-bold">
                              {getInitials(user.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold" data-testid={`username-${index + 1}`}>
                              {user.username}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Member since {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium" data-testid={`submissions-${index + 1}`}>
                        {user.submissionCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium" data-testid={`total-votes-${index + 1}`}>
                        {user.totalVotes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="font-bold text-lg text-primary" data-testid={`glory-${index + 1}`}>
                          {user.gloryBalance.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {/* Rest of leaderboard */}
                  {restOfLeaderboard.map((user: any, index: number) => (
                    <tr 
                      key={user.id} 
                      className="hover:bg-muted/30 transition-colors"
                      data-testid={`leaderboard-row-${index + 4}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xl font-bold">
                          {index + 4}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">
                              {getInitials(user.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold" data-testid={`username-${index + 4}`}>
                              {user.username}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Member since {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium" data-testid={`submissions-${index + 4}`}>
                        {user.submissionCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium" data-testid={`total-votes-${index + 4}`}>
                        {user.totalVotes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="font-bold text-lg" data-testid={`glory-${index + 4}`}>
                          {user.gloryBalance.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Empty state */}
        {leaderboard.length === 0 && (
          <div className="text-center py-12" data-testid="leaderboard-empty">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <Trophy className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No rankings yet</h3>
            <p className="text-muted-foreground">
              Start competing to see the leaderboard in action!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
