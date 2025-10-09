import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/GlassButton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, User, Calendar, Eye, EyeOff, Upload, Settings, Clock, CheckCircle, XCircle, Edit2, Share2, Trash2, Medal, DollarSign, Copy, Camera, Save, X as XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { useAuth, isAuthenticated } from "@/lib/auth";
import { useUserBalance } from "@/hooks/useUserBalance";
import { WalletConnect } from "@/components/wallet/WalletConnect";
import { CashoutRequest } from "@/components/wallet/CashoutRequest";
import { EditSubmissionModal } from "@/components/EditSubmissionModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function Profile() {
  const { data: user } = useAuth();
  const { balance } = useUserBalance();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  // Redirect if not authenticated
  if (!isAuthenticated(user)) {
    setLocation("/login");
    return null;
  }

  // Fetch user's submissions using dedicated endpoint
  const { data: submissions = [] } = useQuery({
    queryKey: ["/api/me/submissions"],
    queryFn: async () => {
      const response = await fetch(`/api/me/submissions`);
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    },
  });

  // Fetch active contests to filter submissions
  const { data: activeContests = [] } = useQuery({
    queryKey: ["/api/contests", { status: "active" }],
    queryFn: async () => {
      const response = await fetch("/api/contests?status=active");
      if (!response.ok) throw new Error("Failed to fetch contests");
      return response.json();
    },
  });

  // Filter submissions to only those in active contests
  const activeContestSubmissions = submissions.filter((sub: any) => 
    sub.contestId && activeContests.some((c: any) => c.id === sub.contestId)
  );

  // Fetch all approved submissions for ranking calculation
  const { data: allApprovedSubmissions = [] } = useQuery({
    queryKey: ["/api/submissions", { status: "approved" }],
    queryFn: async () => {
      const response = await fetch("/api/submissions?status=approved");
      if (!response.ok) throw new Error("Failed to fetch approved submissions");
      return response.json();
    },
  });

  // Calculate rank for each submission in its contest (using all contest submissions)
  const submissionsWithRank = activeContestSubmissions.map((submission: any) => {
    if (submission.status !== "approved") {
      return { ...submission, rank: null };
    }

    // Get all approved submissions for this contest, not just user's
    const contestSubmissions = allApprovedSubmissions
      .filter((s: any) => s.contestId === submission.contestId)
      .sort((a: any, b: any) => b.votesCount - a.votesCount);
    
    const rank = contestSubmissions.findIndex((s: any) => s.id === submission.id) + 1;
    return { ...submission, rank: rank > 0 ? rank : null };
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

  // Update submission mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PATCH", `/api/submissions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({ title: "Success", description: "Submission updated successfully" });
      setEditModalOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update submission", variant: "destructive" });
    },
  });

  // Delete submission mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/submissions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({ title: "Success", description: "Submission deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete submission", variant: "destructive" });
    },
  });

  // Fetch wallet data for withdraw modal
  const { data: walletData } = useQuery<any>({ queryKey: ["/api/wallet/me"] });

  // Clear all glory history mutation
  const clearGloryHistoryMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/glory-ledger`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/glory-ledger"] });
      toast({ title: "Success", description: "All GLORY history cleared successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to clear GLORY history", variant: "destructive" });
    },
  });

  // Handle edit submission
  const handleEdit = (submission: any) => {
    setSelectedSubmission(submission);
    setEditModalOpen(true);
  };

  // Handle save from edit modal
  const handleSaveEdit = (data: { title: string; description: string; tags: string[] }) => {
    if (selectedSubmission) {
      updateMutation.mutate({ id: selectedSubmission.id, data });
    }
  };

  // Handle delete with confirmation
  const handleDelete = (submissionId: string) => {
    if (confirm("Are you sure you want to delete this submission? This action cannot be undone.")) {
      deleteMutation.mutate(submissionId);
    }
  };

  // Handle share
  const handleShare = (submission: any) => {
    const shareUrl = `${window.location.origin}/submission/${submission.id}`;
    
    if (navigator.share) {
      navigator.share({
        title: submission.title,
        text: `Check out my submission: ${submission.title}`,
        url: shareUrl,
      }).catch(() => {
        fallbackShare(shareUrl);
      });
    } else {
      fallbackShare(shareUrl);
    }
  };

  // Fallback share (copy to clipboard)
  const fallbackShare = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied!", description: "Submission link copied to clipboard" });
    }).catch(() => {
      toast({ title: "Error", description: "Failed to copy link", variant: "destructive" });
    });
  };

  // Handle copy wallet address
  const handleCopyWallet = () => {
    if (walletData?.wallet?.address) {
      navigator.clipboard.writeText(walletData.wallet.address).then(() => {
        toast({ title: "Copied!", description: "Wallet address copied to clipboard" });
      }).catch(() => {
        toast({ title: "Error", description: "Failed to copy wallet address", variant: "destructive" });
      });
    }
  };

  // Handle clear all glory history with confirmation
  const handleClearGloryHistory = () => {
    if (confirm("Are you sure you want to clear all GLORY history? Your current balance will remain unchanged.")) {
      clearGloryHistoryMutation.mutate();
    }
  };

  // Update username mutation
  const updateUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      return await apiRequest("PATCH", "/api/me", { username });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      setEditingUsername(false);
      toast({ title: "Success", description: "Username updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update username", variant: "destructive" });
    },
  });

  // Upload avatar mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch("/api/me/avatar", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload avatar");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({ title: "Success", description: "Avatar updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload avatar", variant: "destructive" });
    },
  });

  // Delete profile mutation
  const deleteProfileMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/me");
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Profile deleted successfully" });
      setLocation("/login");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete profile", variant: "destructive" });
    },
  });

  // Handle username save
  const handleSaveUsername = () => {
    if (!newUsername.trim() || newUsername.trim().length < 3) {
      toast({ title: "Error", description: "Username must be at least 3 characters", variant: "destructive" });
      return;
    }
    updateUsernameMutation.mutate(newUsername);
  };

  // Handle avatar upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
        return;
      }
      uploadAvatarMutation.mutate(file);
    }
  };

  // Handle delete profile
  const handleDeleteProfile = () => {
    if (confirm("Are you sure you want to delete your profile? This action cannot be undone and will delete all your data including submissions, votes, and GLORY balance.")) {
      deleteProfileMutation.mutate();
    }
  };

  return (
    <div className="min-h-screen py-16 pb-32 md:pb-16" data-testid="profile-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Profile Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20" data-testid="profile-sidebar">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="relative inline-block group mb-4">
                    <Avatar className="w-24 h-24">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        <AvatarFallback className="gradient-glory text-white text-4xl font-bold">
                          {getInitials(user.username)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-6 h-6 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={uploadAvatarMutation.isPending}
                        data-testid="input-avatar-upload"
                      />
                    </label>
                  </div>
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
                  <div className="text-white text-4xl font-black">
                    {balance.toLocaleString()}
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
                  <GlassButton
                    className="w-full"
                    onClick={() => setWithdrawModalOpen(true)}
                    data-testid="button-withdraw-glory"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Withdraw Glory
                  </GlassButton>
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
                <TabsTrigger value="submissions" className="gap-2" data-testid="tab-submissions">
                  <Upload className="w-4 h-4" />
                  <span className="hidden md:inline">My Submissions</span>
                </TabsTrigger>
                <TabsTrigger value="glory" className="gap-2" data-testid="tab-glory">
                  <Medal className="w-4 h-4" />
                  <span className="hidden md:inline">GLORY History</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="gap-2" data-testid="tab-settings">
                  <Settings className="w-4 h-4" />
                  <span className="hidden md:inline">Settings</span>
                </TabsTrigger>
              </TabsList>

              {/* Submissions Tab */}
              <TabsContent value="submissions" className="space-y-4" data-testid="submissions-tab">
                {submissionsWithRank.length > 0 ? (
                  <div className="space-y-4">
                    {submissionsWithRank.map((submission: any) => (
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
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg" data-testid={`submission-title-${submission.id}`}>
                                      {submission.title}
                                    </h3>
                                    {submission.rank && submission.rank <= 5 && submission.status === "approved" && (
                                      <Badge className="gradient-glory text-white" data-testid={`rank-badge-${submission.id}`}>
                                        <Medal className="w-3 h-3 mr-1" />
                                        #{submission.rank}
                                      </Badge>
                                    )}
                                  </div>
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
                                {submission.tags && submission.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {submission.tags.map((tag: string, idx: number) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <div className="flex items-center space-x-1">
                                    <Trophy className="w-4 h-4" />
                                    <span data-testid={`submission-contest-${submission.id}`}>
                                      {submission.contest.title}
                                    </span>
                                  </div>
                                  {submission.status === "approved" && (
                                    <div className="flex items-center space-x-1 font-semibold text-primary">
                                      <Trophy className="w-4 h-4" />
                                      <span data-testid={`submission-votes-${submission.id}`}>
                                        {submission.votesCount} votes
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(submission)}
                                    data-testid={`button-edit-${submission.id}`}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleShare(submission)}
                                    data-testid={`button-share-${submission.id}`}
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(submission.id)}
                                    data-testid={`button-delete-${submission.id}`}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
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
                      <Trophy className="w-12 h-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No active contest submissions</h3>
                    <p className="text-muted-foreground mb-6">
                      You don't have any submissions in active contests. Start competing!
                    </p>
                    <Link href="/contests" data-testid="browse-contests-button">
                      <GlassButton>
                        Browse Active Contests
                        <Trophy className="w-4 h-4 ml-2" />
                      </GlassButton>
                    </Link>
                  </div>
                )}
              </TabsContent>

              {/* Glory History Tab */}
              <TabsContent value="glory" className="space-y-4" data-testid="glory-tab">
                {gloryHistory.length > 0 ? (
                  <>
                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        onClick={handleClearGloryHistory}
                        disabled={clearGloryHistoryMutation.isPending}
                        data-testid="button-clear-glory-history"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear All History
                      </Button>
                    </div>
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
                  </>
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
                        {editingUsername ? (
                          <div className="flex gap-2 mt-2">
                            <Input
                              value={newUsername}
                              onChange={(e) => setNewUsername(e.target.value)}
                              placeholder="Enter new username"
                              data-testid="input-new-username"
                            />
                            <Button
                              size="sm"
                              onClick={handleSaveUsername}
                              disabled={updateUsernameMutation.isPending}
                              data-testid="button-save-username"
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingUsername(false);
                                setNewUsername("");
                              }}
                              data-testid="button-cancel-username"
                            >
                              <XIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-muted-foreground">{user.username}</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingUsername(true);
                                setNewUsername(user.username);
                              }}
                              data-testid="button-edit-username"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
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
                      <div>
                        <label className="text-sm font-medium">Member Since</label>
                        <p className="text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <WalletConnect />

                <Card className="border-destructive">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-2 text-destructive">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Once you delete your profile, there is no going back. This will permanently delete your account, submissions, votes, and GLORY balance.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteProfile}
                      disabled={deleteProfileMutation.isPending}
                      data-testid="button-delete-profile"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Profile
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Edit Submission Modal */}
      <EditSubmissionModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleSaveEdit}
        submission={selectedSubmission || { id: '', title: '', description: '', tags: [] }}
      />

      {/* Withdraw Glory Modal */}
      <Dialog open={withdrawModalOpen} onOpenChange={setWithdrawModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cash Out GLORY
            </DialogTitle>
            <DialogDescription>
              Convert your GLORY points to USDC on Solana
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {walletData?.wallet && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Wallet Address</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 rounded-lg bg-muted/50">
                    <p className="font-mono text-sm break-all">{walletData.wallet.address}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyWallet}
                    data-testid="button-copy-wallet"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <CashoutRequest />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
