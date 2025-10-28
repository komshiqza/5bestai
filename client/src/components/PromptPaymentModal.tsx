import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Wallet, Coins, Loader2 } from "lucide-react";
import { PromptSolanaPayment } from "@/components/payment/PromptSolanaPayment";

interface PromptPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: {
    id: string;
    title: string;
    promptPrice: string;
    promptCurrency: string;
    promptForSale: boolean;
  };
  onSuccess: () => void;
}

type PaymentMethod = 'balance' | 'solana' | 'selecting';

export function PromptPaymentModal({
  isOpen,
  onClose,
  submission,
  onSuccess
}: PromptPaymentModalProps) {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('selecting');
  const [isProcessing, setIsProcessing] = useState(false);

  // Debug logging - removed to prevent infinite render
  // console.log("PromptPaymentModal render:", { 
  //   isOpen, 
  //   hasSubmission: !!submission,
  //   hasUser: !!user,
  //   submissionId: submission?.id,
  //   promptPrice: submission?.promptPrice,
  //   promptCurrency: submission?.promptCurrency
  // });

  // Check if user has sufficient balance
  const checkBalance = (): boolean => {
    if (!submission.promptPrice || !submission.promptCurrency) return false;
    if (!user) return false;
    
    const price = parseFloat(submission.promptPrice);
    const currency = submission.promptCurrency;

    if (currency === "GLORY") {
      return user.gloryBalance >= price;
    } else if (currency === "SOL") {
      return parseFloat(user.solBalance) >= price;
    } else if (currency === "USDC") {
      return parseFloat(user.usdcBalance) >= price;
    }

    return false;
  };

  const hasEnoughBalance = checkBalance();
  const canPayWithBalance = hasEnoughBalance;

  // Handle payment with profile balance
  const handlePayWithBalance = async () => {
    if (!canPayWithBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You don't have enough ${submission.promptCurrency} in your account.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const response = await apiRequest("POST", `/api/prompts/purchase/${submission.id}`, {});
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to purchase prompt");
      }

      await response.json();

      // Invalidate all related queries
      await queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/submissions"
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/prompts/purchased"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/prompts/purchased/submissions"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/me"] });

      toast({
        title: "Purchase Successful!",
        description: "You now have access to this prompt.",
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Failed to purchase prompt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Solana payment success
  const handleSolanaPaymentSuccess = async (txHash: string) => {
    // Backend already processed the payment and purchased the prompt
    // Just invalidate queries and close modal
    try {
      await queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/submissions"
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/prompts/purchased"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/prompts/purchased/submissions"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/me"] });

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error invalidating queries:", error);
      toast({
        title: "Warning",
        description: "Purchase successful but failed to refresh data. Please refresh the page.",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (price: string, currency: string): string => {
    const num = parseFloat(price);
    if (isNaN(num)) return `${price} ${currency}`;
    return `${num.toLocaleString()} ${currency}`;
  };

  const getBalance = (): string => {
    if (!user) return "0";
    
    if (submission.promptCurrency === "GLORY") {
      return user.gloryBalance.toLocaleString();
    } else if (submission.promptCurrency === "SOL") {
      return parseFloat(user.solBalance).toFixed(4);
    } else if (submission.promptCurrency === "USDC") {
      return parseFloat(user.usdcBalance).toFixed(2);
    }

    return "0";
  };

  const getNewBalance = (): string => {
    if (!user) return "0";
    
    const price = parseFloat(submission.promptPrice || "0");
    
    if (submission.promptCurrency === "GLORY") {
      const newBalance = user.gloryBalance - price;
      return newBalance.toLocaleString();
    } else if (submission.promptCurrency === "SOL") {
      const current = parseFloat(user.solBalance);
      const newBalance = current - price;
      return newBalance.toFixed(4);
    } else if (submission.promptCurrency === "USDC") {
      const current = parseFloat(user.usdcBalance);
      const newBalance = current - price;
      return newBalance.toFixed(2);
    }

    return "0";
  };

  // Check if user exists before rendering balance options
  const hasUser = !!user;

  // Reset selected method when modal closes
  useEffect(() => {
    if (!isOpen && selectedMethod !== 'selecting') {
      setSelectedMethod('selecting');
    }
  }, [isOpen, selectedMethod]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={selectedMethod === 'solana' ? "max-w-4xl z-[9999]" : "max-w-2xl z-[9999]"}>
        <DialogHeader>
          <DialogTitle>
            {selectedMethod === 'solana' ? 'Pay with Solana Wallet' : 'Purchase Prompt'}
          </DialogTitle>
          <DialogDescription>
            {selectedMethod === 'solana' 
              ? 'Complete the payment using your Solana wallet'
              : 'Choose your payment method to purchase this prompt'}
          </DialogDescription>
        </DialogHeader>

        {selectedMethod === 'solana' && submission.promptPrice && submission.promptCurrency && hasUser ? (
          <PromptSolanaPayment
            submission={submission}
            userId={user.id}
            onSuccess={handleSolanaPaymentSuccess}
            onCancel={() => setSelectedMethod('selecting')}
          />
        ) : (
          <div className="space-y-4">
          {/* Price Display */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-lg border border-violet-500/30">
            <div>
              <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">Price</p>
              <p className="text-2xl font-bold text-white">
                {formatPrice(submission.promptPrice, submission.promptCurrency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400 uppercase tracking-wide mb-1">For</p>
              <p className="text-lg font-semibold text-white">{submission.title}</p>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="grid gap-4">
            {/* Profile Balance Option */}
            {canPayWithBalance && (
              <Card className="cursor-pointer hover:border-violet-500/50 transition-colors"
                    onClick={() => handlePayWithBalance()}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Coins className="h-6 w-6 text-violet-400" />
                      <div>
                        <CardTitle className="text-lg">Pay with Profile Balance</CardTitle>
                        <CardDescription>
                          Use your existing balance
                        </CardDescription>
                      </div>
                    </div>
                    {isProcessing && (
                      <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 mb-1">Current Balance</p>
                      <p className="text-xl font-semibold text-white">
                        {getBalance()} {submission.promptCurrency}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 mb-1">New Balance</p>
                      <p className="text-xl font-semibold text-green-400">
                        {getNewBalance()} {submission.promptCurrency}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Solana Wallet Option */}
            <Card className="cursor-pointer hover:border-violet-500/50 transition-colors"
                  onClick={() => setSelectedMethod('solana')}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Wallet className="h-6 w-6 text-violet-400" />
                  <div className="flex-1">
                    <CardTitle className="text-lg">Pay with Solana Wallet</CardTitle>
                    <CardDescription>
                      Connect your Phantom or Solflare wallet
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">
                  Send payment directly from your wallet. Your balance will be automatically credited.
                </p>
              </CardContent>
            </Card>

            {/* Insufficient Balance Warning */}
            {!canPayWithBalance && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-400">
                  You don't have enough {submission.promptCurrency} in your profile balance.
                  Please use Solana wallet payment instead.
                </p>
              </div>
            )}
          </div>

          {/* Cancel Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
