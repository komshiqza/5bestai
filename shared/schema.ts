import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, numeric, timestamp, boolean, jsonb, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  role: varchar("role", { length: 50 }).notNull().default("user"), // user, admin
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, approved, banned
  gloryBalance: integer("glory_balance").notNull().default(0),
  solBalance: numeric("sol_balance", { precision: 18, scale: 9 }).notNull().default("0"), // SOL with 9 decimals
  usdcBalance: numeric("usdc_balance", { precision: 18, scale: 6 }).notNull().default("0"), // USDC with 6 decimals
  imageCredits: integer("image_credits").notNull().default(100), // Credits for AI image generation and upscaling
  withdrawalAddress: varchar("withdrawal_address", { length: 255 }), // Solana withdrawal address
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  usernameIdx: index("users_username_idx").on(table.username)
}));

// Contests table
export const contests = pgTable("contests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description").notNull(),
  rules: text("rules").notNull(),
  coverImageUrl: text("cover_image_url"),
  status: varchar("status", { length: 50 }).notNull().default("draft"), // draft, active, ended, archived
  prizeGlory: numeric("prize_glory", { precision: 10, scale: 2 }).notNull().default("0"),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  config: jsonb("config"), // Stores all additional contest configuration (voting rules, prize distribution, etc.)
  isFeatured: boolean("is_featured").notNull().default(false), // Featured contest shown on home page
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  slugIdx: index("contests_slug_idx").on(table.slug),
  statusIdx: index("contests_status_idx").on(table.status)
}));

// Submissions table
export const submissions = pgTable("submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contestId: varchar("contest_id").references(() => contests.id, { onDelete: "set null" }),
  contestName: varchar("contest_name", { length: 255 }), // Preserved contest name even after contest deletion
  type: varchar("type", { length: 50 }).notNull(), // image, video
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  mediaUrl: text("media_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  cloudinaryPublicId: varchar("cloudinary_public_id", { length: 255 }), // Store Cloudinary public_id for easy deletion
  cloudinaryResourceType: varchar("cloudinary_resource_type", { length: 20 }), // Store resource type (image/video) for deletion
  tags: text("tags").array(),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, approved, rejected
  votesCount: integer("votes_count").notNull().default(0),
  isEnhanced: boolean("is_enhanced").notNull().default(false), // True if edited or upscaled via built-in editor
  entryFeeAmount: text("entry_fee_amount"), // Entry fee amount paid at submission time (stored as string for precision)
  entryFeeCurrency: varchar("entry_fee_currency", { length: 20 }), // Currency of entry fee (GLORY, SOL, USDC)
  category: varchar("category", { length: 100 }), // Category (Art, Portrait, Landscape, etc.)
  aiModel: varchar("ai_model", { length: 255 }), // AI model used to generate the image
  prompt: text("prompt"), // Prompt used to generate the image
  generationId: varchar("generation_id").references(() => aiGenerations.id, { onDelete: "set null" }), // Reference to AI generation
  promptForSale: boolean("prompt_for_sale").notNull().default(false), // Whether the prompt is for sale
  promptPrice: numeric("prompt_price", { precision: 18, scale: 6 }), // Price for the prompt (supports decimals for crypto)
  promptCurrency: varchar("prompt_currency", { length: 20 }), // Currency for prompt sale (SOL, USDC, GLORY)
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  userContestIdx: index("submissions_user_contest_idx").on(table.userId, table.contestId),
  contestStatusIdx: index("submissions_contest_status_idx").on(table.contestId, table.status),
  votesIdx: index("submissions_votes_idx").on(table.votesCount)
}));

// Votes table
export const votes = pgTable("votes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  submissionId: varchar("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  userIdx: index("votes_user_idx").on(table.userId),
  submissionIdx: index("votes_submission_idx").on(table.submissionId),
  createdAtIdx: index("votes_created_at_idx").on(table.createdAt)
}));

