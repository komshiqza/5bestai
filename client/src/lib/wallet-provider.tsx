import { createContext, useContext, useState, useEffect } from "react";

interface WalletContextType {
  connected: boolean;
  connecting: boolean;
  publicKey: string | null;
  connect: () => Promise<void>;
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

    // Define event handlers
    const handleConnect = (publicKey: any) => {
      setPublicKey(publicKey.toString());
      setConnected(true);
    };

    const handleDisconnect = () => {
      setPublicKey(null);
      setConnected(false);
    };

    const handleAccountChanged = (publicKey: any) => {
      if (publicKey) {
        setPublicKey(publicKey.toString());
      } else {
        setPublicKey(null);
        setConnected(false);
      }
    };

    // Listen for events
    window.solana?.on("connect", handleConnect);
    window.solana?.on("disconnect", handleDisconnect);
    window.solana?.on("accountChanged", handleAccountChanged);

    return () => {
      window.solana?.removeListener("connect", handleConnect);
      window.solana?.removeListener("disconnect", handleDisconnect);
      window.solana?.removeListener("accountChanged", handleAccountChanged);
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
      setPublicKey(response.publicKey.toString());
      setConnected(true);
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
    if (!window.solana || !connected) {
      throw new Error("Wallet not connected");
    }

    const encodedMessage = new TextEncoder().encode(message);
    const signedMessage = await window.solana.signMessage(encodedMessage, "utf8");
    
    // Convert Uint8Array to base64 using browser APIs
    const bytes = new Uint8Array(signedMessage.signature);
    const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binary);
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
