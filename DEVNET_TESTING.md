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

### Test 1: Wallet Connection
1. Go to `/profile`
2. Click "Connect Wallet" button in navbar
3. Select Phantom or Solflare
4. Approve connection in wallet popup
5. ✅ Verify: Wallet address displayed in navbar
6. ✅ Verify: SOL balance shown
7. ✅ Verify: Profile page shows connected wallet

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

### Test 4: Automatic Payment Verification
1. On mobile: Scan QR code with Phantom/Solflare app
2. On desktop: Click "Open in Wallet" button
3. Approve transaction in wallet (0.01 SOL + network fee)
4. ✅ Verify: Payment modal shows "Verifying..." or automatically closes
5. ✅ Verify: Success toast appears
6. ✅ Verify: Submission created successfully

### Test 5: Manual Payment Verification
1. Complete payment in wallet but DON'T wait for auto-verification
2. Click "Verify Payment" button manually
3. ✅ Verify: Success toast appears
4. ✅ Verify: Transaction verified
5. ✅ Verify: Payment modal closes

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

### Payment Not Found
- Wait 10-15 seconds for blockchain confirmation
- Check transaction on Solana Explorer: https://explorer.solana.com/?cluster=devnet
- Verify wallet is on devnet (not mainnet)

### Verification Fails
- Check server logs for detailed error messages
- Verify SOLANA_NETWORK=devnet (or not set, defaults to devnet)
- Ensure platform wallet address is correct

### QR Code Not Scanning
- Ensure mobile wallet is on devnet
- Try "Open in Wallet" button instead
- Check payment URL format

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
