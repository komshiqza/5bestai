import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/currency";

interface PromptSolanaPaymentProps {
  submissionId: string;
  amount: number;
  currency: "SOL" | "USDC";
  onSuccess: (txHash: string) => void;
  onCancel?: () => void;
}

export function PromptSolanaPayment({
  submissionId,
  amount,
  currency,
  onSuccess,
  onCancel,
}: PromptSolanaPaymentProps) {
  const [paymentUrl, setPaymentUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(300);
  const [walletDetected, setWalletDetected] = useState<boolean>(false);
  const [recipient, setRecipient] = useState<string>("");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Generate unique reference for transaction tracking
  const reference = useMemo(() => Keypair.generate().publicKey, []);

  // Fetch platform wallet
  useEffect(() => {
    const fetchPlatformWallet = async () => {
      try {
        const res = await apiRequest("GET", "/api/settings/platform-wallet");
        const data = await res.json();
        if (data.platformWalletAddress) {
          setRecipient(data.platformWalletAddress);
        } else {
          toast({
            title: "Configuration Error",
            description: "Platform wallet not configured",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to fetch platform wallet:", error);
        toast({
          title: "Error",
          description: "Failed to fetch payment address",
          variant: "destructive",
        });
      }
    };

    fetchPlatformWallet();
  }, [toast]);

  // Detect Solana wallets
  useEffect(() => {
    const detectWallet = () => {
      const win = window as any;
      const detected = !!(win.solana?.isPhantom || win.solflare || win.glowSolana);
      setWalletDetected(detected);
    };

    detectWallet();
    const timeout1 = setTimeout(detectWallet, 1000);
    const timeout2 = setTimeout(detectWallet, 3000);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, []);

  // Generate Solana Pay URL
  useEffect(() => {
    if (!recipient) return;

    try {
      const params = new URLSearchParams();
      params.append('amount', amount.toString());
      params.append('reference', reference.toBase58());
      params.append('label', 'Prompt Purchase');
      params.append('message', `Purchase prompt access`);
      params.append('memo', `prompt:${submissionId}`);
      
      if (currency === "USDC") {
        params.append('spl-token', "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
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
  }, [amount, currency, recipient, submissionId, reference, toast]);

  // Copy to clipboard
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Payment link copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  }, [paymentUrl, toast]);

  // Start polling for payment verification
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    let pollCount = 0;
    const maxPolls = 100; // 5 minutes
    
    const interval = setInterval(async () => {
      try {
        pollCount++;
        const remainingSeconds = Math.max(0, (maxPolls - pollCount) * 3);
        setTimeoutSeconds(remainingSeconds);
        
        if (pollCount > maxPolls) {
          clearInterval(interval);
          pollingIntervalRef.current = null;
          setTimeoutSeconds(0);
          return;
        }

        const res = await apiRequest("POST", `/api/prompts/verify-payment/${submissionId}`, {
          reference: reference.toBase58(),
          currency,
        });
        
        const data = await res.json();
        
        if (data.found && data.success && data.txHash) {
          clearInterval(interval);
          pollingIntervalRef.current = null;
          
          toast({
            title: "Payment Successful!",
            description: "You now have access to the prompt",
          });
          
          onSuccess(data.txHash);
        }
      } catch (error) {
        console.error("Error checking payment:", error);
      }
    }, 3000); // Poll every 3 seconds

    pollingIntervalRef.current = interval;
  }, [reference, submissionId, currency, onSuccess, toast]);

  // Open in wallet
  const openInWallet = useCallback(async () => {
    if (!paymentUrl) {
      toast({
        title: "Error",
        description: "Payment URL not ready",
        variant: "destructive",
      });
      return;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Mobile: use deep link
    if (isMobile) {
      const phantomDeepLink = `https://phantom.app/ul/v1/browse/${encodeURIComponent(paymentUrl)}?ref=${encodeURIComponent(window.location.origin)}`;
      window.location.href = phantomDeepLink;
      
      toast({
        title: "Opening Wallet",
        description: "Redirecting to your mobile wallet...",
      });
      
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          window.location.href = paymentUrl;
        }
      }, 2000);
      
      startPolling();
      return;
    }

    // Desktop without extension: open in new tab
    if (!walletDetected) {
      toast({
        title: "Opening Payment Link",
        description: "Opening Solana Pay link in your browser...",
      });
      window.open(paymentUrl, '_blank');
      startPolling();
      return;
    }

    // Desktop with extension: direct wallet integration
    try {
      const win = window as any;
      
      if (win.solana?.isPhantom) {
        toast({
          title: "Connecting to Phantom...",
          description: "Please approve in your wallet",
        });

        let walletResponse;
        if (win.solana.isConnected) {
          walletResponse = { publicKey: win.solana.publicKey };
        } else {
          walletResponse = await win.solana.connect();
        }

        toast({
          title: "Creating Transaction",
          description: "Preparing payment...",
        });

        const url = new URL(paymentUrl);
        const recipientAddress = url.pathname;
        const payAmount = parseFloat(url.searchParams.get('amount') || '0');
        const splToken = url.searchParams.get('spl-token');
        
        const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
        const { 
          getAssociatedTokenAddress, 
          createTransferCheckedInstruction,
          createAssociatedTokenAccountInstruction,
          getAccount
        } = await import('@solana/spl-token');
        
        const rpcUrl = import.meta.env.VITE_HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
        const connection = new Connection(rpcUrl, 'confirmed');
        
        const transaction = new Transaction();
        
        if (splToken) {
          // USDC transfer
          const usdcMint = new PublicKey(splToken);
          const sender = walletResponse.publicKey;
          const recipientPubkey = new PublicKey(recipientAddress);
          
          const senderTokenAccount = await getAssociatedTokenAddress(usdcMint, sender);
          const recipientTokenAccount = await getAssociatedTokenAddress(usdcMint, recipientPubkey);
          
          // Check if recipient token account exists
          try {
            await getAccount(connection, recipientTokenAccount);
          } catch (error) {
            transaction.add(
              createAssociatedTokenAccountInstruction(
                sender,
                recipientTokenAccount,
                recipientPubkey,
                usdcMint
              )
            );
          }
          
          // Transfer USDC (6 decimals)
          transaction.add(
            createTransferCheckedInstruction(
              senderTokenAccount,
              usdcMint,
              recipientTokenAccount,
              sender,
              Math.round(payAmount * 1_000_000),
              6
            )
          );
        } else {
          // SOL transfer
          transaction.add(
            SystemProgram.transfer({
              fromPubkey: walletResponse.publicKey,
              toPubkey: new PublicKey(recipientAddress),
              lamports: Math.round(payAmount * LAMPORTS_PER_SOL),
            })
          );
        }
        
        // Add reference
        const referenceInstruction = SystemProgram.transfer({
          fromPubkey: walletResponse.publicKey,
          toPubkey: reference,
          lamports: 0,
        });
        transaction.add(referenceInstruction);
        
        transaction.feePayer = walletResponse.publicKey;
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        
        const signed = await win.solana.signAndSendTransaction(transaction);
        
        toast({
          title: "Transaction Sent",
          description: "Waiting for confirmation...",
        });
        
        startPolling();
      }
    } catch (error: any) {
      console.error("Wallet payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  }, [paymentUrl, walletDetected, reference, startPolling, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* QR Code */}
      {paymentUrl && (
        <div className="flex justify-center p-4 bg-white rounded-lg">
          <QRCodeSVG value={paymentUrl} size={200} />
        </div>
      )}

      {/* Amount Display */}
      <div className="text-center">
        <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">
          {formatCurrency(amount, currency)}
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Scan QR code or pay with wallet
        </div>
      </div>

      {/* Pay with Wallet Button */}
      <Button
        onClick={openInWallet}
        disabled={!paymentUrl}
        className="w-full"
        data-testid="button-pay-wallet"
      >
        {walletDetected ? "Pay with Wallet" : "Open Payment Link"}
      </Button>

      {/* Copy Link Button */}
      <Button
        onClick={copyToClipboard}
        disabled={!paymentUrl}
        variant="outline"
        className="w-full"
        data-testid="button-copy-link"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-2" />
            Copy Payment Link
          </>
        )}
      </Button>

      {/* Timeout indicator */}
      {timeoutSeconds > 0 && timeoutSeconds < 300 && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting for payment... ({Math.floor(timeoutSeconds / 60)}:{(timeoutSeconds % 60).toString().padStart(2, '0')})
        </div>
      )}

      {/* Cancel Button */}
      {onCancel && (
        <Button
          onClick={onCancel}
          variant="ghost"
          className="w-full"
          data-testid="button-cancel"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
