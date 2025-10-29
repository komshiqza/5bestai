import type { Express } from "express";
import { storage } from "../storage";
import {
  authenticateOptional,
  authenticateToken,
  requireApproved,
  type AuthRequest,
} from "../middleware/auth";
import { voteSubmissionSchema } from "@shared/schema";
import { votingRateLimiter } from "../services/rate-limiter";

export function registerVotingRoutes(app: Express): void {
  // POST /api/votes - Submit a vote
  app.post(
    "/api/votes",
    authenticateOptional,
    async (req: AuthRequest, res) => {
      try {
        const { submissionId } = voteSubmissionSchema.parse(req.body);

        // Check if we need a user ID for voting
        let userId: string;
        if (req.user) {
          userId = req.user.id;
        } else {
          // For anonymous voting, use IP address as identifier
          const clientIP =
            req.ip || req.connection.remoteAddress || "anonymous";
          userId = `anonymous:${clientIP}`;
        }

        // Check if submission exists
        const submission = await storage.getSubmission(submissionId);
        if (!submission) {
          return res.status(404).json({ error: "Submission not found" });
        }

        if (submission.status !== "approved") {
          return res
            .status(400)
            .json({ error: "Cannot vote on unapproved submission" });
        }

        // Check if user is voting for their own submission (only for authenticated users)
        if (req.user && submission.userId === req.user.id) {
          return res
            .status(400)
            .json({ error: "Cannot vote for your own submission" });
        }

        // Get contest to check voting rules and timing
        let contest = null;
        if (submission.contestId) {
          contest = await storage.getContest(submission.contestId);
          if (!contest) {
            return res.status(404).json({ error: "Contest not found" });
          }

          // Check if contest is active
          if (contest.status !== "active") {
            return res.status(400).json({ error: "Contest is not active" });
          }

          // Check contest timing
          const now = new Date();
          if (now < contest.startAt) {
            return res
              .status(400)
              .json({ error: "Contest has not started yet" });
          }
          if (now > contest.endAt) {
            return res.status(400).json({ error: "Contest has ended" });
          }

          // Check voting timing from contest config
          const config = contest.config as any;
          if (config) {
            if (config.votingStartAt && now < new Date(config.votingStartAt)) {
              return res
                .status(400)
                .json({ error: "Voting has not started yet" });
            }
            if (config.votingEndAt && now > new Date(config.votingEndAt)) {
              return res.status(400).json({ error: "Voting period has ended" });
            }
            if (
              config.submissionEndAt &&
              config.submissionEndAt !== config.votingEndAt &&
              now > new Date(config.submissionEndAt)
            ) {
              // Allow voting even after submission deadline if voting end is different
            }

            // Check voting methods restrictions
            if (config.votingMethods && config.votingMethods.length > 0) {
              let canVote = false;

              // Check if public voting is allowed (anonymous users can vote)
              if (config.votingMethods.includes("public") && !req.user) {
                canVote = true;
              }
              // Check if logged users voting is allowed
              else if (
                config.votingMethods.includes("logged_users") &&
                req.user
              ) {
                canVote = true;
              }
              // Check if jury voting is allowed (requires authentication)
              else if (
                config.votingMethods.includes("jury") &&
                req.user &&
                config.juryMembers &&
                config.juryMembers.includes(req.user.id)
              ) {
                canVote = true;
              }

              if (!canVote) {
                if (!req.user) {
                  return res.status(401).json({
                    error: "This contest requires authentication to vote",
                  });
                } else {
                  return res.status(403).json({
                    error: "You are not authorized to vote in this contest",
                  });
                }
              }
            }

            // Check jury voting restrictions (only if jury is the ONLY voting method)
            if (
              config.votingMethods &&
              config.votingMethods.length === 1 &&
              config.votingMethods.includes("jury")
            ) {
              // If ONLY jury voting is enabled, check if user is in jury list
              if (config.juryMembers && Array.isArray(config.juryMembers)) {
                if (!req.user || !config.juryMembers.includes(req.user.id)) {
                  return res.status(403).json({
                    error: "Only jury members can vote in this contest",
                  });
                }
              }
            }
          }

          // Check contest-specific voting frequency rules
          if (config && config.periodDurationHours) {
            const periodStart = new Date(
              now.getTime() - config.periodDurationHours * 60 * 60 * 1000,
            );

            // 1. Check if user already voted for THIS submission in period
            const votesForThisSubmission =
              await storage.getVoteCountForSubmissionInPeriod(
                userId,
                submissionId,
                periodStart,
              );
            if (votesForThisSubmission >= 1) {
              return res.status(400).json({
                error: `You have already voted for this submission in the last ${config.periodDurationHours} hours`,
                nextVoteAllowed: new Date(
                  now.getTime() + config.periodDurationHours * 60 * 60 * 1000,
                ),
              });
            }

            // 2. Check if user reached vote limit for CONTEST in period (if limit > 0)
            if (config.votesPerUserPerPeriod > 0) {
              const totalVotesInPeriod =
                await storage.getUserTotalVotesInContestInPeriod(
                  userId,
                  submission.contestId!,
                  periodStart,
                );

              if (totalVotesInPeriod >= config.votesPerUserPerPeriod) {
                return res.status(400).json({
                  error: `You can only vote ${config.votesPerUserPerPeriod} time(s) in this contest every ${config.periodDurationHours} hours`,
                });
              }
            }
          }

          // Check total votes limit for contest
          if (
            config &&
            config.totalVotesPerUser &&
            config.totalVotesPerUser > 0
          ) {
            const totalVotesInContest =
              await storage.getUserTotalVotesInContest(
                userId,
                submission.contestId!,
              );

            if (totalVotesInContest >= config.totalVotesPerUser) {
              return res.status(400).json({
                error: `You have reached the maximum of ${config.totalVotesPerUser} votes for this contest`,
              });
            }
          }
        }

        // Note: Multiple votes per submission are now allowed based on contest votesPerUserPerPeriod config
        // The period-based check above enforces the voting frequency rules

        // Check general rate limit (30 votes per hour per user) - keeping as backup
        const rateLimitKey = `vote:${userId}`;
        if (!votingRateLimiter.isAllowed(rateLimitKey)) {
          return res.status(429).json({
            error: "Rate limit exceeded. Maximum 30 votes per hour.",
            resetTime: votingRateLimiter.getResetTime(rateLimitKey),
          });
        }

        // Create vote
        const vote = await storage.createVote({ userId, submissionId });

        // Calculate remaining information for response
        let remainingInfo: any = {
          remainingVotes: votingRateLimiter.getRemainingRequests(rateLimitKey),
        };

        if (contest && submission.contestId) {
          const config = contest.config as any;
          if (
            config &&
            config.totalVotesPerUser &&
            config.totalVotesPerUser > 0
          ) {
            const totalVotesInContest =
              await storage.getUserTotalVotesInContest(
                userId,
                submission.contestId,
              );
            remainingInfo.remainingContestVotes =
              config.totalVotesPerUser - totalVotesInContest;
          }
        }

        res.status(201).json({
          message: "Vote recorded successfully",
          ...remainingInfo,
        });
      } catch (error) {
        res
          .status(400)
          .json({
            error: error instanceof Error ? error.message : "Invalid input",
          });
      }
    },
  );

  // GET /api/votes/status - Get voting status for a user and submission/contest
  app.get(
    "/api/votes/status",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const { submissionId, contestId } = req.query;
        const userId = req.user!.id;

        if (!submissionId && !contestId) {
          return res
            .status(400)
            .json({ error: "Either submissionId or contestId is required" });
        }

        let contest = null;
        let submission = null;

        if (submissionId) {
          submission = await storage.getSubmission(submissionId as string);
          if (!submission) {
            return res.status(404).json({ error: "Submission not found" });
          }
          if (submission.contestId) {
            contest = await storage.getContest(submission.contestId);
          }
        } else if (contestId) {
          contest = await storage.getContest(contestId as string);
          if (!contest) {
            return res.status(404).json({ error: "Contest not found" });
          }
        }

        const now = new Date();
        const response: any = {
          canVote: true,
          reasons: [],
          votingStatus: {
            generalRateLimit: votingRateLimiter.getRemainingRequests(
              `vote:${userId}`,
            ),
          },
        };

        // Check general conditions
        if (submission && submission.userId === userId) {
          response.canVote = false;
          response.reasons.push("Cannot vote for your own submission");
        }

        if (submission && submission.status !== "approved") {
          response.canVote = false;
          response.reasons.push("Submission is not approved for voting");
        }

        // Check contest-specific conditions
        if (contest) {
          if (contest.status !== "active") {
            response.canVote = false;
            response.reasons.push("Contest is not active");
          }

          if (now < contest.startAt) {
            response.canVote = false;
            response.reasons.push("Contest has not started yet");
          }

          if (now > contest.endAt) {
            response.canVote = false;
            response.reasons.push("Contest has ended");
          }

          const config = contest.config as any;
          if (config) {
            // Check voting period
            if (config.votingStartAt && now < new Date(config.votingStartAt)) {
              response.canVote = false;
              response.reasons.push("Voting has not started yet");
              response.votingStartsAt = config.votingStartAt;
            }

            if (config.votingEndAt && now > new Date(config.votingEndAt)) {
              response.canVote = false;
              response.reasons.push("Voting period has ended");
            }

            // Check voting frequency limits
            if (
              submissionId &&
              config.votesPerUserPerPeriod &&
              config.periodDurationHours
            ) {
              const periodStart = new Date(
                now.getTime() - config.periodDurationHours * 60 * 60 * 1000,
              );
              const votesInPeriod =
                await storage.getVoteCountForSubmissionInPeriod(
                  userId,
                  submissionId as string,
                  periodStart,
                );

              response.votingStatus.periodInfo = {
                votesInPeriod,
                maxVotesPerPeriod: config.votesPerUserPerPeriod,
                periodDurationHours: config.periodDurationHours,
                canVoteInPeriod: votesInPeriod < config.votesPerUserPerPeriod,
              };

              if (votesInPeriod >= config.votesPerUserPerPeriod) {
                response.canVote = false;
                response.reasons.push(
                  `Maximum ${config.votesPerUserPerPeriod} votes per ${config.periodDurationHours} hours reached for this submission`,
                );
                response.nextVoteAllowed = new Date(
                  now.getTime() + config.periodDurationHours * 60 * 60 * 1000,
                );
              }
            }

            // Check total votes limit
            if (config.totalVotesPerUser && config.totalVotesPerUser > 0) {
              const totalVotesInContest =
                await storage.getUserTotalVotesInContest(userId, contest.id);

              response.votingStatus.contestInfo = {
                totalVotesInContest,
                maxTotalVotes: config.totalVotesPerUser,
                remainingVotes: Math.max(
                  0,
                  config.totalVotesPerUser - totalVotesInContest,
                ),
              };

              if (totalVotesInContest >= config.totalVotesPerUser) {
                response.canVote = false;
                response.reasons.push(
                  `Maximum ${config.totalVotesPerUser} total votes reached for this contest`,
                );
              }
            }
          }
        }

        // Check if already voted for this specific submission
        if (submissionId) {
          const existingVote = await storage.getVote(
            userId,
            submissionId as string,
          );
          if (existingVote) {
            response.canVote = false;
            response.reasons.push("Already voted for this submission");
            response.votedAt = existingVote.createdAt;
          }
        }

        res.json(response);
      } catch (error) {
        res
          .status(500)
          .json({
            error:
              error instanceof Error
                ? error.message
                : "Failed to get voting status",
          });
      }
    },
  );
}
