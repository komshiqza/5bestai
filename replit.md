# 5best - Creative Competition Platform

## Overview

5best is a creative competition platform built with a modern full-stack architecture. The application enables users to participate in contests by submitting images and videos, vote on submissions, and earn GLORY rewards. The platform features role-based access control with admin moderation capabilities and implements a structured reward distribution system where top 5 submissions receive tiered GLORY prizes (40%, 25%, 15%, 10%, 10%).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript running on Vite for fast development and optimized production builds
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: shadcn/ui component library built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query (React Query) for server state management with automatic caching and invalidation
- **Form Handling**: React Hook Form with Zod validation for type-safe form schemas
- **Design System**: Custom design tokens with CSS variables supporting dark mode, gradient effects, and glass morphism aesthetics

**Key Design Decisions**:
- Chose Vite over Create React App for faster HMR and build times
- TanStack Query eliminates need for global state management (Redux/Zustand) by managing server state effectively
- shadcn/ui provides accessible, customizable components while maintaining full code ownership
- Wouter chosen over React Router for smaller bundle size in this application

### Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Language**: TypeScript with ES modules for type safety and modern JavaScript features
- **Database ORM**: Drizzle ORM with PostgreSQL dialect (configured for Neon serverless)
- **Authentication**: JWT-based authentication with httpOnly cookies for secure token storage
- **Password Security**: bcrypt for password hashing (10 rounds)
- **Middleware Stack**: Cookie parser, JSON body parsing with raw body preservation for webhooks

**Authentication & Authorization**:
- Three-tier access control: unauthenticated, authenticated users, and admin
- User status flow: pending → approved/banned (requires admin action)
- JWT tokens stored in httpOnly cookies to prevent XSS attacks
- Middleware chain: `authenticateToken` → `requireApproved` → `requireAdmin` for progressive authorization

**Rate Limiting**:
- In-memory rate limiter for voting (30 votes per hour per user)
- Tracks votes via database queries within sliding time window
- Production-ready design allows easy migration to Redis for distributed systems

### Database Schema & Data Model

**Core Entities**:
1. **Users**: Identity, roles (user/admin), status (pending/approved/banned), GLORY balance
2. **Contests**: Competition details, prize pool, status lifecycle (draft/active/ended)
3. **Submissions**: User-created content linked to contests, moderation status
4. **Votes**: One vote per user per submission with uniqueness constraint
5. **GloryLedger**: Immutable transaction log for GLORY balance changes
6. **AuditLog**: Activity tracking for administrative actions

**Key Schema Patterns**:
- UUID primary keys with PostgreSQL `gen_random_uuid()` for distributed safety
- Composite unique constraints on votes (userId + submissionId) to enforce one-vote rule
- Cascade deletion from users/contests to maintain referential integrity
- Indexed columns on frequently queried fields (email, username, slug, status)
- Timestamp tracking (createdAt, updatedAt) for audit trails

### File Upload & Media Management
- **Primary**: Cloudinary integration for image/video uploads with automatic optimization
- **Fallback**: Local file system storage when Cloudinary credentials unavailable
- **Upload Flow**: Multer middleware → file validation → Cloudinary/local storage → URL persistence
- **File Constraints**: 10MB for images, 100MB for videos with MIME type validation
- **Media Types**: Images and H.264/WebM video support with thumbnail generation

**Tradeoffs**:
- Cloudinary provides CDN, automatic format optimization, and video transcoding
- Local fallback ensures development works without external service dependencies
- Chose Cloudinary over S3 for simpler API and built-in transformations

### Contest & Reward System

**Contest Lifecycle**:
1. **Draft**: Admin creates contest, configures prize pool and timeline
2. **Active**: Users submit entries (pending approval), approved users can vote
3. **Ended**: Admin triggers reward distribution, calculates top 5, distributes GLORY

**Reward Distribution Algorithm**:
- Top 5 submissions sorted by vote count receive tiered percentages
- Distribution: 1st place 40%, 2nd 25%, 3rd 15%, 4th 10%, 5th 10%
- Atomic transaction: Creates GloryLedger entries and updates user balances
- Remainder from rounding goes to first place winner

