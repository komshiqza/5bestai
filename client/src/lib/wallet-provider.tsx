import { createContext, useContext, useMemo, ReactNode, useCallback } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet as useSolanaWallet,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import bs58 from 'bs58';

// Import default wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextType {
  connected: boolean;
  connecting: boolean;
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  // Using mainnet-beta for production (real transactions)
  const network = import.meta.env.VITE_SOLANA_NETWORK || 'mainnet-beta';
  const endpoint = useMemo(() => {
    // Use custom RPC if provided, otherwise use default cluster API
    const customRpc = import.meta.env.VITE_SOLANA_RPC_ENDPOINT;
    if (customRpc) {
      return customRpc;
    }
    return clusterApiUrl(network as 'devnet' | 'testnet' | 'mainnet-beta');
  }, [network]);
  
  // Empty array - Wallet Standard automatically detects Phantom, Solflare, Backpack, etc.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContextWrapper>
            {children}
          </WalletContextWrapper>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

// Wrapper to provide compatibility with existing useWallet hook
function WalletContextWrapper({ children }: { children: ReactNode }) {
  const { 
    publicKey: solanaPublicKey, 
    connected, 
    connecting, 
    connect: solanaConnect,
    disconnect: solanaDisconnect,
    signMessage: solanaSignMessage,
  } = useSolanaWallet();

  const publicKey = solanaPublicKey?.toBase58() || null;

  const connect = useCallback(async () => {
    if (!solanaConnect) {
      throw new Error("Wallet adapter not initialized");
    }
    await solanaConnect();
  }, [solanaConnect]);

  const disconnect = useCallback(async () => {
    if (solanaDisconnect) {
      await solanaDisconnect();
    }
  }, [solanaDisconnect]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!solanaSignMessage || !connected) {
      throw new Error("Wallet not connected");
    }

    const encodedMessage = new TextEncoder().encode(message);
    const signature = await solanaSignMessage(encodedMessage);
    
    // Convert Uint8Array to base58
    return bs58.encode(signature);
  }, [solanaSignMessage, connected]);

  const value = useMemo(() => ({
    connected,
    connecting,
    publicKey,
    connect,
    disconnect,
    signMessage,
  }), [connected, connecting, publicKey, connect, disconnect, signMessage]);

  return (
    <WalletContext.Provider value={value}>
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

// Export additional wallet adapter hooks for advanced usage
export { useConnection } from '@solana/wallet-adapter-react';
export { useWallet as useSolanaWalletAdapter } from '@solana/wallet-adapter-react';

declare global {
  interface Window {
    solana?: any;
  }
}