// Glory Ledger table (kept for backwards compatibility, but now tracks all currencies)
export const gloryLedger = pgTable("glory_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  delta: numeric("delta", { precision: 18, scale: 9 }).notNull(), // positive or negative change (supports GLORY integers and SOL/USDC decimals)
  currency: varchar("currency", { length: 20 }).notNull().default("GLORY"), // GLORY, SOL, USDC
  reason: text("reason").notNull(),
  contestId: varchar("contest_id").references(() => contests.id, { onDelete: "set null" }),
  submissionId: varchar("submission_id").references(() => submissions.id, { onDelete: "set null" }),
  txHash: varchar("tx_hash", { length: 255 }), // Blockchain transaction hash (for crypto payments)
  metadata: jsonb("metadata"), // Additional transaction metadata
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  userIdx: index("glory_ledger_user_idx").on(table.userId),
  createdAtIdx: index("glory_ledger_created_at_idx").on(table.createdAt),
  contestSubmissionUnique: unique("glory_ledger_contest_submission_unique").on(table.contestId, table.submissionId),
  txHashUnique: unique("glory_ledger_tx_hash_unique").on(table.txHash)
}));

// Audit Log table
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorUserId: varchar("actor_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 255 }).notNull(),
  meta: jsonb("meta"), // JSON metadata
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  actorIdx: index("audit_log_actor_idx").on(table.actorUserId),
  createdAtIdx: index("audit_log_created_at_idx").on(table.createdAt)
}));

// User Wallets table (Solana wallet addresses)
export const userWallets = pgTable("user_wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  address: varchar("address", { length: 255 }).notNull().unique(), // Solana wallet address
  provider: varchar("provider", { length: 50 }).notNull(), // phantom, solflare, etc
  signatureNonce: varchar("signature_nonce", { length: 255 }), // For verification
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, inactive
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  userIdx: index("user_wallets_user_idx").on(table.userId),
  addressIdx: index("user_wallets_address_idx").on(table.address)
}));

// Cashout Requests table
export const cashoutRequests = pgTable("cashout_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  withdrawalAddress: varchar("withdrawal_address", { length: 255 }).notNull(), // Solana withdrawal address
  amountGlory: integer("amount_glory").notNull(), // GLORY points to cash out
  amountToken: text("amount_token").notNull(), // Token amount (as string for precision)
  tokenType: varchar("token_type", { length: 50 }).notNull().default("USDC"), // USDC, SOL, GLORY
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, approved, rejected, processing, sent, confirmed, failed
  adminId: varchar("admin_id").references(() => users.id, { onDelete: "set null" }), // Admin who processed
  txHash: varchar("tx_hash", { length: 255 }), // Solana transaction hash
  txMeta: jsonb("tx_meta"), // Additional transaction metadata
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  userIdx: index("cashout_requests_user_idx").on(table.userId),
  statusIdx: index("cashout_requests_status_idx").on(table.status),
  createdAtIdx: index("cashout_requests_created_at_idx").on(table.createdAt)
}));

// Cashout Events table (audit trail)
export const cashoutEvents = pgTable("cashout_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cashoutRequestId: varchar("cashout_request_id").notNull().references(() => cashoutRequests.id, { onDelete: "cascade" }),
  fromStatus: varchar("from_status", { length: 50 }).notNull(),
  toStatus: varchar("to_status", { length: 50 }).notNull(),
  actorUserId: varchar("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  cashoutRequestIdx: index("cashout_events_cashout_request_idx").on(table.cashoutRequestId),
  createdAtIdx: index("cashout_events_created_at_idx").on(table.createdAt)
}));

