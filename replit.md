# 5best - Creative Competition Platform

## Overview
5best is a creative competition platform designed to host image and video contests. Users can submit entries, vote on submissions, and earn GLORY rewards. The platform features robust role-based access control, admin moderation tools, and a structured reward system that distributes GLORY prizes among the top 5 submissions. It aims to offer a modern, full-stack experience for creative competitions, including a comprehensive 5-tier subscription model with various features and AI model access, and integrates Solana Pay for USDC subscription payments.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite.
- **Routing**: Wouter for lightweight client-side routing.
- **UI Components**: shadcn/ui built on Radix UI with Tailwind CSS for styling, supporting dark mode, gradient, and glass morphism effects.
- **State Management**: TanStack Query for server state management.
- **Form Handling**: React Hook Form with Zod validation.

### Backend
- **Runtime**: Node.js with Express.js REST API.
- **Language**: TypeScript with ES modules.
- **Database ORM**: Drizzle ORM with PostgreSQL (Neon serverless).
- **Authentication**: JWT-based with httpOnly cookies; three-tier access control (unauthenticated, authenticated, admin).
- **Password Security**: bcrypt (10 rounds).
- **Rate Limiting**: In-memory rate limiter for voting (30 votes/hour/user), scalable to Redis.

### Database Schema & Data Model
- **Core Entities**: Users, Contests, Submissions, Votes, GloryLedger, AuditLog.
- **Key Patterns**: UUID primary keys, composite unique constraints, cascade deletion, indexed columns, timestamp tracking.

### File Upload & Media Management
- **Primary**: Cloudinary for image/video uploads, optimization, and CDN.
- **Fallback**: Local file system storage for development.
- **Process**: Multer middleware, validation, storage, URL persistence.
- **Constraints**: 10MB images, 100MB videos, MIME type validation.

### Contest & Reward System
- **Contest Lifecycle**: Draft, Active, Ended, Archived.
- **Reward Distribution**: Top 5 submissions receive tiered rewards (40%, 25%, 15%, 10%, 10%) in contest's configured currency (GLORY, SOL, or USDC).
- **Multi-Currency Support**: Prizes automatically distributed to correct user balance (gloryBalance, solBalance, usdcBalance) based on contest.config.currency.
- **Voting Flexibility**: Configurable `votesPerUserPerPeriod`, `periodDurationHours`, and `totalVotesPerUser`.
- **Contest Types**: Image/video specific with submission validation.
- **Entry Fees**: Optional GLORY, Solana, or USDC entry fees, deducted atomically.
- **Jury Voting**: Supports public, jury, or hybrid voting methods.
- **Submission Rules**: `maxSubmissions`, `fileSizeLimit`, `submissionEndAt`.

### API Design Patterns
- **Validation**: Zod schemas shared client/server.
- **Error Handling**: Consistent JSON error responses.
- **Response Format**: `{ data }` for success, `{ error }` for failure.

### Submission Detail & Sharing
- **Dedicated Pages**: Unique URLs (`/submission/:id`) for public access to approved submissions.
- **Share Functionality**: Web Share API with clipboard fallback, targeting submission detail pages.
- **Future Integration**: Designed for marketplace features like "Buy Now" buttons and licensing.

### Subscription System
- **Model**: 5-tier (Free, Starter, Creator, Pro, Studio) with configurable pricing, AI credits, model access, permissions, commission rates, and limits.
- **USDC Payment Flow (Solana Pay)**:
    - Users purchase subscriptions using USDC on Solana mainnet via Solana Pay (QR code/wallet integration).
    - Server-side verification of SPL token transfers and amount.
    - Frontend polls `/api/subscription/purchase-crypto` for transaction confirmation.
    - Direct Phantom wallet integration for desktop and deep linking for mobile.

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL.
- **Cloudinary**: Media hosting and CDN.

### Authentication & Security
- **jsonwebtoken**: JWT token handling.
- **bcrypt**: Password hashing.
- **cookie-parser**: Secure cookie handling.

### Development & Build Tools
- **Drizzle Kit**: Database migrations.
- **esbuild**: Server-side bundling.
- **tsx**: TypeScript execution.
- **Vite**: Frontend bundling.

### UI & Component Libraries
- **Radix UI**: Headless accessible components.
- **Tailwind CSS**: Utility-first styling.
- **class-variance-authority**: Component variant management.
- **React Hook Form**: Form state management.
- **TanStack Query**: Async state management.

### Blockchain & Payment Integration
- **Solana Web3.js**: Solana blockchain interaction.
- **@solana/pay**: Solana Pay protocol for USDC payments.
- **SPL Token**: USDC token standard.

### AI & Image Processing
- **Replicate API**: AI model integration for image enhancement.
- **Supabase Storage**: Unlimited storage for Pro Edit enhanced images.

## Recent Updates (October 2025)

### Automatic Thumbnail Generation for AI Images (October 26, 2025)
**Problem:** Loading full-resolution AI-generated images in grid displays (AI Generator history panel, admin dashboard) caused slow page load times and excessive bandwidth usage.

**Solution:**
- **Added `thumbnailUrl` field** to `ai_generations` table to store optimized preview images
- **Smart thumbnail strategy:**
  - Cloudinary images: Use transformation URLs (no additional storage)
  - Supabase images: Generate and upload 400x400 thumbnails using Sharp library
  - `thumb_` prefix for Supabase thumbnail files
- **Automatic generation:**
  - Thumbnails created during initial upload to Cloudinary/Supabase
  - Both generateImage and upscaleImage propagate thumbnailUrl through full call chain
  - Frontend uses fallback chain: `thumbnailUrl || editedImageUrl || imageUrl`
