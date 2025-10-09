import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/GlassButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function CashoutRequest() {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [tokenType, setTokenType] = useState("USDC");

  const { data: userData } = useQuery<any>({ queryKey: ["/api/me"] });
  const { data: walletData } = useQuery<any>({ queryKey: ["/api/wallet/me"] });

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      if (!walletData?.wallet?.id) {
        throw new Error("No wallet connected");
      }

      const amountGlory = parseInt(amount);
      if (isNaN(amountGlory) || amountGlory < 1000) {
        throw new Error("Minimum cashout amount is 1000 GLORY");
      }

      // apiRequest expects (method, url, data)
      return apiRequest("POST", "/api/cashout/request", {
        walletId: walletData.wallet.id,
        amountGlory,
        tokenType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashout/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      setAmount("");
      toast({
        title: "Cashout Requested",
        description: "Your cashout request has been submitted for admin approval.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRequestMutation.mutate();
  };

  const gloryBalance = userData?.gloryBalance || 0;
  const hasWallet = !!walletData?.wallet;

  return (
    <div className="space-y-6">
      <Card data-testid="cashout-request-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cash Out GLORY
          </CardTitle>
          <CardDescription>
            Convert your GLORY points to USDC/SOL on Solana (minimum 1000 GLORY)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasWallet ? (
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                Please connect your Solana wallet first to enable cashouts
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (GLORY)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="1000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1000"
                    step="1"
                    required
                    data-testid="input-cashout-amount"
                  />
                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                    of {gloryBalance}
                  </p>
                </div>
              </div>

              {/* Receive As section removed */}

              <GlassButton
                type="submit"
                className="w-full"
                disabled={createRequestMutation.isPending || !hasWallet}
                data-testid="button-submit-cashout"
              >
                {createRequestMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Request Cashout"
                )}
              </GlassButton>
            </form>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
