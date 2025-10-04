import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Trash2, Ban, Image as ImageIcon, Video, Crown, Calendar, Trophy, Users, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth, isAdmin } from "@/lib/auth";
import { EditContestModal } from "@/components/EditContestModal";

export default function AdminContestDetail() {
  const { id } = useParams();
  const { data: user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'contest' | 'submission'; id: string } | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<string | null>(null);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin(user)) {
    setLocation("/admin");
    return null;
  }

  const { data: contest, isLoading: contestLoading } = useQuery({
    queryKey: ["/api/contests", id],
    queryFn: async () => {
      const response = await fetch(`/api/contests/${id}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch contest");
      return response.json();
    },
  });

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ["/api/submissions", { contestId: id }],
    queryFn: async () => {
      const response = await fetch(`/api/submissions?contestId=${id}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    },
  });

  const updateContestMutation = useMutation({
    mutationFn: async (formData: any) => {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime || '00:00'}`);
      // Contest end is votingEndDate/votingEndTime, not endDate/endTime (which is submission deadline)
      const endDateTime = new Date(`${formData.votingEndDate || formData.endDate}T${formData.votingEndTime || formData.endTime || '23:59'}`);
      
      const updateData: any = {
        title: formData.title,
        description: formData.description,
        prizeGlory: parseInt(formData.prizePool) || 0,
        startAt: startDateTime,
        endAt: endDateTime,
        status: formData.status,
        config: {
          contestType: formData.contestType,
          category: formData.category,
          entryFee: formData.entryFee,
          entryFeeAmount: formData.entryFeeAmount,
          prizeDistribution: formData.prizeDistribution,
          additionalRewards: formData.additionalRewards,
          currency: formData.currency,
          eligibility: formData.eligibility,
          maxSubmissions: formData.maxSubmissions,
          allowedMediaTypes: formData.allowedMediaTypes,
          fileSizeLimit: formData.fileSizeLimit,
          nsfwAllowed: formData.nsfwAllowed,
          agreeToRules: formData.agreeToRules,
          votingMethods: formData.votingMethods,
          voteLimitPerPeriod: formData.voteLimitPerPeriod,
          votePeriodHours: formData.votePeriodHours,
          totalVoteLimit: formData.totalVoteLimit,
          startDateOption: formData.startDateOption,
          startDate: formData.startDate,
          startTime: formData.startTime,
          endDate: formData.endDate,
          endTime: formData.endTime,
          submissionDeadline: formData.submissionDeadline,
          votingStartOption: formData.votingStartOption,
          votingStartDate: formData.votingStartDate,
          votingEndDate: formData.votingEndDate,
          votingEndTime: formData.votingEndTime,
          featured: formData.featured,
        }
      };

      // Only include coverImageUrl if it's a valid string URL
      if (formData.coverImage && typeof formData.coverImage === 'string') {
        updateData.coverImageUrl = formData.coverImage;
      } else {
        // Send empty string to trigger backend auto-cover logic
        updateData.coverImageUrl = '';
      }

      const response = await apiRequest("PATCH", `/api/admin/contests/${id}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      toast({
        title: "Contest updated",
        description: "The contest has been successfully updated.",
      });
      setIsEditModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update contest.",
        variant: "destructive",
      });
    },
  });

  const deleteContestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/admin/contests/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contests"] });
      toast({
        title: "Contest deleted",
        description: "The contest has been successfully deleted.",
      });
      setLocation("/admin");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contest.",
        variant: "destructive",
      });
    },
  });

  const deleteSubmissionMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/submissions/${submissionId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Submission deleted",
        description: "The submission has been successfully deleted.",
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

  const suspendUserMutation = useMutation({
    mutationFn: async ({ userId, suspendAssets }: { userId: string; suspendAssets: boolean }) => {
      const response = await apiRequest("PATCH", `/api/admin/users/${userId}`, { status: "banned" });
      
      if (suspendAssets) {
        const userSubmissions = submissions.filter((s: any) => s.user.id === userId);
        await Promise.all(
          userSubmissions.map((s: any) =>
            apiRequest("PATCH", `/api/admin/submissions/${s.id}`, { status: "rejected" })
          )
        );
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User suspended",
        description: "The user has been suspended.",
      });
      setUserToSuspend(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to suspend user.",
        variant: "destructive",
      });
    },
  });

  const handleEditContest = () => {
    setIsEditModalOpen(true);
  };

  const handleSaveContest = (formData: any) => {
    updateContestMutation.mutate(formData);
  };

  const handleDeleteItem = () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'contest') {
      deleteContestMutation.mutate();
    } else {
      deleteSubmissionMutation.mutate(itemToDelete.id);
    }
    
    setItemToDelete(null);
  };

  if (contestLoading || submissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!contest) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Contest not found</p>
          <Button onClick={() => setLocation("/admin")} className="mt-4" data-testid="button-back-to-admin">
            Back to Admin
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-500/20 text-green-400 border-green-500/30",
      draft: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      ended: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      pending: "bg-yellow-500/20 text-yellow-400",
      approved: "bg-green-500/20 text-green-400",
      rejected: "bg-red-500/20 text-red-400"
    };
    
    return (
      <Badge className={colors[status] || "bg-gray-500/20 text-gray-400"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const participantMap = new Map();
  submissions.forEach((submission: any) => {
    if (!participantMap.has(submission.user.id)) {
      participantMap.set(submission.user.id, {
        id: submission.user.id,
        username: submission.user.username,
        submissions: []
      });
    }
    participantMap.get(submission.user.id).submissions.push(submission);
  });

  const participants = Array.from(participantMap.values());

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/admin")}
          className="mb-4"
          data-testid="button-back-to-admin-dashboard"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{contest.title}</h1>
              {getStatusBadge(contest.status)}
            </div>
            <p className="text-muted-foreground mb-4">{contest.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="glassmorphism border border-white/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Trophy className="h-5 w-5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Prize Pool</p>
                      <p className="text-xl font-bold">{contest.prizeGlory.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glassmorphism border border-white/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-primary">
                    <Users className="h-5 w-5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Participants</p>
                      <p className="text-xl font-bold">{participants.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glassmorphism border border-white/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-blue-400">
                    <ImageIcon className="h-5 w-5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Submissions</p>
                      <p className="text-xl font-bold">{submissions.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glassmorphism border border-white/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-5 w-5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Approved</p>
                      <p className="text-xl font-bold">
                        {submissions.filter((s: any) => s.status === 'approved').length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="flex gap-2 ml-4">
            <Button onClick={handleEditContest} data-testid="button-edit-contest">
              <Edit className="mr-2 h-4 w-4" />
              Edit Contest
            </Button>
            <Button
              variant="destructive"
              onClick={() => setItemToDelete({ type: 'contest', id: contest.id })}
              data-testid="button-delete-contest"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Contest
            </Button>
          </div>
        </div>
      </div>

      <Card className="glassmorphism border border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Participants & Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No participants yet</p>
          ) : (
            <div className="space-y-6">
              {participants.map((participant: any) => (
                <div key={participant.id} className="border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold">
                          {participant.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white">{participant.username}</h3>
                        <p className="text-sm text-muted-foreground">
                          {participant.submissions.length} submission{participant.submissions.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setUserToSuspend(participant.id)}
                      data-testid={`button-suspend-user-${participant.id}`}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Suspend User
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {participant.submissions.map((submission: any) => (
                      <Card key={submission.id} className="bg-background-light/50 border-white/5">
                        <CardContent className="p-4">
                          <div className="relative aspect-video mb-3 rounded-lg overflow-hidden bg-black/50">
                            {submission.type === 'image' ? (
                              <img
                                src={submission.mediaUrl}
                                alt={submission.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full">
                                <Video className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-white truncate">{submission.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                Votes: {submission.votesCount}
                              </p>
                            </div>
                            {getStatusBadge(submission.status)}
                          </div>
                          
                          {submission.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {submission.description}
                            </p>
                          )}
                          
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={() => setItemToDelete({ type: 'submission', id: submission.id })}
                            data-testid={`button-delete-submission-${submission.id}`}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Submission
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditContestModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleSaveContest}
        contest={contest}
      />

      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent className="glassmorphism border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {itemToDelete?.type === 'contest' 
                ? "This will permanently delete the contest and all its data. This action cannot be undone."
                : "This will permanently delete this submission. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!userToSuspend} onOpenChange={(open) => !open && setUserToSuspend(null)}>
        <AlertDialogContent className="glassmorphism border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Suspend User</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Do you want to suspend this user and reject all their submissions?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-suspend">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToSuspend && suspendUserMutation.mutate({ userId: userToSuspend, suspendAssets: false })}
              data-testid="button-suspend-only"
            >
              Suspend Only
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => userToSuspend && suspendUserMutation.mutate({ userId: userToSuspend, suspendAssets: true })}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-suspend-and-reject"
            >
              Suspend & Reject Assets
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
