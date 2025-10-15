# Solana Devnet Payment Testing Guide

## Overview
This guide walks through testing the complete Solana wallet payment flow on devnet.

## Prerequisites

### 1. Wallet Setup
- Install [Phantom Wallet](https://phantom.app/) or [Solflare Wallet](https://solflare.com/)
- Switch wallet to **Devnet** network
- Get devnet SOL from faucet: https://faucet.solana.com/

### 2. Platform Configuration

#### Step 1: Create Admin User
1. Register a new user at `/register`
2. Admin must manually approve the user in database (or use existing admin)

#### Step 2: Configure Platform Wallet
1. Login as admin
2. Go to `/admin/settings`
3. Enter your devnet wallet address in "Platform Wallet Address" field
4. Click "Save Changes"

#### Step 3: Create Test Contest
1. Go to `/admin/dashboard`
2. Click "Create New Contest"
3. Configure contest with:
   - **Entry Fee**: Enabled
   - **Entry Fee Amount**: 0.01 (SOL)
   - **Entry Fee Currency**: SOL
   - **Entry Fee Payment Methods**: ["wallet"] (crypto-only for testing)
   - **Contest Type**: image
   - **Start/End Dates**: Set appropriately

## Testing Flow

### Test 1: Wallet Connection (Message Signing Flow)

**Technical Flow:**
1. User clicks "Connect Wallet" → Wallet extension opens
2. User approves connection → `publicKey` available in browser (base58 format)
3. Frontend generates message: `Sign this message to verify your wallet ownership.\nWallet: {publicKey}\nTimestamp: {timestamp}`
4. User signs message in wallet → signature returned as base64
5. Frontend sends to `POST /api/wallet/connect`:
   ```json
   {
     "address": "base58 wallet address (e.g., 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU)",
     "provider": "phantom",
     "signature": "base64-encoded signature",
     "message": "message that was signed"
   }
   ```
6. Backend converts base58 address to bytes via `new PublicKey(address).toBytes()`
7. Backend verifies signature using ed25519 (message bytes + signature bytes + public key bytes)
8. Backend stores wallet record with base58 address and `verifiedAt` timestamp

**Important:** Wallet address stays in **base58 format** throughout (Solana standard). Only converted to bytes internally for ed25519 verification.

**Test Steps:**
1. Go to `/profile`
2. Click "Connect Wallet" button in navbar
3. Select Phantom or Solflare
4. Approve connection in wallet popup
5. Sign verification message when prompted
6. ✅ Verify: Wallet address displayed in navbar
7. ✅ Verify: SOL balance shown
8. ✅ Verify: Profile page shows "Wallet verified and ready for cashouts"
9. ✅ Verify: Green checkmark icon displayed
10. **DevTools Check**: Network tab shows `POST /api/wallet/connect` with 200 response

### Test 2: Payment QR Code Generation
1. Go to test contest detail page
2. Click "Submit Entry" or "Upload" button
3. Upload an image
4. Fill in title and details
5. Select the test contest
6. Click "Next" until payment step
7. ✅ Verify: Payment modal appears with QR code
8. ✅ Verify: Payment URL displayed (starts with `solana:`)
9. ✅ Verify: Amount, recipient, label, memo visible

### Test 3: Payment URL Structure
Inspect the payment URL. It should contain:
```
solana:{recipient}?
  amount=0.01&
  reference={unique-reference}&
  label={contest-name}&
  message=Entry%20fee%20for%20{contest}&
  memo=contest:{contestId}:user:{userId}
```

### Test 4: Automatic Payment Verification (Two-Step Flow)

**Technical Flow:**
1. SolanaPayment component polls every 3 seconds via `POST /api/payment/find-by-reference`
2. Backend uses `findReference()` from @solana/pay to search blockchain for reference key
3. **First response**: `{found: false, message: "Payment not found yet"}`
4. User completes payment in wallet
5. **Second response** (when transaction found):
   - Backend calls `verifyTransaction()` to check confirmation status
   - Validates: payer = user wallet, amount ≥ expected, recipient = platform wallet
   - Creates `glory_ledger` entry with txHash
   - Returns: `{found: true, success: true, txHash: "...", alreadyProcessed: false}`
6. Frontend detects `success: true` → closes modal, shows success toast

**Test Steps:**
1. On mobile: Scan QR code with Phantom/Solflare app
2. On desktop: Click "Open in Wallet" button
3. Approve transaction in wallet (0.01 SOL + network fee ~0.000005)
4. Wait 3-10 seconds for blockchain confirmation
5. ✅ Verify: Payment modal shows "Verifying payment..." spinner
6. ✅ Verify: Modal automatically closes when verified
7. ✅ Verify: Success toast: "Payment verified successfully!"
8. ✅ Verify: Submission created and visible in contest
9. **DevTools Check**: Network tab shows multiple `/api/payment/find-by-reference` requests, last one returns `{found: true, success: true}`

### Test 5: Manual Payment Verification

**When to use:**
- Polling timeout (60 seconds max)
- Network delays causing auto-verification to miss transaction
- User prefers manual control

**Test Steps:**
1. Complete payment in wallet (follow Test 4 steps 1-3)
2. DON'T wait for auto-verification
3. Click "Verify Payment" button in modal
4. ✅ Verify: Manual verification triggers immediately
5. ✅ Verify: Success toast appears
6. ✅ Verify: Transaction verified via same backend flow
7. ✅ Verify: Payment modal closes
8. **DevTools Check**: Network tab shows single `/api/payment/find-by-reference` POST triggered by button click

### Test 6: Backend Verification
1. Check browser DevTools Network tab
2. Find `POST /api/payment/find-by-reference` request
3. ✅ Verify: Response contains `{found: true, success: true, txHash: "..."}`
4. Check server logs for transaction verification
5. ✅ Verify: "Payment verified via reference" message logged

### Test 7: Database Verification
1. Go to Replit Database tab
2. Query `glory_ledger` table:
   ```sql
   SELECT * FROM glory_ledger 
   WHERE tx_hash IS NOT NULL 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
3. ✅ Verify: Entry with:
   - `userId`: Your user ID
   - `contestId`: Test contest ID
   - `currency`: "SOL"
   - `delta`: 0 (crypto payments don't affect GLORY)
   - `reason`: Contains "Solana payment verified"
   - `tx_hash`: Transaction signature
   - `metadata`: Contains reference, from, to, amount

### Test 8: Transaction Uniqueness
1. Try to submit another entry with same wallet
2. Make payment with SAME transaction signature (impossible, but test backend)
3. ✅ Verify: Backend rejects duplicate txHash
4. ✅ Verify: Second payment creates new submission successfully

### Test 9: Error Handling

#### Test 9a: Missing Platform Wallet
1. Admin: Clear platform wallet address in settings
2. User: Try to submit entry
3. ✅ Verify: Error shown (empty recipient address)

#### Test 9b: Wrong Payment Amount
1. Manually construct payment URL with lower amount
2. Send transaction
3. ✅ Verify: Backend rejects with "Insufficient payment amount" error

#### Test 9c: Wrong Recipient
1. Send SOL to different address (not platform wallet)
2. Try manual verification
3. ✅ Verify: Backend rejects with "Payment recipient mismatch"

#### Test 9d: Different Payer
1. Connect wallet A
2. Start submission flow
3. Pay from wallet B (different wallet)
4. ✅ Verify: Backend rejects with "Transaction payer mismatch"

### Test 10: USDC Payment (Optional)
1. Create contest with USDC entry fee
2. Get devnet USDC: https://spl-token-faucet.com/
3. Repeat payment flow with USDC
4. ✅ Verify: Payment URL includes `spl-token` parameter
5. ✅ Verify: Transaction verified successfully

## Success Criteria

All tests must pass:
- ✅ Wallet connects successfully
- ✅ QR code generates correctly
- ✅ Payment URL has correct structure
- ✅ Automatic verification works
- ✅ Manual verification works
- ✅ Transaction recorded in database
- ✅ Duplicate transactions rejected
- ✅ Error cases handled gracefully

## Troubleshooting

### Payment Not Found (Most Common)
**Symptom:** `{found: false, message: "Payment not found yet"}` persists after transaction

**Causes & Solutions:**
1. **Blockchain Confirmation Delay** (3-15 seconds on devnet)
   - Wait 10-15 seconds, auto-polling will detect it
   - Devnet is slower than mainnet during high load
   
2. **Transaction Not Finalized**
   - Backend uses `finality: 'confirmed'` (usually 1-2 seconds)
   - Check Solana Explorer: https://explorer.solana.com/?cluster=devnet
   - Look for transaction status: "Finalized" or "Confirmed"
   - If status is "Processing", wait and retry manual verification

3. **Wrong Network**
   - Verify wallet is on **devnet** (not mainnet/testnet)
   - Check wallet network selector (usually top-right in wallet settings)

4. **Reference Key Mismatch**
   - Ensure payment URL matches exactly what was generated
   - Don't modify Solana Pay URL manually
   - Reference must be unique PublicKey in base58 format

**Debugging Steps:**
1. Copy transaction signature from wallet history
2. Paste into Solana Explorer with `?cluster=devnet` parameter
3. Check:
   - Status: Must be "Confirmed" or "Finalized"
   - From: Must match your connected wallet address
   - To: Must match platform wallet address
   - Amount: Must be ≥ entry fee amount
4. If all correct but still fails, click "Verify Payment" manually
5. Check server logs for detailed error (see Server Logs section below)

### Verification Fails with Error

**Error: "Transaction payer mismatch"**
- You connected wallet A but paid from wallet B
- Solution: Ensure you pay from the SAME wallet shown in navbar

**Error: "Insufficient payment amount"**
- You paid less than entry fee (e.g., 0.005 SOL instead of 0.01 SOL)
- Check transaction details in Solana Explorer
- Network fees are separate, don't reduce payment amount

**Error: "Payment recipient address mismatch"**
- Payment went to wrong address
- Check platform wallet configuration in `/admin/settings`
- Verify contest was created AFTER platform wallet was set

**Error: "Transaction already verified"**
- You tried to reuse same transaction for multiple submissions
- Each submission requires NEW payment with unique transaction
- Solution: Make a fresh payment

**Error: "Transaction not found or not confirmed"**
- Transaction exists but not confirmed on blockchain
- Wait 10-30 seconds and retry manual verification
- Use `getSignatureStatus` to check:
   ```bash
   # In browser console or via Solana CLI
   solana confirm <SIGNATURE> --url devnet
   ```

### QR Code Not Scanning
- Ensure mobile wallet is on devnet
- Try "Open in Wallet" button instead
- Check payment URL format (should start with `solana:`)
- Some wallets don't support Solana Pay QR codes → use manual URL open

### Server Logs (Advanced Debugging)
1. Open Replit Shell
2. Check logs for payment verification:
   ```bash
   # Filter for payment-related logs
   tail -f /tmp/*.log | grep -i "payment\|solana\|verify"
   ```
3. Look for errors:
   - `Solana payment verification error:`
   - `Transaction not found or not confirmed`
   - `Payment recipient mismatch`
4. Check transaction details logged by `verifyTransaction()`

## Production Checklist

Before deploying to mainnet:
- [ ] Configure QuickNode RPC endpoint (SOLANA_RPC_ENDPOINT secret)
- [ ] Set SOLANA_NETWORK=mainnet-beta
- [ ] Configure production platform wallet address
- [ ] Test with real SOL/USDC on mainnet-beta
- [ ] Set up transaction monitoring
- [ ] Configure fee calculations
- [ ] Implement withdrawal system
- [ ] Add fraud detection
