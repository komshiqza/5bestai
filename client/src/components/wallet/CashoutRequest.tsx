import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/GlassButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function CashoutRequest() {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"GLORY" | "SOL" | "USDC">("GLORY");
  const [tokenType, setTokenType] = useState("USDC");

  const { data: userData } = useQuery<any>({ queryKey: ["/api/me"] });

  const createRequestMutation = useMutation({
    mutationFn: async () => {
      if (!userData?.withdrawalAddress) {
        throw new Error("Please set your withdrawal address in your profile first");
      }

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum < 1000) {
        throw new Error(`Minimum cashout amount is 1000 ${currency}`);
      }

      // apiRequest expects (method, url, data)
      return apiRequest("POST", "/api/cashout/request", {
        withdrawalAddress: userData.withdrawalAddress,
        amountGlory: currency === "GLORY" ? amountNum : 0,
        tokenType,
        currency,
        amount: amountNum,
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
  const solBalance = userData?.solBalance || 0;
  const usdcBalance = userData?.usdcBalance || 0;
  const hasWithdrawalAddress = !!userData?.withdrawalAddress;

  const getCurrentBalance = () => {
    switch (currency) {
      case "SOL":
        return solBalance;
      case "USDC":
        return usdcBalance;
      default:
        return gloryBalance;
    }
  };

  return (
    <div className="space-y-6">
      <Card data-testid="cashout-request-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Withdraw
          </CardTitle>
          <CardDescription>
            Request to withdraw your funds (minimum 1000)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasWithdrawalAddress ? (
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground">
                Please set your withdrawal address in your profile first to enable withdrawals
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={currency} onValueChange={(value) => setCurrency(value as "GLORY" | "SOL" | "USDC")}>
                  <SelectTrigger id="currency" data-testid="select-withdraw-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLORY">GLORY</SelectItem>
                    <SelectItem value="SOL">SOL</SelectItem>
                    <SelectItem value="USDC">USDC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({currency})</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="1000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1000"
                    step="0.01"
                    required
                    data-testid="input-cashout-amount"
                  />
                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                    of {getCurrentBalance().toLocaleString()}
                  </p>
                </div>
              </div>

              <GlassButton
                type="submit"
                className="w-full"
                disabled={createRequestMutation.isPending || !hasWithdrawalAddress}
                data-testid="button-submit-cashout"
              >
                {createRequestMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Request Withdrawal"
                )}
              </GlassButton>
            </form>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
