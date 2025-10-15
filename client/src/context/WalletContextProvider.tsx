import { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';

// Import default wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

export const WalletContextProvider: FC<Props> = ({ children }) => {
  // Use devnet for testing, can be changed to mainnet-beta for production
  const network = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
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
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
