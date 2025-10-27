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
  type SiteSettings,
  type InsertSiteSettings,
  type AiGeneration,
  type InsertAiGeneration,
  type PricingSetting,
  type InsertPricingSetting,
  type SubscriptionTier,
  type InsertSubscriptionTier,
  type UserSubscription,
  type InsertUserSubscription,
  type UserSubscriptionWithTier,
  type SubscriptionTransaction,
  type InsertSubscriptionTransaction,
  type PurchasedPrompt,
  type InsertPurchasedPrompt,
  type Image,
  type InsertImage,
  type ImageVersion,
  type InsertImageVersion,
  type EditJob,
  type InsertEditJob,
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
  cashoutEvents,
  siteSettings,
  aiGenerations,
  pricingSettings,
  subscriptionTiers,
  userSubscriptions,
  subscriptionTransactions,
  purchasedPrompts,
  images,
  imageVersions,
  editJobs
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, and, desc, sql, count, countDistinct, sum, inArray, gte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  updateWithdrawalAddress(userId: string, address: string): Promise<User | undefined>;
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
  getSubmissions(filters: { contestId?: string; userId?: string; status?: string; tag?: string; page?: number; limit?: number }): Promise<SubmissionWithUser[]>;
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
  getUserTotalVotesInContestInPeriod(userId: string, contestId: string, since: Date): Promise<number>;
  
  // Glory Ledger (now handles all currencies)
  createGloryTransaction(transaction: InsertGloryLedger): Promise<GloryLedger>;
  getGloryTransactions(userId: string, currency?: string): Promise<GloryLedger[]>;
  getGloryTransactionByHash(txHash: string): Promise<GloryLedger | undefined>;
  clearGloryTransactions(userId: string): Promise<void>;
  updateUserBalance(userId: string, delta: number, currency: string): Promise<void>;
  
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
  
  // Purchased Prompts
  purchasePrompt(userId: string, submissionId: string): Promise<PurchasedPrompt>;
  getPurchasedPrompts(userId: string): Promise<PurchasedPrompt[]>;
  checkIfPromptPurchased(userId: string, submissionId: string): Promise<boolean>;
  
  // Cashout Requests
  getCashoutRequest(id: string): Promise<CashoutRequest | undefined>;
  getCashoutRequests(filters?: { userId?: string; status?: string }): Promise<CashoutRequestWithRelations[]>;
  createCashoutRequest(request: InsertCashoutRequest): Promise<CashoutRequest>;
  updateCashoutRequest(id: string, updates: Partial<CashoutRequest>): Promise<CashoutRequest | undefined>;
  
  // Cashout Events
  createCashoutEvent(event: InsertCashoutEvent): Promise<CashoutEvent>;
  getCashoutEvents(cashoutRequestId: string): Promise<CashoutEvent[]>;
  
  // Site Settings
  getSiteSettings(): Promise<SiteSettings>;
  updateSiteSettings(updates: Partial<SiteSettings>): Promise<SiteSettings>;
  
  // AI Generations
  createAiGeneration(generation: InsertAiGeneration): Promise<AiGeneration>;
  getAiGeneration(id: string): Promise<AiGeneration | undefined>;
  getAiGenerations(userId: string, limit?: number): Promise<AiGeneration[]>;
  deleteAiGeneration(id: string): Promise<void>;
  updateAiGeneration(id: string, updates: Partial<AiGeneration>): Promise<AiGeneration | undefined>;
  
  // Image Credits
  getUserCredits(userId: string): Promise<number>;
  deductCredits(userId: string, amount: number): Promise<boolean>;
  addCredits(userId: string, amount: number): Promise<void>;
  
  // Pricing Settings
  getPricingSetting(key: string): Promise<number | undefined>;
  getAllPricingSettings(): Promise<Map<string, number>>;
  updatePricingSetting(key: string, value: number): Promise<void>;
  
  // Subscription Tiers
  getSubscriptionTiers(): Promise<SubscriptionTier[]>;
  getSubscriptionTier(id: string): Promise<SubscriptionTier | undefined>;
  getSubscriptionTierBySlug(slug: string): Promise<SubscriptionTier | undefined>;
  createSubscriptionTier(tier: InsertSubscriptionTier): Promise<SubscriptionTier>;
  updateSubscriptionTier(id: string, updates: Partial<SubscriptionTier>): Promise<SubscriptionTier | undefined>;
  deleteSubscriptionTier(id: string): Promise<void>;
  
  // User Subscriptions
  getUserSubscription(userId: string): Promise<UserSubscriptionWithTier | undefined>;
  getUserSubscriptionById(id: string): Promise<UserSubscriptionWithTier | undefined>;
  createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription>;
  updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined>;
  cancelUserSubscription(subscriptionId: string): Promise<void>;
  
  // Subscription Transactions
  createSubscriptionTransaction(transaction: InsertSubscriptionTransaction): Promise<SubscriptionTransaction>;
  getSubscriptionTransactions(filters: { userId?: string; subscriptionId?: string }): Promise<SubscriptionTransaction[]>;
  
  // Helper Methods
  canUserAccessModel(userId: string, modelSlug: string): Promise<boolean>;
  canUserEdit(userId: string): Promise<boolean>;
  canUserUpscale(userId: string): Promise<boolean>;
  getUserTierCommissions(userId: string): Promise<{ promptCommission: number; imageCommission: number }>;
  grantMonthlyCredits(userId: string): Promise<void>;
  refreshSubscriptionIfNeeded(userId: string): Promise<boolean>;
  
  // Pro Edit: Images
  createImage(image: InsertImage): Promise<Image>;
  getImage(id: string): Promise<Image | undefined>;
  getImagesByUserId(userId: string): Promise<Image[]>;
  updateImage(id: string, updates: Partial<Image>): Promise<Image | undefined>;
  
  // Pro Edit: Image Versions
  createImageVersion(version: InsertImageVersion): Promise<ImageVersion>;
  getImageVersion(id: string): Promise<ImageVersion | undefined>;
  getImageVersionsByImageId(imageId: string): Promise<ImageVersion[]>;
  getCurrentImageVersion(imageId: string): Promise<ImageVersion | undefined>;
  unsetCurrentVersions(imageId: string): Promise<void>; // Mark all versions as not current
  
  // Pro Edit: Edit Jobs
  createEditJob(job: InsertEditJob): Promise<EditJob>;
  getEditJob(id: string): Promise<EditJob | undefined>;
  getEditJobsByUserId(userId: string): Promise<EditJob[]>;
  getEditJobsByImageId(imageId: string): Promise<EditJob[]>;
  updateEditJob(id: string, updates: Partial<EditJob>): Promise<EditJob | undefined>;
  
  // Pro Edit: Credit Management
  refundAiCredits(userId: string, amount: number, reason: string, jobId: string): Promise<boolean>;
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
      solBalance: "0",
      usdcBalance: "0",
      imageCredits: 100,
      withdrawalAddress: null,
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
        solBalance: "0",
        usdcBalance: "0",
        imageCredits: 100,
        withdrawalAddress: null,
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
      prizeGlory: "1000",
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
      solBalance: "0",
      usdcBalance: "0",
      imageCredits: 100,
      withdrawalAddress: insertUser.withdrawalAddress || null,
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

  async updateWithdrawalAddress(userId: string, address: string): Promise<User | undefined> {
    return this.updateUser(userId, { withdrawalAddress: address });
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
      prizeGlory: insertContest.prizeGlory || "0",
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

  async getSubmissions(filters: { contestId?: string; userId?: string; status?: string; tag?: string; page?: number; limit?: number }): Promise<SubmissionWithUser[]> {
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
    if (filters.tag) {
      submissions = submissions.filter(s => s.tags && s.tags.some(t => t.toLowerCase().includes(filters.tag!.toLowerCase())));
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
      entryFeeAmount: insertSubmission.entryFeeAmount || null,
      entryFeeCurrency: insertSubmission.entryFeeCurrency || null,
      category: insertSubmission.category || null,
      aiModel: insertSubmission.aiModel || null,
      prompt: insertSubmission.prompt || null,
      generationId: insertSubmission.generationId || null,
      promptForSale: insertSubmission.promptForSale || false,
      promptPrice: insertSubmission.promptPrice || null,
      promptCurrency: insertSubmission.promptCurrency || null,
      votesCount: 0,
      isEnhanced: false,
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

  async getUserTotalVotesInContestInPeriod(userId: string, contestId: string, since: Date): Promise<number> {
    const contestSubmissions = Array.from(this.submissions.values()).filter(
      submission => submission.contestId === contestId
    );
    const submissionIds = contestSubmissions.map(s => s.id);
    
    return Array.from(this.votes.values()).filter(
      vote => vote.userId === userId && submissionIds.includes(vote.submissionId) && vote.createdAt >= since
    ).length;
  }

  // Glory Ledger
  async createGloryTransaction(insertTransaction: InsertGloryLedger): Promise<GloryLedger> {
    const id = randomUUID();
    const transaction: GloryLedger = {
      ...insertTransaction,
      id,
      currency: insertTransaction.currency || "GLORY",
      contestId: insertTransaction.contestId || null,
      submissionId: insertTransaction.submissionId || null,
      txHash: insertTransaction.txHash || null,
      metadata: insertTransaction.metadata || null,
      createdAt: new Date()
    };
    this.gloryLedger.set(id, transaction);
    
    // Update user balance
    await this.updateUserBalance(transaction.userId, transaction.delta, transaction.currency);
    
    return transaction;
  }

  async getGloryTransactions(userId: string, currency?: string): Promise<GloryLedger[]> {
    return Array.from(this.gloryLedger.values())
      .filter(transaction => 
        transaction.userId === userId && 
        (!currency || transaction.currency === currency)
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getGloryTransactionByHash(txHash: string): Promise<GloryLedger | undefined> {
    return Array.from(this.gloryLedger.values())
      .find(transaction => transaction.txHash === txHash);
  }

  async clearGloryTransactions(userId: string): Promise<void> {
    // Delete all transactions for this user
    const userTransactions = Array.from(this.gloryLedger.entries())
      .filter(([_, transaction]) => transaction.userId === userId);
    
    for (const [id, _] of userTransactions) {
      this.gloryLedger.delete(id);
    }
  }

  async updateUserBalance(userId: string, delta: string | number, currency: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      if (currency === "GLORY") {
        user.gloryBalance += typeof delta === 'string' ? Number(delta) : delta;
      } else if (currency === "SOL") {
        const currentBalance = Number(user.solBalance || "0");
        const deltaNum = typeof delta === 'string' ? Number(delta) : delta;
        user.solBalance = (currentBalance + deltaNum).toString();
      } else if (currency === "USDC") {
        const currentBalance = Number(user.usdcBalance || "0");
        const deltaNum = typeof delta === 'string' ? Number(delta) : delta;
        user.usdcBalance = (currentBalance + deltaNum).toString();
      }
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
    const currency = config?.currency || "GLORY";
    let prizes: number[] = [];
    
    if (config?.prizeDistribution && Array.isArray(config.prizeDistribution)) {
      // Use fixed prize amounts from config
      prizes = config.prizeDistribution
        .map((p: any) => Number(p.value))
        .filter((v: number) => !isNaN(v) && v > 0);
    } else {
      // Fallback to percentage-based distribution
      const defaultPercentages = [0.4, 0.25, 0.15, 0.1, 0.1];
      prizes = defaultPercentages.map(p => Math.floor(Number(contest.prizeGlory) * p));
    }

    // Get top N submissions based on number of prizes
    const topSubmissions = await this.getTopSubmissionsByContest(contestId, prizes.length);
    const numPrizes = Math.min(topSubmissions.length, prizes.length);
    
    for (let i = 0; i < numPrizes; i++) {
      const submission = topSubmissions[i];
      const prize = prizes[i];
      
      // Create transaction with the contest's currency
      await this.createGloryTransaction({
        userId: submission.userId,
        delta: prize.toString(),
        currency: currency,
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

  // Purchased Prompts (MemStorage - not used in production)
  async purchasePrompt(userId: string, submissionId: string): Promise<PurchasedPrompt> {
    throw new Error("MemStorage purchased prompts methods not implemented");
  }

  async getPurchasedPrompts(userId: string): Promise<PurchasedPrompt[]> {
    throw new Error("MemStorage purchased prompts methods not implemented");
  }

  async checkIfPromptPurchased(userId: string, submissionId: string): Promise<boolean> {
    throw new Error("MemStorage purchased prompts methods not implemented");
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

  // Site Settings (MemStorage - not used in production)
  async getSiteSettings(): Promise<SiteSettings> {
    throw new Error("MemStorage site settings methods not implemented");
  }

  async updateSiteSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
    throw new Error("MemStorage site settings methods not implemented");
  }

  // AI Generations (MemStorage - not used in production)
  async createAiGeneration(generation: InsertAiGeneration): Promise<AiGeneration> {
    throw new Error("MemStorage AI generation methods not implemented");
  }

  async getAiGeneration(id: string): Promise<AiGeneration | undefined> {
    throw new Error("MemStorage AI generation methods not implemented");
  }

  async getAiGenerations(userId: string, limit?: number): Promise<AiGeneration[]> {
    throw new Error("MemStorage AI generation methods not implemented");
  }

  async deleteAiGeneration(id: string): Promise<void> {
    throw new Error("MemStorage AI generation methods not implemented");
  }

  async updateAiGeneration(id: string, updates: Partial<AiGeneration>): Promise<AiGeneration | undefined> {
    throw new Error("MemStorage AI generation methods not implemented");
  }

  // Image Credits (MemStorage - not used in production)
  async getUserCredits(userId: string): Promise<number> {
    throw new Error("MemStorage credit methods not implemented");
  }

  async deductCredits(userId: string, amount: number): Promise<boolean> {
    throw new Error("MemStorage credit methods not implemented");
  }

  async addCredits(userId: string, amount: number): Promise<void> {
    throw new Error("MemStorage credit methods not implemented");
  }

  // Pricing Settings (MemStorage - not used in production)
  async getPricingSetting(key: string): Promise<number | undefined> {
    throw new Error("MemStorage pricing methods not implemented");
  }

  async getAllPricingSettings(): Promise<Map<string, number>> {
    throw new Error("MemStorage pricing methods not implemented");
  }

  async updatePricingSetting(key: string, value: number): Promise<void> {
    throw new Error("MemStorage pricing methods not implemented");
  }

  // Subscription Tiers (MemStorage - not used in production)
  async getSubscriptionTiers(): Promise<SubscriptionTier[]> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  async getSubscriptionTier(id: string): Promise<SubscriptionTier | undefined> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  async getSubscriptionTierBySlug(slug: string): Promise<SubscriptionTier | undefined> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  async createSubscriptionTier(tier: InsertSubscriptionTier): Promise<SubscriptionTier> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  async updateSubscriptionTier(id: string, updates: Partial<SubscriptionTier>): Promise<SubscriptionTier | undefined> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  async deleteSubscriptionTier(id: string): Promise<void> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  // User Subscriptions (MemStorage - not used in production)
  async getUserSubscription(userId: string): Promise<UserSubscriptionWithTier | undefined> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  async getUserSubscriptionById(id: string): Promise<UserSubscriptionWithTier | undefined> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  async updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  async cancelUserSubscription(subscriptionId: string): Promise<void> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  // Subscription Transactions (MemStorage - not used in production)
  async createSubscriptionTransaction(transaction: InsertSubscriptionTransaction): Promise<SubscriptionTransaction> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  async getSubscriptionTransactions(filters: { userId?: string; subscriptionId?: string }): Promise<SubscriptionTransaction[]> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  // Helper Methods (MemStorage - not used in production)
  async canUserAccessModel(userId: string, modelSlug: string): Promise<boolean> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  async canUserEdit(userId: string): Promise<boolean> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  async canUserUpscale(userId: string): Promise<boolean> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  async getUserTierCommissions(userId: string): Promise<{ promptCommission: number; imageCommission: number }> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  async grantMonthlyCredits(userId: string): Promise<void> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  async refreshSubscriptionIfNeeded(userId: string): Promise<boolean> {
    throw new Error("MemStorage subscription methods not implemented");
  }

  // Pro Edit methods (stub implementations - use DbStorage for Pro Edit)
  async createImage(image: InsertImage): Promise<Image> {
    throw new Error("MemStorage does not support Pro Edit - use DbStorage");
  }

  async getImage(id: string): Promise<Image | undefined> {
    throw new Error("MemStorage does not support Pro Edit - use DbStorage");
  }

  async getImagesByUserId(userId: string): Promise<Image[]> {
    throw new Error("MemStorage does not support Pro Edit - use DbStorage");
  }

  async updateImage(id: string, updates: Partial<Image>): Promise<Image | undefined> {
    throw new Error("MemStorage does not support Pro Edit - use DbStorage");
  }

  async createImageVersion(version: InsertImageVersion): Promise<ImageVersion> {
    throw new Error("MemStorage does not support Pro Edit - use DbStorage");
  }

  async getImageVersion(id: string): Promise<ImageVersion | undefined> {
    throw new Error("MemStorage does not support Pro Edit - use DbStorage");
  }

  async getImageVersionsByImageId(imageId: string): Promise<ImageVersion[]> {
    throw new Error("MemStorage does not support Pro Edit - use DbStorage");
  }

  async getCurrentImageVersion(imageId: string): Promise<ImageVersion | undefined> {
    throw new Error("MemStorage does not support Pro Edit - use DbStorage");
  }

  async unsetCurrentVersions(imageId: string): Promise<void> {
    throw new Error("MemStorage does not support Pro Edit - use DbStorage");
  }

  async createEditJob(job: InsertEditJob): Promise<EditJob> {
    throw new Error("MemStorage does not support Pro Edit - use DbStorage");
  }

  async getEditJob(id: string): Promise<EditJob | undefined> {
    throw new Error("MemStorage does not support Pro Edit - use DbStorage");
  }

  async getEditJobsByUserId(userId: string): Promise<EditJob[]> {
    throw new Error("MemStorage does not support Pro Edit - use DbStorage");
  }

  async getEditJobsByImageId(imageId: string): Promise<EditJob[]> {
    throw new Error("MemStorage does not support Pro Edit - use DbStorage");
  }

  async updateEditJob(id: string, updates: Partial<EditJob>): Promise<EditJob | undefined> {
    throw new Error("MemStorage does not support Pro Edit - use DbStorage");
  }

  async refundAiCredits(userId: string, amount: number, reason: string, jobId: string): Promise<boolean> {
    throw new Error("MemStorage does not support Pro Edit - use DbStorage");
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

    // Seed pricing settings if they don't exist
    const existingPricing = await db.query.pricingSettings.findFirst();
    if (!existingPricing) {
      const defaultPricing = [
        { key: "leonardo", value: 1 },
        { key: "nano-banana", value: 12 },
        { key: "flux-1.1-pro", value: 12 },
        { key: "sd-3.5-large", value: 20 },
        { key: "ideogram-v3", value: 27 },
        { key: "upscale", value: 5 }
      ];

      await db.insert(pricingSettings).values(defaultPricing);
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

  async updateWithdrawalAddress(userId: string, address: string): Promise<User | undefined> {
    return this.updateUser(userId, { withdrawalAddress: address });
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

  async getSubmissions(filters: { contestId?: string; userId?: string; status?: string; tag?: string; page?: number; limit?: number }): Promise<SubmissionWithUser[]> {
    const conditions = [];
    if (filters.contestId) conditions.push(eq(submissions.contestId, filters.contestId));
    if (filters.userId) conditions.push(eq(submissions.userId, filters.userId));
    if (filters.status) conditions.push(eq(submissions.status, filters.status));
    if (filters.tag) {
      // Check if any tag in the array contains the search string (case-insensitive)
      conditions.push(sql`EXISTS (SELECT 1 FROM unnest(${submissions.tags}) AS tag WHERE LOWER(tag) LIKE LOWER(${'%' + filters.tag + '%'}))`);
    }

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

  async getUserTotalVotesInContestInPeriod(userId: string, contestId: string, since: Date): Promise<number> {
    const result = await db.select({ count: count() })
      .from(votes)
      .innerJoin(submissions, eq(votes.submissionId, submissions.id))
      .where(and(
        eq(votes.userId, userId),
        eq(submissions.contestId, contestId),
        gte(votes.createdAt, since)
      ));
    
    return result[0]?.count || 0;
  }

  async createGloryTransaction(insertTransaction: InsertGloryLedger): Promise<GloryLedger> {
    const [transaction] = await db.insert(gloryLedger).values(insertTransaction).returning();
    
    await this.updateUserBalance(transaction.userId, transaction.delta, transaction.currency || "GLORY");
    
    return transaction as GloryLedger;
  }

  async getGloryTransactions(userId: string, currency?: string): Promise<GloryLedger[]> {
    const result = await db.query.gloryLedger.findMany({
      where: currency 
        ? and(eq(gloryLedger.userId, userId), eq(gloryLedger.currency, currency))
        : eq(gloryLedger.userId, userId),
      orderBy: [desc(gloryLedger.createdAt)]
    });
    return result;
  }

  async getGloryTransactionByHash(txHash: string): Promise<GloryLedger | undefined> {
    const result = await db.query.gloryLedger.findFirst({
      where: eq(gloryLedger.txHash, txHash)
    });
    return result;
  }

  async clearGloryTransactions(userId: string): Promise<void> {
    await db.delete(gloryLedger).where(eq(gloryLedger.userId, userId));
  }

  async updateUserBalance(userId: string, delta: string | number, currency: string): Promise<void> {
    const deltaNum = typeof delta === 'string' ? Number(delta) : delta;
    if (currency === "GLORY") {
      await db.update(users)
        .set({ 
          gloryBalance: sql`${users.gloryBalance} + ${deltaNum}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    } else if (currency === "SOL") {
      await db.update(users)
        .set({ 
          solBalance: sql`${users.solBalance} + ${deltaNum}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    } else if (currency === "USDC") {
      await db.update(users)
        .set({ 
          usdcBalance: sql`${users.usdcBalance} + ${deltaNum}`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    }
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
    const currency = config?.currency || "GLORY";
    let prizes: number[] = [];
    
    if (config?.prizeDistribution && Array.isArray(config.prizeDistribution)) {
      // Use fixed prize amounts from config
      prizes = config.prizeDistribution
        .map((p: any) => Number(p.value))
        .filter((v: number) => !isNaN(v) && v > 0);
    } else {
      // Fallback to percentage-based distribution
      const defaultPercentages = [0.4, 0.25, 0.15, 0.1, 0.1];
      prizes = defaultPercentages.map(p => Math.floor(Number(contest.prizeGlory) * p));
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
        delta: prize.toString(),
        currency: currency,
        reason: `Contest Prize - ${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Place`,
        contestId: contestId,
        submissionId: submission.id
      });
      
      userUpdates.push({
        userId: submission.userId,
        prize: prize,
        currency: currency
      });
    }

    // Batch insert ledger entries (single query)
    if (ledgerEntries.length > 0) {
      await db.insert(gloryLedger).values(ledgerEntries).onConflictDoNothing();
      
      // Update user balances based on currency (unfortunately needs to be individual queries)
      for (const update of userUpdates) {
        if (update.currency === "GLORY") {
          await db.update(users)
            .set({ 
              gloryBalance: sql`${users.gloryBalance} + ${update.prize}`,
              updatedAt: new Date()
            })
            .where(eq(users.id, update.userId));
        } else if (update.currency === "SOL") {
          await db.update(users)
            .set({ 
              solBalance: sql`${users.solBalance} + ${update.prize}`,
              updatedAt: new Date()
            })
            .where(eq(users.id, update.userId));
        } else if (update.currency === "USDC") {
          await db.update(users)
            .set({ 
              usdcBalance: sql`${users.usdcBalance} + ${update.prize}`,
              updatedAt: new Date()
            })
            .where(eq(users.id, update.userId));
        }
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

  // Purchased Prompts
  async purchasePrompt(userId: string, submissionId: string): Promise<PurchasedPrompt> {
    // Get submission with prompt details
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, submissionId),
      with: {
        user: true
      }
    });

    if (!submission) {
      throw new Error("Submission not found");
    }

    if (!submission.promptForSale) {
      throw new Error("This prompt is not for sale");
    }

    if (!submission.promptPrice || !submission.promptCurrency) {
      throw new Error("Prompt price not set");
    }

    if (submission.userId === userId) {
      throw new Error("Cannot purchase your own prompt");
    }

    // Check if already purchased
    const existing = await db.query.purchasedPrompts.findFirst({
      where: and(
        eq(purchasedPrompts.userId, userId),
        eq(purchasedPrompts.submissionId, submissionId)
      )
    });

    if (existing) {
      throw new Error("You have already purchased this prompt");
    }

    // Get buyer details
    const buyer = await this.getUser(userId);
    if (!buyer) {
      throw new Error("Buyer not found");
    }

    const price = parseFloat(submission.promptPrice);
    const currency = submission.promptCurrency;

    // Check buyer balance
    let hasSufficientBalance = false;
    if (currency === "GLORY") {
      hasSufficientBalance = buyer.gloryBalance >= price;
    } else if (currency === "SOL") {
      hasSufficientBalance = parseFloat(buyer.solBalance) >= price;
    } else if (currency === "USDC") {
      hasSufficientBalance = parseFloat(buyer.usdcBalance) >= price;
    }

    if (!hasSufficientBalance) {
      throw new Error(`Insufficient ${currency} balance`);
    }

    // Perform transaction atomically
    await db.transaction(async (tx) => {
      // Deduct from buyer
      await this.createGloryTransaction({
        userId,
        delta: (-price).toString(),
        currency,
        reason: `Purchased prompt for submission "${submission.title}"`,
        submissionId,
        contestId: submission.contestId || null,
        txHash: null,
        metadata: {
          sellerId: submission.userId,
          price,
          currency
        }
      });

      // Credit seller
      await this.createGloryTransaction({
        userId: submission.userId,
        delta: price.toString(),
        currency,
        reason: `Sold prompt for submission "${submission.title}"`,
        submissionId,
        contestId: submission.contestId || null,
        txHash: null,
        metadata: {
          buyerId: userId,
          price,
          currency
        }
      });
    });

    // Create purchased prompt record
    const [purchase] = await db.insert(purchasedPrompts).values({
      userId,
      submissionId,
      sellerId: submission.userId,
      price: price.toString(),
      currency
    }).returning();

    return purchase as PurchasedPrompt;
  }

  async getPurchasedPrompts(userId: string): Promise<PurchasedPrompt[]> {
    const results = await db.query.purchasedPrompts.findMany({
      where: eq(purchasedPrompts.userId, userId),
      orderBy: [desc(purchasedPrompts.createdAt)]
    });
    return results as PurchasedPrompt[];
  }

  async checkIfPromptPurchased(userId: string, submissionId: string): Promise<boolean> {
    const result = await db.query.purchasedPrompts.findFirst({
      where: and(
        eq(purchasedPrompts.userId, userId),
        eq(purchasedPrompts.submissionId, submissionId)
      )
    });
    return !!result;
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

  // Site Settings
  async getSiteSettings(): Promise<SiteSettings> {
    // Try to get existing settings
    const existing = await db.query.siteSettings.findFirst();
    
    if (existing) {
      return existing;
    }
    
    // Create default settings if none exist
    const [newSettings] = await db.insert(siteSettings)
      .values({ privateMode: false })
      .returning();
    
    return newSettings as SiteSettings;
  }

  async updateSiteSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
    // Get existing settings to get the ID
    const existing = await this.getSiteSettings();
    
    // Update settings
    const [updated] = await db.update(siteSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(siteSettings.id, existing.id))
      .returning();
    
    return updated as SiteSettings;
  }

  // AI Generations
  async createAiGeneration(generation: InsertAiGeneration): Promise<AiGeneration> {
    const [newGeneration] = await db.insert(aiGenerations).values(generation).returning();
    return newGeneration as AiGeneration;
  }

  async getAiGeneration(id: string): Promise<AiGeneration | undefined> {
    const result = await db.query.aiGenerations.findFirst({
      where: eq(aiGenerations.id, id)
    });
    return result;
  }

  async getAiGenerations(userId: string, limit: number = 20): Promise<AiGeneration[]> {
    const result = await db.query.aiGenerations.findMany({
      where: eq(aiGenerations.userId, userId),
      orderBy: [desc(aiGenerations.createdAt)],
      limit
    });
    return result;
  }

  async deleteAiGeneration(id: string): Promise<void> {
    await db.delete(aiGenerations).where(eq(aiGenerations.id, id));
  }

  async updateAiGeneration(id: string, updates: Partial<AiGeneration>): Promise<AiGeneration | undefined> {
    const [updated] = await db.update(aiGenerations)
      .set(updates)
      .where(eq(aiGenerations.id, id))
      .returning();
    return updated;
  }

  // Image Credits
  async getUserCredits(userId: string): Promise<number> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { imageCredits: true }
    });
    return user?.imageCredits || 0;
  }

  async deductCredits(userId: string, amount: number): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { imageCredits: true }
    });

    if (!user || user.imageCredits < amount) {
      return false; // Insufficient credits
    }

    await db.update(users)
      .set({ imageCredits: user.imageCredits - amount, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return true;
  }

  async addCredits(userId: string, amount: number): Promise<void> {
    await db.update(users)
      .set({ 
        imageCredits: sql`${users.imageCredits} + ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Pricing Settings
  async getPricingSetting(key: string): Promise<number | undefined> {
    const setting = await db.query.pricingSettings.findFirst({
      where: eq(pricingSettings.key, key)
    });
    return setting?.value;
  }

  async getAllPricingSettings(): Promise<Map<string, number>> {
    const settings = await db.query.pricingSettings.findMany();
    const map = new Map<string, number>();
    settings.forEach(s => map.set(s.key, s.value));
    return map;
  }

  async updatePricingSetting(key: string, value: number): Promise<void> {
    const existing = await db.query.pricingSettings.findFirst({
      where: eq(pricingSettings.key, key)
    });

    if (existing) {
      await db.update(pricingSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(pricingSettings.key, key));
    } else {
      await db.insert(pricingSettings).values({ key, value });
    }
  }

  // Subscription Tiers
  async getSubscriptionTiers(): Promise<SubscriptionTier[]> {
    const result = await db.query.subscriptionTiers.findMany({
      where: eq(subscriptionTiers.isActive, true),
      orderBy: [subscriptionTiers.sortOrder]
    });
    return result;
  }

  async getSubscriptionTier(id: string): Promise<SubscriptionTier | undefined> {
    const result = await db.query.subscriptionTiers.findFirst({
      where: eq(subscriptionTiers.id, id)
    });
    return result;
  }

  async getSubscriptionTierBySlug(slug: string): Promise<SubscriptionTier | undefined> {
    const result = await db.query.subscriptionTiers.findFirst({
      where: eq(subscriptionTiers.slug, slug)
    });
    return result;
  }

  async createSubscriptionTier(tier: InsertSubscriptionTier): Promise<SubscriptionTier> {
    const [newTier] = await db.insert(subscriptionTiers).values(tier).returning();
    return newTier as SubscriptionTier;
  }

  async updateSubscriptionTier(id: string, updates: Partial<SubscriptionTier>): Promise<SubscriptionTier | undefined> {
    const [tier] = await db.update(subscriptionTiers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptionTiers.id, id))
      .returning();
    return tier;
  }

  async deleteSubscriptionTier(id: string): Promise<void> {
    await db.delete(subscriptionTiers).where(eq(subscriptionTiers.id, id));
  }

  // User Subscriptions
  async getUserSubscription(userId: string): Promise<UserSubscriptionWithTier | undefined> {
    const subscription = await db.query.userSubscriptions.findFirst({
      where: and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, 'active')
      )
    });

    if (!subscription) {
      // Default to free tier if no subscription exists
      const freeTier = await this.getSubscriptionTierBySlug('free');
      if (!freeTier) return undefined;
      
      return {
        id: '',
        userId,
        tierId: freeTier.id,
        status: 'active',
        paymentMethod: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        paymentTxHash: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        creditsGranted: 0,
        creditsGrantedAt: null,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        tier: freeTier
      };
    }

    const tier = await db.query.subscriptionTiers.findFirst({
      where: eq(subscriptionTiers.id, subscription.tierId)
    });

    if (!tier) return undefined;

    return {
      ...subscription,
      tier
    };
  }

  async getUserSubscriptionById(id: string): Promise<UserSubscriptionWithTier | undefined> {
    const subscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.id, id)
    });

    if (!subscription) return undefined;

    const tier = await db.query.subscriptionTiers.findFirst({
      where: eq(subscriptionTiers.id, subscription.tierId)
    });

    if (!tier) return undefined;

    return {
      ...subscription,
      tier
    };
  }

  async createUserSubscription(subscription: InsertUserSubscription): Promise<UserSubscription> {
    const [newSubscription] = await db.insert(userSubscriptions).values(subscription).returning();
    return newSubscription as UserSubscription;
  }

  async updateUserSubscription(id: string, updates: Partial<UserSubscription>): Promise<UserSubscription | undefined> {
    const [subscription] = await db.update(userSubscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSubscriptions.id, id))
      .returning();
    return subscription;
  }

  async cancelUserSubscription(subscriptionId: string): Promise<void> {
    await db.update(userSubscriptions)
      .set({ 
        cancelAtPeriodEnd: true, 
        cancelledAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(userSubscriptions.id, subscriptionId));
  }

  // Subscription Transactions
  async createSubscriptionTransaction(transaction: InsertSubscriptionTransaction): Promise<SubscriptionTransaction> {
    const [newTransaction] = await db.insert(subscriptionTransactions).values(transaction).returning();
    return newTransaction as SubscriptionTransaction;
  }

  async getSubscriptionTransactions(filters: { userId?: string; subscriptionId?: string }): Promise<SubscriptionTransaction[]> {
    const conditions = [];
    if (filters.userId) conditions.push(eq(subscriptionTransactions.userId, filters.userId));
    if (filters.subscriptionId) conditions.push(eq(subscriptionTransactions.subscriptionId, filters.subscriptionId));

    const result = await db.query.subscriptionTransactions.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(subscriptionTransactions.createdAt)]
    });
    return result;
  }

  // Helper Methods
  async canUserAccessModel(userId: string, modelSlug: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return false;

    const allowedModels = subscription.tier.allowedModels || [];
    return allowedModels.includes(modelSlug);
  }

  async canUserEdit(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return false;
    return subscription.tier.canEdit;
  }

  async canUserUpscale(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) return false;
    return subscription.tier.canUpscale;
  }

  async getUserTierCommissions(userId: string): Promise<{ promptCommission: number; imageCommission: number }> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription) {
      return { promptCommission: 0, imageCommission: 0 };
    }
    return {
      promptCommission: subscription.tier.promptCommission,
      imageCommission: subscription.tier.imageCommission
    };
  }

  async grantMonthlyCredits(userId: string): Promise<void> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription || !subscription.id) return;

    const monthlyCredits = subscription.tier.monthlyCredits;
    
    // Add credits to user account
    await this.addCredits(userId, monthlyCredits);

    // Update subscription with grant timestamp
    await db.update(userSubscriptions)
      .set({
        creditsGranted: monthlyCredits,
        creditsGrantedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(userSubscriptions.id, subscription.id));
  }

  async refreshSubscriptionIfNeeded(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    if (!subscription || !subscription.id) return false;

    const now = new Date();
    let periodEnd = new Date(subscription.currentPeriodEnd);

    // Check if subscription period has expired
    if (periodEnd > now) {
      return false; // Period still active, no refresh needed
    }

    // Check if subscription is canceled - finalize cancellation instead of renewing
    if (subscription.status !== "active" || subscription.cancelAtPeriodEnd) {
      console.log(`[Subscription] Finalizing canceled subscription for user ${userId}`);
      
      // Set subscription to canceled status
      await db.update(userSubscriptions)
        .set({
          status: "canceled",
          cancelledAt: now,
          updatedAt: now
        })
        .where(eq(userSubscriptions.id, subscription.id));

      return false; // No refresh, subscription is now canceled
    }

    // Calculate how many months to advance (handle long gaps)
    let newPeriodStart = new Date(subscription.currentPeriodEnd);
    let newPeriodEnd = new Date(subscription.currentPeriodEnd);
    let monthsToAdd = 1;

    // Advance period until it's in the future
    while (newPeriodEnd <= now) {
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      monthsToAdd++;
    }

    // Update start to be end of last period
    newPeriodStart = new Date(newPeriodEnd);
    newPeriodStart.setMonth(newPeriodStart.getMonth() - 1);

    // Reset user credits to monthly allowance
    const monthlyCredits = subscription.tier.monthlyCredits;
    await db.update(users)
      .set({ 
        imageCredits: monthlyCredits,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    // Update subscription period
    await db.update(userSubscriptions)
      .set({
        currentPeriodStart: newPeriodStart,
        currentPeriodEnd: newPeriodEnd,
        creditsGranted: monthlyCredits,
        creditsGrantedAt: now,
        updatedAt: now
      })
      .where(eq(userSubscriptions.id, subscription.id));

    // Create transaction record
    await this.createSubscriptionTransaction({
      userId,
      subscriptionId: subscription.id,
      tierId: subscription.tierId,
      amountCents: 0, // Auto-refresh doesn't charge
      currency: "USD",
      paymentMethod: "auto-renewal",
      paymentStatus: "completed",
      metadata: {
        creditsGranted: monthlyCredits,
        periodStart: newPeriodStart.toISOString(),
        periodEnd: newPeriodEnd.toISOString(),
        monthsAdvanced: monthsToAdd - 1
      }
    });

    console.log(`[Subscription] Auto-refreshed credits for user ${userId}: ${monthlyCredits} credits, advanced ${monthsToAdd - 1} months, new period: ${newPeriodStart.toISOString()} - ${newPeriodEnd.toISOString()}`);

    return true; // Refresh performed
  }

  // Pro Edit: Images
  async createImage(image: InsertImage): Promise<Image> {
    const [created] = await db.insert(images).values(image).returning();
    return created;
  }

  async getImage(id: string): Promise<Image | undefined> {
    const [image] = await db.select().from(images).where(eq(images.id, id));
    return image;
  }

  async getImagesByUserId(userId: string): Promise<Image[]> {
    return await db.select()
      .from(images)
      .where(eq(images.userId, userId))
      .orderBy(desc(images.createdAt));
  }

  async updateImage(id: string, updates: Partial<Image>): Promise<Image | undefined> {
    const [updated] = await db.update(images)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(images.id, id))
      .returning();
    return updated;
  }

  // Pro Edit: Image Versions
  async createImageVersion(version: InsertImageVersion): Promise<ImageVersion> {
    const [created] = await db.insert(imageVersions).values(version).returning();
    return created;
  }

  async getImageVersion(id: string): Promise<ImageVersion | undefined> {
    const [version] = await db.select().from(imageVersions).where(eq(imageVersions.id, id));
    return version;
  }

  async getImageVersionsByImageId(imageId: string): Promise<ImageVersion[]> {
    return await db.select()
      .from(imageVersions)
      .where(eq(imageVersions.imageId, imageId))
      .orderBy(desc(imageVersions.createdAt));
  }

  async getCurrentImageVersion(imageId: string): Promise<ImageVersion | undefined> {
    const [version] = await db.select()
      .from(imageVersions)
      .where(and(
        eq(imageVersions.imageId, imageId),
        eq(imageVersions.isCurrent, true)
      ))
      .limit(1);
    return version;
  }

  async unsetCurrentVersions(imageId: string): Promise<void> {
    await db.update(imageVersions)
      .set({ isCurrent: false })
      .where(eq(imageVersions.imageId, imageId));
  }

  // Pro Edit: Edit Jobs
  async createEditJob(job: InsertEditJob): Promise<EditJob> {
    const [created] = await db.insert(editJobs).values(job).returning();
    return created;
  }

  async getEditJob(id: string): Promise<EditJob | undefined> {
    const [job] = await db.select().from(editJobs).where(eq(editJobs.id, id));
    return job;
  }

  async getEditJobsByUserId(userId: string): Promise<EditJob[]> {
    return await db.select()
      .from(editJobs)
      .where(eq(editJobs.userId, userId))
      .orderBy(desc(editJobs.createdAt));
  }

  async getEditJobsByImageId(imageId: string): Promise<EditJob[]> {
    return await db.select()
      .from(editJobs)
      .where(eq(editJobs.imageId, imageId))
      .orderBy(desc(editJobs.createdAt));
  }

  async updateEditJob(id: string, updates: Partial<EditJob>): Promise<EditJob | undefined> {
    const [updated] = await db.update(editJobs)
      .set(updates)
      .where(eq(editJobs.id, id))
      .returning();
    return updated;
  }

  // Pro Edit: Credit Management
  async refundAiCredits(userId: string, amount: number, reason: string, jobId: string): Promise<boolean> {
    // Use atomic UPDATE with WHERE condition instead of transaction (neon-http doesn't support transactions)
    // This UPDATE will only succeed if refundedAt IS NULL, providing idempotency
    const [updatedJob] = await db.update(editJobs)
      .set({ refundedAt: new Date() })
      .where(and(
        eq(editJobs.id, jobId),
        sql`${editJobs.refundedAt} IS NULL`
      ))
      .returning();
    
    // If no row was updated, job was already refunded or doesn't exist
    if (!updatedJob) {
      console.log(`[ProEdit] Refund skipped: Job ${jobId} not found or already refunded`);
      return false;
    }
    
    // Refund credits
    await db.update(users)
      .set({
        imageCredits: sql`${users.imageCredits} + ${amount}`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    
    console.log(`[ProEdit] Refunded ${amount} AI credits to user ${userId} for job ${jobId}. Reason: ${reason}`);
    
    // Log the refund in audit log
    await this.createAuditLog({
      actorUserId: userId,
      action: 'ai_credits_refund',
      meta: { amount, reason, jobId }
    });
    
    return true;
  }
}

export const storage = new DbStorage();