// Relations
export const cashoutRequestsRelations = relations(cashoutRequests, ({ one }) => ({
  user: one(users, {
    fields: [cashoutRequests.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  gloryBalance: true
});

export const insertContestSchema = createInsertSchema(contests).omit({
  id: true,
  createdAt: true
}).extend({
  prizeGlory: z.union([z.string(), z.number()]).transform(val => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num < 0) throw new Error('Prize pool must be a positive number');
    return String(num); // Return as string, preserving original precision
  }),
  startAt: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  endAt: z.union([z.date(), z.string()]).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  )
});

export const insertSubmissionSchema = createInsertSchema(submissions).omit({
  id: true,
  createdAt: true,
  votesCount: true
});

export const insertVoteSchema = createInsertSchema(votes).omit({
  id: true,
  createdAt: true
});

export const insertGloryLedgerSchema = createInsertSchema(gloryLedger).omit({
  id: true,
  createdAt: true
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({
  id: true,
  createdAt: true
});

export const insertUserWalletSchema = createInsertSchema(userWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCashoutRequestSchema = createInsertSchema(cashoutRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCashoutEventSchema = createInsertSchema(cashoutEvents).omit({
  id: true,
  createdAt: true
});

// Contest Config schema
export const contestConfigSchema = z.object({
  // Contest type and rules
  contestType: z.enum(["image", "video"]).optional(),
  votingMethods: z.array(z.enum(["public", "jury"])).optional(),
  juryMembers: z.array(z.string()).optional(),
  maxSubmissions: z.number().optional(),
  fileSizeLimit: z.number().optional(),
  
  // Timing
  submissionEndAt: z.string().optional(),
  votingStartAt: z.string().optional(),
  votingEndAt: z.string().optional(),
  
  // Voting rules
  votesPerUserPerPeriod: z.number().optional(),
  periodDurationHours: z.number().optional(),
  totalVotesPerUser: z.number().optional(),
  
  // Prize distribution
  prizeDistribution: z.array(z.number()).optional(),
  currency: z.enum(["GLORY", "SOL", "USDC"]).optional(), // Prize currency
  
  // Entry fee configuration
  entryFee: z.boolean().optional(),
  entryFeeAmount: z.number().optional(),
  entryFeeCurrency: z.enum(["GLORY", "SOL", "USDC", "CUSTOM"]).optional(),
  entryFeePaymentMethods: z.array(z.enum(["balance", "wallet"])).optional(), // Allow balance or wallet payment
  
  // Platform wallet configuration for crypto payments
  platformWalletAddress: z.string().min(32).max(44).regex(/^[1-9A-HJ-NP-Za-km-z]+$/).optional(), // Solana wallet address (base58, 32-44 chars)
  platformFeePercentage: z.number().min(0).max(100).optional(), // Platform fee percentage from entry fees
  
  // Custom SPL token support
  customTokenMint: z.string().min(32).max(44).regex(/^[1-9A-HJ-NP-Za-km-z]+$/).optional(), // Solana SPL token mint address (base58, 32-44 chars)
  customTokenDecimals: z.number().int().min(0).max(9).optional(), // Decimals for custom token (0-9)
}).optional().refine((config) => {
  // If currency is CUSTOM, require customTokenMint and customTokenDecimals
  if (config?.entryFeeCurrency === "CUSTOM") {
    return config.customTokenMint && config.customTokenDecimals !== undefined;
  }
  return true;
}, {
  message: "customTokenMint and customTokenDecimals are required when entryFeeCurrency is CUSTOM"
}).refine((config) => {
  // Forbid customTokenMint/decimals when currency is not CUSTOM
  if (config?.entryFeeCurrency && config.entryFeeCurrency !== "CUSTOM") {
    return !config.customTokenMint && config.customTokenDecimals === undefined;
  }
  return true;
}, {
  message: "customTokenMint and customTokenDecimals can only be used when entryFeeCurrency is CUSTOM"
}).refine((config) => {
  // If wallet payment is enabled, require platformWalletAddress
  if (config?.entryFeePaymentMethods?.includes("wallet")) {
    return !!config.platformWalletAddress;
  }
  return true;
}, {
  message: "platformWalletAddress is required when wallet payment method is enabled"
});

export type ContestConfig = z.infer<typeof contestConfigSchema>;

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6)
});

// API response schemas
export const voteSubmissionSchema = z.object({
  submissionId: z.string()
});

export const updateUserStatusSchema = z.object({
  status: z.enum(["pending", "approved", "banned"])
});

export const updateSubmissionStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"])
});

export const updateWithdrawalAddressSchema = z.object({
  address: z.string().min(32).max(44) // Solana wallet address (32-44 chars)
});