- **Performance optimization:**
  - Reduces bandwidth for grid displays by ~95% (400x400 vs 4096x4096)
  - Maintains full resolution for lightbox/detail views
  - Graceful fallback if thumbnail generation fails

**Impact:** Grid displays now load significantly faster with optimized 400x400 previews, while full-resolution images are only loaded when viewing individual images in detail mode.

### Size-Based Storage Routing with Full Metadata Tracking (October 26, 2025)
**Problem:** AI-generated images >= 10MB need to use Supabase storage due to Cloudinary free tier limits, but the system wasn't tracking which storage backend was used for each image.

**Solution:**
- **Added `storageBucket` column** to `ai_generations` table with values: `cloudinary`, `supabase-temp`
- **Extended `GeneratedImage` interface** to include `storageBucket: 'cloudinary' | 'supabase-temp'`
- **Updated `downloadAndUploadToCloudinary`** to return `isSupabase` flag indicating storage location
- **Storage routing logic:**
  - Images < 10MB → Cloudinary temporary folder (`5best-ai-generated`)
  - Images >= 10MB → Supabase temporary bucket (`pro-edit-images`)
  - `storageBucket` metadata tracked in database for all generations
- **userId propagation:** Full call chain passes userId from routes → generateImage/upscaleImage → downloadAndUploadToCloudinary → Supabase upload
- **Error handling:** Defaults to `'cloudinary'` if upload fails, ensuring graceful fallback

**Impact:** System now correctly tracks storage location for each AI generation, enabling:
- Proper cleanup of temporary files from correct storage backend
- Accurate cost tracking per storage provider
- Future optimization of storage migration and retrieval patterns

### AI Image Permanent Storage System (October 26, 2025)
**Problem:** All AI-generated images and Pro Edit versions were deleted after 7 days by the cleanup scheduler, even if users wanted to keep them.

**Solution:**
- **Two-bucket Supabase architecture:**
  - `pro-edit-images` - temporary storage for AI generations/versions (7-day retention)
  - `5best-submissions` - permanent storage for saved images (no auto-deletion)
- **Save to Gallery feature:**
  - New "Gallery" button in canvas toolbar saves current image to permanent storage
  - Creates submission with `status: "approved"`, no `contestId` or `generationId`
  - Submissions without `generationId` are immune to 7-day cleanup
- **Version thumbnail actions:**
  - Save button on each version - copies to permanent storage with title/description
  - Download button - downloads version file
  - Delete button - placeholder for future implementation
- **Contest submission enhancement:**
  - Automatically copies images from temporary to permanent storage when submitting to contests
  - Prevents contest entries from being deleted after 7 days
- **Security hardening:**
  - URL validation ensures only user's own images can be saved
  - Domain whitelisting (Supabase + Cloudinary)
  - Ownership verification via database lookups
  - Prevents SSRF attacks and unauthorized file access

**Impact:** Users can now permanently save AI-generated images and Pro Edit versions to their gallery, while temporary work-in-progress files are still cleaned up after 7 days.

### Prize Distribution Currency Fix (October 24, 2025)
**Problem:** Contest rewards were always distributed as GLORY tokens, regardless of the contest's configured currency setting.

**Solution:**
- Updated `MemStorage.distributeContestRewards` and `DbStorage.distributeContestRewards` to respect `contest.config.currency`
- Prize distribution now correctly updates the appropriate user balance field based on currency:
  - `GLORY` → updates `gloryBalance`
  - `SOL` → updates `solBalance`
  - `USDC` → updates `usdcBalance`
- Ledger entries now include the correct currency field
- Fixed type conversion for `contest.prizeGlory` (numeric to number) in percentage-based distribution

**Impact:** Contests can now award prizes in SOL, USDC, or GLORY as configured, enabling multi-currency contest economies.

## Recent Updates (October 2025)

### Pro Edit System Enhancements

**Expanded AI Presets (6 Total):**
1. Clean & Denoise (2 credits) - Real-ESRGAN noise reduction
2. Upscale 4× (4 credits) - Real-ESRGAN 4× upscaling
3. Portrait Pro (4 credits) - CodeFormer face restoration with fidelity 0.7
4. Smart Enhance (3 credits) - CodeFormer upscale + enhancement
5. Remove Background (2 credits) - Rembg background removal
6. Relight Scene (4 credits) - AI-powered scene relighting

**Before/After Image Comparison:**
- Interactive slider with draggable divider
- Visual comparison between original and enhanced versions
- Smooth mouse/touch interactions
- Labels showing "Original" vs "Enhanced"

**Version History Panel:**
- Horizontal scrollable thumbnail gallery
- Shows all enhancement versions for an image
- Click to switch between versions in comparison slider
- Auto-loads when opening modal for previously edited images
- Real-time updates as new versions are created

**Reliability & Error Handling:**
- Auto-retry logic: up to 2 retries on Replicate prediction failures
- Timeout guard: automatically fails jobs stuck for >10 minutes
- Per-attempt timestamp tracking prevents premature timeout cancellation
- Clear error messages for users
- Comprehensive logging for debugging

**Technical Implementation:**
- `retryCount` field tracks retry attempts
- `lastAttemptAt` timestamp for timeout management
- New API endpoints:
  - `GET /api/pro-edit/image-id` - Fetch imageId for submissions/generations
  - `GET /api/images/:imageId/versions` - Retrieve version history
- Non-destructive editing with full history preservation
- Credits deducted only once, even with retries