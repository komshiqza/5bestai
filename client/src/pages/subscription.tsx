import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  CreditCard, 
  Gift, 
  Zap, 
  Star, 
  Sparkles, 
  Crown,
  Calendar,
  Check,
  AlertTriangle,
  Loader2,
  X
} from "lucide-react";
import type { UserSubscriptionWithTier, SubscriptionTier, SubscriptionTransaction } from "@shared/schema";

// Tier icons matching the pricing page
const TIER_ICONS: Record<string, any> = {
  free: Gift,
  starter: Zap,
  creator: Star,
  pro: Sparkles,
  studio: Crown,
};

// Tier color schemes matching the pricing page
const TIER_COLORS: Record<string, { gradient: string; badge: string; border: string; text: string }> = {
  free: {
    gradient: "from-gray-500/20 to-gray-600/20",
    badge: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    border: "border-gray-500/30",
    text: "text-gray-300"
  },
  starter: {
    gradient: "from-blue-500/20 to-cyan-500/20",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    border: "border-blue-500/30",
    text: "text-blue-300"
  },
  creator: {
    gradient: "from-purple-500/20 to-pink-500/20",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    border: "border-purple-500/30",
    text: "text-purple-300"
  },
  pro: {
    gradient: "from-amber-500/20 to-yellow-500/20",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    border: "border-amber-500/30",
    text: "text-amber-300"
  },
  studio: {
    gradient: "from-pink-500/20 via-purple-500/20 to-cyan-500/20",
    badge: "bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 text-white border-pink-500/30",
    border: "border-pink-500/30",
    text: "text-pink-300"
  },
};