export const bulkSubmissionIdsSchema = z.object({
  submissionIds: z.array(z.string()).min(1, "At least one submission must be selected")
});

// Wallet and Cashout schemas
export const connectWalletSchema = z.object({
  address: z.string().min(32).max(44), // Solana addresses are 32-44 chars
  provider: z.string(), // phantom, solflare, etc
  signature: z.string(), // Signature for verification
  message: z.string() // Message that was signed
});

export const createCashoutRequestSchema = z.object({
  withdrawalAddress: z.string().min(32).max(44), // Solana address
  amountGlory: z.number().int().min(1000), // Minimum 1000 GLORY
  tokenType: z.enum(["USDC", "SOL", "GLORY"]).default("USDC")
});

export const updateCashoutStatusSchema = z.object({
  status: z.enum(["approved", "rejected", "processing", "sent", "confirmed", "failed"]),
  rejectionReason: z.string().optional(),
  txHash: z.string().optional()
});

export const approveCashoutSchema = z.object({
  requestId: z.string()
});

export const rejectCashoutSchema = z.object({
  requestId: z.string(),
  rejectionReason: z.string().optional()
});

export const bulkCashoutIdsSchema = z.object({
  requestIds: z.array(z.string()).min(1, "At least one request must be selected")
});

export const bulkRejectCashoutSchema = z.object({
  requestIds: z.array(z.string()).min(1, "At least one request must be selected"),
  rejectionReason: z.string().optional()
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContest = z.infer<typeof insertContestSchema>;
export type Contest = typeof contests.$inferSelect;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type Submission = typeof submissions.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;
export type InsertGloryLedger = z.infer<typeof insertGloryLedgerSchema>;
export type GloryLedger = typeof gloryLedger.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertUserWallet = z.infer<typeof insertUserWalletSchema>;
export type UserWallet = typeof userWallets.$inferSelect;
export type InsertCashoutRequest = z.infer<typeof insertCashoutRequestSchema>;
export type CashoutRequest = typeof cashoutRequests.$inferSelect;
export type InsertCashoutEvent = z.infer<typeof insertCashoutEventSchema>;
export type CashoutEvent = typeof cashoutEvents.$inferSelect;
export type InsertAiGeneration = z.infer<typeof insertAiGenerationSchema>;
export type AiGeneration = typeof aiGenerations.$inferSelect;

// Extended types with relations
export type SubmissionWithUser = Submission & {
  user: Pick<User, 'id' | 'username'>;
  contest: Pick<Contest, 'id' | 'title'>;
};

export type ContestWithStats = Contest & {
  submissionCount: number;
  participantCount: number;
  totalVotes: number;
  topSubmissionImageUrl?: string | null;
};

export type UserWithStats = User & {
  submissionCount: number;
  totalVotes: number;
  contestWins: number;
};

export type CashoutRequestWithRelations = CashoutRequest & {
  user: Pick<User, 'id' | 'username' | 'email' | 'gloryBalance'>;
};

// AI Generations table
export const aiGenerations = pgTable("ai_generations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  prompt: text("prompt").notNull(),
  model: varchar("model", { length: 255 }).notNull(), // e.g., "stability-ai/sdxl"
  imageUrl: text("image_url").notNull(),
  thumbnailUrl: text("thumbnail_url"), // Thumbnail URL for fast loading (400x400)
  parameters: jsonb("parameters"), // Store generation parameters (width, height, steps, etc.)
  cloudinaryPublicId: varchar("cloudinary_public_id", { length: 255 }),
  storageBucket: varchar("storage_bucket", { length: 50 }).notNull().default("cloudinary"), // cloudinary, supabase-temp
  status: varchar("status", { length: 50 }).notNull().default("generated"), // generated, saved, submitted
  editedImageUrl: text("edited_image_url"), // URL of edited version (if edited via built-in editor)
  isEdited: boolean("is_edited").notNull().default(false), // True if edited via built-in editor
  isUpscaled: boolean("is_upscaled").notNull().default(false), // True if upscaled via AI upscaling
  creditsUsed: integer("credits_used").notNull().default(0), // Credits deducted for this generation
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  userIdx: index("ai_generations_user_idx").on(table.userId),
  createdAtIdx: index("ai_generations_created_at_idx").on(table.createdAt)
}));

