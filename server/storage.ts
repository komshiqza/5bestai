import { 
  type User, 
  type InsertUser, 
  type Contest, 
  type InsertContest,
  type Submission,
  type InsertSubmission,
  type Vote,
  type InsertVote,
  type GloryLedger,
  type InsertGloryLedger,
  type AuditLog,
  type InsertAuditLog,
  type UserWallet,
  type InsertUserWallet,
  type CashoutRequest,
  type InsertCashoutRequest,
  type CashoutRequestWithRelations,
  type CashoutEvent,
  type InsertCashoutEvent,
  type SubmissionWithUser,
  type ContestWithStats,
  type UserWithStats,
  users,
  contests,
  submissions,
  votes,
  gloryLedger,
  auditLog,
  userWallets,
  cashoutRequests,
  cashoutEvents
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, and, desc, sql, count, countDistinct, sum, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  getUsersWithFilters(filters: { status?: string; role?: string }): Promise<UserWithStats[]>;
  getUsersByIds(ids: string[]): Promise<User[]>;
  bulkDeleteUsers(ids: string[]): Promise<number>;
  
  // Contests
  getContest(id: string): Promise<Contest | undefined>;
  getContestBySlug(slug: string): Promise<Contest | undefined>;
  getContests(filters?: { status?: string }): Promise<ContestWithStats[]>;
  createContest(contest: InsertContest): Promise<Contest>;
  updateContest(id: string, updates: Partial<Contest>): Promise<Contest | undefined>;
  deleteContest(id: string): Promise<boolean>;
  
  // Submissions
  getSubmission(id: string): Promise<Submission | undefined>;
  getSubmissions(filters: { contestId?: string; userId?: string; status?: string; page?: number; limit?: number }): Promise<SubmissionWithUser[]>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  updateSubmission(id: string, updates: Partial<Submission>): Promise<Submission | undefined>;
  deleteSubmission(id: string): Promise<boolean>;
  getTopSubmissionsByContest(contestId: string, limit?: number): Promise<SubmissionWithUser[]>;
  getUserSubmissionsInContest(userId: string, contestId: string): Promise<number>;
  
  // Votes
  getVote(userId: string, submissionId: string): Promise<Vote | undefined>;
  createVote(vote: InsertVote): Promise<Vote>;
  getVoteCountByUser(userId: string, since: Date): Promise<number>;
  getVoteCountForSubmissionInPeriod(userId: string, submissionId: string, since: Date): Promise<number>;
  getUserTotalVotesInContest(userId: string, contestId: string): Promise<number>;
  
  // Glory Ledger
  createGloryTransaction(transaction: InsertGloryLedger): Promise<GloryLedger>;
  getGloryTransactions(userId: string): Promise<GloryLedger[]>;
  clearGloryTransactions(userId: string): Promise<void>;
  updateUserGloryBalance(userId: string, delta: number): Promise<void>;
  
  // Audit Log
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  clearAuditLogs(): Promise<void>;
  
  // Contest distribution
  distributeContestRewards(contestId: string): Promise<void>;
  
  // User Wallets
  getUserWallet(userId: string): Promise<UserWallet | undefined>;
  getUserWalletByAddress(address: string): Promise<UserWallet | undefined>;
  createUserWallet(wallet: InsertUserWallet): Promise<UserWallet>;
  updateUserWallet(id: string, updates: Partial<UserWallet>): Promise<UserWallet | undefined>;
  
  // Cashout Requests
  getCashoutRequest(id: string): Promise<CashoutRequest | undefined>;
  getCashoutRequests(filters?: { userId?: string; status?: string }): Promise<CashoutRequestWithRelations[]>;
  createCashoutRequest(request: InsertCashoutRequest): Promise<CashoutRequest>;
  updateCashoutRequest(id: string, updates: Partial<CashoutRequest>): Promise<CashoutRequest | undefined>;
  
  // Cashout Events
  createCashoutEvent(event: InsertCashoutEvent): Promise<CashoutEvent>;
  getCashoutEvents(cashoutRequestId: string): Promise<CashoutEvent[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private contests: Map<string, Contest> = new Map();
  private submissions: Map<string, Submission> = new Map();
  private votes: Map<string, Vote> = new Map();
  private gloryLedger: Map<string, GloryLedger> = new Map();
  private auditLogs: Map<string, AuditLog> = new Map();

  constructor() {
    this.seedData();
  }

  private async seedData() {
    // Create admin user
    const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
    const adminUser: User = {
      id: randomUUID(),
      username: "admin",
      email: "bellapokerstars@gmail.com",
      passwordHash: adminPasswordHash,
      avatarUrl: null,
      role: "admin",
      status: "approved",
      gloryBalance: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(adminUser.id, adminUser);

    // Create sample approved users
    const users = [
      { username: "tbppworld", email: "tbppworld@gmail.com", gloryBalance: 0 },
      { username: "creative_legend", email: "legend@example.com", gloryBalance: 12380 },
      { username: "design_master", email: "master@example.com", gloryBalance: 8450 },
      { username: "pixel_wizard", email: "wizard@example.com", gloryBalance: 7920 },
      { username: "art_jones", email: "jones@example.com", gloryBalance: 6850 },
      { username: "video_king", email: "king@example.com", gloryBalance: 5420 }
    ];

    for (const userData of users) {
      const passwordHash = await bcrypt.hash("password123", 10);
      const user: User = {
        id: randomUUID(),
        username: userData.username,
        email: userData.email,
        passwordHash,
        avatarUrl: null,
        role: "user",
        status: "approved",
        gloryBalance: userData.gloryBalance,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date()
      };
      this.users.set(user.id, user);
    }

    // Create active contest
    const contest: Contest = {
      id: randomUUID(),
      title: "Weekly Top 5 Challenge",
      slug: "weekly-top-5",
      description: "Submit your best creative work this week! Top 5 submissions share a prize pool of 1,000 GLORY points.",
      rules: "Submit original artwork only (images or videos up to 100MB). One submission per user per contest. Voting ends when the contest timer reaches zero. Top 5 submissions win GLORY: 40%, 25%, 15%, 10%, 10%. Admin approval required before submissions are visible.",
      coverImageUrl: null,
      status: "active",
      prizeGlory: 1000,
      startAt: new Date(),
      endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      config: {
        votesPerUserPerPeriod: 1,
        periodDurationHours: 24,
        totalVotesPerUser: 0
      },
      createdAt: new Date()
    };
    this.contests.set(contest.id, contest);
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      avatarUrl: insertUser.avatarUrl || null,
      role: insertUser.role || "user",
      status: insertUser.status || "pending",
      gloryBalance: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
    // Cascade delete related data
    Array.from(this.submissions.values())
      .filter(s => s.userId === id)
      .forEach(s => this.submissions.delete(s.id));
    Array.from(this.votes.values())
      .filter(v => v.userId === id)
      .forEach(v => this.votes.delete(v.id));
    Array.from(this.gloryLedger.values())
      .filter(g => g.userId === id)
      .forEach(g => this.gloryLedger.delete(g.id));
    Array.from(this.auditLogs.values())
      .filter(a => a.actorUserId === id)
      .forEach(a => this.auditLogs.delete(a.id));
  }

  async getUsersWithFilters(filters: { status?: string; role?: string }): Promise<UserWithStats[]> {
    const users = Array.from(this.users.values());
    let filtered = users;

    if (filters.status) {
      filtered = filtered.filter(user => user.status === filters.status);
    }
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }

    return filtered.map(user => ({
      ...user,
      submissionCount: Array.from(this.submissions.values()).filter(s => s.userId === user.id).length,
      totalVotes: Array.from(this.submissions.values())
        .filter(s => s.userId === user.id)
        .reduce((sum, s) => sum + s.votesCount, 0),
      contestWins: 0 // TODO: implement win tracking
    }));
  }

  async getUsersByIds(ids: string[]): Promise<User[]> {
    return ids.map(id => this.users.get(id)).filter((u): u is User => u !== undefined);
  }

  async bulkDeleteUsers(ids: string[]): Promise<number> {
    let deletedCount = 0;
    
    for (const userId of ids) {
      if (this.users.has(userId)) {
        // Delete user's submissions
        const userSubmissions = Array.from(this.submissions.values()).filter(s => s.userId === userId);
        for (const submission of userSubmissions) {
          this.submissions.delete(submission.id);
          // Delete votes on this submission
          Array.from(this.votes.keys()).forEach(voteId => {
            const vote = this.votes.get(voteId);
            if (vote && vote.submissionId === submission.id) {
              this.votes.delete(voteId);
            }
          });
        }
        
        // Delete user's votes
        Array.from(this.votes.keys()).forEach(voteId => {
          const vote = this.votes.get(voteId);
          if (vote && vote.userId === userId) {
            this.votes.delete(voteId);
          }
        });
        
        // Delete user's glory ledger entries
        Array.from(this.gloryLedger.keys()).forEach(ledgerId => {
          const entry = this.gloryLedger.get(ledgerId);
          if (entry && entry.userId === userId) {
            this.gloryLedger.delete(ledgerId);
          }
        });
        
        // Finally delete the user
        this.users.delete(userId);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  // Contests
  async getContest(id: string): Promise<Contest | undefined> {
    return this.contests.get(id);
  }

  async getContestBySlug(slug: string): Promise<Contest | undefined> {
    return Array.from(this.contests.values()).find(contest => contest.slug === slug);
  }

  async getContests(filters?: { status?: string }): Promise<ContestWithStats[]> {
    let contests = Array.from(this.contests.values());
    
    if (filters?.status) {
      contests = contests.filter(contest => contest.status === filters.status);
    }

    return contests.map(contest => {
      const submissions = Array.from(this.submissions.values()).filter(s => s.contestId === contest.id);
      const approvedSubmissions = submissions.filter(s => s.status === 'approved');
      const uniqueUsers = new Set(submissions.map(s => s.userId));
      
      // Find top submission by votes (for cover image)
      const topSubmission = approvedSubmissions.length > 0
        ? approvedSubmissions.reduce((top, current) => 
            current.votesCount > top.votesCount ? current : top
          )
        : null;
      
      return {
        ...contest,
        submissionCount: submissions.length,
        participantCount: uniqueUsers.size,
        totalVotes: submissions.reduce((sum, s) => sum + s.votesCount, 0),
        topSubmissionImageUrl: topSubmission?.mediaUrl || null
      };
    });
  }

  async createContest(insertContest: InsertContest): Promise<Contest> {
    const id = randomUUID();
    const contest: Contest = {
      ...insertContest,
      id,
      status: insertContest.status || "draft",
      coverImageUrl: insertContest.coverImageUrl || null,
      prizeGlory: insertContest.prizeGlory || 0,
      config: insertContest.config || null,
      createdAt: new Date()
    };
    this.contests.set(id, contest);
    return contest;
  }

  async updateContest(id: string, updates: Partial<Contest>): Promise<Contest | undefined> {
    const contest = this.contests.get(id);
    if (!contest) return undefined;
    
    const updatedContest = { ...contest, ...updates };
    this.contests.set(id, updatedContest);
    return updatedContest;
  }

  async deleteContest(id: string): Promise<boolean> {
    return this.contests.delete(id);
  }

  // Submissions
  async getSubmission(id: string): Promise<Submission | undefined> {
    return this.submissions.get(id);
  }

  async getSubmissions(filters: { contestId?: string; userId?: string; status?: string; page?: number; limit?: number }): Promise<SubmissionWithUser[]> {
    let submissions = Array.from(this.submissions.values());
    
    if (filters.contestId) {
      submissions = submissions.filter(s => s.contestId === filters.contestId);
    }
    if (filters.userId) {
      submissions = submissions.filter(s => s.userId === filters.userId);
    }
    if (filters.status) {
      submissions = submissions.filter(s => s.status === filters.status);
    }

    // Sort by creation date (newest first)
    submissions = submissions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    const paginatedSubmissions = submissions.slice(offset, offset + limit);

    return paginatedSubmissions.map(submission => {
        const user = this.users.get(submission.userId)!;
        const contest = submission.contestId ? this.contests.get(submission.contestId) : null;
        
        return {
          ...submission,
          user: { id: user.id, username: user.username },
          contest: contest ? { id: contest.id, title: contest.title } : { id: '', title: submission.contestName || 'Deleted Contest' }
        };
      });
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const id = randomUUID();
    const submission: Submission = {
      ...insertSubmission,
      id,
      status: insertSubmission.status || "pending",
      description: insertSubmission.description || null,
      contestId: insertSubmission.contestId || null,
      contestName: insertSubmission.contestName || null,
      thumbnailUrl: insertSubmission.thumbnailUrl || null,
      tags: insertSubmission.tags || null,
      cloudinaryPublicId: insertSubmission.cloudinaryPublicId || null,
      cloudinaryResourceType: insertSubmission.cloudinaryResourceType || null,
      votesCount: 0,
      createdAt: new Date()
    };
    this.submissions.set(id, submission);
    return submission;
  }

  async updateSubmission(id: string, updates: Partial<Submission>): Promise<Submission | undefined> {
    const submission = this.submissions.get(id);
    if (!submission) return undefined;
    
    const updatedSubmission = { ...submission, ...updates };
    this.submissions.set(id, updatedSubmission);
    return updatedSubmission;
  }

  async deleteSubmission(id: string): Promise<boolean> {
    return this.submissions.delete(id);
  }

  async getTopSubmissionsByContest(contestId: string, limit = 10): Promise<SubmissionWithUser[]> {
    const submissions = await this.getSubmissions({ contestId, status: "approved" });
    return submissions
      .sort((a, b) => b.votesCount - a.votesCount)
      .slice(0, limit);
  }

  async getUserSubmissionsInContest(userId: string, contestId: string): Promise<number> {
    return Array.from(this.submissions.values()).filter(
      submission => submission.userId === userId && submission.contestId === contestId
    ).length;
  }

  // Votes
  async getVote(userId: string, submissionId: string): Promise<Vote | undefined> {
    return Array.from(this.votes.values()).find(
      vote => vote.userId === userId && vote.submissionId === submissionId
    );
  }

  async createVote(insertVote: InsertVote): Promise<Vote> {
    const id = randomUUID();
    const vote: Vote = {
      ...insertVote,
      id,
      createdAt: new Date()
    };
    this.votes.set(id, vote);

    // Update submission vote count
    const submission = this.submissions.get(insertVote.submissionId);
    if (submission) {
      submission.votesCount += 1;
      this.submissions.set(submission.id, submission);
    }

    return vote;
  }

  async getVoteCountByUser(userId: string, since: Date): Promise<number> {
    return Array.from(this.votes.values()).filter(
      vote => vote.userId === userId && vote.createdAt >= since
    ).length;
  }

  async getVoteCountForSubmissionInPeriod(userId: string, submissionId: string, since: Date): Promise<number> {
    return Array.from(this.votes.values()).filter(
      vote => vote.userId === userId && vote.submissionId === submissionId && vote.createdAt >= since
    ).length;
  }

  async getUserTotalVotesInContest(userId: string, contestId: string): Promise<number> {
    const contestSubmissions = Array.from(this.submissions.values()).filter(
      submission => submission.contestId === contestId
    );
    const submissionIds = contestSubmissions.map(s => s.id);
    
    return Array.from(this.votes.values()).filter(
      vote => vote.userId === userId && submissionIds.includes(vote.submissionId)
    ).length;
  }

  // Glory Ledger
  async createGloryTransaction(insertTransaction: InsertGloryLedger): Promise<GloryLedger> {
    const id = randomUUID();
    const transaction: GloryLedger = {
      ...insertTransaction,
      id,
      contestId: insertTransaction.contestId || null,
      submissionId: insertTransaction.submissionId || null,
      createdAt: new Date()
    };
    this.gloryLedger.set(id, transaction);
    
    // Update user balance
    await this.updateUserGloryBalance(transaction.userId, transaction.delta);
    
    return transaction;
  }

  async getGloryTransactions(userId: string): Promise<GloryLedger[]> {
    return Array.from(this.gloryLedger.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async clearGloryTransactions(userId: string): Promise<void> {
    // Delete all transactions for this user
    const userTransactions = Array.from(this.gloryLedger.entries())
      .filter(([_, transaction]) => transaction.userId === userId);
    
    for (const [id, _] of userTransactions) {
      this.gloryLedger.delete(id);
    }
  }

  async updateUserGloryBalance(userId: string, delta: number): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      user.gloryBalance += delta;
      user.updatedAt = new Date();
      this.users.set(userId, user);
    }
  }

  // Audit Log
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const log: AuditLog = {
      ...insertLog,
      id,
      meta: insertLog.meta || null,
      createdAt: new Date()
    };
    this.auditLogs.set(id, log);
    return log;
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async clearAuditLogs(): Promise<void> {
    this.auditLogs.clear();
  }

  // Contest distribution
  async distributeContestRewards(contestId: string): Promise<void> {
    const contest = this.contests.get(contestId);
    
    if (!contest || contest.status !== "active") {
      return;
    }

    // Get prize distribution from config (fixed amounts) or use default percentages
    const config = contest.config as any;
    let prizes: number[] = [];
    
    if (config?.prizeDistribution && Array.isArray(config.prizeDistribution)) {
      // Use fixed prize amounts from config
      prizes = config.prizeDistribution
        .map((p: any) => Number(p.value))
        .filter((v: number) => !isNaN(v) && v > 0);
    } else {
      // Fallback to percentage-based distribution
      const defaultPercentages = [0.4, 0.25, 0.15, 0.1, 0.1];
      prizes = defaultPercentages.map(p => Math.floor(contest.prizeGlory * p));
    }

    // Get top N submissions based on number of prizes
    const topSubmissions = await this.getTopSubmissionsByContest(contestId, prizes.length);
    const numPrizes = Math.min(topSubmissions.length, prizes.length);
    
    for (let i = 0; i < numPrizes; i++) {
      const submission = topSubmissions[i];
      const prize = prizes[i];
      
      // Create glory transaction
      await this.createGloryTransaction({
        userId: submission.userId,
        delta: prize,
        reason: `Contest Prize - ${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Place`,
        contestId: contestId,
        submissionId: submission.id
      });
    }

    // Update contest status to ended
    contest.status = "ended";
    this.contests.set(contestId, contest);
  }

  // User Wallets (MemStorage - not used in production)
  async getUserWallet(userId: string): Promise<UserWallet | undefined> {
    throw new Error("MemStorage wallet methods not implemented");
  }

  async getUserWalletByAddress(address: string): Promise<UserWallet | undefined> {
    throw new Error("MemStorage wallet methods not implemented");
  }

  async createUserWallet(wallet: InsertUserWallet): Promise<UserWallet> {
    throw new Error("MemStorage wallet methods not implemented");
  }

  async updateUserWallet(id: string, updates: Partial<UserWallet>): Promise<UserWallet | undefined> {
    throw new Error("MemStorage wallet methods not implemented");
  }

  // Cashout Requests (MemStorage - not used in production)
  async getCashoutRequest(id: string): Promise<CashoutRequest | undefined> {
    throw new Error("MemStorage cashout methods not implemented");
  }

  async getCashoutRequests(filters?: { userId?: string; status?: string }): Promise<CashoutRequestWithRelations[]> {
    throw new Error("MemStorage cashout methods not implemented");
  }

  async createCashoutRequest(request: InsertCashoutRequest): Promise<CashoutRequest> {
    throw new Error("MemStorage cashout methods not implemented");
  }

  async updateCashoutRequest(id: string, updates: Partial<CashoutRequest>): Promise<CashoutRequest | undefined> {
    throw new Error("MemStorage cashout methods not implemented");
  }

  // Cashout Events (MemStorage - not used in production)
  async createCashoutEvent(event: InsertCashoutEvent): Promise<CashoutEvent> {
    throw new Error("MemStorage cashout methods not implemented");
  }

  async getCashoutEvents(cashoutRequestId: string): Promise<CashoutEvent[]> {
    throw new Error("MemStorage cashout methods not implemented");
  }
}

export class DbStorage implements IStorage {
  constructor() {
    this.seedDatabase().catch(err => {
      console.error("[DB] Failed to seed database:", err);
    });
  }

  private async seedDatabase() {
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.email, "bellapokerstars@gmail.com")
    });

    if (!existingAdmin) {
      const adminPasswordHash = await bcrypt.hash("Admin123!", 10);
      await db.insert(users).values({
        username: "admin",
        email: "bellapokerstars@gmail.com",
        passwordHash: adminPasswordHash,
        role: "admin",
        status: "approved",
        gloryBalance: 0
      });
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id)
    });
    return result;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    return result;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    return result;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user as User;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
    // Cascade delete is handled by database constraints
  }

  async getUsersWithFilters(filters: { status?: string; role?: string }): Promise<UserWithStats[]> {
    const conditions = [];
    if (filters.status) conditions.push(eq(users.status, filters.status));
    if (filters.role) conditions.push(eq(users.role, filters.role));

    const usersData = await db.query.users.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined
    });

    const result: UserWithStats[] = [];
    for (const user of usersData) {
      const submissionCount = await db.select({ count: count() })
        .from(submissions)
        .where(eq(submissions.userId, user.id));
      
      const totalVotesResult = await db.select({ total: sum(submissions.votesCount) })
        .from(submissions)
        .where(eq(submissions.userId, user.id));

      result.push({
        ...user,
        submissionCount: submissionCount[0]?.count || 0,
        totalVotes: Number(totalVotesResult[0]?.total) || 0,
        contestWins: 0
      });
    }

    return result;
  }

  async getUsersByIds(ids: string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    
    const result = await db.query.users.findMany({
      where: inArray(users.id, ids)
    });
    return result;
  }

  async bulkDeleteUsers(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    try {
      // Since neon-http doesn't support transactions, we'll delete in proper order
      // to maintain referential integrity as much as possible
      
      // Get user submissions to delete associated votes
      const userSubmissions = await db.select({ id: submissions.id })
        .from(submissions)
        .where(inArray(submissions.userId, ids));

      const submissionIds = userSubmissions.map(s => s.id);

      // Delete votes on user submissions first
      if (submissionIds.length > 0) {
        await db.delete(votes)
          .where(inArray(votes.submissionId, submissionIds));
      }

      // Delete user votes
      await db.delete(votes)
        .where(inArray(votes.userId, ids));

      // Delete cashout events (via cashout requests first)
      const userCashoutRequests = await db.select({ id: cashoutRequests.id })
        .from(cashoutRequests)
        .where(inArray(cashoutRequests.userId, ids));
      
      const cashoutRequestIds = userCashoutRequests.map(r => r.id);
      if (cashoutRequestIds.length > 0) {
        await db.delete(cashoutEvents)
          .where(inArray(cashoutEvents.cashoutRequestId, cashoutRequestIds));
      }

      // Delete cashout requests
      await db.delete(cashoutRequests)
        .where(inArray(cashoutRequests.userId, ids));

      // Delete user wallets
      await db.delete(userWallets)
        .where(inArray(userWallets.userId, ids));

      // Delete glory ledger entries
      await db.delete(gloryLedger)
        .where(inArray(gloryLedger.userId, ids));

      // Delete submissions
      await db.delete(submissions)
        .where(inArray(submissions.userId, ids));

      // Finally delete users
      const result = await db.delete(users)
        .where(inArray(users.id, ids));

      return result.rowCount || 0;
    } catch (error) {
      console.error('Error in bulkDeleteUsers:', error);
      throw error;
    }
  }

  async getContest(id: string): Promise<Contest | undefined> {
    const result = await db.query.contests.findFirst({
      where: eq(contests.id, id)
    });
    return result;
  }

  async getContestBySlug(slug: string): Promise<Contest | undefined> {
    const result = await db.query.contests.findFirst({
      where: eq(contests.slug, slug)
    });
    return result;
  }

  async getContests(filters?: { status?: string }): Promise<ContestWithStats[]> {
    const contestsData = await db.query.contests.findMany({
      where: filters?.status ? eq(contests.status, filters.status) : undefined
    });

    const result: ContestWithStats[] = [];
    for (const contest of contestsData) {
      const submissionCount = await db.select({ count: count() })
        .from(submissions)
        .where(eq(submissions.contestId, contest.id));
      
      const participantCount = await db.select({ count: countDistinct(submissions.userId) })
        .from(submissions)
        .where(eq(submissions.contestId, contest.id));
      
      const totalVotesResult = await db.select({ total: sum(submissions.votesCount) })
        .from(submissions)
        .where(eq(submissions.contestId, contest.id));

      // Get top submission image (highest voted approved submission)
      const topSubmission = await db.query.submissions.findFirst({
        where: and(
          eq(submissions.contestId, contest.id),
          eq(submissions.status, 'approved')
        ),
        orderBy: [desc(submissions.votesCount)],
        columns: { mediaUrl: true }
      });

      result.push({
        ...contest,
        submissionCount: submissionCount[0]?.count || 0,
        participantCount: participantCount[0]?.count || 0,
        totalVotes: Number(totalVotesResult[0]?.total) || 0,
        topSubmissionImageUrl: topSubmission?.mediaUrl || null
      });
    }

    return result;
  }

  async createContest(insertContest: InsertContest): Promise<Contest> {
    const [contest] = await db.insert(contests).values(insertContest).returning();
    return contest as Contest;
  }

  async updateContest(id: string, updates: Partial<Contest>): Promise<Contest | undefined> {
    const [contest] = await db.update(contests)
      .set(updates)
      .where(eq(contests.id, id))
      .returning();
    return contest;
  }

  async deleteContest(id: string): Promise<boolean> {
    const result = await db.delete(contests)
      .where(eq(contests.id, id));
    return true;
  }

  async getSubmission(id: string): Promise<Submission | undefined> {
    const result = await db.query.submissions.findFirst({
      where: eq(submissions.id, id)
    });
    return result;
  }

  async getSubmissions(filters: { contestId?: string; userId?: string; status?: string; page?: number; limit?: number }): Promise<SubmissionWithUser[]> {
    const conditions = [];
    if (filters.contestId) conditions.push(eq(submissions.contestId, filters.contestId));
    if (filters.userId) conditions.push(eq(submissions.userId, filters.userId));
    if (filters.status) conditions.push(eq(submissions.status, filters.status));

    // Calculate pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const submissionsData = await db.query.submissions.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(submissions.createdAt)],
      limit: limit,
      offset: offset
    });

    const result: SubmissionWithUser[] = [];
    for (const submission of submissionsData) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, submission.userId),
        columns: { id: true, username: true }
      });
      
      let contest = null;
      if (submission.contestId) {
        contest = await db.query.contests.findFirst({
          where: eq(contests.id, submission.contestId),
          columns: { id: true, title: true }
        });
      }
      
      if (user) {
        result.push({
          ...submission,
          user,
          contest: contest || { id: '', title: submission.contestName || 'Deleted Contest' }
        });
      }
    }

    return result;
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const [submission] = await db.insert(submissions).values(insertSubmission).returning();
    return submission as Submission;
  }

  async updateSubmission(id: string, updates: Partial<Submission>): Promise<Submission | undefined> {
    const [submission] = await db.update(submissions)
      .set(updates)
      .where(eq(submissions.id, id))
      .returning();
    return submission;
  }

  async deleteSubmission(id: string): Promise<boolean> {
    const result = await db.delete(submissions)
      .where(eq(submissions.id, id));
    return true;
  }

  async getTopSubmissionsByContest(contestId: string, limit = 10): Promise<SubmissionWithUser[]> {
    const submissionsData = await db.query.submissions.findMany({
      where: and(
        eq(submissions.contestId, contestId),
        eq(submissions.status, "approved")
      ),
      orderBy: [desc(submissions.votesCount)],
      limit
    });

    const result: SubmissionWithUser[] = [];
    for (const submission of submissionsData) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, submission.userId),
        columns: { id: true, username: true }
      });
      
      let contest = null;
      if (submission.contestId) {
        contest = await db.query.contests.findFirst({
          where: eq(contests.id, submission.contestId),
          columns: { id: true, title: true }
        });
      }
      
      if (user) {
        result.push({
          ...submission,
          user,
          contest: contest || { id: '', title: 'No Contest' }
        });
      }
    }

    return result;
  }

  async getUserSubmissionsInContest(userId: string, contestId: string): Promise<number> {
    const result = await db.select({ count: count() })
      .from(submissions)
      .where(and(
        eq(submissions.userId, userId),
        eq(submissions.contestId, contestId)
      ));
    
    return result[0]?.count || 0;
  }

  async getVote(userId: string, submissionId: string): Promise<Vote | undefined> {
    const result = await db.query.votes.findFirst({
      where: and(
        eq(votes.userId, userId),
        eq(votes.submissionId, submissionId)
      )
    });
    return result;
  }

  async createVote(insertVote: InsertVote): Promise<Vote> {
    const [vote] = await db.insert(votes).values(insertVote).returning();
    
    await db.update(submissions)
      .set({ votesCount: sql`${submissions.votesCount} + 1` })
      .where(eq(submissions.id, insertVote.submissionId));

    return vote;
  }

  async getVoteCountByUser(userId: string, since: Date): Promise<number> {
    const result = await db.select({ count: count() })
      .from(votes)
      .where(and(
        eq(votes.userId, userId),
        sql`${votes.createdAt} >= ${since}`
      ));
    
    return result[0]?.count || 0;
  }

  async getVoteCountForSubmissionInPeriod(userId: string, submissionId: string, since: Date): Promise<number> {
    const result = await db.select({ count: count() })
      .from(votes)
      .where(and(
        eq(votes.userId, userId),
        eq(votes.submissionId, submissionId),
        sql`${votes.createdAt} >= ${since}`
      ));
    
    return result[0]?.count || 0;
  }

  async getUserTotalVotesInContest(userId: string, contestId: string): Promise<number> {
    const result = await db.select({ count: count() })
      .from(votes)
      .innerJoin(submissions, eq(votes.submissionId, submissions.id))
      .where(and(
        eq(votes.userId, userId),
        eq(submissions.contestId, contestId)
      ));
    
    return result[0]?.count || 0;
  }

  async createGloryTransaction(insertTransaction: InsertGloryLedger): Promise<GloryLedger> {
    const [transaction] = await db.insert(gloryLedger).values(insertTransaction).returning();
    
    await this.updateUserGloryBalance(transaction.userId, transaction.delta);
    
    return transaction as GloryLedger;
  }

  async getGloryTransactions(userId: string): Promise<GloryLedger[]> {
    const result = await db.query.gloryLedger.findMany({
      where: eq(gloryLedger.userId, userId),
      orderBy: [desc(gloryLedger.createdAt)]
    });
    return result;
  }

  async clearGloryTransactions(userId: string): Promise<void> {
    await db.delete(gloryLedger).where(eq(gloryLedger.userId, userId));
  }

  async updateUserGloryBalance(userId: string, delta: number): Promise<void> {
    await db.update(users)
      .set({ 
        gloryBalance: sql`${users.gloryBalance} + ${delta}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLog).values(insertLog).returning();
    return log as AuditLog;
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    const result = await db.query.auditLog.findMany({
      orderBy: [desc(auditLog.createdAt)],
      limit
    });
    return result;
  }

  async clearAuditLogs(): Promise<void> {
    await db.delete(auditLog);
  }

  async distributeContestRewards(contestId: string): Promise<void> {
    // Note: Can't use db.transaction with neon-http driver
    const contest = await db.query.contests.findFirst({
      where: eq(contests.id, contestId)
    });
    
    if (!contest) {
      throw new Error("Contest not found");
    }

    if (contest.status === "ended") {
      throw new Error("Contest has already ended");
    }

    if (contest.status !== "active") {
      throw new Error("Contest is not active");
    }

    // Get prize distribution from config (fixed amounts) or use default percentages
    const config = contest.config as any;
    let prizes: number[] = [];
    
    if (config?.prizeDistribution && Array.isArray(config.prizeDistribution)) {
      // Use fixed prize amounts from config
      prizes = config.prizeDistribution
        .map((p: any) => Number(p.value))
        .filter((v: number) => !isNaN(v) && v > 0);
    } else {
      // Fallback to percentage-based distribution
      const defaultPercentages = [0.4, 0.25, 0.15, 0.1, 0.1];
      prizes = defaultPercentages.map(p => Math.floor(contest.prizeGlory * p));
    }

    // Get top N submissions based on number of prizes
    const topSubmissionsData = await db.query.submissions.findMany({
      where: and(
        eq(submissions.contestId, contestId),
        eq(submissions.status, "approved")
      ),
      orderBy: [desc(submissions.votesCount)],
      limit: prizes.length
    });
    
    if (topSubmissionsData.length === 0) {
      await db.update(contests)
        .set({ status: "ended" })
        .where(eq(contests.id, contestId));
      return;
    }
    
    const numPrizes = Math.min(topSubmissionsData.length, prizes.length);
    
    // Batch prepare all ledger entries and user updates
    const ledgerEntries = [];
    const userUpdates = [];
    
    // Check for existing ledger entries in one query
    const existingLedgers = await db.query.gloryLedger.findMany({
      where: and(
        eq(gloryLedger.contestId, contestId),
        inArray(gloryLedger.submissionId, topSubmissionsData.map(s => s.id))
      )
    });
    
    const existingSubmissionIds = new Set(existingLedgers.map(l => l.submissionId));
    
    for (let i = 0; i < numPrizes; i++) {
      const submission = topSubmissionsData[i];
      const prize = prizes[i];
      
      // Skip if already awarded
      if (existingSubmissionIds.has(submission.id)) {
        continue;
      }

      ledgerEntries.push({
        userId: submission.userId,
        delta: prize,
        reason: `Contest Prize - ${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Place`,
        contestId: contestId,
        submissionId: submission.id
      });
      
      userUpdates.push({
        userId: submission.userId,
        prize: prize
      });
    }

    // Batch insert ledger entries (single query)
    if (ledgerEntries.length > 0) {
      await db.insert(gloryLedger).values(ledgerEntries).onConflictDoNothing();
      
      // Update user balances (unfortunately needs to be individual queries)
      for (const update of userUpdates) {
        await db.update(users)
          .set({ 
            gloryBalance: sql`${users.gloryBalance} + ${update.prize}`,
            updatedAt: new Date()
          })
          .where(eq(users.id, update.userId));
      }
    }

    // Only end contest if we actually awarded new prizes
    if (ledgerEntries.length > 0) {
      await db.update(contests)
        .set({ status: "ended" })
        .where(eq(contests.id, contestId));
    }
  }

  // User Wallets
  async getUserWallet(userId: string): Promise<UserWallet | undefined> {
    const result = await db.query.userWallets.findFirst({
      where: eq(userWallets.userId, userId)
    });
    return result;
  }

  async getUserWalletByAddress(address: string): Promise<UserWallet | undefined> {
    const result = await db.query.userWallets.findFirst({
      where: eq(userWallets.address, address)
    });
    return result;
  }

  async createUserWallet(wallet: InsertUserWallet): Promise<UserWallet> {
    const [newWallet] = await db.insert(userWallets).values(wallet).returning();
    return newWallet as UserWallet;
  }

  async updateUserWallet(id: string, updates: Partial<UserWallet>): Promise<UserWallet | undefined> {
    const [wallet] = await db.update(userWallets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userWallets.id, id))
      .returning();
    return wallet;
  }

  // Cashout Requests
  async getCashoutRequest(id: string): Promise<CashoutRequest | undefined> {
    const result = await db.query.cashoutRequests.findFirst({
      where: eq(cashoutRequests.id, id)
    });
    return result;
  }

  async getCashoutRequests(filters?: { userId?: string; status?: string }): Promise<CashoutRequestWithRelations[]> {
    const conditions = [];
    if (filters?.userId) conditions.push(eq(cashoutRequests.userId, filters.userId));
    if (filters?.status) conditions.push(eq(cashoutRequests.status, filters.status));

    const result = await db.query.cashoutRequests.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(cashoutRequests.createdAt)],
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            email: true,
            gloryBalance: true
          }
        },
        wallet: {
          columns: {
            id: true,
            address: true,
            provider: true
          }
        }
      }
    });
    return result as CashoutRequestWithRelations[];
  }

  async createCashoutRequest(request: InsertCashoutRequest): Promise<CashoutRequest> {
    const [newRequest] = await db.insert(cashoutRequests).values(request).returning();
    return newRequest as CashoutRequest;
  }

  async updateCashoutRequest(id: string, updates: Partial<CashoutRequest>): Promise<CashoutRequest | undefined> {
    const [request] = await db.update(cashoutRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cashoutRequests.id, id))
      .returning();
    return request;
  }

  // Cashout Events
  async createCashoutEvent(event: InsertCashoutEvent): Promise<CashoutEvent> {
    const [newEvent] = await db.insert(cashoutEvents).values(event).returning();
    return newEvent as CashoutEvent;
  }

  async getCashoutEvents(cashoutRequestId: string): Promise<CashoutEvent[]> {
    const result = await db.query.cashoutEvents.findMany({
      where: eq(cashoutEvents.cashoutRequestId, cashoutRequestId),
      orderBy: [desc(cashoutEvents.createdAt)]
    });
    return result;
  }
}

export const storage = new DbStorage();
