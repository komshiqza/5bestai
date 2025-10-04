# Solana Cashout Test Scenario

## Test Environment Setup

### Prerequisites
- Phantom wallet browser extension installed
- Test Solana wallet with devnet SOL/USDC (for demo purposes)
- Two browser profiles/windows:
  - Profile 1: Regular user account
  - Profile 2: Admin account

---

## Test Scenario: Complete Cashout Workflow

### Phase 1: User Wallet Connection

**As a Regular User:**

1. **Login to User Account**
   - Navigate to `/login`
   - Login with regular user credentials
   - Verify user has GLORY balance > 1000

2. **Connect Phantom Wallet**
   - Navigate to `/profile`
   - Click on "Settings" tab
   - Locate "Solana Wallet" card
   - Click "Connect Phantom Wallet" button
   - Phantom extension popup appears
   - Approve the connection request
   - Verify wallet address is displayed
   - Verify "Verified" badge appears

**Expected Result:**
- ✅ Wallet address shown in the UI
- ✅ Green "Verified" badge displayed
- ✅ Connection status saved to database

---

### Phase 2: Cashout Request

**As a Regular User (continued):**

3. **Submit Cashout Request**
   - Still on Settings tab in profile page
   - Locate "Cash Out GLORY" card
   - Enter amount: `2000` GLORY
   - Select token type: `USDC` (or SOL/GLORY)
   - Click "Request Cashout" button
   - Wait for success toast notification

4. **Verify Request Appears**
   - Scroll down to "Cashout History" section
   - Verify new request appears with:
     - Amount: 2000 GLORY → 2000 USDC (1:1 ratio)
     - Status: "pending" (yellow badge)
     - Date: Current date
   - Check user's GLORY balance (should be unchanged - not deducted yet)

**Expected Result:**
- ✅ Request created successfully
- ✅ Status shows "pending"
- ✅ GLORY not yet deducted (deducted only on admin approval)

---

### Phase 3: Admin Approval

**As an Admin:**

5. **Access Admin Dashboard**
   - Login with admin credentials
   - Navigate to `/admin`
   - Click on "Cashouts" tab

6. **Review Pending Request**
   - Verify the cashout request appears in the table
   - Check details:
     - User: Username and email visible
     - Amount: 2000 GLORY → 2000 USDC
     - Wallet: Truncated Solana address
     - Status: "pending" badge
     - Actions: "Approve" and "Reject" buttons visible

7. **Approve Cashout Request**
   - Click "Approve" button for the request
   - Wait for success toast: "Cashout Approved - GLORY has been deducted..."
   - Verify status changes to "approved" (blue badge)
   - Verify action button changes to "Mark as Sent"

**Expected Result:**
- ✅ Status changed to "approved"
- ✅ User's GLORY balance deducted by 2000
- ✅ GLORY ledger entry created (negative delta)
- ✅ "Mark as Sent" button now visible

**Alternative Flow - Rejection:**
- Click "Reject" instead of "Approve"
- Verify status changes to "rejected" (red badge)
- Verify user's GLORY balance remains unchanged (no deduction occurred)
- Verify no GLORY ledger entries created (query glory_ledger for this user)
- Verify cashout_events shows pending → rejected transition
- No further actions available

---

### Phase 4: Token Transfer & Transaction Recording

**As an Admin (continued):**

8. **Simulate Token Transfer**
   - **Manual Step:** Use Phantom wallet to send tokens to user's wallet address
   - Copy user's Solana wallet address from the table
   - Send 2000 USDC (or equivalent) on Solana devnet
   - **Copy the transaction hash from Phantom**

9. **Mark Cashout as Sent**
   - Back in admin dashboard, click "Mark as Sent" button
   - Transaction hash dialog appears
   - Paste the transaction hash from Phantom
   - Click "Mark as Sent" button
   - Wait for success toast

10. **Verify Transaction Recorded**
    - Status changes to "sent" (blue badge)
    - "View TX" link appears next to the request
    - Click "View TX" link
    - Verify it opens Solscan.io with correct transaction hash
    - Verify transaction details on Solscan (devnet)

**Expected Result:**
- ✅ Transaction hash saved to database
- ✅ Status updated to "sent"
- ✅ Solscan link works correctly
- ✅ Cashout event recorded in audit log

---

### Phase 5: User Verification

**As a Regular User:**

11. **Check Cashout Status**
    - Navigate back to `/profile` → Settings tab
    - Scroll to "Cashout History"
    - Verify request now shows:
      - Status: "sent" or "confirmed" (blue/green badge)
      - "View Transaction" link visible
    - Click transaction link
    - Verify Solscan page loads with transaction

12. **Verify GLORY Balance**
    - Check GLORY balance display (should be reduced by 2000)
    - Navigate to "GLORY History" tab
    - Verify deduction entry appears:
      - Reason: "Cashout deduction" or similar
      - Delta: -2000 GLORY
      - Date: Approval timestamp

**Expected Result:**
- ✅ User sees completed cashout with transaction link
- ✅ GLORY balance correctly reduced
- ✅ GLORY ledger shows deduction entry
- ✅ Transaction link works from user view

