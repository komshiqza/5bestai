# 5best - Creative Competition Platform

## Overview
5best is a creative competition platform for image and video contests. It allows users to submit entries, vote, and earn GLORY rewards. The platform features robust role-based access control, admin moderation, and a structured reward system distributing prizes to top submissions. It aims to provide a modern, full-stack experience with a 5-tier subscription model including AI model access, and integrates Solana Pay for USDC subscription payments. The platform also includes a prompt marketplace for AI-generated images, enabling users to monetize their creative prompts.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript and Vite.
- **UI/UX**: shadcn/ui (Radix UI, Tailwind CSS) for styling, dark mode, gradient, and glass morphism effects.
- **State Management**: TanStack Query.
- **Form Handling**: React Hook Form with Zod validation.
- **Routing**: Wouter.
- **Navigation**: Standardized order (Home → AI Studio → Contests → Explore → Pricing) across desktop and mobile (BottomNav).

### Backend
- **Runtime**: Node.js with Express.js REST API.
- **Language**: TypeScript.
- **Database ORM**: Drizzle ORM with PostgreSQL (Neon serverless).
- **Authentication**: JWT-based with httpOnly cookies; three-tier access control.
- **Password Security**: bcrypt.
- **Rate Limiting**: In-memory for voting, scalable to Redis.

### Database & Data Model
- **Core Entities**: Users, Contests, Submissions, Votes, GloryLedger, AuditLog.
- **Key Patterns**: UUID PKs, composite unique constraints, cascade deletion, indexed columns, timestamp tracking.
- **Contest Lifecycle**: Draft, Active, Ended, Archived.
- **Prompt Marketplace**: `submissions` schema extended with `category`, `aiModel`, `prompt`, `generationId`, `promptForSale`, `promptPrice`, `promptCurrency`.
- **Featured Contests**: `isFeatured` field in `contests` table.
- **AI Generations**: `thumbnailUrl` and `storageBucket` fields in `ai_generations` for optimized loading and storage tracking.

### File Upload & Media Management
- **Primary**: Cloudinary for image/video uploads, optimization, and CDN.
- **Secondary**: Supabase Storage for large AI-generated images (>= 10MB) and permanent storage.
- **Process**: Multer middleware, validation, storage, URL persistence.
- **AI Image Storage**: Two Supabase buckets (`pro-edit-images` for temporary, `5best-submissions` for permanent).
- **Thumbnail Generation**: Automatic generation for AI images to optimize grid displays.

### Contest & Reward System
- **Reward Distribution**: Top 5 submissions receive tiered rewards (40%, 25%, 15%, 10%, 10%).
- **Multi-Currency Support**: Prizes distributed in GLORY, SOL, or USDC based on contest configuration.
- **Voting Flexibility**: Configurable `votesPerUserPerPeriod`, `periodDurationHours`, `totalVotesPerUser`.
- **Contest Types**: Image/video specific with submission validation.
- **Entry Fees**: Optional GLORY, Solana, or USDC.
- **Jury Voting**: Supports public, jury, or hybrid methods.

### Subscription System
- **Model**: 5-tier (Free, Starter, Creator, Pro, Studio) with configurable features, AI credits, and pricing.
- **USDC Payment Flow**: Solana Pay for USDC payments on Solana via QR code/wallet integration, server-side verification.

### Pro Edit System (AI Enhancements)
- **AI Presets**: 6 specialized presets (Clean & Denoise, Upscale 4x, Portrait Pro, Smart Enhance, Remove Background, Relight Scene) with credit costs.
- **Comparison Tool**: Interactive before/after slider for enhanced versions.
- **Version History**: Panel displaying and allowing selection of all enhancement versions.
- **Reliability**: Auto-retry logic for prediction failures, timeout guards, clear error messages.
- **Permanent Storage**: "Save to Gallery" feature to permanently store AI-generated and Pro Edited images.

### API Design
- **Validation**: Zod schemas.
- **Error Handling**: Consistent JSON error responses.
- **Response Format**: `{ data }` for success, `{ error }` for failure.

## External Dependencies

### Core Services
- **Neon Database**: Serverless PostgreSQL.
- **Cloudinary**: Media hosting and CDN.
- **Supabase Storage**: Image storage for AI-generated content.

### Authentication & Security
- **jsonwebtoken**: JWT token handling.
- **bcrypt**: Password hashing.
- **cookie-parser**: Secure cookie handling.

### Blockchain & Payment Integration
- **Solana Web3.js**: Solana blockchain interaction.
- **@solana/pay**: Solana Pay protocol.
- **SPL Token**: USDC token standard.

### AI & Image Processing
- **Replicate API**: AI model integration (e.g., Real-ESRGAN, CodeFormer, Rembg).