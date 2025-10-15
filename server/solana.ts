import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const network = (process.env.SOLANA_NETWORK || 'mainnet-beta') as 'devnet' | 'testnet' | 'mainnet-beta';

const endpoint = process.env.SOLANA_RPC_ENDPOINT || clusterApiUrl(network);

export const solanaConnection = new Connection(endpoint, 'confirmed');

export async function verifySolanaSignature(
  publicKey: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    const publicKeyObj = new PublicKey(publicKey);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signature, 'base64');

    const nacl = await import('tweetnacl');
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyObj.toBytes()
    );
  } catch (error) {
    console.error('Failed to verify Solana signature:', error);
    return false;
  }
}

export async function getSolanaBalance(walletAddress: string): Promise<number> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await solanaConnection.getBalance(publicKey);
    return balance / 1e9; // Convert lamports to SOL
  } catch (error) {
    console.error('Failed to get Solana balance:', error);
    return 0;
  }
}

export async function verifyTransaction(signature: string): Promise<{
  confirmed: boolean;
  amount?: number;
  from?: string;
  to?: string;
  accountKeys?: string[];
}> {
  try {
    const tx = await solanaConnection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta) {
      return { confirmed: false };
    }

    // Get all account keys (static + loaded addresses for versioned transactions)
    const staticKeys = tx.transaction.message.staticAccountKeys.map(key => key.toBase58());
    const loadedWritable = tx.meta.loadedAddresses?.writable?.map(key => key.toBase58()) || [];
    const loadedReadonly = tx.meta.loadedAddresses?.readonly?.map(key => key.toBase58()) || [];
    
    // Combine all account keys in the correct order
    const accountKeys = [...staticKeys, ...loadedWritable, ...loadedReadonly];
    
    // Find the largest balance decrease (actual payer)
    let maxDecrease = 0;
    let payerIndex = 0;
    
    for (let i = 0; i < tx.meta.preBalances.length; i++) {
      const preBalance = tx.meta.preBalances[i] || 0;
      const postBalance = tx.meta.postBalances[i] || 0;
      const decrease = preBalance - postBalance;
      
      if (decrease > maxDecrease) {
        maxDecrease = decrease;
        payerIndex = i;
      }
    }

    // Get the actual payer address from the computed index
    const payer = accountKeys[payerIndex];

    // Subtract transaction fee to get actual transfer amount
    const fee = tx.meta.fee || 0;
    const transferAmount = Math.max(0, maxDecrease - fee);
    
    // Find recipient (account with largest balance increase)
    let maxIncrease = 0;
    let recipientIndex = -1;
    
    for (let i = 0; i < tx.meta.postBalances.length; i++) {
      if (i === payerIndex) continue; // Skip payer
      
      const preBalance = tx.meta.preBalances[i] || 0;
      const postBalance = tx.meta.postBalances[i] || 0;
      const increase = postBalance - preBalance;
      
      if (increase > maxIncrease) {
        maxIncrease = increase;
        recipientIndex = i;
      }
    }

    const recipient = recipientIndex >= 0 ? accountKeys[recipientIndex] : undefined;

    return {
      confirmed: true,
      amount: transferAmount / 1e9, // Convert lamports to SOL
      from: payer,
      to: recipient,
      accountKeys,
    };
  } catch (error) {
    console.error('Failed to verify transaction:', error);
    return { confirmed: false };
  }
}