---

## Test Case Matrix

| Scenario | Expected Behavior | Status |
|----------|------------------|--------|
| Connect wallet without Phantom | Error message, redirect to Phantom download | ⬜ |
| Request cashout < 1000 GLORY | Validation error message | ⬜ |
| Request cashout > user balance | Backend validation error | ⬜ |
| Admin approves request | GLORY deducted, status → approved | ⬜ |
| Admin rejects pending request | Status → rejected, no GLORY change | ⬜ |
| Mark as sent without TX hash | Validation error in dialog | ⬜ |
| Mark as sent with TX hash | Status → sent, link works | ⬜ |
| Approve request twice (race condition) | Second attempt fails gracefully | ⬜ |
| Disconnect wallet | Wallet status cleared, cashout disabled | ⬜ |

---

## Edge Cases to Test

### 1. Multiple Cashout Requests
- Create 3 cashout requests as user
- Approve 1st, reject 2nd, keep 3rd pending
- Verify all show correct status independently

### 2. Transaction Confirmation Flow
- Admin approves request (GLORY deducted, status → "approved")
- Admin marks as sent with TX hash (status → "sent")
- **Expected:** Transaction recorded with hash
- **Verify:** Solscan link works, cashout_events shows transitions

### 3. Invalid Transaction Hash
- Mark cashout as sent
- Enter invalid/malformed transaction hash
- Complete the action
- Click "View TX" link
- **Expected:** Solscan shows error or 404 (graceful handling)

### 4. Wallet Re-connection
- Connect wallet
- Submit cashout request
- Disconnect wallet
- Reconnect same wallet
- **Expected:** Previous cashout request still accessible

---

## Database Verification Queries

After testing, verify database state:

```sql
-- Check cashout requests
SELECT id, user_id, wallet_id, amount_glory, amount_token, 
       token_type, status, tx_hash, admin_id, created_at
FROM cashout_requests 
ORDER BY created_at DESC LIMIT 5;

-- Check cashout events (audit trail for status transitions)
SELECT id, cashout_request_id, from_status, to_status, 
       actor_user_id, notes, created_at
FROM cashout_events 
ORDER BY created_at DESC LIMIT 10;

-- Check user GLORY balance and wallet
SELECT u.id, u.username, u.glory_balance, 
       w.address, w.provider, w.status AS wallet_status
FROM users u
LEFT JOIN user_wallets w ON w.user_id = u.id
WHERE u.username = 'testuser';

-- Check GLORY ledger entries for cashout-related transactions
SELECT user_id, delta, reason, contest_id, submission_id, created_at
FROM glory_ledger 
WHERE reason LIKE '%cashout%' OR reason LIKE '%Cashout%'
ORDER BY created_at DESC LIMIT 10;

-- Get full cashout details with user and wallet info
SELECT 
    cr.id AS request_id,
    cr.status,
    cr.amount_glory,
    cr.amount_token,
    cr.token_type,
    cr.tx_hash,
    u.username,
    u.email,
    u.glory_balance AS current_glory,
    w.address AS wallet_address,
    w.provider,
    cr.created_at,
    cr.updated_at
FROM cashout_requests cr
JOIN users u ON cr.user_id = u.id
JOIN user_wallets w ON cr.wallet_id = w.id
ORDER BY cr.created_at DESC
LIMIT 5;
```

---

## Success Criteria

- ✅ Wallet connects and verifies via Solana signature
- ✅ Cashout requests created with correct amounts and token types
- ✅ Admin can approve/reject pending requests with proper state transitions
- ✅ GLORY deducted only on admin approval (not on request creation)
- ✅ GLORY remains unchanged on pending rejection (no deduction occurred, so no refund needed)
- ✅ Transaction hashes saved and displayed correctly
- ✅ Solscan links work for devnet transactions
- ✅ Complete audit trail in cashout_events table:
  - pending → approved (or rejected)
  - approved → sent (with TX hash)
- ✅ GLORY ledger entries created correctly:
  - Deduction entry when admin approves request
  - No ledger entry when admin rejects pending request (nothing to deduct/refund)
- ✅ All UI states display correctly:
  - pending: Shows approve/reject buttons
  - approved: Shows "mark as sent" button
  - sent: Shows Solscan transaction link
  - rejected: No actions available
- ✅ No console errors or unhandled exceptions
- ✅ Proper toast notifications for all state changes

---

## Known Limitations (Devnet)

1. **Mock Token Conversion:** 1 GLORY = 1 USDC (hardcoded, no real price feed)
2. **Manual Token Transfer:** Admin must manually send tokens via Phantom
3. **Devnet Only:** Transaction links point to Solscan devnet
4. **No Automatic Confirmation:** Status doesn't auto-update from blockchain

---

## Next Steps After Testing

If all tests pass:
1. Document any bugs found and fixes applied
2. Consider adding automated tests for critical flows
3. Add production-ready features:
   - Automatic token price conversion (GLORY → USD → SOL/USDC)
   - Automated token transfer via backend wallet
   - Blockchain confirmation polling
   - Mainnet deployment configuration
