import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useWallet } from "@/lib/wallet-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function WalletConnect() {
  const { connected, connecting, publicKey, connect, disconnect, signMessage } = useWallet();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: walletData } = useQuery({
    queryKey: ["/api/wallet/me"],
    enabled: !!publicKey,
  });

  const connectWalletMutation = useMutation({
    mutationFn: async () => {
      if (!connected || !publicKey) {
        throw new Error("Wallet not connected");
      }

      const message = `Sign this message to verify your wallet ownership.\nWallet: ${publicKey}\nTimestamp: ${Date.now()}`;
      const signature = await signMessage(message);

      return apiRequest("/api/wallet/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: publicKey,
          provider: "phantom",
          signature,
          message,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/me"] });
      toast({
        title: "Wallet Connected",
        description: "Your Solana wallet has been successfully verified and connected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      await connect();
      await connectWalletMutation.mutateAsync();
    } catch (error) {
      console.error("Error connecting wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    queryClient.invalidateQueries({ queryKey: ["/api/wallet/me"] });
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected.",
    });
  };

  const isVerified = walletData?.wallet?.status === "active";

  return (
    <Card data-testid="wallet-connect-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Solana Wallet
            </CardTitle>
            <CardDescription>
              Connect your Solana wallet to cash out GLORY rewards
            </CardDescription>
          </div>
          {connected && isVerified && (
            <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20" data-testid="wallet-verified-badge">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Phantom wallet to enable cashouts. Make sure you have the Phantom browser extension installed.
            </p>
            <Button
              onClick={handleConnect}
              disabled={isConnecting || connecting}
              className="w-full"
              data-testid="button-connect-wallet"
            >
              {isConnecting || connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Phantom Wallet
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50" data-testid="wallet-address">
              <p className="text-xs text-muted-foreground mb-1">Connected Wallet</p>
              <p className="font-mono text-sm break-all">{publicKey}</p>
            </div>

            {isVerified ? (
              <div className="flex items-center gap-2 text-sm text-green-500">
                <CheckCircle className="h-4 w-4" />
                <span>Wallet verified and ready for cashouts</span>
              </div>
            ) : connectWalletMutation.isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying wallet...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-yellow-500">
                <XCircle className="h-4 w-4" />
                <span>Wallet not verified</span>
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleDisconnect}
              className="w-full"
              data-testid="button-disconnect-wallet"
            >
              Disconnect Wallet
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
