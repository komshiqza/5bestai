import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Loader2, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface PromptSolanaPaymentProps {
  submission: {
    id: string;
    title: string;
    promptPrice: string;
    promptCurrency: string;
  };
  userId: string; // Current user ID
  onSuccess: (txHash: string) => void;
  onCancel?: () => void;
}

export function PromptSolanaPayment({
  submission,
  userId,
  onSuccess,
  onCancel,
}: PromptSolanaPaymentProps) {
  const [paymentUrl, setPaymentUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(300); // 5 minutes
  const [walletDetected, setWalletDetected] = useState<boolean>(false);
  const [recipient, setRecipient] = useState<string>("");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const amount = parseFloat(submission.promptPrice);
  const currency = submission.promptCurrency;

  // Generate unique reference for transaction tracking (stable across renders)
  const reference = useMemo(() => Keypair.generate().publicKey, []);

  // Fetch platform wallet from backend
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
            description: "Platform wallet address not configured. Please contact support.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Failed to fetch platform wallet:", error);
        toast({
          title: "Error",
          description: "Failed to fetch payment address. Please try again.",
          variant: "destructive",
        });
      }
    };

    fetchPlatformWallet();
  }, [toast]);

  // Detect available Solana wallets
  useEffect(() => {
    const detectWallet = async () => {
      let detected = false;
      
      const hasPhantom = typeof window !== 'undefined' && (window as any).solana && (window as any).solana.isPhantom;
      const hasSolflare = typeof window !== 'undefined' && (window as any).solflare;
      const hasGlow = typeof window !== 'undefined' && (window as any).glowSolana;
      
      if (hasPhantom || hasSolflare || hasGlow) {
        detected = true;
      }
      
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
    // Wait for recipient to be loaded
    if (!recipient) return;

    try {
      const params = new URLSearchParams();
      
      params.append('amount', amount.toString());
      params.append('reference', reference.toBase58());
      params.append('label', `Purchase: ${submission.title}`);
      params.append('message', `Buy prompt for ${amount} ${currency}`);
      params.append('memo', `prompt:${submission.id}:user:${userId}`);
      
      // Add SPL token mint if using USDC
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
  }, [amount, currency, recipient, submission, userId, reference, toast]);

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

  // Direct wallet transaction
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
    
    // Mobile: use protocol URL
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

    // Desktop: Check for wallet extension
    if (!walletDetected) {
      toast({
        title: "Opening Payment Link",
        description: "Opening Solana Pay link in your browser...",
      });
      window.open(paymentUrl, '_blank');
      
      startPolling();
      return;
    }

    // Desktop with extension: Try wallet integration
    try {
      const win = window as any;
      
      if (win.solana && win.solana.isPhantom) {
        toast({
          title: "Connecting to Phantom...",
          description: "Please approve the connection in your wallet.",
        });

        // Connect wallet
        let walletResponse;
        if (win.solana.isConnected) {
          walletResponse = { publicKey: win.solana.publicKey };
        } else {
          walletResponse = await win.solana.connect();
        }

        toast({
          title: "Creating Transaction",
          description: "Preparing prompt payment...",
        });

        // Parse payment URL
        const url = new URL(paymentUrl);
        const recipientAddress = url.pathname;
        const amount = parseFloat(url.searchParams.get('amount') || '0');
        const referenceParam = url.searchParams.get('reference');
        const splToken = url.searchParams.get('spl-token');
        
        // Import Solana web3.js
        const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
        
        if (splToken) {
          // USDC SPL Token transfer
          const { 
            getAssociatedTokenAddress, 
            createTransferCheckedInstruction,
            createAssociatedTokenAccountInstruction,
            getAccount
          } = await import('@solana/spl-token');
          
          const rpcUrl = import.meta.env.VITE_HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
          const connection = new Connection(rpcUrl, 'confirmed');
          
          const transaction = new Transaction();
          
          const usdcMint = new PublicKey(splToken);
          const sender = walletResponse.publicKey;
          const recipient = new PublicKey(recipientAddress);
          
          const senderTokenAccount = await getAssociatedTokenAddress(usdcMint, sender);
          const recipientTokenAccount = await getAssociatedTokenAddress(usdcMint, recipient);
          
          try {
            await getAccount(connection, senderTokenAccount);
          } catch (error) {
            transaction.add(
              createAssociatedTokenAccountInstruction(
                sender,
                senderTokenAccount,
                sender,
                usdcMint
              )
            );
          }
          
          try {
            await getAccount(connection, recipientTokenAccount);
          } catch (error) {
            transaction.add(
              createAssociatedTokenAccountInstruction(
                sender,
                recipientTokenAccount,
                recipient,
                usdcMint
              )
            );
          }
          
          const usdcDecimals = 6;
          const transferAmount = Math.round(amount * Math.pow(10, usdcDecimals));
          
          let transferInstruction = createTransferCheckedInstruction(
            senderTokenAccount,
            usdcMint,
            recipientTokenAccount,
            sender,
            transferAmount,
            usdcDecimals
          );
          
          if (referenceParam) {
            const referenceKey = new PublicKey(referenceParam);
            transferInstruction = {
              ...transferInstruction,
              keys: [
                ...transferInstruction.keys,
                {
                  pubkey: referenceKey,
                  isSigner: false,
                  isWritable: false,
                }
              ]
            };
          }
          
          transaction.add(transferInstruction);
          
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = walletResponse.publicKey;

          toast({
            title: "Sending Transaction",
            description: "Please approve the payment in Phantom...",
          });

          const signedTransaction = await win.solana.signAndSendTransaction(transaction);
          
          toast({
            title: "Payment Sent!",
            description: "Verifying your payment...",
          });
          
          startPolling();
          return;
        } else {
          // SOL transfer
          const rpcUrl = import.meta.env.VITE_HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
          const connection = new Connection(rpcUrl, 'confirmed');
          
          const transaction = new Transaction();
          
          let transferInstruction = SystemProgram.transfer({
            fromPubkey: walletResponse.publicKey,
            toPubkey: new PublicKey(recipientAddress),
            lamports: Math.round(amount * LAMPORTS_PER_SOL),
          });
          
          if (referenceParam) {
            const referenceKey = new PublicKey(referenceParam);
            transferInstruction = {
              ...transferInstruction,
              keys: [
                ...transferInstruction.keys,
                {
                  pubkey: referenceKey,
                  isSigner: false,
                  isWritable: false,
                }
              ]
            };
          }
          
          transaction.add(transferInstruction);
          
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = walletResponse.publicKey;

          toast({
            title: "Sending Transaction",
            description: "Please approve the payment in Phantom...",
          });

          const signedTransaction = await win.solana.signAndSendTransaction(transaction);
          
          toast({
            title: "Payment Sent!",
            description: "Verifying your payment...",
          });
          
          startPolling();
          return;
        }
      }
      
      // Fallback: Copy link
      await navigator.clipboard.writeText(paymentUrl);
      toast({
        title: "Payment Link Copied",
        description: "Open your wallet extension and paste this link in the browser tab.",
        duration: 8000,
      });
      
      startPolling();
      
    } catch (error: any) {
      console.error("Wallet integration error:", error);
      
      if (error.code === 4001) {
        toast({
          title: "Transaction Cancelled",
          description: "You cancelled the transaction.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Wallet Integration Error",
          description: `${error.message || "Please use the QR code or copy link method as a backup."}`,
          variant: "destructive",
        });
      }
    }
  }, [paymentUrl, walletDetected, onSuccess, toast, submission]);

  // Poll backend for payment verification
  const startPolling = useCallback(() => {
    // Stop any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    let pollCount = 0;
    let consecutiveRateLimitErrors = 0;
    const maxPolls = 100; // 5 minutes at 3 second intervals
    const maxRateLimitErrors = 3; // Stop after 3 consecutive rate limit errors
    
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

        const res = await apiRequest("POST", "/api/prompts/purchase-with-solana", {
          submissionId: submission.id,
          reference: reference.toBase58(),
        });
        
        const data = await res.json();
        
        if (data.success && (data.purchase || data.alreadyProcessed)) {
          clearInterval(interval);
          pollingIntervalRef.current = null;
          
          toast({
            title: "Prompt Purchased!",
            description: "Your payment has been processed and the prompt is now visible.",
          });
          
          onSuccess(data.txHash);
        } else if (data.error && data.error.includes("429")) {
          consecutiveRateLimitErrors++;
          console.warn(`Rate limit error (${consecutiveRateLimitErrors}/${maxRateLimitErrors})`);
          
          if (consecutiveRateLimitErrors >= maxRateLimitErrors) {
            clearInterval(interval);
            pollingIntervalRef.current = null;
            toast({
              title: "Rate Limit Exceeded",
              description: "Too many verification attempts. Please use the 'Verify Payment' button after completing your transaction.",
              variant: "destructive",
            });
            return;
          }
        } else if (data.error && !data.message.includes("not yet confirmed")) {
          console.error("❌ Prompt payment error:", data.error);
          consecutiveRateLimitErrors = 0; // Reset on non-rate-limit errors
        }
      } catch (error: any) {
        if (error?.message?.includes("429")) {
          consecutiveRateLimitErrors++;
          if (consecutiveRateLimitErrors >= maxRateLimitErrors) {
            clearInterval(interval);
            pollingIntervalRef.current = null;
            toast({
              title: "Rate Limit Exceeded",
              description: "Too many verification attempts. Please use the 'Verify Payment' button after completing your transaction.",
              variant: "destructive",
            });
          }
        } else {
          console.error("💥 Error checking prompt payment:", error);
        }
      }
    }, 3000); // Poll every 3 seconds

    pollingIntervalRef.current = interval;
  }, [reference, submission, onSuccess, toast]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Manual verification
  const verifyPayment = useCallback(async () => {
    setIsVerifying(true);
    
    try {
      const res = await apiRequest("POST", "/api/prompts/purchase-with-solana", {
        submissionId: submission.id,
        reference: reference.toBase58(),
      });
      
      const data = await res.json();
      
      if (data.success && (data.purchase || data.alreadyProcessed)) {
        toast({
          title: "Prompt Purchased!",
          description: "Your payment has been processed and the prompt is now visible.",
        });
        
        onSuccess(data.txHash);
      } else {
        const isNotFoundMessage = data.message && data.message.includes("not yet confirmed");
        toast({
          title: isNotFoundMessage ? "Transaction Not Detected" : "Payment Not Found",
          description: isNotFoundMessage 
            ? "Transaction may still be processing. Please wait and try again."
            : data.message || data.error || "Please complete the payment and try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("💥 Manual prompt verification error:", error);
      toast({
        title: "Verification Error",
        description: error instanceof Error ? error.message : "Failed to verify payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  }, [reference, submission, onSuccess, toast]);

  return (
    <div className="space-y-4">
        {/* Mainnet Warning */}
        <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Real Money Transaction:</strong> This payment uses mainnet with real {currency}.
          </AlertDescription>
        </Alert>

        {/* QR Code */}
        {paymentUrl && (
          <div className="flex justify-center p-4 bg-white rounded-lg">
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
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
          <p className="font-medium">Payment Options:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li><strong>QR Code:</strong> Scan with your mobile Solana wallet</li>
            {walletDetected ? (
              <li><strong>Pay with Wallet:</strong> Direct transaction in browser wallet ✅</li>
            ) : (
              <li><strong>No Wallet:</strong> Install browser extension first ⚠️</li>
            )}
            <li><strong>Manual Copy:</strong> Copy link and paste in wallet browser</li>
            <li><strong>Verification:</strong> Automatic detection after completion</li>
          </ol>
        </div>

        {/* Timeout counter */}
        {timeoutSeconds > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            Auto-verifying... ({Math.floor(timeoutSeconds / 60)}:{(timeoutSeconds % 60).toString().padStart(2, '0')})
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={openInWallet}
          >
            {walletDetected ? "Pay with Phantom" : "Open in Browser"}
          </Button>
          <Button
            variant="outline"
            onClick={verifyPayment}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              "Verify Payment"
            )}
          </Button>
        </div>

        {onCancel && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
    </div>
  );
}