// Site Settings table (global settings - should have only one row)
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  privateMode: boolean("private_mode").notNull().default(false), // When true, only logged-in users can access the site
  platformWalletAddress: varchar("platform_wallet_address", { length: 255 }), // Solana wallet address for receiving entry fees
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updatedAt: true
});

export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;
export type SiteSettings = typeof siteSettings.$inferSelect;

// Pricing Settings table (key-value store for model costs and upscale pricing)
export const pricingSettings = pgTable("pricing_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 255 }).notNull().unique(), // e.g., "leonardo", "nano-banana", "upscale"
  value: integer("value").notNull(), // Credit cost
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertPricingSettingSchema = createInsertSchema(pricingSettings).omit({
  id: true,
  updatedAt: true
});

export type InsertPricingSetting = z.infer<typeof insertPricingSettingSchema>;
export type PricingSetting = typeof pricingSettings.$inferSelect;

export const insertAiGenerationSchema = createInsertSchema(aiGenerations).omit({
  id: true,
  createdAt: true
});

// Subscription Tiers table
export const subscriptionTiers = pgTable("subscription_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // free, starter, creator, pro, studio
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  priceUsd: integer("price_usd").notNull().default(0), // Price in cents (0 for free tier)
  monthlyCredits: integer("monthly_credits").notNull().default(0),
  
  // Feature flags
  canEdit: boolean("can_edit").notNull().default(false),
  canUpscale: boolean("can_upscale").notNull().default(false),
  
  // AI model access (array of model slugs)
  allowedModels: text("allowed_models").array().notNull().default(sql`ARRAY[]::text[]`),
  
  // Commission rates (percentage as integer, e.g., 15 = 15%)
  promptCommission: integer("prompt_commission").notNull().default(0), // % from prompt sales
  imageCommission: integer("image_commission").notNull().default(0), // % from image/video sales
  
  // Additional features (stored as JSON for flexibility)
  features: jsonb("features"), // { maxSubmissionsPerContest: 10, prioritySupport: true, etc. }
  
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0), // For display ordering
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  slugIdx: index("subscription_tiers_slug_idx").on(table.slug),
  sortOrderIdx: index("subscription_tiers_sort_order_idx").on(table.sortOrder)
}));

// User Subscriptions table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tierId: varchar("tier_id").notNull().references(() => subscriptionTiers.id, { onDelete: "restrict" }),
  
  status: varchar("status", { length: 50 }).notNull().default("active"), // active, cancelled, expired, pending
  paymentMethod: varchar("payment_method", { length: 50 }), // stripe, usdc, sol
  
  // Stripe-specific fields
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  
  // Crypto payment fields
  paymentTxHash: varchar("payment_tx_hash", { length: 255 }), // Solana transaction hash
  
  // Subscription period
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  
  // Credit tracking
  creditsGranted: integer("credits_granted").notNull().default(0), // Credits granted for this billing period
  creditsGrantedAt: timestamp("credits_granted_at"), // When credits were last granted
  
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  cancelledAt: timestamp("cancelled_at"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  userIdx: index("user_subscriptions_user_idx").on(table.userId),
  tierIdx: index("user_subscriptions_tier_idx").on(table.tierId),
  statusIdx: index("user_subscriptions_status_idx").on(table.status),
  stripeSubscriptionIdx: index("user_subscriptions_stripe_subscription_idx").on(table.stripeSubscriptionId),
  currentPeriodEndIdx: index("user_subscriptions_current_period_end_idx").on(table.currentPeriodEnd)
}));

