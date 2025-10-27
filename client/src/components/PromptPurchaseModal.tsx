import { useState } from "react";
import { X, Wallet, Lock, Sparkles } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { PromptSolanaPayment } from "./payment/PromptSolanaPayment";

interface PromptPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  promptPrice: string;
  promptCurrency: string;
  userBalance: {
    glory: number;
    sol: number;
    usdc: number;
  };
}

export function PromptPurchaseModal({
  isOpen,
  onClose,
  submissionId,
  promptPrice,
  promptCurrency,
  userBalance
}: PromptPurchaseModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'wallet'>('balance');
  const [showSolanaPayment, setShowSolanaPayment] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const price = parseFloat(promptPrice);
  const currency = promptCurrency as 'GLORY' | 'SOL' | 'USDC';
  
  // Get user balance for selected currency
  const getBalance = () => {
    switch (currency) {
      case 'SOL':
        return userBalance.sol || 0;
      case 'USDC':
        return userBalance.usdc || 0;
      case 'GLORY':
      default:
        return userBalance.glory || 0;
    }
  };

  const balance = getBalance();
  const hasInsufficientBalance = balance < price;

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/prompts/purchase/${submissionId}`, {
        paymentMethod,
        txHash: null // Wallet payment not implemented yet
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions", submissionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({
        title: "Purchase successful!",
        description: "You now have access to this prompt"
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Purchase failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  });

  const handlePurchase = () => {
    if (paymentMethod === 'balance') {
      if (hasInsufficientBalance) {
        toast({
          title: "Insufficient balance",
          description: `You need ${formatCurrency(price, currency)} to purchase this prompt`,
          variant: "destructive"
        });
        return;
      }
      purchaseMutation.mutate();
    } else if (paymentMethod === 'wallet') {
      // Show Solana payment interface
      if (currency === 'GLORY') {
        toast({
          title: "Not supported",
          description: "Wallet payments are only available for SOL and USDC",
          variant: "destructive"
        });
        return;
      }
      setShowSolanaPayment(true);
    }
  };

  const handleSolanaSuccess = (txHash: string) => {
    // Transaction verified on backend, invalidate caches
    queryClient.invalidateQueries({ queryKey: ["/api/submissions", submissionId] });
    queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    toast({
      title: "Purchase successful!",
      description: "You now have access to this prompt"
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      data-testid="modal-purchase-prompt-overlay"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-300/60 dark:border-slate-700/60"
        onClick={(e) => e.stopPropagation()}
        data-testid="modal-purchase-prompt"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-300/60 dark:border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/20">
              <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
              Purchase Prompt
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            data-testid="button-close"
          >
            <X className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {showSolanaPayment && currency !== 'GLORY' ? (
            <PromptSolanaPayment
              submissionId={submissionId}
              amount={price}
              currency={currency as 'SOL' | 'USDC'}
              onSuccess={handleSolanaSuccess}
              onCancel={() => setShowSolanaPayment(false)}
            />
          ) : (
            <>
          {/* Price Display */}
          <div className="flex items-center justify-center py-6">
            <div className="text-center">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                Price
              </div>
              <div className="text-4xl font-bold text-violet-600 dark:text-violet-400">
                {formatCurrency(price, currency)}
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
              Payment Method *
            </label>
            <div className="space-y-2">
              {!hasInsufficientBalance && (
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="balance"
                    checked={paymentMethod === 'balance'}
                    onChange={() => setPaymentMethod('balance')}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                    data-testid="radio-payment-balance"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Pay from Balance
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Your balance: {formatCurrency(balance, currency)}
                    </div>
                  </div>
                </label>
              )}
              
              {currency !== 'GLORY' && (
                <label className={`flex items-center gap-3 p-3 rounded-lg border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${hasInsufficientBalance ? '' : 'opacity-75'}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wallet"
                    checked={paymentMethod === 'wallet'}
                    onChange={() => setPaymentMethod('wallet')}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                    data-testid="radio-payment-wallet"
                  />
                  <div className="flex-1 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        Pay with Solana Wallet
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        {currency} payment via wallet extension
                      </div>
                    </div>
                  </div>
                </label>
              )}

              {hasInsufficientBalance && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-300/60 dark:border-red-700/60">
                  <div className="text-sm text-red-800 dark:text-red-200 font-medium">
                    Insufficient Balance
                  </div>
                  <div className="text-xs text-red-700 dark:text-red-300 mt-1">
                    You need {formatCurrency(price, currency)} but only have {formatCurrency(balance, currency)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-xl border border-blue-300/60 dark:border-blue-700/60 bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Unlock Full Prompt Access
                </div>
                <div className="text-xs text-blue-800 dark:text-blue-200">
                  After purchase, you'll have permanent access to the complete AI prompt used to create this image.
                </div>
              </div>
            </div>
          </div>
          </>
          )}
        </div>

        {/* Footer */}
        {!showSolanaPayment && (
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-300/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            data-testid="button-cancel"
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={purchaseMutation.isPending || (paymentMethod === 'balance' && hasInsufficientBalance)}
            className="px-6 py-2 rounded-lg font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            data-testid="button-purchase"
          >
            {purchaseMutation.isPending ? "Processing..." : `Purchase for ${formatCurrency(price, currency)}`}
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