**Vote Integrity & Flexibility**:
- **Voting Frequency Control**: Contests can configure `votesPerUserPerPeriod` and `periodDurationHours` to allow multiple votes per submission within time windows (e.g., 3 votes per 24 hours)
- **Total Vote Limits**: Optional `totalVotesPerUser` caps total votes across entire contest
- **Rate Limiting**: System-wide 30 votes per hour per user prevents abuse
- **Access Control**: Only approved users can vote (prevents banned/pending abuse)

**Contest Type Validation**:
- Contests specify `contestType` (image/video) in config
- Submissions validated against contest type during upload
- File type enforcement ensures only matching media types accepted

**Entry Fee System**:
- Contests can require entry fees (paid in GLORY, Solana, or USDC)
- Entry fee deducted AFTER submission creation (atomic operation)
- Creates `glory_ledger` entry for transparency
- Prevents GLORY loss if upload fails

**Jury Voting**:
- Contests can enable `votingMethods`: ['public'], ['jury'], or ['public', 'jury']
- When ONLY 'jury' voting: restricted to users in `juryMembers` array
- Hybrid mode (public+jury): all approved users can vote
- Jury members specified by user IDs in contest config

**Contest Status Workflow**:
- **Draft**: Requires admin approval, not publicly visible
- **Active** (via "Publish"): Live immediately, users can submit/vote
- **Ended**: Voting closed, ready for reward distribution
- **Archived**: Historical storage, no longer active

**Submission Rules**:
- `maxSubmissions`: Limit submissions per user (validated at submission time)
- `fileSizeLimit`: Max file size in MB (validated during upload)
- `submissionEndAt`: Optional deadline separate from voting end

### API Design Patterns
- **Validation**: Zod schemas shared between client and server (`@shared/schema`)
- **Error Handling**: Consistent JSON error responses with descriptive messages
- **Response Format**: Standard { data } success, { error } failure pattern
- **Path Aliases**: `@/` for client, `@shared/` for shared code enabling clean imports

### Submission Detail & Sharing System

**Dedicated Submission Pages**:
- Each submission has unique URL: `/submission/:id`
- Public access for approved submissions, private for pending (owner/admin only)
- Full submission details: image/video, author info, contest link, vote count, tags
- Direct vote and share functionality on submission page

**Share Functionality**:
- Web Share API for native mobile sharing
- Clipboard fallback for desktop browsers  
- Share URLs point to dedicated submission detail pages (`/submission/:id`)
- Prepared for future marketplace: dedicated pages enable product listings, pricing, licensing info

**API Endpoint** (`GET /api/submissions/:id`):
- Optional authentication (public access for approved, authenticated for own pending)
- Enriched response includes user info, contest info, hasVoted status
- Permission-based visibility: admin sees all, users see approved + own submissions

**Future Marketplace Integration**:
- Submission detail pages designed to support "Buy Now" buttons
- URL structure ready for SEO and social media sharing
- Foundation for adding price, license type, download management

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL with connection pooling via `@neondatabase/serverless`
- **Cloudinary**: Media hosting, CDN, and transformation service for images/videos

### Authentication & Security
- **JWT**: Token generation and verification via `jsonwebtoken`
- **bcrypt**: Password hashing with configurable salt rounds
- **Cookie Parser**: Secure cookie handling for authentication tokens

### Development & Build Tools
- **Drizzle Kit**: Database migrations and schema management
- **esbuild**: Fast server-side bundling for production
- **tsx**: TypeScript execution for development workflow
- **Vite**: Frontend bundling with HMR and optimized builds

### UI & Component Libraries
- **Radix UI**: Headless accessible component primitives (30+ components)
- **Tailwind CSS**: Utility-first styling with custom design tokens
- **class-variance-authority**: Type-safe component variant management
- **React Hook Form**: Performant form state management
- **TanStack Query**: Async state management and caching

