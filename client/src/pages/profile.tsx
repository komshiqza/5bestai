import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/GlassButton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, User, Calendar, Eye, EyeOff, Upload, Settings, Clock, CheckCircle, XCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth, isAuthenticated } from "@/lib/auth";
import { WalletConnect } from "@/components/wallet/WalletConnect";
import { CashoutRequest } from "@/components/wallet/CashoutRequest";

export default function Profile() {
  const { data: user } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if not authenticated
  if (!isAuthenticated(user)) {
    setLocation("/login");
    return null;
  }

  const { data: submissions = [] } = useQuery({
    queryKey: ["/api/submissions", { userId: user.id }],
    queryFn: async () => {
      const response = await fetch(`/api/submissions?userId=${user.id}`);
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    },
  });

  const { data: gloryHistory = [] } = useQuery({
    queryKey: ["/api/glory-ledger"],
    queryFn: async () => {
      const response = await fetch("/api/glory-ledger", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch glory history");
      return response.json();
    },
  });

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-success/20 text-success border-success/30";
      case "pending":
        return "bg-muted text-muted-foreground border-border";
      case "rejected":
        return "bg-destructive/20 text-destructive border-destructive/30";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const approvedSubmissions = submissions.filter((s: any) => s.status === "approved");
  const totalVotes = approvedSubmissions.reduce((sum: number, s: any) => sum + s.votesCount, 0);

  return (
    <div className="min-h-screen py-16" data-testid="profile-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20" data-testid="profile-sidebar">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <Avatar className="w-24 h-24 mx-auto mb-4">
                    <AvatarFallback className="gradient-glory text-white text-4xl font-bold">
                      {getInitials(user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-2xl font-bold mb-1" data-testid="profile-username">
                    {user.username}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4" data-testid="profile-email">
                    {user.email}
                  </p>
                  <Badge className={getStatusColor(user.status)} data-testid="profile-status">
                    {getStatusIcon(user.status)}
                    <span className="ml-1">{user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span>
                  </Badge>
                </div>

                {/* GLORY Balance */}
                <div className="gradient-glory rounded-xl p-6 text-center mb-6" data-testid="glory-balance">
                  <div className="text-white/80 text-sm mb-2">Your GLORY Balance</div>
                  <div className="text-white text-4xl font-black mb-2">
                    {user.gloryBalance.toLocaleString()}
                  </div>
                  <div className="text-white/60 text-xs">
                    {/* Mock rank calculation */}
                    Rank #{Math.floor(Math.random() * 100) + 1} globally
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground text-sm">Total Submissions</span>
                    <span className="font-semibold" data-testid="total-submissions">
                      {submissions.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground text-sm">Votes Received</span>
                    <span className="font-semibold" data-testid="total-votes">
                      {totalVotes}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground text-sm">Member Since</span>
                    <span className="font-semibold text-sm" data-testid="member-since">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Link href="/upload" data-testid="upload-button">
                    <Button className="w-full gradient-glory hover:opacity-90 transition-opacity">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload New Entry
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full" data-testid="settings-button">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="submissions" className="space-y-4" data-testid="profile-tabs">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="submissions" data-testid="tab-submissions">My Submissions</TabsTrigger>
                <TabsTrigger value="glory" data-testid="tab-glory">GLORY History</TabsTrigger>
                <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
              </TabsList>

              {/* Submissions Tab */}
              <TabsContent value="submissions" className="space-y-4" data-testid="submissions-tab">
                {submissions.length > 0 ? (
                  <div className="space-y-4">
                    {submissions.map((submission: any) => (
                      <Card key={submission.id} className={`hover:border-primary/50 transition-colors ${submission.status === "rejected" ? "opacity-75" : ""}`} data-testid={`submission-item-${submission.id}`}>
                        <CardContent className="p-6">
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="sm:w-48 aspect-square flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                              <img 
                                src={submission.type === "video" ? submission.thumbnailUrl || submission.mediaUrl : submission.mediaUrl}
                                alt={submission.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23334155" width="400" height="400"/%3E%3Ctext fill="%239ca3af" font-family="system-ui" font-size="48" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E%3Ctspan x="50%25" dy="-20"%3E' + (submission.type === 'video' ? '🎬' : '🖼️') + '%3C/tspan%3E%3Ctspan x="50%25" dy="60" font-size="16"%3EImage not available%3C/tspan%3E%3C/text%3E%3C/svg%3E';
                                  target.onerror = null;
                                }}
                              />
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between mb-2">
                                  <h3 className="font-bold text-lg" data-testid={`submission-title-${submission.id}`}>
                                    {submission.title}
                                  </h3>
                                  <Badge className={getStatusColor(submission.status)} data-testid={`submission-status-${submission.id}`}>
                                    {getStatusIcon(submission.status)}
                                    <span className="ml-1">{submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}</span>
                                  </Badge>
                                </div>
                                {submission.description && (
                                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2" data-testid={`submission-description-${submission.id}`}>
                                    {submission.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <div className="flex items-center space-x-1">
                                    <Calendar className="w-4 h-4" />
                                    <span data-testid={`submission-date-${submission.id}`}>
                                      {new Date(submission.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Trophy className="w-4 h-4" />
                                    <span data-testid={`submission-contest-${submission.id}`}>
                                      {submission.contest.title}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {submission.status === "approved" ? (
                                    <div className="flex items-center space-x-1 font-semibold">
                                      <Trophy className="w-4 h-4 text-primary" />
                                      <span data-testid={`submission-votes-${submission.id}`}>
                                        {submission.votesCount}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-1 text-muted-foreground">
                                      {submission.status === "pending" ? (
                                        <>
                                          <EyeOff className="w-4 h-4" />
                                          <span>Hidden</span>
                                        </>
                                      ) : (
                                        <>
                                          <XCircle className="w-4 h-4" />
                                          <span>Rejected</span>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12" data-testid="no-submissions">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                      <Upload className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No submissions yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Start competing by uploading your first creative work!
                    </p>
                    <Link href="/upload" data-testid="first-upload-button">
                      <GlassButton>
                        Upload New Entry
                        <Upload className="w-4 h-4 ml-2" />
                      </GlassButton>
                    </Link>
                  </div>
                )}
              </TabsContent>

              {/* Glory History Tab */}
              <TabsContent value="glory" className="space-y-4" data-testid="glory-tab">
                {gloryHistory.length > 0 ? (
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full" data-testid="glory-history-table">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Transaction
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {gloryHistory.map((transaction: any, index: number) => (
                              <tr key={transaction.id} data-testid={`glory-transaction-${index}`}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                  {new Date(transaction.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-medium" data-testid={`transaction-reason-${index}`}>
                                    {transaction.reason}
                                  </div>
                                  {transaction.contestId && (
                                    <div className="text-muted-foreground text-xs">
                                      Contest reward
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  <span 
                                    className={`font-semibold font-mono ${transaction.delta > 0 ? "text-success" : "text-destructive"}`}
                                    data-testid={`transaction-amount-${index}`}
                                  >
                                    {transaction.delta > 0 ? "+" : ""}{transaction.delta.toLocaleString()} GLORY
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center py-12" data-testid="no-glory-history">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                      <Trophy className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No GLORY transactions yet</h3>
                    <p className="text-muted-foreground">
                      Start participating in contests to earn GLORY rewards!
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6" data-testid="settings-tab">
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Username</label>
                        <p className="text-muted-foreground">{user.username}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <p className="text-muted-foreground">{user.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Account Status</label>
                        <div className="mt-1">
                          <Badge className={getStatusColor(user.status)}>
                            {getStatusIcon(user.status)}
                            <span className="ml-1">{user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span>
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Role</label>
                        <p className="text-muted-foreground capitalize">{user.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <WalletConnect />
                <CashoutRequest />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
