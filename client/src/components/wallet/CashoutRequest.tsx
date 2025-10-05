import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Loader2, Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function CashoutRequest() {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [tokenType, setTokenType] = useState("USDC");

  const { data: userData } = useQuery<any>({ queryKey: ["/api/me"] });
  const { data: walletData } = useQuery<any>({ queryKey: ["/api/wallet/me"] });
  const { data: requestsData } = useQuery<any>({ 
    queryKey: ["/api/cashout/requests"],
    enabled: !!walletData?.wallet,
  });

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
  const requests = requestsData?.requests || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "approved":
      case "processing":
      case "sent":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "confirmed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "rejected":
      case "failed":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "confirmed":
        return <CheckCircle className="h-3 w-3" />;
      case "rejected":
      case "failed":
        return <XCircle className="h-3 w-3" />;
      default:
        return <Loader2 className="h-3 w-3 animate-spin" />;
    }
  };

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

              <Button
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
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cashout History</CardTitle>
            <CardDescription>Track your cashout requests and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {requests.map((request: any) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  data-testid={`cashout-request-${request.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{request.amountGlory} GLORY</p>
                      <Badge variant="outline" className={getStatusColor(request.status)}>
                        {getStatusIcon(request.status)}
                        <span className="ml-1">{request.status}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {request.amountToken} {request.tokenType} • {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                    {request.txHash && (
                      <a
                        href={`https://solscan.io/tx/${request.txHash}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                        data-testid={`link-tx-${request.id}`}
                      >
                        View Transaction
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
