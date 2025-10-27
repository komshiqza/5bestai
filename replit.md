# 5best - Creative Competition Platform

## Overview
5best is a creative competition platform for image and video contests. It allows users to submit entries, vote, and earn GLORY rewards. The platform features robust role-based access control, admin moderation, a structured reward system for top submissions, and a 5-tier subscription model with AI model access. It integrates Solana Pay for USDC subscription payments, aiming to provide a modern, full-stack experience for creative competitions. The platform also includes a marketplace for monetizing AI-generated prompts.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite.
- **UI**: shadcn/ui (Radix UI + Tailwind CSS) with dark mode, gradient, and glass morphism.
- **State Management**: TanStack Query for server state.
- **Form Handling**: React Hook Form with Zod validation.
- **Routing**: Wouter.

### Backend
- **Runtime**: Node.js with Express.js REST API.
- **Language**: TypeScript with ES modules.
- **Database**: Drizzle ORM with PostgreSQL (Neon serverless).
- **Authentication**: JWT-based with httpOnly cookies; three-tier access control (unauthenticated, authenticated, admin).
- **Security**: bcrypt for password hashing, in-memory rate limiting for voting.

### Database Schema & Data Model
- **Core Entities**: Users, Contests, Submissions, Votes, GloryLedger, AuditLog.
- **Patterns**: UUID primary keys, composite unique constraints, cascade deletion, indexed columns, timestamp tracking.

### File Upload & Media Management
- **Primary**: Cloudinary for image/video uploads, optimization, and CDN.
- **Constraints**: 10MB images, 100MB videos, MIME type validation.
- **AI-generated images**: Size-based routing to Cloudinary (<10MB) or Supabase (>=10MB) with `storageBucket` tracking.
- **Thumbnails**: Automatic generation for AI images to optimize grid display loading.
- **Permanent Storage**: Dedicated Supabase bucket for permanently saved AI images; temporary files are cleaned after 7 days.

### Contest & Reward System
- **Lifecycle**: Draft, Active, Ended, Archived.
- **Rewards**: Top 5 submissions receive tiered rewards (40%, 25%, 15%, 10%, 10%) in GLORY, SOL, or USDC.
- **Voting**: Configurable `votesPerUserPerPeriod`, `periodDurationHours`, `totalVotesPerUser`.
- **Entry Fees**: Optional GLORY, Solana, or USDC.
- **Jury Voting**: Supports public, jury, or hybrid methods.
- **Submission Rules**: `maxSubmissions`, `fileSizeLimit`, `submissionEndAt`.
- **Featured Contests**: Admin-controlled system to highlight contests on the homepage.

### API Design Patterns
- **Validation**: Zod schemas (shared client/server).
- **Error Handling**: Consistent JSON error responses.
- **Response Format**: `{ data }` for success, `{ error }` for failure.

### Submission Detail & Sharing
- **Pages**: Unique URLs (`/submission/:id`) for public access.
- **Sharing**: Web Share API with clipboard fallback.

### Subscription System
- **Model**: 5-tier (Free, Starter, Creator, Pro, Studio) with configurable features, AI credits, and commission rates.
- **USDC Payment**: Solana Pay integration for USDC subscriptions via QR code/wallet.

### Prompt Marketplace System
- **Monetization**: Users can sell AI-generated prompts.
- **Payment**: Supports wallet (blockchain) and balance payments in GLORY, SOL, USDC.
- **Commissions**: Platform takes a configurable commission (default 20%, customizable per user).
- **Admin Tools**: Comprehensive admin page for monitoring revenue, adjusting default commission, and managing user-specific commissions.
- **Buyer Experience**: 
  - **Access Control**: `hasPromptAccess` flag determines if user can view full prompt (owner, purchased, or free).
  - **Prompt Display**: `BlurredPrompt` component shows blurred text for paid prompts requiring purchase.
  - **Purchase Flow**: `PromptPurchaseModal` handles payment with balance validation and method selection.
  - **UI Integration**: Prompt sections in ContestLightboxModal (2-column layout) and SubmissionDetailPage with buy buttons.

### Pro Edit System
- **AI Presets**: Six AI presets for image enhancement (e.g., Clean & Denoise, Upscale 4x, Portrait Pro, Smart Enhance, Remove Background, Relight Scene).
- **Comparison**: Before/After image comparison slider.
- **Version History**: Thumbnail gallery of enhancement versions.
- **Reliability**: Auto-retry logic and timeout guards for Replicate predictions.

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL.
- **Cloudinary**: Media hosting and CDN.
- **Supabase Storage**: Permanent and temporary storage for AI-generated images.

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