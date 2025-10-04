import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, unique, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"), // user, admin
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, approved, banned
  gloryBalance: integer("glory_balance").notNull().default(0),
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
  status: varchar("status", { length: 50 }).notNull().default("draft"), // draft, active, ended
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
  type: varchar("type", { length: 50 }).notNull(), // image, video
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  mediaUrl: text("media_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
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
  userSubmissionUnique: unique("votes_user_submission_unique").on(table.userId, table.submissionId),
  userIdx: index("votes_user_idx").on(table.userId),
  submissionIdx: index("votes_submission_idx").on(table.submissionId)
}));

// Glory Ledger table
export const gloryLedger = pgTable("glory_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  delta: integer("delta").notNull(), // positive or negative change
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