### Session Management
- **connect-pg-simple**: PostgreSQL session store (configured but JWT is primary auth method)
- **express-session**: Session middleware for potential session-based features

### Additional Utilities
- **date-fns**: Date manipulation and formatting
- **nanoid**: Unique ID generation for sessions/tokens
- **multer**: Multipart form data handling for file uploads

### Blockchain & Payment Integration
- **Solana Web3.js**: Blockchain interaction for mainnet Solana payments
- **@solana/pay**: Solana Pay protocol for USDC subscription payments
- **SPL Token**: USDC token standard (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v mint address)

## Subscription System

### 5-Tier Subscription Model
The platform implements a comprehensive subscription system with 5 tiers:
- **Free**: Basic access with limited features
- **Starter**: Entry-level paid tier
- **Creator**: Mid-tier for active creators
- **Pro**: Advanced tier with premium features
- **Studio**: Enterprise-level access

### Subscription Features
Each tier is admin-configurable with:
- **Pricing**: Monthly/annual pricing in USD (stored as cents)
- **Credits**: AI generation credits per billing cycle
- **AI Model Access**: Specific models available (Leonardo, Flux, Ideogram, Stable Diffusion, Nano Banana)
- **Permissions**: Edit/upscale capabilities for AI-generated images
- **Commission Rates**: Marketplace sales commission percentage
- **Limits**: Max submissions per contest, file size limits

### USDC Payment Flow (Solana Pay)
**Implementation** (October 2025):
- Users can purchase subscriptions with USDC on Solana mainnet
- Payment processed via Solana Pay protocol with QR code and wallet integration
- Server-side verification of SPL token transfers

**Security Architecture**:
1. **Platform Wallet**: Fetched SERVER-SIDE via `storage.getSiteSettings()` to prevent client manipulation
2. **Amount Verification**: Backend converts tier.priceUsd (cents) to USDC dollars and verifies exact match
3. **SPL Token Parsing**: `verifyUSDCTransaction()` extracts token balance changes from transaction metadata
4. **Reference-based Polling**: Frontend polls with unique reference key until transaction confirmed

**Payment Workflow**:
1. User clicks "Get Started" on pricing page
2. SubscriptionSolanaPayment component generates Solana Pay URL with USDC amount and platform wallet
3. QR code displayed for mobile wallets, deep link for browser extensions
4. User completes payment in Phantom/Solflare/other Solana wallet
5. Frontend polls `/api/subscription/purchase-crypto` endpoint every 3 seconds
6. Backend uses `findReference()` to detect transaction on-chain
7. `verifyUSDCTransaction()` verifies correct amount sent to platform wallet
8. Backend creates/updates subscription, grants credits, logs transaction
9. Frontend redirects to /subscription with success message

**API Endpoints**:
- `POST /api/subscription/purchase-crypto`: Polling endpoint for payment verification
  - Input: `reference` (unique transaction identifier), `tierId`, `currency` (USDC)
  - Output: `{found: boolean, subscription?: Subscription}` or error
  - Error Handling: Returns `{found: false}` during polling (FindReferenceError), validates transaction details
- `GET /api/settings/platform-wallet`: Public endpoint returning platform USDC wallet address for QR display

**Transaction Verification** (`server/solana.ts`):
- `verifyUSDCTransaction()`: Parses SPL token balance changes from Solana transaction
- Extracts sender/receiver from `preTokenBalances`/`postTokenBalances`
- Returns amount in whole USDC (uiAmountString), not base units (6 decimals)
- Verifies recipient matches platform wallet address

**Components**:
- `SubscriptionSolanaPayment.tsx`: Crypto payment modal with QR code, wallet detection, polling logic
- Payment modal integrated into pricing page with crypto/Stripe toggle (Stripe TBD)

**Recent Changes** (October 18, 2025):
- Fixed cents-to-USDC conversion (tier.priceUsd / 100)
- Implemented server-side platform wallet fetch for security
- Created SPL token verification using token balance deltas
- Added FindReferenceError handling for polling gracefully
- Confirmed production-ready by architect review