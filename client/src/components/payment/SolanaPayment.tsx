import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Loader2, ExternalLink } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface SolanaPaymentProps {
  amount: number;
  currency: "SOL" | "USDC" | "CUSTOM";
  recipient: string; // Platform wallet address
  label: string; // Contest name
  message?: string; // Optional message
  customTokenMint?: string; // For custom SPL tokens
  customTokenDecimals?: number; // For custom SPL tokens
  userId: string; // Current user ID
  contestId: string; // Contest ID for verification
  onSuccess: (txHash: string) => void;
  onCancel?: () => void;
}

export function SolanaPayment({
  amount,
  currency,
  recipient,
  label,
  message,
  customTokenMint,
  customTokenDecimals,
  userId,
  contestId,
  onSuccess,
  onCancel,
}: SolanaPaymentProps) {
  const [paymentUrl, setPaymentUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Generate unique reference for transaction tracking (stable across renders)
  const reference = useMemo(() => Keypair.generate().publicKey, []);

  // Generate Solana Pay URL manually (avoids Buffer dependencies)
  useEffect(() => {
    try {
      // Build Solana Pay URL according to spec: solana:{recipient}?params
      // URLSearchParams handles encoding automatically, don't double-encode!
      const params = new URLSearchParams();
      
      params.append('amount', amount.toString());
      params.append('reference', reference.toBase58());
      params.append('label', label);
      params.append('message', message || `Entry fee for ${label}`);
      params.append('memo', `contest:${contestId}:user:${userId}`);
      
      // Add SPL token mint if applicable
      if (currency === "USDC") {
        // USDC devnet mint address
        params.append('spl-token', "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
      } else if (currency === "CUSTOM" && customTokenMint) {
        params.append('spl-token', customTokenMint);
      }

      const url = `solana:${recipient}?${params.toString()}`;
      setPaymentUrl(url);
    } catch (error) {
      console.error("Error generating payment URL:", error);
      toast({
        title: "Error",
        description: "Failed to generate payment link",
        variant: "destructive",
      });
    }
  }, [amount, currency, recipient, label, message, customTokenMint, contestId, userId, reference, toast]);

  // Copy payment URL to clipboard
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Payment link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  }, [paymentUrl, toast]);

  // Open payment URL in wallet
  const openInWallet = useCallback(() => {
    window.open(paymentUrl, "_blank");
  }, [paymentUrl]);

  // Poll backend for payment verification using reference
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiRequest("POST", "/api/payment/find-by-reference", {
          reference: reference.toBase58(),
          expectedAmount: amount,
          recipientAddress: recipient,
          contestId,
        });
        
        const data = await res.json();
        
        if (data.found && data.success && data.txHash) {
          // Payment verified!
          clearInterval(interval);
          pollingIntervalRef.current = null;
          onSuccess(data.txHash);
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
      }
    }, 3000); // Poll every 3 seconds

    pollingIntervalRef.current = interval;
  }, [reference, amount, recipient, contestId, onSuccess]);

  // Start automatic polling when component mounts
  useEffect(() => {
    startPolling();
    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual verification
  const verifyPayment = useCallback(async () => {
    setIsVerifying(true);
    
    try {
      const res = await apiRequest("POST", "/api/payment/find-by-reference", {
        reference: reference.toBase58(),
        expectedAmount: amount,
        recipientAddress: recipient,
        contestId,
      });
      
      const data = await res.json();
      
      if (data.found && data.success && data.txHash) {
        onSuccess(data.txHash);
        toast({
          title: "Payment Verified!",
          description: "Your entry fee payment has been confirmed",
        });
      } else {
        toast({
          title: "Payment Not Found",
          description: data.message || "Please complete the payment and try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      toast({
        title: "Verification Error",
        description: error instanceof Error ? error.message : "Failed to verify payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  }, [reference, amount, recipient, contestId, onSuccess, toast]);

  const displayAmount = currency === "CUSTOM" && customTokenDecimals
    ? `${amount} (Custom Token)`
    : `${amount} ${currency}`;

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="card-solana-payment">
      <CardHeader>
        <CardTitle>Pay Entry Fee</CardTitle>
        <CardDescription>
          Scan QR code or use the payment link to pay {displayAmount}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* QR Code */}
        {paymentUrl && (
          <div className="flex justify-center p-4 bg-white rounded-lg" data-testid="container-qr-code">
            <QRCodeSVG value={paymentUrl} size={200} level="H" />
          </div>
        )}

        {/* Payment URL */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Payment Link:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={paymentUrl}
              readOnly
              className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
              data-testid="input-payment-url"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              data-testid="button-copy-link"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
          <p className="font-medium">How to pay:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Scan QR code with mobile wallet (Phantom, Solflare)</li>
            <li>Or copy link and open in wallet app</li>
            <li>Confirm transaction in your wallet</li>
            <li>Wait for verification (automatic)</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={openInWallet}
            data-testid="button-open-wallet"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in Wallet
          </Button>
          
          <Button
            variant="default"
            className="flex-1"
            onClick={verifyPayment}
            disabled={isVerifying}
            data-testid="button-verify-payment"
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Payment"
            )}
          </Button>
        </div>

        {/* Auto-polling notice */}
        <p className="text-xs text-center text-muted-foreground">
          Payment verification happens automatically. You can also verify manually.
        </p>

        {/* Cancel */}
        {onCancel && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={onCancel}
            data-testid="button-cancel-payment"
          >
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