// Subscription Transactions table (payment history)
export const subscriptionTransactions = pgTable("subscription_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subscriptionId: varchar("subscription_id").notNull().references(() => userSubscriptions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tierId: varchar("tier_id").notNull().references(() => subscriptionTiers.id, { onDelete: "restrict" }),
  
  amountCents: integer("amount_cents").notNull(), // Amount in cents (for USD pricing)
  currency: varchar("currency", { length: 20 }).notNull().default("USD"), // USD, USDC, SOL
  
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // stripe, usdc, sol
  paymentStatus: varchar("payment_status", { length: 50 }).notNull().default("pending"), // pending, completed, failed, refunded
  
  // Stripe fields
  stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
  stripeChargeId: varchar("stripe_charge_id", { length: 255 }),
  
  // Crypto fields
  txHash: varchar("tx_hash", { length: 255 }), // Solana transaction hash
  walletAddress: varchar("wallet_address", { length: 255 }), // Payer's wallet address
  
  metadata: jsonb("metadata"), // Additional transaction data
  
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  subscriptionIdx: index("subscription_transactions_subscription_idx").on(table.subscriptionId),
  userIdx: index("subscription_transactions_user_idx").on(table.userId),
  statusIdx: index("subscription_transactions_status_idx").on(table.paymentStatus),
  createdAtIdx: index("subscription_transactions_created_at_idx").on(table.createdAt),
  txHashIdx: index("subscription_transactions_tx_hash_idx").on(table.txHash)
}));

// Purchased Prompts table (marketplace transactions)
export const purchasedPrompts = pgTable("purchased_prompts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  submissionId: varchar("submission_id").notNull().references(() => submissions.id, { onDelete: "cascade" }),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: "cascade" }), // Creator of the prompt
  price: numeric("price", { precision: 18, scale: 9 }).notNull(), // Price paid (supports decimals for SOL/USDC)
  currency: varchar("currency", { length: 20 }).notNull(), // GLORY, SOL, USDC
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  userIdx: index("purchased_prompts_user_idx").on(table.userId),
  submissionIdx: index("purchased_prompts_submission_idx").on(table.submissionId),
  sellerIdx: index("purchased_prompts_seller_idx").on(table.sellerId),
  createdAtIdx: index("purchased_prompts_created_at_idx").on(table.createdAt),
  userSubmissionUnique: unique("purchased_prompts_user_submission_unique").on(table.userId, table.submissionId)
}));

// Purchased Prompts Relations
export const purchasedPromptsRelations = relations(purchasedPrompts, ({ one }) => ({
  user: one(users, {
    fields: [purchasedPrompts.userId],
    references: [users.id],
  }),
  submission: one(submissions, {
    fields: [purchasedPrompts.submissionId],
    references: [submissions.id],
  }),
  seller: one(users, {
    fields: [purchasedPrompts.sellerId],
    references: [users.id],
  }),
}));

// Pro Edit: Images table (master image records)
export const images = pgTable("images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  submissionId: varchar("submission_id").references(() => submissions.id, { onDelete: "set null" }), // Link to submission if created from one
  generationId: varchar("generation_id").references(() => aiGenerations.id, { onDelete: "set null" }), // Link to AI generation if created from one
  originalUrl: text("original_url").notNull(), // URL of the original uploaded image
  currentVersionId: varchar("current_version_id"), // Points to the active version
  title: varchar("title", { length: 255 }),
  width: integer("width"),
  height: integer("height"),
  format: varchar("format", { length: 20 }), // png, jpg, webp
  metadata: jsonb("metadata"), // EXIF, camera data, etc.
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}, (table) => ({
  userIdx: index("images_user_idx").on(table.userId),
  submissionIdx: index("images_submission_idx").on(table.submissionId),
  generationIdx: index("images_generation_idx").on(table.generationId)
}));

// Pro Edit: Image Versions table (non-destructive editing history)
export const imageVersions = pgTable("image_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageId: varchar("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
  url: text("url").notNull(), // Full-size URL (Cloudinary or Supabase)
  thumbnailUrl: text("thumbnail_url"), // Thumbnail URL for gallery display (optimized)
  previewUrl: text("preview_url"), // Medium-size URL for previews
  width: integer("width"),
  height: integer("height"),
  format: varchar("format", { length: 20 }), // png, jpg, webp
  source: varchar("source", { length: 50 }).notNull(), // 'upload', 'generate', 'edit'
  preset: varchar("preset", { length: 50 }), // 'clean', 'upscale4x', 'portrait_pro', etc.
  params: jsonb("params"), // Parameters used for this version
  metadata: jsonb("metadata"), // Additional version data
  isCurrent: boolean("is_current").default(false).notNull(), // Mark as the active version
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  imageIdx: index("image_versions_image_idx").on(table.imageId),
  createdAtIdx: index("image_versions_created_at_idx").on(table.createdAt),
  isCurrentIdx: index("image_versions_is_current_idx").on(table.imageId, table.isCurrent)
}));

