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
  type SubmissionWithUser,
  type ContestWithStats,
  type UserWithStats,
  users,
  contests,
  submissions,
  votes,
  gloryLedger,
  auditLog
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, and, desc, sql, count, countDistinct, sum } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getUsersWithFilters(filters: { status?: string; role?: string }): Promise<UserWithStats[]>;
  
  // Contests
  getContest(id: string): Promise<Contest | undefined>;
  getContestBySlug(slug: string): Promise<Contest | undefined>;
  getContests(filters?: { status?: string }): Promise<ContestWithStats[]>;
  createContest(contest: InsertContest): Promise<Contest>;
  updateContest(id: string, updates: Partial<Contest>): Promise<Contest | undefined>;
  deleteContest(id: string): Promise<boolean>;
  
  // Submissions
  getSubmission(id: string): Promise<Submission | undefined>;
  getSubmissions(filters: { contestId?: string; userId?: string; status?: string }): Promise<SubmissionWithUser[]>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  updateSubmission(id: string, updates: Partial<Submission>): Promise<Submission | undefined>;
  deleteSubmission(id: string): Promise<boolean>;
  getTopSubmissionsByContest(contestId: string, limit?: number): Promise<SubmissionWithUser[]>;
  
  // Votes
  getVote(userId: string, submissionId: string): Promise<Vote | undefined>;
  createVote(vote: InsertVote): Promise<Vote>;
  getVoteCountByUser(userId: string, since: Date): Promise<number>;
  
  // Glory Ledger
  createGloryTransaction(transaction: InsertGloryLedger): Promise<GloryLedger>;
  getGloryTransactions(userId: string): Promise<GloryLedger[]>;
  updateUserGloryBalance(userId: string, delta: number): Promise<void>;
  
  // Audit Log
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  
  // Leaderboard
  getLeaderboard(limit?: number): Promise<UserWithStats[]>;
  
  // Contest distribution
  distributeContestRewards(contestId: string): Promise<void>;
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
      startAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      endAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
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

  async getSubmissions(filters: { contestId?: string; userId?: string; status?: string }): Promise<SubmissionWithUser[]> {
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

    return submissions.map(submission => {
      const user = this.users.get(submission.userId)!;
      const contest = this.contests.get(submission.contestId)!;
      
      return {
        ...submission,
        user: { id: user.id, username: user.username },
        contest: { id: contest.id, title: contest.title }
      };
    });
  }

  async createSubmission(insertSubmission: InsertSubmission): Promise<Submission> {
    const id = randomUUID();
    const submission: Submission = {
      ...insertSubmission,
      id,
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

  // Glory Ledger
  async createGloryTransaction(insertTransaction: InsertGloryLedger): Promise<GloryLedger> {
    const id = randomUUID();
    const transaction: GloryLedger = {
      ...insertTransaction,
      id,
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

  // Leaderboard
  async getLeaderboard(limit = 20): Promise<UserWithStats[]> {
    const users = Array.from(this.users.values())
      .filter(user => user.status === "approved")
      .map(user => ({
        ...user,
        submissionCount: Array.from(this.submissions.values()).filter(s => s.userId === user.id).length,
        totalVotes: Array.from(this.submissions.values())
          .filter(s => s.userId === user.id)
          .reduce((sum, s) => sum + s.votesCount, 0),
        contestWins: 0 // TODO: implement win tracking
      }))
      .sort((a, b) => b.gloryBalance - a.gloryBalance)
      .slice(0, limit);

    return users;
  }

  // Contest distribution
  async distributeContestRewards(contestId: string): Promise<void> {
    const contest = this.contests.get(contestId);
    
    if (!contest || contest.status !== "active") {
      return;
    }

    // Get top 5 submissions
    const topSubmissions = await this.getTopSubmissionsByContest(contestId, 5);
    
    // Use custom prize distribution from config if available, otherwise use default
    const defaultPercentages = [0.4, 0.25, 0.15, 0.1, 0.1];
    let prizePercentages = defaultPercentages;
    
    if ((contest.config as any)?.prizeDistribution && Array.isArray((contest.config as any).prizeDistribution)) {
      const configPercentages = (contest.config as any).prizeDistribution
        .map((p: any) => {
          const num = Number(p);
          return isNaN(num) ? null : num / 100;
        })
        .filter((p: any) => p !== null);
      
      if (configPercentages.length === 5) {
        prizePercentages = configPercentages;
      }
    }
    
    for (let i = 0; i < Math.min(topSubmissions.length, 5); i++) {
      const submission = topSubmissions[i];
      const prize = Math.floor(contest.prizeGlory * prizePercentages[i]);
      
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
      console.log("[DB] Created admin user");
    }

    const existingContest = await db.query.contests.findFirst({
      where: eq(contests.slug, "weekly-top-5")
    });

    if (!existingContest) {
      await db.insert(contests).values({
        title: "Weekly Top 5 Challenge",
        slug: "weekly-top-5",
        description: "Submit your best creative work this week! Top 5 submissions share a prize pool of 1,000 GLORY points.",
        rules: "Submit original artwork only (images or videos up to 100MB). One submission per user per contest. Voting ends when the contest timer reaches zero. Top 5 submissions win GLORY: 40%, 25%, 15%, 10%, 10%. Admin approval required before submissions are visible.",
        coverImageUrl: null,
        status: "active",
        prizeGlory: 1000,
        startAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      });
      console.log("[DB] Created sample contest");
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

  async getSubmissions(filters: { contestId?: string; userId?: string; status?: string }): Promise<SubmissionWithUser[]> {
    const conditions = [];
    if (filters.contestId) conditions.push(eq(submissions.contestId, filters.contestId));
    if (filters.userId) conditions.push(eq(submissions.userId, filters.userId));
    if (filters.status) conditions.push(eq(submissions.status, filters.status));

    const submissionsData = await db.query.submissions.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined
    });

    const result: SubmissionWithUser[] = [];
    for (const submission of submissionsData) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, submission.userId),
        columns: { id: true, username: true }
      });
      const contest = await db.query.contests.findFirst({
        where: eq(contests.id, submission.contestId),
        columns: { id: true, title: true }
      });
      
      if (user && contest) {
        result.push({
          ...submission,
          user,
          contest
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
      const contest = await db.query.contests.findFirst({
        where: eq(contests.id, submission.contestId),
        columns: { id: true, title: true }
      });
      
      if (user && contest) {
        result.push({
          ...submission,
          user,
          contest
        });
      }
    }

    return result;
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
    try {
      const [vote] = await db.insert(votes).values(insertVote).returning();
      
      await db.update(submissions)
        .set({ votesCount: sql`${submissions.votesCount} + 1` })
        .where(eq(submissions.id, insertVote.submissionId));

      return vote;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new Error("You have already voted for this submission");
      }
      throw error;
    }
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

  async getLeaderboard(limit = 20): Promise<UserWithStats[]> {
    const usersData = await db.query.users.findMany({
      where: eq(users.status, "approved"),
      orderBy: [desc(users.gloryBalance)],
      limit
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

  async distributeContestRewards(contestId: string): Promise<void> {
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

    const topSubmissionsData = await db.query.submissions.findMany({
      where: and(
        eq(submissions.contestId, contestId),
        eq(submissions.status, "approved")
      ),
      orderBy: [desc(submissions.votesCount)],
      limit: 5
    });
    
    if (topSubmissionsData.length === 0) {
      console.log("No approved submissions found for contest", contestId);
      await db.update(contests)
        .set({ status: "ended" })
        .where(eq(contests.id, contestId));
      return;
    }
    
    // Use custom prize distribution from config if available, otherwise use default
    const defaultPercentages = [0.4, 0.25, 0.15, 0.1, 0.1];
    let prizePercentages = defaultPercentages;
    
    if ((contest.config as any)?.prizeDistribution && Array.isArray((contest.config as any).prizeDistribution)) {
      const configPercentages = (contest.config as any).prizeDistribution
        .map((p: any) => {
          const num = Number(p);
          return isNaN(num) ? null : num / 100;
        })
        .filter((p: any) => p !== null);
      
      if (configPercentages.length === 5) {
        prizePercentages = configPercentages;
      }
    }
    
    let awardedCount = 0;
    
    for (let i = 0; i < Math.min(topSubmissionsData.length, 5); i++) {
      const submission = topSubmissionsData[i];
      const prize = Math.floor(contest.prizeGlory * prizePercentages[i]);
      
      const user = await db.query.users.findFirst({
        where: eq(users.id, submission.userId)
      });

      if (!user) {
        console.error("User not found for submission:", submission.id);
        continue;
      }

      const existingLedger = await db.query.gloryLedger.findFirst({
        where: and(
          eq(gloryLedger.contestId, contestId),
          eq(gloryLedger.submissionId, submission.id)
        )
      });

      if (existingLedger) {
        console.log(`Reward already distributed for submission ${submission.id}, skipping`);
        awardedCount++;
        continue;
      }

      try {
        await db.insert(gloryLedger).values({
          userId: submission.userId,
          delta: prize,
          reason: `Contest Prize - ${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Place`,
          contestId: contestId,
          submissionId: submission.id
        }).onConflictDoNothing();

        await db.update(users)
          .set({ 
            gloryBalance: sql`${users.gloryBalance} + ${prize}`,
            updatedAt: new Date()
          })
          .where(eq(users.id, submission.userId));

        console.log(`Awarded ${prize} GLORY to user ${user.username} (${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} place)`);
        awardedCount++;
      } catch (error) {
        console.error(`Error awarding prize to user ${user.username}:`, error);
        throw error;
      }
    }

    if (awardedCount > 0 || topSubmissionsData.length > 0) {
      await db.update(contests)
        .set({ status: "ended" })
        .where(eq(contests.id, contestId));
      console.log(`Contest ${contestId} ended. Awarded GLORY to ${awardedCount} winners.`);
    }
  }
}

export const storage = new DbStorage();
