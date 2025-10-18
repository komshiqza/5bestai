import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { PublicKey, Keypair } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Loader2, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { SubscriptionTier } from "@shared/schema";

interface SubscriptionSolanaPaymentProps {
  tier: SubscriptionTier;
  currency: "SOL" | "USDC";
  recipient?: string; // Optional - will fetch from backend if not provided
  userId: string; // Current user ID
  onSuccess: (txHash: string) => void;
  onCancel?: () => void;
}

export function SubscriptionSolanaPayment({
  tier,
  currency,
  recipient: recipientProp,
  userId,
  onSuccess,
  onCancel,
}: SubscriptionSolanaPaymentProps) {
  const [paymentUrl, setPaymentUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(300); // 5 minutes
  const [walletDetected, setWalletDetected] = useState<boolean>(false);
  const [recipient, setRecipient] = useState<string>(recipientProp || "");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Convert cents to dollars for USDC payment
  const amount = tier.priceUsd / 100;

  // Generate unique reference for transaction tracking (stable across renders)
  const reference = useMemo(() => Keypair.generate().publicKey, []);

  // Fetch platform wallet from backend if not provided
  useEffect(() => {
    const fetchPlatformWallet = async () => {
      if (recipientProp) {
        setRecipient(recipientProp);
        return;
      }

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
  }, [recipientProp, toast]);

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
      params.append('label', `${tier.name} Subscription`);
      params.append('message', `Subscribe to ${tier.name} tier - ${tier.monthlyCredits} credits/month`);
      params.append('memo', `subscription:${tier.id}:user:${userId}`);
      
      // Add SPL token mint if using USDC
      if (currency === "USDC") {
        // USDC mainnet mint address
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
  }, [amount, currency, recipient, tier, userId, reference, toast]);

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

  // Direct wallet transaction (desktop wallet integration)
  const openInWallet = useCallback(async () => {
    console.log("🚀 openInWallet called for subscription!");
    
    if (!paymentUrl) {
      toast({
        title: "Error",
        description: "Payment URL not ready",
        variant: "destructive",
      });
      return;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Mobile: always use deep link (works with or without extension)
    if (isMobile) {
      // Use Phantom universal link for better mobile UX
      const phantomDeepLink = `https://phantom.app/ul/v1/browse/${encodeURIComponent(paymentUrl)}?ref=${encodeURIComponent(window.location.origin)}`;
      
      window.location.href = phantomDeepLink;
      
      toast({
        title: "Opening Wallet",
        description: "Redirecting to your mobile wallet...",
      });
      
      // Fallback to direct Solana Pay URL after 2 seconds if Phantom not installed
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          // User still on page, try direct protocol
          window.location.href = paymentUrl;
        }
      }, 2000);
      
      // Start polling for mobile flow (user will complete payment in wallet app)
      startPolling();
      
      return;
    }

    // Desktop: Check for wallet extension
    if (!walletDetected) {
      // No extension found, open in browser instead
      toast({
        title: "Opening Payment Link",
        description: "Opening Solana Pay link in your browser...",
      });
      window.open(paymentUrl, '_blank');
      
      // Start polling for fallback flow (user will complete payment in new tab)
      startPolling();
      
      return;
    }

    // Desktop with extension: Try wallet integration
    try{
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
          description: "Preparing subscription payment...",
        });

        // Parse payment URL
        const url = new URL(paymentUrl);
        const recipientAddress = url.pathname;
        const amount = parseFloat(url.searchParams.get('amount') || '0');
        const referenceParam = url.searchParams.get('reference');
        const splToken = url.searchParams.get('spl-token'); // USDC mint address
        
        // Import Solana web3.js, SPL token, and Solana Pay
        const { Connection, PublicKey, Transaction } = await import('@solana/web3.js');
        const { 
          getAssociatedTokenAddress, 
          createTransferCheckedInstruction,
          createAssociatedTokenAccountInstruction,
          getAccount
        } = await import('@solana/spl-token');
        const { findReference } = await import('@solana/pay');
        
        const rpcUrl = import.meta.env.VITE_HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
        const connection = new Connection(rpcUrl, 'confirmed');
        
        // Create transaction
        const transaction = new Transaction();
        
        if (splToken) {
          // USDC SPL Token transfer
          const usdcMint = new PublicKey(splToken);
          const sender = walletResponse.publicKey;
          const recipient = new PublicKey(recipientAddress);
          
          // Get associated token accounts
          const senderTokenAccount = await getAssociatedTokenAddress(usdcMint, sender);
          const recipientTokenAccount = await getAssociatedTokenAddress(usdcMint, recipient);
          
          // Check if accounts exist, create if needed
          try {
            await getAccount(connection, senderTokenAccount);
          } catch (error) {
            // Sender token account doesn't exist - this shouldn't happen for USDC holders
            // but we can create it if needed
            console.log("Creating sender token account...");
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
            // Recipient (platform) token account doesn't exist, create it
            console.log("Creating recipient token account...");
            transaction.add(
              createAssociatedTokenAccountInstruction(
                sender, // payer
                recipientTokenAccount,
                recipient, // owner
                usdcMint
              )
            );
          }
          
          // USDC has 6 decimals
          const usdcDecimals = 6;
          const transferAmount = Math.round(amount * Math.pow(10, usdcDecimals));
          
          // Create USDC transfer instruction (using TransferChecked for proper validation)
          let transferInstruction = createTransferCheckedInstruction(
            senderTokenAccount,     // source
            usdcMint,              // mint
            recipientTokenAccount, // destination
            sender,                // owner
            transferAmount,        // amount
            usdcDecimals          // decimals
          );
          
          // Add reference BEFORE adding to transaction (Solana Pay spec)
          if (referenceParam) {
            const referenceKey = new PublicKey(referenceParam);
            // Clone the instruction with reference added to keys
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
            console.log("Added reference to USDC transfer:", referenceParam);
          }
          
          transaction.add(transferInstruction);
        } else {
          // Fallback to SOL transfer (not expected for subscriptions)
          const { SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
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
            console.log("Added reference to SOL transaction:", referenceParam);
          }
          
          transaction.add(transferInstruction);
        }
        
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = walletResponse.publicKey;

        console.log("Transaction details:", {
          instructions: transaction.instructions.length,
          feePayer: transaction.feePayer?.toBase58(),
          recentBlockhash: transaction.recentBlockhash
        });

        toast({
          title: "Sending Transaction",
          description: "Please approve the subscription payment in Phantom...",
        });

        const signedTransaction = await win.solana.signAndSendTransaction(transaction);
        
        console.log("✅ Subscription payment sent:", signedTransaction.signature);
        
        toast({
          title: "Payment Sent!",
          description: "Processing your subscription...",
        });
        
        // Start polling AFTER transaction is successfully sent
        startPolling();
        
        onSuccess(signedTransaction.signature);
        
        return;
      }
      
      // Fallback: Copy link (for non-Phantom wallets or errors)
      await navigator.clipboard.writeText(paymentUrl);
      toast({
        title: "Payment Link Copied",
        description: "Open your wallet extension and paste this link in the browser tab.",
        duration: 8000,
      });
      
      // Start polling for fallback flow
      startPolling();
      
    } catch (error: any) {
      console.error("Wallet integration error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      if (error.code === 4001) {
        toast({
          title: "Transaction Cancelled",
          description: "You cancelled the transaction.",
          variant: "destructive",
        });
      } else if (error.code === -32603) {
        toast({
          title: "Transaction Failed",
          description: "RPC error. Make sure Phantom is on Solana Mainnet and you have USDC + SOL for fees.",
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
  }, [paymentUrl, walletDetected, onSuccess, toast, tier]);

  // Poll backend for payment verification
  const startPolling = useCallback(() => {
    // Stop any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    let pollCount = 0;
    const maxPolls = 100; // 5 minutes (enough time for user to complete wallet transaction)
    
    const interval = setInterval(async () => {
      try {
        pollCount++;
        
        const remainingSeconds = Math.max(0, (maxPolls - pollCount) * 3);
        setTimeoutSeconds(remainingSeconds);
        
        if (pollCount > maxPolls) {
          console.log("⏰ Subscription payment polling timeout");
          clearInterval(interval);
          pollingIntervalRef.current = null;
          setTimeoutSeconds(0);
          return;
        }

        const res = await apiRequest("POST", "/api/subscription/purchase-crypto", {
          reference: reference.toBase58(),
          tierId: tier.id,
          currency,
        });
        
        const data = await res.json();
        
        if (data.found || data.error) {
          console.log("📡 Subscription payment verification response:", data);
        }
        
        if (data.found && data.success && data.txHash) {
          console.log("✅ Subscription payment verified:", data.txHash);
          clearInterval(interval);
          pollingIntervalRef.current = null;
          
          toast({
            title: "Subscription Activated!",
            description: data.message || `Successfully subscribed to ${tier.name} tier!`,
          });
          
          onSuccess(data.txHash);
        } else if (data.error) {
          console.error("❌ Subscription payment error:", data.error);
        }
      } catch (error) {
        console.error("💥 Error checking subscription payment:", error);
      }
    }, 3000); // Poll every 3 seconds

    pollingIntervalRef.current = interval;
  }, [reference, tier, currency, recipient, onSuccess, toast]);

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
      const res = await apiRequest("POST", "/api/subscription/purchase-crypto", {
        reference: reference.toBase58(),
        tierId: tier.id,
        currency,
      });
      
      const data = await res.json();
      
      if (data.found && data.success && data.txHash) {
        console.log("✅ Manual subscription verification successful:", data.txHash);
        
        toast({
          title: "Subscription Activated!",
          description: data.message || `Successfully subscribed to ${tier.name} tier!`,
        });
        
        onSuccess(data.txHash);
      } else {
        const isNotFoundMessage = data.message && data.message.includes("Payment not found yet");
        toast({
          title: isNotFoundMessage ? "Transaction Not Detected" : "Payment Not Found",
          description: isNotFoundMessage 
            ? "Transaction may still be processing. Please wait and try again."
            : data.message || data.error || "Please complete the payment and try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("💥 Manual subscription verification error:", error);
      toast({
        title: "Verification Error",
        description: error instanceof Error ? error.message : "Failed to verify payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  }, [reference, tier, currency, recipient, onSuccess, toast]);

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="card-subscription-payment">
      <CardHeader>
        <CardTitle>Subscribe to {tier.name}</CardTitle>
        <CardDescription>
          Pay {amount} {currency} to activate your subscription
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mainnet Warning */}
        <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Real Money Transaction:</strong> This payment uses mainnet with real {currency}. You'll receive {tier.monthlyCredits} credits immediately.
          </AlertDescription>
        </Alert>

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
            onClick={() => {
              openInWallet();
            }}
            data-testid="button-pay-with-wallet"
          >
            {walletDetected ? "Pay with Phantom" : "Open in Browser"}
          </Button>
          <Button
            variant="outline"
            onClick={verifyPayment}
            disabled={isVerifying}
            data-testid="button-verify-payment"
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
            data-testid="button-cancel-payment"
          >
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
