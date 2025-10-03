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
  type UserWithStats
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

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
  
  // Submissions
  getSubmission(id: string): Promise<Submission | undefined>;
  getSubmissions(filters: { contestId?: string; userId?: string; status?: string }): Promise<SubmissionWithUser[]>;
  createSubmission(submission: InsertSubmission): Promise<Submission>;
  updateSubmission(id: string, updates: Partial<Submission>): Promise<Submission | undefined>;
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
      const uniqueUsers = new Set(submissions.map(s => s.userId));
      
      return {
        ...contest,
        submissionCount: submissions.length,
        participantCount: uniqueUsers.size,
        totalVotes: submissions.reduce((sum, s) => sum + s.votesCount, 0)
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
    if (!contest || contest.status !== "active") return;

    // Get top 5 submissions
    const topSubmissions = await this.getTopSubmissionsByContest(contestId, 5);
    
    // Prize distribution: 40%, 25%, 15%, 10%, 10%
    const prizePercentages = [0.4, 0.25, 0.15, 0.1, 0.1];
    
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

export const storage = new MemStorage();
