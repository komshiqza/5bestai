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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
  Trash2,
  Edit3,
  Copy,
  Download
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
  const [submissionContestFilter, setSubmissionContestFilter] = useState("all");
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState("");
  const [isCreateContestModalOpen, setIsCreateContestModalOpen] = useState(false);
  
  // Bulk deletion state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Bulk submission actions state
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);

  // Bulk contest actions state
  const [selectedContestIds, setSelectedContestIds] = useState<string[]>([]);
  const [bulkDeleteContestsDialogOpen, setBulkDeleteContestsDialogOpen] = useState(false);
  const [deleteContestsConfirmText, setDeleteContestsConfirmText] = useState("");

  // Bulk cashout actions state
  const [selectedCashoutIds, setSelectedCashoutIds] = useState<string[]>([]);

  // Balance edit state
  const [gloryEditDialogOpen, setGloryEditDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [gloryAmountInput, setGloryAmountInput] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<"GLORY" | "SOL" | "USDC">("GLORY");

  // Clear audit logs state
  const [clearLogsDialogOpen, setClearLogsDialogOpen] = useState(false);
  const [clearLogsConfirmText, setClearLogsConfirmText] = useState("");

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
    queryKey: ["/api/admin/submissions"],
    queryFn: async () => {
      const response = await fetch("/api/admin/submissions", { credentials: "include" });
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
    refetchInterval: 10000,
  });

  // Site Settings
  const { data: siteSettings } = useQuery<{ privateMode: boolean }>({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/settings", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch site settings");
      return response.json();
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
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

  const bulkApproveSubmissionsMutation = useMutation({
    mutationFn: async (submissionIds: string[]) => {
      const response = await apiRequest("PATCH", "/api/admin/submissions/bulk/approve", { submissionIds });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      setSelectedSubmissionIds([]);
      toast({
        title: "Submissions approved",
        description: `Successfully approved ${data.count} submission(s).`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve submissions.",
        variant: "destructive",
      });
    },
  });

  const bulkRejectSubmissionsMutation = useMutation({
    mutationFn: async (submissionIds: string[]) => {
      const response = await apiRequest("PATCH", "/api/admin/submissions/bulk/reject", { submissionIds });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      setSelectedSubmissionIds([]);
      toast({
        title: "Submissions rejected",
        description: `Successfully rejected ${data.count} submission(s).`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject submissions.",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteSubmissionsMutation = useMutation({
    mutationFn: async (submissionIds: string[]) => {
      const response = await apiRequest("DELETE", "/api/admin/submissions/bulk", { submissionIds });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      setSelectedSubmissionIds([]);
      toast({
        title: "Submissions deleted",
        description: `Successfully deleted ${data.count} submission(s).`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete submissions.",
        variant: "destructive",
      });
    },
  });

  const cleanupBrokenSubmissionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/cleanup-broken-submissions", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me/submissions"] });
      toast({
        title: "Cleanup completed",
        description: data.message || `Successfully removed ${data.deletedCount} broken submission(s).`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cleanup broken submissions.",
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

  const bulkActivateContestsMutation = useMutation({
    mutationFn: async (contestIds: string[]) => {
      const response = await apiRequest("PATCH", "/api/admin/contests/bulk/activate", { contestIds });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      setSelectedContestIds([]);
      toast({
        title: "Contests activated",
        description: `Successfully activated ${data.updatedCount} contests.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to activate contests.",
        variant: "destructive",
      });
    },
  });

  const bulkEndContestsMutation = useMutation({
    mutationFn: async (contestIds: string[]) => {
      const response = await apiRequest("POST", "/api/admin/contests/bulk/end", { contestIds });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      setSelectedContestIds([]);
      toast({
        title: "Contests ended",
        description: `Successfully ended ${data.endedCount} contests and distributed rewards.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to end contests.",
        variant: "destructive",
      });
    },
  });

  const bulkDeleteContestsMutation = useMutation({
    mutationFn: async (contestIds: string[]) => {
      const response = await apiRequest("DELETE", "/api/admin/contests/bulk", { contestIds });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      setSelectedContestIds([]);
      setBulkDeleteContestsDialogOpen(false);
      setDeleteContestsConfirmText("");
      toast({
        title: "Contests deleted",
        description: `Successfully deleted ${data.deletedCount} contests.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contests.",
        variant: "destructive",
      });
    },
  });

  const createContestMutation = useMutation({
    mutationFn: async (formData: any) => {
      // The CreateContestModal already sends data in the correct format
      // with all processing done (slug, dates, config object, etc.)
      const response = await apiRequest("POST", "/api/admin/contests", formData);
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

  // Bulk cashout approval mutation
  const bulkApproveCashoutsMutation = useMutation({
    mutationFn: async (requestIds: string[]) => {
      const response = await apiRequest("POST", "/api/admin/cashout/bulk-approve", { requestIds });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cashout/requests"] });
      setSelectedCashoutIds([]);
      toast({
        title: "Cashouts approved",
        description: `Successfully approved ${data.approvedCount} cashout requests.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve cashouts.",
        variant: "destructive",
      });
    },
  });

  // Bulk cashout rejection mutation
  const bulkRejectCashoutsMutation = useMutation({
    mutationFn: async (requestIds: string[]) => {
      const response = await apiRequest("POST", "/api/admin/cashout/bulk-reject", { requestIds });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cashout/requests"] });
      setSelectedCashoutIds([]);
      toast({
        title: "Cashouts rejected",
        description: `Successfully rejected ${data.rejectedCount} cashout requests.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject cashouts.",
        variant: "destructive",
      });
    },
  });

  // Bulk user approval mutation
  const bulkApproveUsersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const response = await apiRequest("PATCH", "/api/admin/users/bulk/approve", { userIds });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setSelectedUserIds([]);
      toast({
        title: "Users approved",
        description: `Successfully approved ${data.updatedCount} users.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve users.",
        variant: "destructive",
      });
    },
  });

  // Bulk user deletion mutation
  const bulkDeleteUsersMutation = useMutation({
    mutationFn: async (userIds: string[]) => {
      const response = await apiRequest("DELETE", "/api/admin/users/bulk", { userIds });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/submissions"] });
      setSelectedUserIds([]);
      setBulkDeleteDialogOpen(false);
      setDeleteConfirmText("");
      toast({
        title: "Users deleted",
        description: `Successfully deleted ${data.deletedCount} users and all their associated assets.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete users.",
        variant: "destructive",
      });
    },
  });

  // Clear audit logs mutation
  const clearAuditLogsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/admin/audit-logs", {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/audit-logs"] });
      setClearLogsDialogOpen(false);
      setClearLogsConfirmText("");
      toast({
        title: "Audit logs cleared",
        description: "All audit logs have been successfully cleared.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear audit logs.",
        variant: "destructive",
      });
    },
  });

  // Update Balance mutation
  const updateGloryBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount, operation, currency }: { userId: string; amount: number; operation: 'set' | 'add' | 'subtract'; currency: 'GLORY' | 'SOL' | 'USDC' }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}/balance`, { 
        amount, 
        operation,
        currency
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setGloryEditDialogOpen(false);
      setGloryAmountInput("");
      setSelectedUserId("");
      const updatedCurrency = variables.currency;
      setSelectedCurrency("GLORY");
      
      // Also invalidate /api/me for all users to update their balance display
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      
      // Force refetch to ensure immediate update
      queryClient.refetchQueries({ queryKey: ["/api/me"] });
      
      toast({
        title: "Balance updated",
        description: data.message || `Successfully updated user's ${updatedCurrency} balance.`,
      });
    },
    onError: (error: any, variables) => {
      toast({
        title: "Error",
        description: error.message || `Failed to update ${variables.currency} balance.`,
        variant: "destructive",
      });
    },
  });

  // Update Private Mode mutation
  const updatePrivateModeMutation = useMutation({
    mutationFn: async (privateMode: boolean) => {
      const response = await apiRequest("PATCH", "/api/admin/settings", { privateMode });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Settings Updated",
        description: `Private mode is now ${!siteSettings?.privateMode ? "enabled" : "disabled"}.`,
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update private mode setting.",
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
    const matchesContest = submissionContestFilter === "all" || submission.contestId === submissionContestFilter;
    const matchesSearch = 
      submission.title.toLowerCase().includes(submissionSearchQuery.toLowerCase()) ||
      (submission.description?.toLowerCase() || "").includes(submissionSearchQuery.toLowerCase()) ||
      submission.user.username.toLowerCase().includes(submissionSearchQuery.toLowerCase());
    return matchesStatus && matchesContest && matchesSearch;
  });

  // Helper functions for bulk selection
  const handleUserSelect = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds(prev => [...prev, userId]);
    } else {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(filteredUsers.map((user: any) => user.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const isAllSelected = filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length;
  const isSomeSelected = selectedUserIds.length > 0 && selectedUserIds.length < filteredUsers.length;

  const handleBulkApprove = () => {
    if (selectedUserIds.length === 0) return;
    bulkApproveUsersMutation.mutate(selectedUserIds);
  };

  const handleBulkDelete = () => {
    if (selectedUserIds.length === 0) return;
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    if (deleteConfirmText !== "DELETE") {
      toast({
        title: "Confirmation required",
        description: 'Please type "DELETE" to confirm the deletion.',
        variant: "destructive",
      });
      return;
    }
    bulkDeleteUsersMutation.mutate(selectedUserIds);
  };

  // Helper functions for bulk submission selection
  const handleSubmissionSelect = (submissionId: string, checked: boolean) => {
    if (checked) {
      setSelectedSubmissionIds(prev => [...prev, submissionId]);
    } else {
      setSelectedSubmissionIds(prev => prev.filter(id => id !== submissionId));
    }
  };

  const handleSelectAllSubmissions = (checked: boolean) => {
    if (checked) {
      setSelectedSubmissionIds(filteredSubmissions.map((sub: any) => sub.id));
    } else {
      setSelectedSubmissionIds([]);
    }
  };

  const isAllSubmissionsSelected = filteredSubmissions.length > 0 && selectedSubmissionIds.length === filteredSubmissions.length;
  const isSomeSubmissionsSelected = selectedSubmissionIds.length > 0 && selectedSubmissionIds.length < filteredSubmissions.length;

  // Helper function to open Balance edit dialog
  const openGloryEditDialog = (userId: string) => {
    setSelectedUserId(userId);
    setGloryAmountInput("");
    setSelectedCurrency("GLORY");
    setGloryEditDialogOpen(true);
  };

  // Helper function to handle Glory balance update
  const handleGloryBalanceUpdate = () => {
    // Prevent double clicks while mutation is pending
    if (updateGloryBalanceMutation.isPending) {
      return;
    }

    const input = gloryAmountInput.trim();
    if (!input) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    let operation: 'set' | 'add' | 'subtract';
    let amount: number;

    if (input.startsWith('+')) {
      operation = 'add';
      amount = parseInt(input.substring(1));
    } else if (input.startsWith('-')) {
      operation = 'subtract';
      amount = parseInt(input.substring(1));
    } else {
      // When no +/- prefix, treat as 'set' operation
      operation = 'set';
      amount = parseInt(input);
    }

    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number (0 or greater)",
        variant: "destructive",
      });
      return;
    }

    updateGloryBalanceMutation.mutate({ userId: selectedUserId, amount, operation, currency: selectedCurrency });
  };

  // Helper functions for bulk contest selection
  const handleContestSelect = (contestId: string, checked: boolean) => {
    if (checked) {
      setSelectedContestIds(prev => [...prev, contestId]);
    } else {
      setSelectedContestIds(prev => prev.filter(id => id !== contestId));
    }
  };

  const handleSelectAllContests = (checked: boolean) => {
    if (checked) {
      setSelectedContestIds(contests.map((contest: any) => contest.id));
    } else {
      setSelectedContestIds([]);
    }
  };

  const isAllContestsSelected = contests.length > 0 && selectedContestIds.length === contests.length;
  const isSomeContestsSelected = selectedContestIds.length > 0 && selectedContestIds.length < contests.length;

  const handleBulkActivateContests = () => {
    if (selectedContestIds.length === 0) return;
    bulkActivateContestsMutation.mutate(selectedContestIds);
  };

  const handleBulkEndContests = () => {
    if (selectedContestIds.length === 0) return;
    bulkEndContestsMutation.mutate(selectedContestIds);
  };

  const handleBulkDeleteContests = () => {
    if (selectedContestIds.length === 0) return;
    setBulkDeleteContestsDialogOpen(true);
  };

  const confirmBulkDeleteContests = () => {
    if (deleteContestsConfirmText !== "DELETE") {
      toast({
        title: "Confirmation required",
        description: 'Please type "DELETE" to confirm the deletion.',
        variant: "destructive",
      });
      return;
    }
    bulkDeleteContestsMutation.mutate(selectedContestIds);
  };

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
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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

          <Card data-testid="stat-private-mode">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Private Mode</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  {siteSettings?.privateMode ? "Enabled" : "Disabled"}
                </div>
                <Switch
                  checked={siteSettings?.privateMode || false}
                  onCheckedChange={(checked) => updatePrivateModeMutation.mutate(checked)}
                  disabled={updatePrivateModeMutation.isPending}
                  data-testid="switch-private-mode"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {siteSettings?.privateMode ? "Login required" : "Public access"}
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
                    {selectedUserIds.length > 0 && (
                      <>
                        <Button
                          variant="outline"
                          className="bg-success/20 text-success hover:bg-success/30 border-success/30"
                          onClick={handleBulkApprove}
                          data-testid="bulk-approve-button"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Approve Selected ({selectedUserIds.length})
                        </Button>
                        <Button
                          variant="outline"
                          className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30"
                          onClick={handleBulkDelete}
                          data-testid="bulk-delete-button"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Selected ({selectedUserIds.length})
                        </Button>
                      </>
                    )}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const csvData = filteredUsers.map((user: any) => ({
                          Username: user.username,
                          Email: user.email,
                          Status: user.status,
                          'GLORY Balance': user.gloryBalance || 0,
                          'SOL Balance': user.solBalance || 0,
                          'USDC Balance': user.usdcBalance || 0,
                          'Withdrawal Address': user.withdrawalAddress || 'Not set',
                          'Joined': new Date(user.createdAt).toLocaleDateString(),
                        }));
                        
                        const headers = Object.keys(csvData[0] || {});
                        const csv = [
                          headers.join(','),
                          ...csvData.map((row: any) => headers.map(h => `"${row[h]}"`).join(','))
                        ].join('\n');
                        
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                        
                        toast({
                          title: "CSV Downloaded",
                          description: `${filteredUsers.length} users exported successfully`,
                        });
                      }}
                      data-testid="export-users-csv"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="users-table">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <Checkbox
                            checked={isSomeSelected ? "indeterminate" : isAllSelected}
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                            data-testid="select-all-checkbox"
                          />
                        </th>
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
                          <td className="px-6 py-4">
                            <Checkbox
                              checked={selectedUserIds.includes(user.id)}
                              onCheckedChange={(checked) => handleUserSelect(user.id, !!checked)}
                              data-testid={`select-user-${user.id}`}
                            />
                          </td>
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold font-mono" data-testid={`glory-${user.id}`}>
                                {user.gloryBalance.toLocaleString()}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-primary/20"
                                onClick={() => openGloryEditDialog(user.id)}
                                data-testid={`edit-balance-${user.id}`}
                                title="Edit user balance"
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                            </div>
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
                  <div className="flex items-center gap-4">
                    <CardTitle>Submission Management</CardTitle>
                    {filteredSubmissions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isAllSubmissionsSelected}
                          onCheckedChange={handleSelectAllSubmissions}
                          data-testid="select-all-submissions"
                        />
                        <span className="text-sm text-muted-foreground">
                          {selectedSubmissionIds.length > 0 ? `${selectedSubmissionIds.length} selected` : 'Select all'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedSubmissionIds.length > 0 && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-success/20 text-success hover:bg-success/30 border-success/30"
                          onClick={() => bulkApproveSubmissionsMutation.mutate(selectedSubmissionIds)}
                          disabled={bulkApproveSubmissionsMutation.isPending}
                          data-testid="bulk-approve-submissions"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve ({selectedSubmissionIds.length})
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30"
                          onClick={() => bulkRejectSubmissionsMutation.mutate(selectedSubmissionIds)}
                          disabled={bulkRejectSubmissionsMutation.isPending}
                          data-testid="bulk-reject-submissions"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject ({selectedSubmissionIds.length})
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30"
                          onClick={() => bulkDeleteSubmissionsMutation.mutate(selectedSubmissionIds)}
                          disabled={bulkDeleteSubmissionsMutation.isPending}
                          data-testid="bulk-delete-submissions"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete ({selectedSubmissionIds.length})
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-orange-500/30"
                      onClick={() => cleanupBrokenSubmissionsMutation.mutate()}
                      disabled={cleanupBrokenSubmissionsMutation.isPending}
                      data-testid="cleanup-broken-submissions"
                    >
                      {cleanupBrokenSubmissionsMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 mr-1" />
                      )}
                      Cleanup Broken
                    </Button>
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
                    <Select value={submissionContestFilter} onValueChange={setSubmissionContestFilter} data-testid="submission-contest-filter">
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Contests</SelectItem>
                        {contests
                          .filter((contest: any) => contest.status === "active")
                          .map((contest: any) => (
                            <SelectItem key={contest.id} value={contest.id}>
                              {contest.title}
                            </SelectItem>
                          ))}
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
                        <div className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm rounded p-1">
                          <Checkbox
                            checked={selectedSubmissionIds.includes(submission.id)}
                            onCheckedChange={(checked) => handleSubmissionSelect(submission.id, checked as boolean)}
                            data-testid={`select-submission-${submission.id}`}
                          />
                        </div>
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
                          {submission.contest.title} • {submission.votesCount || 0} votes
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
                  <div className="flex items-center gap-2">
                    {selectedContestIds.length > 0 && (
                      <>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="bg-success/20 text-success hover:bg-success/30 border-success/30"
                          onClick={handleBulkActivateContests}
                          disabled={bulkActivateContestsMutation.isPending}
                          data-testid="bulk-activate-contests"
                        >
                          <Trophy className="w-4 h-4 mr-2" />
                          Activate Selected ({selectedContestIds.length})
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="gradient-glory"
                          onClick={handleBulkEndContests}
                          disabled={bulkEndContestsMutation.isPending}
                          data-testid="bulk-end-contests"
                        >
                          <Trophy className="w-4 h-4 mr-2" />
                          End & Distribute Selected ({selectedContestIds.length})
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30"
                          onClick={handleBulkDeleteContests}
                          disabled={bulkDeleteContestsMutation.isPending}
                          data-testid="bulk-delete-contests"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Selected ({selectedContestIds.length})
                        </Button>
                      </>
                    )}
                    <Button 
                      className="gradient-glory" 
                      data-testid="create-contest-button"
                      onClick={() => setIsCreateContestModalOpen(true)}
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Create Contest
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {contests.length > 0 && (
                  <div className="mb-4 flex items-center">
                    <Checkbox
                      checked={isAllContestsSelected}
                      onCheckedChange={handleSelectAllContests}
                      data-testid="select-all-contests"
                      className={isSomeContestsSelected && !isAllContestsSelected ? "data-[state=checked]:bg-primary/50" : ""}
                    />
                    <label className="ml-2 text-sm font-medium text-muted-foreground">
                      Select All Contests
                    </label>
                  </div>
                )}
                <div className="space-y-4">
                  {contests.map((contest: any) => (
                    <Card key={contest.id} className={contest.status === "active" ? "border-primary/50" : ""} data-testid={`contest-item-${contest.id}`}>
                      <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <Checkbox
                              checked={selectedContestIds.includes(contest.id)}
                              onCheckedChange={(checked) => handleContestSelect(contest.id, checked as boolean)}
                              data-testid={`select-contest-${contest.id}`}
                              className="mt-1"
                            />
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CardTitle>Cashout Requests Management</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const csvData = cashoutRequests.map((request: any) => ({
                          ID: request.id,
                          User: request.user.username,
                          Email: request.user.email,
                          Amount: request.amountGlory,
                          Token: request.tokenType,
                          'Token Amount': request.amountToken,
                          'Withdrawal Address': request.withdrawalAddress,
                          Status: request.status,
                          'Created At': new Date(request.createdAt).toLocaleString(),
                        }));
                        
                        const headers = Object.keys(csvData[0] || {});
                        const csv = [
                          headers.join(','),
                          ...csvData.map((row: any) => headers.map(h => `"${row[h]}"`).join(','))
                        ].join('\n');
                        
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `cashout-requests-${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                        
                        toast({
                          title: "CSV Downloaded",
                          description: `${cashoutRequests.length} cashout requests exported successfully`,
                        });
                      }}
                      data-testid="export-cashouts-csv"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                  {selectedCashoutIds.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedCashoutIds.length} selected
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-success/20 text-success hover:bg-success/30 border-success/30"
                        onClick={() => bulkApproveCashoutsMutation.mutate(selectedCashoutIds)}
                        disabled={bulkApproveCashoutsMutation.isPending}
                        data-testid="bulk-approve-cashouts"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve Selected
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30"
                        onClick={() => bulkRejectCashoutsMutation.mutate(selectedCashoutIds)}
                        disabled={bulkRejectCashoutsMutation.isPending}
                        data-testid="bulk-reject-cashouts"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Selected
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid="cashouts-table">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={
                              cashoutRequests.filter((r: any) => r.status === "pending").length > 0 &&
                              cashoutRequests
                                .filter((r: any) => r.status === "pending")
                                .every((r: any) => selectedCashoutIds.includes(r.id))
                            }
                            onChange={(e) => {
                              const pendingRequests = cashoutRequests.filter((r: any) => r.status === "pending");
                              if (e.target.checked) {
                                setSelectedCashoutIds(pendingRequests.map((r: any) => r.id));
                              } else {
                                setSelectedCashoutIds([]);
                              }
                            }}
                            className="rounded border-border"
                            data-testid="select-all-cashouts"
                          />
                        </th>
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
                            {request.status === "pending" && (
                              <input
                                type="checkbox"
                                checked={selectedCashoutIds.includes(request.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCashoutIds([...selectedCashoutIds, request.id]);
                                  } else {
                                    setSelectedCashoutIds(selectedCashoutIds.filter(id => id !== request.id));
                                  }
                                }}
                                className="rounded border-border"
                                data-testid={`select-cashout-${request.id}`}
                              />
                            )}
                          </td>
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
                            <div className="flex items-center gap-2">
                              <div className="font-mono text-xs max-w-[200px] truncate" data-testid={`cashout-wallet-${request.id}`}>
                                {request.withdrawalAddress}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                  navigator.clipboard.writeText(request.withdrawalAddress);
                                  toast({
                                    title: "Address Copied",
                                    description: "Withdrawal address copied to clipboard",
                                  });
                                }}
                                data-testid={`copy-address-${request.id}`}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
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
                <div className="flex items-center justify-between">
                  <CardTitle>Audit Logs</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-destructive/30"
                    onClick={() => setClearLogsDialogOpen(true)}
                    data-testid="button-clear-logs"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Logs
                  </Button>
                </div>
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

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent data-testid="bulk-delete-dialog">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Selected Users</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to permanently delete <span className="font-semibold">{selectedUserIds.length}</span> users.
                </p>
                <div>
                  <p className="text-destructive font-medium mb-2">
                    This will also delete ALL associated data including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-4 text-muted-foreground">
                    <li>All submissions and media files</li>
                    <li>All votes and interactions</li>
                    <li>GLORY balance and transaction history</li>
                    <li>Profile data and settings</li>
                    <li>Cashout requests</li>
                  </ul>
                </div>
                <p className="font-semibold text-destructive">
                  This action cannot be undone!
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirmDelete">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </Label>
              <Input
                id="confirmDelete"
                placeholder="Type DELETE to confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                data-testid="confirm-delete-input"
              />
            </div>
            <div className="bg-muted p-3 rounded-md">
              <h4 className="font-semibold text-sm mb-2">Selected users:</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedUserIds.map(userId => {
                  const user = filteredUsers.find((u: any) => u.id === userId);
                  return (
                    <div key={userId} className="text-sm text-muted-foreground">
                      {user?.username} ({user?.email})
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkDeleteDialogOpen(false);
                setDeleteConfirmText("");
              }}
              data-testid="cancel-bulk-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDelete}
              disabled={bulkDeleteUsersMutation.isPending || deleteConfirmText !== "DELETE"}
              data-testid="confirm-bulk-delete"
            >
              {bulkDeleteUsersMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedUserIds.length} Users
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Contests Confirmation Dialog */}
      <Dialog open={bulkDeleteContestsDialogOpen} onOpenChange={setBulkDeleteContestsDialogOpen}>
        <DialogContent data-testid="bulk-delete-contests-dialog">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete Selected Contests</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to permanently delete <span className="font-semibold">{selectedContestIds.length}</span> contests.
                </p>
                <div>
                  <p className="text-destructive font-medium mb-2">
                    This will also delete ALL associated data including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-4 text-muted-foreground">
                    <li>All submissions in these contests</li>
                    <li>All votes on these submissions</li>
                    <li>All media files associated with submissions</li>
                    <li>Prize pool and reward distribution data</li>
                  </ul>
                </div>
                <p className="font-semibold text-destructive">
                  This action cannot be undone!
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirmDeleteContests">
                Type <span className="font-mono font-bold">DELETE</span> to confirm
              </Label>
              <Input
                id="confirmDeleteContests"
                placeholder="Type DELETE to confirm"
                value={deleteContestsConfirmText}
                onChange={(e) => setDeleteContestsConfirmText(e.target.value)}
                data-testid="confirm-delete-contests-input"
              />
            </div>
            <div className="bg-muted p-3 rounded-md">
              <h4 className="font-semibold text-sm mb-2">Selected contests:</h4>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {selectedContestIds.map(contestId => {
                  const contest = contests.find((c: any) => c.id === contestId);
                  return (
                    <div key={contestId} className="text-sm text-muted-foreground">
                      {contest?.title} ({contest?.status})
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkDeleteContestsDialogOpen(false);
                setDeleteContestsConfirmText("");
              }}
              data-testid="cancel-bulk-delete-contests"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmBulkDeleteContests}
              disabled={bulkDeleteContestsMutation.isPending || deleteContestsConfirmText !== "DELETE"}
              data-testid="confirm-bulk-delete-contests"
            >
              {bulkDeleteContestsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedContestIds.length} Contests
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Audit Logs Confirmation Dialog */}
      <Dialog open={clearLogsDialogOpen} onOpenChange={setClearLogsDialogOpen}>
        <DialogContent data-testid="clear-logs-dialog">
          <DialogHeader>
            <DialogTitle className="text-destructive">Clear All Audit Logs</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to permanently delete <span className="font-semibold">all audit logs</span>.
                </p>
                <p className="text-destructive font-medium">
                  This will remove all historical records of admin actions and system events.
                </p>
                <p className="font-semibold text-destructive">
                  This action cannot be undone!
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirmClearLogs">
                Type <span className="font-mono font-bold">CLEAR</span> to confirm
              </Label>
              <Input
                id="confirmClearLogs"
                placeholder="Type CLEAR to confirm"
                value={clearLogsConfirmText}
                onChange={(e) => setClearLogsConfirmText(e.target.value)}
                data-testid="confirm-clear-logs-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setClearLogsDialogOpen(false);
                setClearLogsConfirmText("");
              }}
              data-testid="cancel-clear-logs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => clearAuditLogsMutation.mutate()}
              disabled={clearAuditLogsMutation.isPending || clearLogsConfirmText !== "CLEAR"}
              data-testid="confirm-clear-logs"
            >
              {clearAuditLogsMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Logs
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Balance Edit Dialog */}
      <Dialog open={gloryEditDialogOpen} onOpenChange={(open) => {
        setGloryEditDialogOpen(open);
        if (!open) {
          // Reset state when dialog closes
          setGloryAmountInput("");
          setSelectedUserId("");
          setSelectedCurrency("GLORY");
        }
      }}>
        <DialogContent data-testid="balance-edit-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Crown className="w-5 h-5 mr-2 text-primary" />
              Edit User Balance
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Edit the balance for the selected user.
                </p>
                <div className="bg-muted p-3 rounded-md text-sm">
                  <p className="font-medium mb-2">Supported formats:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li><code className="bg-background px-1 rounded">300</code> - Set balance to exactly 300</li>
                    <li><code className="bg-background px-1 rounded">+50</code> - Add 50 to current balance</li>
                    <li><code className="bg-background px-1 rounded">-20</code> - Subtract 20 from current balance</li>
                  </ul>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={selectedCurrency} onValueChange={(value) => setSelectedCurrency(value as "GLORY" | "SOL" | "USDC")}>
                <SelectTrigger id="currency" data-testid="select-balance-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GLORY">GLORY</SelectItem>
                  <SelectItem value="SOL">SOL</SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedUserId && (
              <div className="bg-muted p-3 rounded-md">
                <div className="text-sm">
                  <span className="text-muted-foreground">Current {selectedCurrency} balance:</span>
                  <span className="font-mono font-semibold ml-2">
                    {(() => {
                      const userBalance = filteredUsers.find((u: any) => u.id === selectedUserId);
                      const balance = selectedCurrency === 'SOL' ? userBalance?.solBalance : 
                                     selectedCurrency === 'USDC' ? userBalance?.usdcBalance : 
                                     userBalance?.gloryBalance;
                      return (balance || 0).toLocaleString();
                    })()} {selectedCurrency}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="gloryAmount">New {selectedCurrency} Amount</Label>
              <Input
                id="gloryAmount"
                placeholder="e.g., 300, +50, -20"
                value={gloryAmountInput}
                onChange={(e) => setGloryAmountInput(e.target.value)}
                data-testid="glory-amount-input"
              />
              <p className="text-xs text-muted-foreground">
                Enter a number to set exact balance, or use +/- to add/subtract
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setGloryEditDialogOpen(false);
                setGloryAmountInput("");
                setSelectedUserId("");
                setSelectedCurrency("GLORY");
              }}
              data-testid="cancel-balance-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGloryBalanceUpdate}
              disabled={updateGloryBalanceMutation.isPending || !gloryAmountInput.trim()}
              data-testid="confirm-glory-edit"
              className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/30"
            >
              {updateGloryBalanceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Update Balance
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
