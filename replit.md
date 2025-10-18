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
- **Reward Distribution**: Top 5 submissions receive tiered GLORY (40%, 25%, 15%, 10%, 10%).
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