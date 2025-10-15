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
  const [timeoutSeconds, setTimeoutSeconds] = useState<number>(120); // 2 minutes
  const [walletDetected, setWalletDetected] = useState<boolean>(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Generate unique reference for transaction tracking (stable across renders)
  const reference = useMemo(() => Keypair.generate().publicKey, []);

  // Detect available Solana wallets and protocol handlers
  useEffect(() => {
    const detectWallet = async () => {
      let detected = false;
      
      // Check for wallet objects
      const hasPhantom = typeof window !== 'undefined' && (window as any).solana && (window as any).solana.isPhantom;
      const hasSolflare = typeof window !== 'undefined' && (window as any).solflare;
      const hasGlow = typeof window !== 'undefined' && (window as any).glowSolana;
      
      if (hasPhantom || hasSolflare || hasGlow) {
        detected = true;
      }
      
      // Test if solana: protocol is supported (without triggering the error)
      if (!detected && 'navigator' in window && 'registerProtocolHandler' in navigator) {
        try {
          // Create a temporary iframe to test protocol handling
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = 'about:blank';
          document.body.appendChild(iframe);
          
          // Test if we can handle solana: URLs without error
          const testUrl = 'solana:test';
          const link = iframe.contentDocument?.createElement('a');
          if (link) {
            link.href = testUrl;
            // If this doesn't throw, protocol might be supported
            if (link.protocol === 'solana:') {
              detected = true;
            }
          }
          
          document.body.removeChild(iframe);
        } catch (error) {
          // Protocol not supported
          detected = false;
        }
      }
      
      setWalletDetected(detected);
    };

    // Initial check
    detectWallet();

    // Check again after delays (wallets might load async)
    const timeout1 = setTimeout(detectWallet, 1000);
    const timeout2 = setTimeout(detectWallet, 3000);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, []);

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
      
      // Debug logging disabled to reduce console spam
      // console.log("💳 Payment URL Generated:", {
      //   url: url.substring(0, 100) + "...", // Truncated for security
      //   reference: reference.toBase58(),
      //   amount,
      //   currency,
      //   recipient: recipient.substring(0, 8) + "...",
      //   contestId
      // });
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

  // Direct wallet transaction (localhost-friendly)
  const openInWallet = useCallback(async () => {
    console.log("🚀 openInWallet called!", { paymentUrl, walletDetected });
    
    if (!paymentUrl) {
      toast({
        title: "Error",
        description: "Payment URL not ready",
        variant: "destructive",
      });
      return;
    }

    if (!walletDetected) {
      toast({
        title: "No Wallet Extension Found",
        description: "Please install Phantom or Solflare browser extension first.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Opening Wallet...",
      description: "Attempting to connect to your wallet extension.",
    });

    try {
      const win = window as any;
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Mobile: use protocol URL (works better on mobile)
      if (isMobile) {
        window.location.href = paymentUrl;
        toast({
          title: "Opening Mobile Wallet",
          description: "Redirecting to your wallet app...",
        });
        return;
      }

      // Desktop: Try both direct integration and protocol URL
      console.log("🔍 Detailed wallet detection:", { 
        hasSolana: !!win.solana, 
        isPhantom: win.solana?.isPhantom,
        isConnected: win.solana?.isConnected,
        phantomExists: !!win.phantom,
        solflareExists: !!win.solflare,
        walletDetected,
        paymentUrl: paymentUrl?.substring(0, 50) + '...'
      });

      if (win.solana && win.solana.isPhantom) {
        try {
          console.log("Attempting Phantom direct integration...");
          
          toast({
            title: "Connecting to Phantom...",
            description: "Please approve the connection in your wallet.",
          });

          // Connect wallet first (if not already connected)
          let walletResponse;
          try {
            if (win.solana.isConnected) {
              console.log("✅ Wallet already connected, skipping connect call");
              walletResponse = { publicKey: win.solana.publicKey };
            } else {
              console.log("🔗 Calling win.solana.connect()...");
              walletResponse = await win.solana.connect();
              console.log("✅ Wallet connected successfully:", walletResponse.publicKey.toString());
            }
          } catch (connectError: any) {
            console.log("❌ Wallet connection error:", connectError);
            if (connectError.code === 4001) {
              toast({
                title: "Connection Cancelled",
                description: "You cancelled the wallet connection.",
                variant: "destructive",
              });
              return;
            }
            throw connectError;
          }

          toast({
            title: "Wallet Connected",
            description: "Creating payment transaction...",
          });

          // Parse payment URL for transaction details
          const url = new URL(paymentUrl);
          const recipientAddress = url.pathname;
          const amount = parseFloat(url.searchParams.get('amount') || '0');
          const referenceParam = url.searchParams.get('reference');
          const memoParam = url.searchParams.get('memo');
          
          console.log("Payment details:", { recipientAddress, amount, referenceParam, memoParam });

          // Import Solana web3.js for direct transaction creation
          const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = await import('@solana/web3.js');
          
          // Create connection to devnet
          const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
          
          // Create transaction directly
          const transaction = new Transaction();
          
          // Add transfer instruction
          const transferInstruction = SystemProgram.transfer({
            fromPubkey: walletResponse.publicKey,
            toPubkey: new PublicKey(recipientAddress),
            lamports: Math.round(amount * LAMPORTS_PER_SOL),
          });
          
          transaction.add(transferInstruction);
          
          // Add reference if provided (for tracking)
          if (referenceParam) {
            transaction.add({
              keys: [{ pubkey: new PublicKey(referenceParam), isSigner: false, isWritable: false }],
              programId: new PublicKey('11111111111111111111111111111111'),
              data: Buffer.alloc(0),
            });
          }
          
          // Add memo if provided (simple memo instruction without external package)
          if (memoParam) {
            const memoProgram = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
            const memoData = Buffer.from(decodeURIComponent(memoParam), 'utf8');
            const memoInstruction = {
              keys: [],
              programId: memoProgram,
              data: memoData,
            };
            transaction.add(memoInstruction);
          }
          
          // Get latest blockhash
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = walletResponse.publicKey;

          toast({
            title: "Sending Transaction",
            description: "Please approve the transaction in Phantom...",
          });

          try {
            console.log("🔄 Sending transaction to Phantom for signature...");
            
            // Use Phantom's signAndSendTransaction method
            const signedTransaction = await win.solana.signAndSendTransaction(transaction);
            
            console.log("✅ Transaction sent successfully:", signedTransaction.signature);
            
            toast({
              title: "Payment Sent!",
              description: `Transaction: ${signedTransaction.signature.substring(0, 20)}...`,
            });
            
            // Notify parent component of successful payment
            onSuccess(signedTransaction.signature);
            
          } catch (transactionError: any) {
            console.log("❌ Transaction failed:", transactionError);
            
            if (transactionError.code === 4001) {
              toast({
                title: "Transaction Cancelled",
                description: "You cancelled the transaction.",
                variant: "destructive",
              });
            } else {
              toast({
                title: "Transaction Failed",
                description: `Error: ${transactionError.message || 'Unknown error'}`,
                variant: "destructive",
              });
            }
          }

          return;
          
        } catch (phantomError: any) {
          console.error("Phantom integration error:", phantomError);
          
          toast({
            title: "Wallet Integration Issue",
            description: "Direct wallet method failed. Please use the QR code or copy link method below.",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Fallback: Simple approach for other wallets or if direct fails
      toast({
        title: "Alternative Method",
        description: "Copying payment link - paste it in your wallet's browser section.",
      });
      
      try {
        // For localhost compatibility, just copy the link
        await navigator.clipboard.writeText(paymentUrl);
        
        setTimeout(() => {
          toast({
            title: "Payment Link Copied",
            description: "Open your wallet extension, find the browser/dApp tab, and paste this link there.",
            duration: 8000,
          });
        }, 1000);
        
      } catch (copyError) {
        toast({
          title: "Please Copy Manually",
          description: "Copy the payment link above and paste it in your wallet's browser tab.",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error("Wallet integration error:", error);
      toast({
        title: "Wallet Integration Error",
        description: "Please use the QR code or copy link method as a backup.",
        variant: "destructive",
      });
    }
  }, [paymentUrl, walletDetected, onSuccess, toast]);

  // Poll backend for payment verification using reference
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    let pollCount = 0;
    const maxPolls = 40; // Stop after 2 minutes (40 * 3 seconds)
    
    const interval = setInterval(async () => {
      try {
        pollCount++;
        
        // Update countdown
        const remainingSeconds = Math.max(0, (maxPolls - pollCount) * 3);
        setTimeoutSeconds(remainingSeconds);
        
        // Stop polling after max attempts
        if (pollCount > maxPolls) {
          console.log("⏰ Payment polling timeout after", maxPolls, "attempts");
          clearInterval(interval);
          pollingIntervalRef.current = null;
          setTimeoutSeconds(0);
          return;
        }
        
        // Debug logging disabled to reduce console spam
        // if (pollCount === 1 || pollCount === 20 || pollCount === 35) {
        //   console.log("🔍 Polling for payment verification... (attempt", pollCount + "/" + maxPolls + ")");
        // }

        const res = await apiRequest("POST", "/api/payment/find-by-reference", {
          reference: reference.toBase58(),
          expectedAmount: amount,
          recipientAddress: recipient,
          contestId,
        });
        
        const data = await res.json();
        
        // Only log responses that are not "payment not found"
        if (data.found || data.error) {
          console.log("📡 Payment verification response:", data);
        }
        
        if (data.found && data.success && data.txHash) {
          // Payment verified!
          console.log("✅ Payment verified successfully:", data.txHash);
          clearInterval(interval);
          pollingIntervalRef.current = null;
          onSuccess(data.txHash);
        } else if (data.error) {
          console.error("❌ Payment verification error:", data.error);
        }
      } catch (error) {
        console.error("💥 Error checking payment status:", error);
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
      // Debug logging disabled to reduce console spam
      // if (process.env.NODE_ENV === 'development') {
      //   console.log("🔍 Manual payment verification started...", {
      //     reference: reference.toBase58(),
      //     expectedAmount: amount,
      //     recipientAddress: recipient,
      //     contestId,
      //   });
      // }

      const res = await apiRequest("POST", "/api/payment/find-by-reference", {
        reference: reference.toBase58(),
        expectedAmount: amount,
        recipientAddress: recipient,
        contestId,
      });
      
      const data = await res.json();
      // Debug logging disabled to reduce console spam
      // if (process.env.NODE_ENV === 'development') {
      //   console.log("📡 Manual verification response:", data);
      // }
      
      if (data.found && data.success && data.txHash) {
        // Success logging still enabled for important events
        console.log("✅ Manual verification successful:", data.txHash);
        onSuccess(data.txHash);
        toast({
          title: "Payment Verified!",
          description: "Your entry fee payment has been confirmed",
        });
      } else {
        // Error logging disabled to reduce console spam - users see toast notification
        // if (process.env.NODE_ENV === 'development') {
        //   console.error("❌ Manual verification failed:", data);
        // }
        const isNotFoundMessage = data.message && data.message.includes("Payment not found yet");
        toast({
          title: isNotFoundMessage ? "Transaction Not Detected" : "Payment Not Found",
          description: isNotFoundMessage 
            ? "Transaction may still be processing on the blockchain. Please wait a moment and try again, or check if your wallet shows a pending transaction."
            : data.message || data.error || "Please complete the payment and try again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("💥 Manual verification error:", error);
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
        <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
          <p className="font-medium">Payment Options:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li><strong>QR Code:</strong> Scan with your mobile Solana wallet (mobile method)</li>
            {walletDetected ? (
              <li><strong>Pay with Wallet:</strong> Direct transaction in browser wallet ✅ (localhost-friendly)</li>
            ) : (
              <li><strong>No Wallet:</strong> Install browser extension first, then refresh page ⚠️</li>
            )}
            <li><strong>Manual Copy:</strong> Copy link and paste in wallet browser manually</li>
            <li><strong>Verification:</strong> Automatic detection after transaction completion</li>
          </ol>
          
          {/* Wallet Status Help */}
          {!walletDetected && (
            <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs">
              <p className="font-medium text-red-800 dark:text-red-200 mb-1">⚠️ No Wallet Extension Detected</p>
              <p className="text-red-700 dark:text-red-300 mb-2">
                Without a wallet extension, you'll need to use QR code or manual copy methods. Install a browser extension for easier payments:
              </p>
              <div className="flex gap-2">
                <a 
                  href="https://phantom.app" 
                  target="_blank" 
                  className="inline-block bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-2 py-1 rounded text-xs font-medium hover:bg-red-200 dark:hover:bg-red-700"
                >
                  Install Phantom
                </a>
                <a 
                  href="https://solflare.com" 
                  target="_blank" 
                  className="inline-block bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-2 py-1 rounded text-xs font-medium hover:bg-red-200 dark:hover:bg-red-700"
                >
                  Install Solflare
                </a>
              </div>
              <p className="text-red-600 dark:text-red-400 mt-2 text-xs">
                💡 After installation, refresh this page to enable direct wallet opening.
              </p>
            </div>
          )}
          
          {walletDetected && (
            <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-xs">
              <p className="font-medium text-green-800 dark:text-green-200 mb-1">✅ Wallet Extension Detected</p>
              <p className="text-green-700 dark:text-green-300 mb-1">
                Try these methods in order:
              </p>
              <ol className="list-decimal ml-4 text-green-700 dark:text-green-300">
                <li>"Open in Wallet" button (main method)</li>
                <li>"Try Alternative Method" if first doesn't work</li>
                <li>"Copy Full Payment Link" as backup</li>
              </ol>
            </div>
          )}
          
          {timeoutSeconds === 0 && (
            <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs">
              <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">Troubleshooting:</p>
              <ul className="list-disc ml-4 space-y-1 text-yellow-700 dark:text-yellow-300">
                <li>If "Open Wallet" doesn't work, install Phantom or Solflare first</li>
                <li>Use "Copy Full Payment Link" and paste in your wallet</li>
                <li>Check your wallet for pending/completed transactions</li>
                <li>Ensure you have enough SOL for transaction + gas fees (~0.001 SOL extra)</li>
                <li>Wait a few moments for blockchain confirmation</li>
                <li>Try "Verify Payment" button after completing transaction</li>
              </ul>
            </div>
          )}
          
          {/* Timeout countdown */}
          {timeoutSeconds > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">
                Auto-verification timeout: {Math.floor(timeoutSeconds / 60)}:{(timeoutSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
          
          {timeoutSeconds === 0 && (
            <div className="flex items-center gap-2 pt-2 border-t text-amber-600">
              <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
              <span className="text-xs font-medium">
                Auto-verification stopped. Use "Verify Manually" button below.
              </span>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant={walletDetected ? "outline" : "secondary"}
            className="flex-1"
            onClick={() => {
              console.log("🎯 BUTTON CLICKED! Wallet detected:", walletDetected);
              openInWallet();
            }}
            data-testid="button-open-wallet"
            disabled={!walletDetected}
            title={walletDetected ? "Open wallet directly for transaction approval" : "No wallet extension found - install Phantom or Solflare first"}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {walletDetected ? "Pay with Wallet" : "No Wallet ⚠️"}
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
        
        {/* Alternative direct wallet approach */}
        {walletDetected && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-xs border border-dashed border-gray-300"
              onClick={() => {
                if (!walletDetected) {
                  toast({
                    title: "No Wallet Detected",
                    description: "Please install a Solana wallet extension first.",
                    variant: "destructive",
                  });
                  return;
                }
                
                toast({
                  title: "Copy & Paste Method",
                  description: "Payment link copied! Paste it in your wallet's browser or address bar.",
                });
                
                // Safer approach: just copy to clipboard
                navigator.clipboard.writeText(paymentUrl).then(() => {
                  // Also show instructions
                  setTimeout(() => {
                    toast({
                      title: "Next Steps",
                      description: "1. Open your wallet app, 2. Paste the link in browser/address bar, 3. Approve transaction",
                      duration: 8000,
                    });
                  }, 1000);
                }).catch(() => {
                  toast({
                    title: "Copy Failed", 
                    description: "Please manually copy the payment link above.",
                    variant: "destructive",
                  });
                });
              }}
            >
              Copy & Paste Method
            </Button>
          </div>
        )}
        
        {/* Alternative: Show full URL for manual copying */}
        <Button
          variant={walletDetected ? "ghost" : "outline"}
          size="sm"
          className={`w-full text-xs ${!walletDetected ? 'border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium' : ''}`}
          onClick={() => {
            navigator.clipboard.writeText(paymentUrl);
            toast({
              title: "Payment Link Copied!",
              description: "Paste this link in your wallet's browser or address bar",
            });
          }}
        >
          {walletDetected ? "Copy Full Payment Link" : "📋 Copy Payment Link (Recommended)"}
        </Button>

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
