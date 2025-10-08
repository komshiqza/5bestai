import type { IStorage } from "./storage";

interface ScheduledJob {
  contestId: string;
  timeoutId: NodeJS.Timeout;
  endAt: Date;
}

export class ContestScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async initialize() {
    // Schedule all active contests on startup
    const contests = await this.storage.getContests({ status: "active" });
    
    for (const contest of contests) {
      if (contest.endAt) {
        this.scheduleContestEnd(contest.id, contest.endAt);
      }
    }
    
    console.log(`Contest scheduler initialized with ${this.jobs.size} active contests`);
  }

  scheduleContestEnd(contestId: string, endAt: Date) {
    // Cancel existing job if any
    this.cancelJob(contestId);

    const now = new Date();
    const endTime = new Date(endAt);
    const delay = endTime.getTime() - now.getTime();

    // Only schedule if the end time is in the future
    if (delay <= 0) {
      console.log(`Contest ${contestId} has already ended, distributing immediately`);
      this.distributeRewards(contestId);
      return;
    }

    // Maximum timeout value in JavaScript is ~24.8 days
    const MAX_TIMEOUT = 2147483647;
    const actualDelay = delay > MAX_TIMEOUT ? MAX_TIMEOUT : delay;

    console.log(`Scheduling contest ${contestId} to end in ${Math.round(delay / 1000)} seconds`);

    const timeoutId = setTimeout(async () => {
      // Recalculate remaining delay
      const nowInCallback = new Date();
      const remainingDelay = endTime.getTime() - nowInCallback.getTime();
      
      // If there's still time remaining, reschedule for the remaining time
      if (remainingDelay > 0) {
        console.log(`Rescheduling contest ${contestId} for remaining ${Math.round(remainingDelay / 1000)} seconds`);
        this.scheduleContestEnd(contestId, endTime);
      } else {
        await this.distributeRewards(contestId);
        this.jobs.delete(contestId);
      }
    }, actualDelay);

    this.jobs.set(contestId, {
      contestId,
      timeoutId,
      endAt: endTime,
    });
  }

  private async distributeRewards(contestId: string) {
    try {
      // Verify contest is still active before distributing
      const contest = await this.storage.getContest(contestId);
      if (!contest) {
        console.log(`Contest ${contestId} no longer exists, skipping distribution`);
        return;
      }
      
      if (contest.status !== "active") {
        console.log(`Contest ${contestId} is ${contest.status}, skipping distribution`);
        return;
      }

      console.log(`Auto-distributing rewards for contest ${contestId}`);
      await this.storage.distributeContestRewards(contestId);
      console.log(`Successfully distributed rewards for contest ${contestId}`);
    } catch (error) {
      console.error(`Failed to distribute rewards for contest ${contestId}:`, error);
    }
  }

  cancelJob(contestId: string) {
    const job = this.jobs.get(contestId);
    if (job) {
      clearTimeout(job.timeoutId);
      this.jobs.delete(contestId);
      console.log(`Cancelled scheduled end for contest ${contestId}`);
    }
  }

  rescheduleContest(contestId: string, newEndAt: Date) {
    this.scheduleContestEnd(contestId, newEndAt);
  }

  getScheduledJobs() {
    return Array.from(this.jobs.values()).map(job => ({
      contestId: job.contestId,
      endAt: job.endAt,
    }));
  }
}