// Pro Edit: Edit Jobs table (processing queue)
export const editJobs = pgTable("edit_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  imageId: varchar("image_id").notNull().references(() => images.id, { onDelete: "cascade" }),
  inputVersionId: varchar("input_version_id").references(() => imageVersions.id, { onDelete: "set null" }),
  
  preset: varchar("preset", { length: 50 }).notNull(), // 'clean', 'upscale4x', 'portrait_pro', etc.
  params: jsonb("params").notNull(), // Preset parameters
  
  status: varchar("status", { length: 50 }).notNull().default("queued"), // queued, running, succeeded, failed
  
  // Replicate integration
  replicatePredictionId: text("replicate_prediction_id"),
  
  outputVersionId: varchar("output_version_id").references(() => imageVersions.id, { onDelete: "set null" }),
  
  costCredits: integer("cost_credits").notNull().default(0), // Credits deducted for this job
  
  retryCount: integer("retry_count").notNull().default(0), // Number of retries attempted
  
  lastAttemptAt: timestamp("last_attempt_at").notNull().defaultNow(), // Timestamp of last prediction attempt
  
  error: text("error"), // Error message if failed
  
  refundedAt: timestamp("refunded_at"), // Timestamp when credits were refunded (for idempotency)
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at")
}, (table) => ({
  userIdx: index("edit_jobs_user_idx").on(table.userId),
  imageIdx: index("edit_jobs_image_idx").on(table.imageId),
  statusIdx: index("edit_jobs_status_idx").on(table.status),
  createdAtIdx: index("edit_jobs_created_at_idx").on(table.createdAt)
}));

// Insert schemas
export const insertSubscriptionTierSchema = createInsertSchema(subscriptionTiers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSubscriptionTransactionSchema = createInsertSchema(subscriptionTransactions).omit({
  id: true,
  createdAt: true
});

export const insertPurchasedPromptSchema = createInsertSchema(purchasedPrompts).omit({
  id: true,
  createdAt: true
});

export const insertImageSchema = createInsertSchema(images).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertImageVersionSchema = createInsertSchema(imageVersions).omit({
  id: true,
  createdAt: true
});

export const insertEditJobSchema = createInsertSchema(editJobs).omit({
  id: true,
  createdAt: true,
  finishedAt: true
});

// Export types
export type InsertSubscriptionTier = z.infer<typeof insertSubscriptionTierSchema>;
export type SubscriptionTier = typeof subscriptionTiers.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertSubscriptionTransaction = z.infer<typeof insertSubscriptionTransactionSchema>;
export type SubscriptionTransaction = typeof subscriptionTransactions.$inferSelect;
export type InsertPurchasedPrompt = z.infer<typeof insertPurchasedPromptSchema>;
export type PurchasedPrompt = typeof purchasedPrompts.$inferSelect;

export type InsertImage = z.infer<typeof insertImageSchema>;
export type Image = typeof images.$inferSelect;
export type InsertImageVersion = z.infer<typeof insertImageVersionSchema>;
export type ImageVersion = typeof imageVersions.$inferSelect;
export type InsertEditJob = z.infer<typeof insertEditJobSchema>;
export type EditJob = typeof editJobs.$inferSelect;

// Extended types with relations
export type UserSubscriptionWithTier = UserSubscription & {
  tier: SubscriptionTier;
};

export type SubscriptionTransactionWithDetails = SubscriptionTransaction & {
  tier: SubscriptionTier;
  user: Pick<User, 'id' | 'username' | 'email'>;
};
