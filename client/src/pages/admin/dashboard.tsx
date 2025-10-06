import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Shield, 
  Users, 
  Image as ImageIcon, 
  Trophy, 
  Crown, 
  Clock, 
  Search, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Calendar,
  Eye,
  BarChart3,
  DollarSign,
  Loader2,
  Trash2
} from "lucide-react";
import { useAuth, isAdmin } from "@/lib/auth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreateContestModal } from "@/components/CreateContestModal";

export default function AdminDashboard() {
  const { data: user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState("all");
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState("");
  const [isCreateContestModalOpen, setIsCreateContestModalOpen] = useState(false);
  const [txHashDialogOpen, setTxHashDialogOpen] = useState(false);
  const [selectedCashoutId, setSelectedCashoutId] = useState("");
  const [txHashInput, setTxHashInput] = useState("");

  // Redirect if not admin
  if (!user || !isAdmin(user)) {
    setLocation("/");
    return null;
  }

  // Fetch admin data
  const { data: users = [] } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["/api/submissions", { admin: true }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("limit", "1000");
      const response = await fetch(`/api/submissions?${params.toString()}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    },
  });

  const { data: contests = [] } = useQuery({
    queryKey: ["/api/contests"],
    queryFn: async () => {
      const response = await fetch("/api/contests", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch contests");
      return response.json();
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["/api/admin/audit-logs"],
    queryFn: async () => {
      const response = await fetch("/api/admin/audit-logs", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch audit logs");
      return response.json();
    },
  });

  const { data: cashoutRequests = [] } = useQuery({
    queryKey: ["/api/admin/cashout/requests"],
    queryFn: async () => {
      const response = await fetch("/api/admin/cashout/requests", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch cashout requests");
      const data = await response.json();
      return data.requests;
    },
  });

  // Mutations
  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User status updated",
        description: "The user's status has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user status.",
        variant: "destructive",
      });
    },
  });

  const updateSubmissionStatusMutation = useMutation({
    mutationFn: async ({ submissionId, status }: { submissionId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/admin/submissions/${submissionId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Submission status updated",
        description: "The submission's status has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update submission status.",
        variant: "destructive",
      });
    },
  });

  const deleteSubmissionMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/submissions/${submissionId}`);
      if (!response.ok) throw new Error("Failed to delete submission");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Submission deleted",
        description: "The submission has been permanently deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete submission.",
        variant: "destructive",
      });
    },
  });

  const activateContestMutation = useMutation({
    mutationFn: async (contestId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/contests/${contestId}/activate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      toast({
        title: "Contest activated",
        description: "Contest is now active and users can submit entries.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to activate contest.",
        variant: "destructive",
      });
    },
  });

  const endContestMutation = useMutation({
    mutationFn: async (contestId: string) => {
      const response = await apiRequest("POST", `/api/admin/contests/${contestId}/end`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      toast({
        title: "Contest ended",
        description: "Contest has been ended and rewards have been distributed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to end contest.",
        variant: "destructive",
      });
    },
  });

  const createContestMutation = useMutation({
    mutationFn: async (formData: any) => {
      const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      // Handle start date
      const startAt = formData.startDateOption === 'now' 
        ? new Date() 
        : new Date(`${formData.startDate}T${formData.startTime || '00:00'}`);
      
      // Handle end date (submission deadline)
      const endAt = new Date(`${formData.endDate}T${formData.endTime || '23:59'}`);
      
      // Build rules text from form data
      const rulesText = `
## Contest Rules

### Contest Type
${formData.contestType || 'Image'} Contest

### Category
${formData.category || 'General'}

### Prize Pool
${formData.prizePool} ${formData.currency}

### Prize Distribution
${formData.prizeDistribution.map((p: any) => `${p.place} place: ${p.value} ${formData.currency}`).join('\n')}

### Participation Rules
- Eligibility: ${formData.eligibility}
- Max Submissions per User: ${formData.maxSubmissions}
- File Size Limit: ${formData.fileSizeLimit}MB
- Allowed Media Types: ${formData.allowedMediaTypes.join(', ')}
- NSFW Content: ${formData.nsfwAllowed ? 'Allowed' : 'Not Allowed'}

### Entry Fee
${formData.entryFee ? `${formData.entryFeeAmount} ${formData.currency}` : 'Free to enter'}

### Voting Rules
- Methods: ${formData.votingMethods.join(', ')}
- Votes per period: ${formData.voteLimitPerPeriod}
- Period duration: ${formData.votePeriodHours} hours
- Total vote limit: ${formData.totalVoteLimit === 0 ? 'Unlimited' : formData.totalVoteLimit}

### Important Dates
- Voting Start: ${formData.votingStartOption === 'now' ? 'Immediately' : `${formData.votingStartDate}`}
- Contest End: ${formData.votingEndDate} ${formData.votingEndTime || ''}
      `.trim();
      
      // Store all configuration in a structured format
      const config = {
        contestType: formData.contestType,
        category: formData.category,
        currency: formData.currency,
        prizeDistribution: formData.prizeDistribution,
        entryFee: formData.entryFee,
        entryFeeAmount: formData.entryFeeAmount,
        eligibility: formData.eligibility,
        maxSubmissions: formData.maxSubmissions,
        fileSizeLimit: formData.fileSizeLimit,
        allowedMediaTypes: formData.allowedMediaTypes,
        nsfwAllowed: formData.nsfwAllowed,
        votingMethods: formData.votingMethods,
        voteLimitPerPeriod: formData.voteLimitPerPeriod,
        votePeriodHours: formData.votePeriodHours,
        totalVoteLimit: formData.totalVoteLimit,
        votingStartOption: formData.votingStartOption,
        votingStartDate: formData.votingStartDate,
        votingEndDate: formData.votingEndDate,
        votingEndTime: formData.votingEndTime,
        featured: formData.featured
      };
      
      const contestData = {
        title: formData.title,
        slug,
        description: formData.description,
        rules: rulesText,
        prizeGlory: parseInt(formData.prizePool) || 0,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        status: formData.status || 'draft',
        coverImageUrl: formData.coverImage || null,
        config
      };

      const response = await apiRequest("POST", "/api/admin/contests", contestData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      setIsCreateContestModalOpen(false);
      toast({
        title: "Contest created",
        description: "The contest has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create contest.",
        variant: "destructive",
      });
    },
  });

  const approveCashoutMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("POST", "/api/admin/cashout/approve", { requestId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cashout/requests"] });
      toast({
        title: "Cashout Approved",
        description: "GLORY has been deducted. Remember to send tokens and mark as sent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve cashout.",
        variant: "destructive",
      });
    },
  });

  const rejectCashoutMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("POST", "/api/admin/cashout/reject", { requestId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cashout/requests"] });
      toast({
        title: "Cashout Rejected",
        description: "The cashout request has been rejected.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject cashout.",
        variant: "destructive",
      });
    },
  });

  const markCashoutSentMutation = useMutation({
    mutationFn: async ({ requestId, txHash }: { requestId: string; txHash: string }) => {
      return apiRequest("POST", "/api/admin/cashout/mark-sent", { requestId, txHash });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cashout/requests"] });
      toast({
        title: "Cashout Marked as Sent",
        description: "The transaction has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark cashout as sent.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-success/20 text-success border-success/30";
      case "pending":
        return "bg-muted text-muted-foreground border-border";
      case "banned":
      case "rejected":
        return "bg-destructive/20 text-destructive border-destructive/30";
      case "active":
        return "bg-success/20 text-success border-success/30";
      case "ended":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
      case "active":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "banned":
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  // Helper for transaction hash submission
  const handleMarkAsSent = () => {
    if (!txHashInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter a transaction hash",
        variant: "destructive",
      });
      return;
    }
    markCashoutSentMutation.mutate(
      { requestId: selectedCashoutId, txHash: txHashInput },
      {
        onSuccess: () => {
          setTxHashDialogOpen(false);
          setTxHashInput("");
          setSelectedCashoutId("");
        },
      }
    );
  };

  const openTxHashDialog = (requestId: string) => {
    setSelectedCashoutId(requestId);
    setTxHashDialogOpen(true);
  };

  // Stats calculations
  const pendingUsers = users.filter((u: any) => u.status === "pending").length;
  const pendingSubmissions = submissions.filter((s: any) => s.status === "pending").length;
  const activeContests = contests.filter((c: any) => c.status === "active").length;
  const totalGloryDistributed = users.reduce((sum: number, u: any) => sum + u.gloryBalance, 0);
  const pendingCashouts = cashoutRequests.filter((r: any) => r.status === "pending").length;

  // Filtered users
  const filteredUsers = users.filter((user: any) => {
    const matchesStatus = userStatusFilter === "all" || user.status === userStatusFilter;
    const matchesSearch = user.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(userSearchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Filtered submissions
  const filteredSubmissions = submissions.filter((submission: any) => {
    const matchesStatus = submissionStatusFilter === "all" || submission.status === submissionStatusFilter;
    const matchesSearch = 
      submission.title.toLowerCase().includes(submissionSearchQuery.toLowerCase()) ||
      (submission.description?.toLowerCase() || "").includes(submissionSearchQuery.toLowerCase()) ||
      submission.user.username.toLowerCase().includes(submissionSearchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen py-16" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2 flex items-center" data-testid="admin-title">
              <Shield className="w-10 h-10 text-primary mr-3" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Manage users, submissions, and contests</p>
          </div>
          <Badge variant="outline" className="text-primary border-primary">
            <Shield className="w-4 h-4 mr-2" />
            Admin Access
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="stat-pending-users">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingUsers}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card data-testid="stat-pending-submissions">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Submissions</CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingSubmissions}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting review
              </p>
            </CardContent>
          </Card>

          <Card data-testid="stat-active-contests">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Contests</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeContests}</div>
              <p className="text-xs text-muted-foreground">
                Currently running
              </p>
            </CardContent>
          </Card>

          <Card data-testid="stat-total-glory">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total GLORY</CardTitle>
              <Crown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGloryDistributed.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Distributed to users
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-4" data-testid="admin-tabs">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="submissions" data-testid="tab-submissions">
              <ImageIcon className="w-4 h-4 mr-2" />
              Submissions
            </TabsTrigger>
            <TabsTrigger value="contests" data-testid="tab-contests">
              <Trophy className="w-4 h-4 mr-2" />
              Contests
            </TabsTrigger>
            <TabsTrigger value="cashouts" data-testid="tab-cashouts">
              <DollarSign className="w-4 h-4 mr-2" />
              Cashouts
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <BarChart3 className="w-4 h-4 mr-2" />
              Audit Logs
            </TabsTrigger>
          </TabsList>

          {/* Users Management Tab */}
          <TabsContent value="users" className="space-y-4" data-testid="users-tab">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Select value={userStatusFilter} onValueChange={setUserStatusFilter} data-testid="user-status-filter">
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="banned">Banned</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                        data-testid="user-search"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="users-table">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          GLORY
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Joined
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredUsers.map((user: any) => (
                        <tr key={user.id} className="hover:bg-muted/30 transition-colors" data-testid={`user-row-${user.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarFallback className={user.status === "banned" ? "bg-destructive/20 text-destructive" : "bg-secondary text-secondary-foreground"}>
                                  {getInitials(user.username)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className={`font-semibold ${user.status === "banned" ? "line-through opacity-60" : ""}`} data-testid={`username-${user.id}`}>
                                  {user.username}
                                </div>
                                <div className="text-sm text-muted-foreground" data-testid={`email-${user.id}`}>
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusColor(user.status)} data-testid={`status-${user.id}`}>
                              {getStatusIcon(user.status)}
                              <span className="ml-1">{user.status.charAt(0).toUpperCase() + user.status.slice(1)}</span>
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-semibold font-mono" data-testid={`glory-${user.id}`}>
                            {user.gloryBalance.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground" data-testid={`joined-${user.id}`}>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {user.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-success/20 text-success hover:bg-success/30 border-success/30"
                                  onClick={() => updateUserStatusMutation.mutate({ userId: user.id, status: "approved" })}
                                  disabled={updateUserStatusMutation.isPending}
                                  data-testid={`approve-user-${user.id}`}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                              )}
                              {user.status !== "banned" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30"
                                  onClick={() => updateUserStatusMutation.mutate({ userId: user.id, status: "banned" })}
                                  disabled={updateUserStatusMutation.isPending}
                                  data-testid={`ban-user-${user.id}`}
                                >
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Ban
                                </Button>
                              )}
                              {user.status === "banned" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-success/20 text-success hover:bg-success/30 border-success/30"
                                  onClick={() => updateUserStatusMutation.mutate({ userId: user.id, status: "approved" })}
                                  disabled={updateUserStatusMutation.isPending}
                                  data-testid={`unban-user-${user.id}`}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Unban
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submissions Tab */}
          <TabsContent value="submissions" className="space-y-4" data-testid="submissions-tab">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Submission Management</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Select value={submissionStatusFilter} onValueChange={setSubmissionStatusFilter} data-testid="submission-status-filter">
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search submissions..."
                        value={submissionSearchQuery}
                        onChange={(e) => setSubmissionSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                        data-testid="submission-search"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSubmissions.map((submission: any) => (
                    <Card key={submission.id} className="overflow-hidden" data-testid={`pending-submission-${submission.id}`}>
                      <div className="relative aspect-square">
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
                        <div className="absolute top-3 right-3">
                          <Badge variant="secondary" className="text-xs">
                            {submission.type === "image" ? (
                              <><Eye className="w-3 h-3 mr-1" />Image</>
                            ) : (
                              <><Eye className="w-3 h-3 mr-1" />Video</>
                            )}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <h4 className="font-bold mb-2" data-testid={`submission-title-${submission.id}`}>
                          {submission.title}
                        </h4>
                        {submission.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2" data-testid={`submission-description-${submission.id}`}>
                            {submission.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between text-sm mb-3">
                          <div className="flex items-center space-x-2 text-muted-foreground">
                            <span data-testid={`submission-author-${submission.id}`}>
                              @{submission.user.username}
                            </span>
                          </div>
                          <Badge className={getStatusColor(submission.status)} data-testid={`submission-status-${submission.id}`}>
                            {getStatusIcon(submission.status)}
                            <span className="ml-1">{submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}</span>
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mb-4" data-testid={`submission-contest-${submission.id}`}>
                          {submission.contest.title} • {submission.voteCount || 0} votes
                        </div>
                        <div className="flex items-center gap-2">
                          {submission.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="flex-1 bg-success/20 text-success hover:bg-success/30 border border-success/30"
                                onClick={() => updateSubmissionStatusMutation.mutate({ submissionId: submission.id, status: "approved" })}
                                disabled={updateSubmissionStatusMutation.isPending}
                                data-testid={`approve-submission-${submission.id}`}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30"
                                onClick={() => updateSubmissionStatusMutation.mutate({ submissionId: submission.id, status: "rejected" })}
                                disabled={updateSubmissionStatusMutation.isPending}
                                data-testid={`reject-submission-${submission.id}`}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {submission.status === "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30"
                              onClick={() => updateSubmissionStatusMutation.mutate({ submissionId: submission.id, status: "rejected" })}
                              disabled={updateSubmissionStatusMutation.isPending}
                              data-testid={`reject-submission-${submission.id}`}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Reject
                            </Button>
                          )}
                          {submission.status === "rejected" && (
                            <Button
                              size="sm"
                              className="flex-1 bg-success/20 text-success hover:bg-success/30 border border-success/30"
                              onClick={() => updateSubmissionStatusMutation.mutate({ submissionId: submission.id, status: "approved" })}
                              disabled={updateSubmissionStatusMutation.isPending}
                              data-testid={`approve-submission-${submission.id}`}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/30"
                            onClick={() => {
                              if (confirm('Are you sure you want to permanently delete this submission? This action cannot be undone.')) {
                                deleteSubmissionMutation.mutate(submission.id);
                              }
                            }}
                            disabled={deleteSubmissionMutation.isPending}
                            data-testid={`delete-submission-${submission.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {filteredSubmissions.length === 0 && (
                  <div className="text-center py-12" data-testid="no-submissions-found">
                    <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No submissions found</h3>
                    <p className="text-muted-foreground">
                      {submissionSearchQuery || submissionStatusFilter !== "all" 
                        ? "Try adjusting your filters or search query."
                        : "No submissions have been uploaded yet."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contests Tab */}
          <TabsContent value="contests" className="space-y-4" data-testid="contests-tab">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Contest Management</CardTitle>
                  <Button 
                    className="gradient-glory" 
                    data-testid="create-contest-button"
                    onClick={() => setIsCreateContestModalOpen(true)}
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Create Contest
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {contests.map((contest: any) => (
                    <Card key={contest.id} className={contest.status === "active" ? "border-primary/50" : ""} data-testid={`contest-item-${contest.id}`}>
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-xl font-bold" data-testid={`contest-title-${contest.id}`}>
                                {contest.title}
                              </h4>
                              <Badge className={getStatusColor(contest.status)} data-testid={`contest-status-${contest.id}`}>
                                {getStatusIcon(contest.status)}
                                <span className="ml-1">{contest.status.charAt(0).toUpperCase() + contest.status.slice(1)}</span>
                              </Badge>
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Prize Pool:</span>
                                <span className="font-semibold ml-2 text-primary" data-testid={`contest-prize-${contest.id}`}>
                                  {contest.prizeGlory.toLocaleString()} GLORY
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Submissions:</span>
                                <span className="font-semibold ml-2" data-testid={`contest-submissions-${contest.id}`}>
                                  {contest.submissionCount || 0}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Participants:</span>
                                <span className="font-semibold ml-2" data-testid={`contest-participants-${contest.id}`}>
                                  {contest.participantCount || 0}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Total Votes:</span>
                                <span className="font-semibold ml-2" data-testid={`contest-votes-${contest.id}`}>
                                  {contest.totalVotes || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setLocation(`/admin/contest/${contest.id}`)}
                              data-testid={`view-contest-${contest.id}`}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            {contest.status === "draft" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/30"
                                onClick={() => activateContestMutation.mutate(contest.id)}
                                disabled={activateContestMutation.isPending}
                                data-testid={`activate-contest-${contest.id}`}
                              >
                                <Trophy className="w-4 h-4 mr-2" />
                                Activate
                              </Button>
                            )}
                            {contest.status === "active" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gradient-glory"
                                onClick={() => endContestMutation.mutate(contest.id)}
                                disabled={endContestMutation.isPending}
                                data-testid={`end-contest-${contest.id}`}
                              >
                                <Trophy className="w-4 h-4 mr-2" />
                                End & Distribute
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {contests.length === 0 && (
                  <div className="text-center py-12" data-testid="no-contests">
                    <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No contests yet</h3>
                    <p className="text-muted-foreground">Create your first contest to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cashouts Tab */}
          <TabsContent value="cashouts" className="space-y-4" data-testid="cashouts-tab">
            <Card>
              <CardHeader>
                <CardTitle>Cashout Requests Management</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="cashouts-table">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Wallet
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {cashoutRequests.map((request: any) => (
                        <tr key={request.id} className="hover:bg-muted/30 transition-colors" data-testid={`cashout-request-${request.id}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarFallback>
                                  {getInitials(request.user.username)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-semibold" data-testid={`cashout-username-${request.id}`}>
                                  {request.user.username}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {request.user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-semibold font-mono" data-testid={`cashout-amount-${request.id}`}>
                              {request.amountGlory.toLocaleString()} GLORY
                            </div>
                            <div className="text-sm text-muted-foreground">
                              → {request.amountToken} {request.tokenType}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-mono text-xs max-w-[200px] truncate" data-testid={`cashout-wallet-${request.id}`}>
                              {request.wallet.address}
                            </div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {request.wallet.provider}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusColor(request.status)} data-testid={`cashout-status-${request.id}`}>
                              {getStatusIcon(request.status)}
                              <span className="ml-1">{request.status.charAt(0).toUpperCase() + request.status.slice(1)}</span>
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-2">
                              {request.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-success/20 text-success hover:bg-success/30 border-success/30"
                                    onClick={() => approveCashoutMutation.mutate(request.id)}
                                    disabled={approveCashoutMutation.isPending}
                                    data-testid={`approve-cashout-${request.id}`}
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30"
                                    onClick={() => rejectCashoutMutation.mutate(request.id)}
                                    disabled={rejectCashoutMutation.isPending}
                                    data-testid={`reject-cashout-${request.id}`}
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {request.status === "approved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/30"
                                  onClick={() => openTxHashDialog(request.id)}
                                  data-testid={`mark-sent-${request.id}`}
                                >
                                  <DollarSign className="w-3 h-3 mr-1" />
                                  Mark as Sent
                                </Button>
                              )}
                              {request.txHash && (
                                <a
                                  href={`https://solscan.io/tx/${request.txHash}?cluster=devnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline"
                                  data-testid={`view-tx-${request.id}`}
                                >
                                  View TX
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {cashoutRequests.length === 0 && (
                  <div className="text-center py-12" data-testid="no-cashouts">
                    <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No cashout requests</h3>
                    <p className="text-muted-foreground">Cashout requests will appear here when users request them.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Logs Tab */}
          <TabsContent value="audit" className="space-y-4" data-testid="audit-tab">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="audit-logs-table">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Admin
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Action
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {auditLogs.map((log: any, index: number) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors" data-testid={`audit-log-${index}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" data-testid={`log-admin-${index}`}>
                            Admin #{log.actorUserId.substring(0, 8)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" data-testid={`log-action-${index}`}>
                            <Badge variant="outline" className="text-xs">
                              {log.action.replace(/_/g, " ").toLowerCase()}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground" data-testid={`log-details-${index}`}>
                            {log.meta ? JSON.stringify(log.meta).substring(0, 100) + "..." : "No details"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {auditLogs.length === 0 && (
                  <div className="text-center py-12" data-testid="no-audit-logs">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No audit logs</h3>
                    <p className="text-muted-foreground">Admin actions will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CreateContestModal
        isOpen={isCreateContestModalOpen}
        onClose={() => setIsCreateContestModalOpen(false)}
        onSubmit={(formData) => createContestMutation.mutate(formData)}
      />

      <Dialog open={txHashDialogOpen} onOpenChange={setTxHashDialogOpen}>
        <DialogContent data-testid="tx-hash-dialog">
          <DialogHeader>
            <DialogTitle>Enter Transaction Hash</DialogTitle>
            <DialogDescription>
              Enter the Solana transaction hash after sending tokens to the user's wallet.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="txHash">Transaction Hash</Label>
              <Input
                id="txHash"
                placeholder="Enter Solana transaction hash..."
                value={txHashInput}
                onChange={(e) => setTxHashInput(e.target.value)}
                data-testid="input-tx-hash"
              />
              <p className="text-xs text-muted-foreground">
                This will be recorded and displayed to the user
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setTxHashDialogOpen(false);
                setTxHashInput("");
              }}
              data-testid="button-cancel-tx"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkAsSent}
              disabled={markCashoutSentMutation.isPending}
              data-testid="button-confirm-tx"
            >
              {markCashoutSentMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Mark as Sent"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
