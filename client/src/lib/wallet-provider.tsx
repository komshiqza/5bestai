import { createContext, useContext, useState, useEffect } from "react";

interface WalletContextType {
  connected: boolean;
  connecting: boolean;
  publicKey: string | null;
  connect: () => Promise<string>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    // Check if wallet is already connected
    const checkWallet = async () => {
      if (window.solana?.isConnected) {
        try {
          const response = await window.solana.connect({ onlyIfTrusted: true });
          setPublicKey(response.publicKey.toString());
          setConnected(true);
        } catch (err) {
          console.log("Not connected");
        }
      }
    };
    checkWallet();

    // Listen for account changes
    window.solana?.on("accountChanged", (publicKey: any) => {
      if (publicKey) {
        setPublicKey(publicKey.toString());
      } else {
        setPublicKey(null);
        setConnected(false);
      }
    });

    return () => {
      window.solana?.removeListener("accountChanged", () => {});
    };
  }, []);

  const connect = async () => {
    if (!window.solana) {
      window.open("https://phantom.app/", "_blank");
      throw new Error("Phantom wallet not found. Please install it.");
    }

    try {
      setConnecting(true);
      const response = await window.solana.connect();
      const walletPublicKey = response.publicKey.toString();
      setPublicKey(walletPublicKey);
      setConnected(true);
      return walletPublicKey;
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (window.solana) {
      await window.solana.disconnect();
      setPublicKey(null);
      setConnected(false);
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (!window.solana) {
      throw new Error("Phantom wallet not found");
    }

    try {
      const encodedMessage = new TextEncoder().encode(message);
      const response = await window.solana.signMessage(encodedMessage);
      
      // Convert Uint8Array signature to base64 using browser APIs
      const base64 = btoa(String.fromCharCode(...response.signature));
      return base64;
    } catch (error) {
      throw new Error("Failed to sign message. Please ensure your wallet is connected.");
    }
  };

  return (
    <WalletContext.Provider
      value={{
        connected,
        connecting,
        publicKey,
        connect,
        disconnect,
        signMessage,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within SolanaWalletProvider");
  }
  return context;
}

declare global {
  interface Window {
    solana?: any;
  }
}