export default function SubscriptionPage() {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);

  // Fetch current subscription
  const { data: subscription, isLoading: subscriptionLoading } = useQuery<UserSubscriptionWithTier | null>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  // Fetch all tiers
  const { data: tiers = [], isLoading: tiersLoading } = useQuery<SubscriptionTier[]>({
    queryKey: ["/api/tiers"],
  });

  // Fetch payment history
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<SubscriptionTransaction[]>({
    queryKey: ["/api/subscription/transactions"],
    enabled: !!user,
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", "/api/subscription/cancel");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription"] });
      toast({ 
        title: "Subscription Cancelled", 
        description: "Your subscription will be cancelled at the end of the current billing period." 
      });
      setCancelDialogOpen(false);
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to cancel subscription", 
        variant: "destructive" 
      });
    },
  });

  const handleChangePlan = () => {
    setChangePlanModalOpen(true);
  };

  const handleSelectTier = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    // For now, just show "coming soon" toast
    toast({
      title: "Payment Integration Coming Soon",
      description: `Payment flow for ${tier.name} tier will be available soon.`
    });
    setChangePlanModalOpen(false);
    setSelectedTier(null);
  };

  const handleCancelSubscription = () => {
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    cancelMutation.mutate();
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), "MMM dd, yyyy");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      active: { variant: "default", icon: Check },
      cancelled: { variant: "secondary", icon: AlertTriangle },
      expired: { variant: "destructive", icon: X },
      pending: { variant: "outline", icon: Loader2 },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant as any} className="gap-1" data-testid={`badge-status-${status}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-500/20 text-green-300 border-green-500/30",
      pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      failed: "bg-red-500/20 text-red-300 border-red-500/30",
      refunded: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    };
    
    return (
      <Badge variant="outline" className={colors[status] || colors.pending} data-testid={`badge-payment-status-${status}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Calculate current tier info
  const currentTier = subscription?.tier || tiers.find(t => t.slug === "free");
  const tierColors = currentTier ? TIER_COLORS[currentTier.slug] || TIER_COLORS.free : TIER_COLORS.free;
  const TierIcon = currentTier ? TIER_ICONS[currentTier.slug] || Gift : Gift;

  // Calculate credits used
  const monthlyCredits = currentTier?.monthlyCredits || 100;
  const currentCredits = user?.imageCredits || 0;
  const creditsUsed = Math.max(0, monthlyCredits - currentCredits);
  const creditsPercentage = (currentCredits / monthlyCredits) * 100;

  // Check if user can cancel (has active paid subscription)
  const canCancel = subscription && subscription.status === "active" && currentTier?.slug !== "free" && !subscription.cancelAtPeriodEnd;

  const isLoading = subscriptionLoading || tiersLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 px-4 max-w-6xl">
        <Skeleton className="h-12 w-64 mb-8" data-testid="skeleton-title" />
        <div className="space-y-8">
          <Skeleton className="h-64 w-full" data-testid="skeleton-card" />
          <Skeleton className="h-48 w-full" data-testid="skeleton-credits" />
          <Skeleton className="h-96 w-full" data-testid="skeleton-table" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-12 px-4 max-w-6xl">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2 gradient-text" data-testid="text-page-title">
            Subscription Management
          </h1>
          <p className="text-muted-foreground" data-testid="text-page-subtitle">
            Manage your subscription, view payment history, and track your credits
          </p>
        </div>

        {/* Section 1: Current Plan Card */}
        <Card className={`overflow-hidden border ${tierColors.border} bg-gradient-to-br ${tierColors.gradient} backdrop-blur-xl`} data-testid="card-current-plan">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <CardHeader className="relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-xl bg-black/40 backdrop-blur-sm border ${tierColors.border}`}>
                  <TierIcon className="w-8 h-8 text-white" data-testid="icon-current-tier" />
                </div>
                <div>
                  <CardTitle className="text-2xl" data-testid="text-current-tier-name">
                    {currentTier?.name || "Free Tier"}
                  </CardTitle>
                  <CardDescription className="text-base" data-testid="text-current-tier-price">
                    {currentTier ? formatPrice(currentTier.priceUsd) : "Free"} 
                    {currentTier && currentTier.priceUsd > 0 && "/month"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                {subscription ? (
                  getStatusBadge(subscription.status)
                ) : (
                  <Badge variant="outline" className={tierColors.badge} data-testid="badge-free-tier">
                    <Gift className="w-3 h-3 mr-1" />
                    Free Tier
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-4">
            {/* Monthly Credits Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={tierColors.badge} data-testid="badge-monthly-credits">
                {monthlyCredits} credits per month
              </Badge>
            </div>

            {/* Current Period */}
            {subscription && (
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-black/30 backdrop-blur-sm">
                <div>
                  <p className="text-sm text-muted-foreground">Current Period Start</p>
                  <p className="font-semibold" data-testid="text-period-start">
                    {formatDate(subscription.currentPeriodStart)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {subscription.cancelAtPeriodEnd ? "Cancels On" : "Current Period End"}
                  </p>
                  <p className="font-semibold" data-testid="text-period-end">
                    {formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
              </div>
            )}

            {/* Cancellation Warning */}
            {subscription?.cancelAtPeriodEnd && (
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3" data-testid="alert-cancellation">
                <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-300">Subscription Ending</p>
                  <p className="text-sm text-yellow-200">
                    Your subscription will be cancelled on {formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
              </div>
            )}

            {/* Empty State for Free Tier */}
            {!subscription && (
              <div className="p-4 rounded-lg bg-black/30 backdrop-blur-sm" data-testid="empty-state-free-tier">
                <p className="text-center text-muted-foreground">
                  You're on the Free tier! Start with 100 credits to get started.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                onClick={handleChangePlan}
                className="flex-1"
                data-testid="button-change-plan"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Change Plan
              </Button>
              {canCancel && (
                <Button 
                  variant="destructive"
                  onClick={handleCancelSubscription}
                  data-testid="button-cancel-subscription"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Credits Display */}
        <Card className="overflow-hidden border border-white/10 bg-gradient-to-br from-purple-500/10 to-blue-500/10 backdrop-blur-xl" data-testid="card-credits">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2" data-testid="text-credits-title">
              <Sparkles className="w-5 h-5" />
              Credit Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Credits</p>
                <p className="text-3xl font-bold" data-testid="text-current-credits">
                  {currentCredits}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Allowance</p>
                <p className="text-3xl font-bold" data-testid="text-monthly-allowance">
                  {monthlyCredits}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credits Used</p>
                <p className="text-3xl font-bold" data-testid="text-credits-used">
                  {creditsUsed}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Usage</span>
                <span className="font-semibold" data-testid="text-credits-percentage">
                  {creditsPercentage.toFixed(0)}% remaining
                </span>
              </div>
              <Progress value={creditsPercentage} className="h-2" data-testid="progress-credits" />
            </div>

            {/* Next Refresh */}
            {subscription && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span data-testid="text-next-refresh">
                  Credits refresh on {formatDate(subscription.currentPeriodEnd)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Payment History Table */}
        <Card className="overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl" data-testid="card-payment-history">
          <CardHeader>
            <CardTitle data-testid="text-payment-history-title">Payment History</CardTitle>
            <CardDescription>View all your subscription transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-state-transactions">
                <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">No payment history yet</p>
                <p className="text-muted-foreground">
                  Your subscription transactions will appear here
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="header-date">Date</TableHead>
                      <TableHead data-testid="header-tier">Tier</TableHead>
                      <TableHead data-testid="header-amount">Amount</TableHead>
                      <TableHead data-testid="header-payment-method">Payment Method</TableHead>
                      <TableHead data-testid="header-status">Status</TableHead>
                      <TableHead data-testid="header-transaction-id">Transaction ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                        <TableCell data-testid={`cell-date-${transaction.id}`}>
                          {formatDate(transaction.createdAt)}
                        </TableCell>
                        <TableCell data-testid={`cell-tier-${transaction.id}`}>
                          {/* We'd need to fetch tier name, for now show tier ID */}
                          {transaction.tierId.slice(0, 8)}...
                        </TableCell>
                        <TableCell data-testid={`cell-amount-${transaction.id}`}>
                          {formatPrice(transaction.amountCents)} {transaction.currency}
                        </TableCell>
                        <TableCell data-testid={`cell-payment-method-${transaction.id}`}>
                          <Badge variant="outline" className="capitalize">
                            {transaction.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`cell-status-${transaction.id}`}>
                          {getPaymentStatusBadge(transaction.paymentStatus)}
                        </TableCell>
                        <TableCell className="font-mono text-sm" data-testid={`cell-tx-id-${transaction.id}`}>
                          {transaction.txHash ? (
                            <span className="truncate max-w-[150px] inline-block">
                              {transaction.txHash}
                            </span>
                          ) : transaction.stripeInvoiceId ? (
                            <span className="truncate max-w-[150px] inline-block">
                              {transaction.stripeInvoiceId}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Tier Selection Modal */}
      <Dialog open={changePlanModalOpen} onOpenChange={setChangePlanModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="modal-change-plan">
          <DialogHeader>
            <DialogTitle data-testid="text-modal-title">Change Subscription Plan</DialogTitle>
            <DialogDescription data-testid="text-modal-description">
              Select a new plan to upgrade or downgrade your subscription
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            {tiers.sort((a, b) => a.sortOrder - b.sortOrder).map((tier) => {
              const colors = TIER_COLORS[tier.slug] || TIER_COLORS.free;
              const Icon = TIER_ICONS[tier.slug] || Gift;
              const isCurrentTier = currentTier?.id === tier.id;

              return (
                <Card
                  key={tier.id}
                  className={`relative overflow-hidden border ${colors.border} bg-gradient-to-br ${colors.gradient} backdrop-blur-xl transition-all duration-300 hover:scale-105`}
                  data-testid={`card-tier-${tier.slug}`}
                >
                  {isCurrentTier && (
                    <div className="absolute top-0 right-0 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg" data-testid={`badge-current-tier-${tier.slug}`}>
                      CURRENT PLAN
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  
                  <CardHeader className="relative space-y-4">
                    <div className="flex items-center gap-3">
                      <Icon className="h-6 w-6 text-white" />
                      <CardTitle className="text-xl" data-testid={`text-tier-name-${tier.slug}`}>
                        {tier.name}
                      </CardTitle>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold" data-testid={`text-tier-price-${tier.slug}`}>
                          {formatPrice(tier.priceUsd)}
                        </span>
                        {tier.priceUsd > 0 && (
                          <span className="text-muted-foreground">/month</span>
                        )}
                      </div>
                      <Badge variant="outline" className={colors.badge} data-testid={`badge-tier-credits-${tier.slug}`}>
                        {tier.monthlyCredits} credits/month
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="relative space-y-4">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Key Features:</p>
                      <ul className="space-y-1 text-sm">
                        {tier.canEdit && (
                          <li className="flex items-center gap-2" data-testid={`feature-edit-${tier.slug}`}>
                            <Check className="w-4 h-4 text-green-400" />
                            Image Editor Access
                          </li>
                        )}
                        {tier.canUpscale && (
                          <li className="flex items-center gap-2" data-testid={`feature-upscale-${tier.slug}`}>
                            <Check className="w-4 h-4 text-green-400" />
                            AI Upscaling
                          </li>
                        )}
                        {tier.allowedModels.length > 0 && (
                          <li className="flex items-center gap-2" data-testid={`feature-models-${tier.slug}`}>
                            <Check className="w-4 h-4 text-green-400" />
                            {tier.allowedModels.length} AI Models
                          </li>
                        )}
                        {tier.promptCommission > 0 && (
                          <li className="flex items-center gap-2" data-testid={`feature-prompt-commission-${tier.slug}`}>
                            <Check className="w-4 h-4 text-green-400" />
                            {tier.promptCommission}% Prompt Sales
                          </li>
                        )}
                        {tier.imageCommission > 0 && (
                          <li className="flex items-center gap-2" data-testid={`feature-image-commission-${tier.slug}`}>
                            <Check className="w-4 h-4 text-green-400" />
                            {tier.imageCommission}% Image Sales
                          </li>
                        )}
                      </ul>
                    </div>

                    <Button
                      onClick={() => handleSelectTier(tier)}
                      disabled={isCurrentTier}
                      className="w-full"
                      variant={isCurrentTier ? "outline" : "default"}
                      data-testid={`button-select-tier-${tier.slug}`}
                    >
                      {isCurrentTier ? "Current Plan" : tier.priceUsd > (currentTier?.priceUsd || 0) ? "Upgrade" : "Downgrade"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent data-testid="dialog-cancel-subscription">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2" data-testid="text-cancel-title">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Cancel Subscription?
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="text-cancel-description">
              Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period on{" "}
              {subscription && formatDate(subscription.currentPeriodEnd)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-no">Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              className="bg-destructive hover:bg-destructive/90"
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-yes"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Subscription"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
