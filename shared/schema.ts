import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, unique, index } from "drizzle-orm/pg-core";
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
  solBalance: integer("sol_balance").notNull().default(0),
  usdcBalance: integer("usdc_balance").notNull().default(0),
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
  prizeGlory: integer("prize_glory").notNull().default(0),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  config: jsonb("config"), // Stores all additional contest configuration (voting rules, prize distribution, etc.)
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
  delta: integer("delta").notNull(), // positive or negative change
  currency: varchar("currency", { length: 20 }).notNull().default("GLORY"), // GLORY, SOL, USDC
  reason: text("reason").notNull(),
  contestId: varchar("contest_id").references(() => contests.id, { onDelete: "set null" }),
  submissionId: varchar("submission_id").references(() => submissions.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow()
}, (table) => ({
  userIdx: index("glory_ledger_user_idx").on(table.userId),
  createdAtIdx: index("glory_ledger_created_at_idx").on(table.createdAt),
  contestSubmissionUnique: unique("glory_ledger_contest_submission_unique").on(table.contestId, table.submissionId)
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
  walletId: varchar("wallet_id").notNull().references(() => userWallets.id, { onDelete: "restrict" }),
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
  wallet: one(userWallets, {
    fields: [cashoutRequests.walletId],
    references: [userWallets.id],
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
  walletId: z.string(),
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
  wallet: Pick<UserWallet, 'id' | 'address' | 'provider'>;
};

// Site Settings table (global settings - should have only one row)
export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  privateMode: boolean("private_mode").notNull().default(false), // When true, only logged-in users can access the site
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const insertSiteSettingsSchema = createInsertSchema(siteSettings).omit({
  id: true,
  updatedAt: true
});

export type InsertSiteSettings = z.infer<typeof insertSiteSettingsSchema>;
export type SiteSettings = typeof siteSettings.$inferSelect;
