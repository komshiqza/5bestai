import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  authenticateToken,
  requireAdmin,
  type AuthRequest,
} from "../middleware/auth";
import {
  insertContestSchema,
} from "@shared/schema";
import { ContestScheduler } from "../contest-scheduler";

export function registerContestRoutes(
  app: Express,
  contestScheduler: ContestScheduler,
): void {
  // GET /api/contests - Get all contests
  app.get("/api/contests", async (req, res) => {
    try {
      const { status } = req.query;
      const contests = await storage.getContests(
        status ? { status: status as string } : undefined,
      );

      // Auto-end contests that have passed their endAt time
      const now = new Date();
      const updatedContests = await Promise.all(
        contests.map(async (contest) => {
          if (contest.status === "active" && new Date(contest.endAt) < now) {
            const updated = await storage.updateContest(contest.id, {
              status: "ended",
            });
            return updated || contest;
          }
          return contest;
        }),
      );

      // Filter out contests that were auto-ended if user requested a specific status
      const filteredContests = status
        ? updatedContests.filter((contest) => contest.status === status)
        : updatedContests;

      // Flatten prizeDistribution from config for frontend
      const contestsWithPrizes = filteredContests.map((contest) => ({
        ...contest,
        prizeDistribution: (contest.config as any)?.prizeDistribution || [],
      }));

      res.json(contestsWithPrizes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contests" });
    }
  });

  // GET /api/contests/by-slug/:slug - Get contest by slug
  app.get("/api/contests/by-slug/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const contest = await storage.getContestBySlug(slug);

      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }

      // Auto-end if expired
      const now = new Date();
      if (contest.status === "active" && new Date(contest.endAt) < now) {
        const updated = await storage.updateContest(contest.id, {
          status: "ended",
        });
        return res.json({
          ...updated,
          prizeDistribution: (updated.config as any)?.prizeDistribution || [],
        });
      }

      res.json({
        ...contest,
        prizeDistribution: (contest.config as any)?.prizeDistribution || [],
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contest" });
    }
  });

  // GET /api/contests/featured - Get featured contest
  app.get("/api/contests/featured", async (req, res) => {
    try {
      const contests = await storage.getContests({ status: "active" });
      const featuredContest = contests.find(
        (contest) => contest.isFeatured === true,
      );

      if (!featuredContest) {
        return res.status(404).json({ error: "No featured contest found" });
      }

      // Auto-end if expired
      const now = new Date();
      if (new Date(featuredContest.endAt) < now) {
        const updated = await storage.updateContest(featuredContest.id, {
          status: "ended",
        });
        if (updated) {
          return res.status(404).json({ error: "Featured contest has ended" });
        }
      }

      res.json({
        ...featuredContest,
        prizeDistribution:
          (featuredContest.config as any)?.prizeDistribution || [],
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch featured contest" });
    }
  });

  // Admin contest routes (BEFORE /api/contests/:id to avoid conflicts)
  // POST /api/admin/contests - Create new contest
  app.post(
    "/api/admin/contests",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const contestData = insertContestSchema.parse(req.body);
        const contest = await storage.createContest(contestData);

        // Log admin action
        await storage.createAuditLog({
          actorUserId: req.user!.id,
          action: "CREATE_CONTEST",
          meta: { contestId: contest.id, title: contest.title },
        });

        res.status(201).json(contest);
      } catch (error) {
        res
          .status(400)
          .json({
            error: error instanceof Error ? error.message : "Invalid input",
          });
      }
    },
  );

  // PATCH /api/admin/contests/:id - Update contest
  app.patch(
    "/api/admin/contests/:id",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        let updateData = { ...req.body };

        // Convert date strings to Date objects for Drizzle
        if (updateData.startAt) {
          updateData.startAt = new Date(updateData.startAt);
        }
        if (updateData.endAt) {
          updateData.endAt = new Date(updateData.endAt);
        }

        // If no cover image is provided or it's explicitly set to null/empty, use top voted submission
        if (!updateData.coverImageUrl || updateData.coverImageUrl === "") {
          const topSubmissions = await storage.getTopSubmissionsByContest(
            req.params.id,
            1,
          );
          if (topSubmissions.length > 0 && topSubmissions[0].type === "image") {
            updateData.coverImageUrl = topSubmissions[0].mediaUrl;
          }
        }

        const updatedContest = await storage.updateContest(
          req.params.id,
          updateData,
        );
        if (!updatedContest) {
          return res.status(404).json({ error: "Contest not found" });
        }

        // Reschedule automatic end if endAt was updated and contest is active
        if (updateData.endAt && updatedContest.status === "active") {
          contestScheduler.rescheduleContest(
            updatedContest.id,
            updatedContest.endAt,
          );
        }

        // Log admin action
        await storage.createAuditLog({
          actorUserId: req.user!.id,
          action: "UPDATE_CONTEST",
          meta: { contestId: updatedContest.id, updates: req.body },
        });

        res.json(updatedContest);
      } catch (error) {
        console.error("Error updating contest:", error);
        res
          .status(400)
          .json({
            error: error instanceof Error ? error.message : "Invalid input",
          });
      }
    },
  );

  // PATCH /api/admin/contests/:id/activate - Activate contest
  app.patch(
    "/api/admin/contests/:id/activate",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const contest = await storage.getContest(req.params.id);
        if (!contest) {
          return res.status(404).json({ error: "Contest not found" });
        }

        if (contest.status !== "draft") {
          return res
            .status(400)
            .json({ error: "Only draft contests can be activated" });
        }

        // Update contest status to active
        const updatedContest = await storage.updateContest(contest.id, {
          status: "active",
        });

        // Schedule automatic end for this contest
        if (updatedContest && updatedContest.endAt) {
          contestScheduler.scheduleContestEnd(
            updatedContest.id,
            updatedContest.endAt,
          );
        }

        // Log admin action
        await storage.createAuditLog({
          actorUserId: req.user!.id,
          action: "ACTIVATE_CONTEST",
          meta: { contestId: contest.id, title: contest.title },
        });

        res.json({
          message: "Contest activated successfully",
          contest: updatedContest,
        });
      } catch (error) {
        console.error("Error activating contest:", error);
        res.status(500).json({
          error: "Failed to activate contest",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // POST /api/admin/contests/:id/end - End contest
  app.post(
    "/api/admin/contests/:id/end",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const contest = await storage.getContest(req.params.id);
        if (!contest) {
          return res.status(404).json({ error: "Contest not found" });
        }

        if (contest.status !== "active") {
          return res.status(400).json({ error: "Contest is not active" });
        }

        // Cancel any scheduled automatic distribution
        contestScheduler.cancelJob(contest.id);

        // Distribute rewards using transaction-like approach
        await storage.distributeContestRewards(contest.id);

        // Log admin action
        await storage.createAuditLog({
          actorUserId: req.user!.id,
          action: "END_CONTEST",
          meta: { contestId: contest.id, prizePool: contest.prizeGlory },
        });

        res.json({
          message: "Contest ended and rewards distributed successfully",
        });
      } catch (error) {
        console.error("Error ending contest:", error);
        res.status(500).json({
          error: "Failed to end contest and distribute rewards",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // DELETE /api/admin/contests/:id - Delete contest
  app.delete(
    "/api/admin/contests/:id",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const contest = await storage.getContest(req.params.id);
        if (!contest) {
          return res.status(404).json({ error: "Contest not found" });
        }

        await storage.deleteContest(req.params.id);

        // Log admin action
        await storage.createAuditLog({
          actorUserId: req.user!.id,
          action: "DELETE_CONTEST",
          meta: { contestId: contest.id, title: contest.title },
        });

        res.json({ message: "Contest deleted successfully" });
      } catch (error) {
        console.error("Error deleting contest:", error);
        res.status(500).json({
          error: "Failed to delete contest",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // PATCH /api/admin/contests/bulk/activate - Bulk activate contests
  app.patch(
    "/api/admin/contests/bulk/activate",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { contestIds } = z
          .object({ contestIds: z.array(z.string()).min(1) })
          .parse(req.body);

        let updatedCount = 0;
        const updatedContests = [];

        for (const contestId of contestIds) {
          const contest = await storage.getContest(contestId);
          if (contest && contest.status === "draft") {
            const updated = await storage.updateContest(contestId, {
              status: "active",
            });
            if (updated) {
              updatedCount++;
              updatedContests.push({ id: updated.id, title: updated.title });
              // Schedule automatic end for each activated contest
              if (updated.endAt) {
                contestScheduler.scheduleContestEnd(updated.id, updated.endAt);
              }
            }
          }
        }

        // Log admin action
        await storage.createAuditLog({
          actorUserId: req.user!.id,
          action: "BULK_ACTIVATE_CONTESTS",
          meta: { contestIds, updatedContests, updatedCount },
        });

        res.json({
          success: true,
          updatedCount,
          message: `Successfully activated ${updatedCount} contests`,
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

  // POST /api/admin/contests/bulk/end - Bulk end and distribute contests
  app.post(
    "/api/admin/contests/bulk/end",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { contestIds } = z
          .object({ contestIds: z.array(z.string()).min(1) })
          .parse(req.body);

        let endedCount = 0;
        const endedContests = [];
        const errors = [];

        for (const contestId of contestIds) {
          try {
            const contest = await storage.getContest(contestId);
            if (contest && contest.status === "active") {
              // Cancel any scheduled automatic distribution
              contestScheduler.cancelJob(contestId);

              await storage.distributeContestRewards(contestId);
              endedCount++;
              endedContests.push({
                id: contest.id,
                title: contest.title,
                prizeGlory: contest.prizeGlory,
              });
            }
          } catch (error) {
            errors.push({
              contestId,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        // Log admin action
        await storage.createAuditLog({
          actorUserId: req.user!.id,
          action: "BULK_END_CONTESTS",
          meta: { contestIds, endedContests, endedCount, errors },
        });

        res.json({
          success: true,
          endedCount,
          message: `Successfully ended ${endedCount} contests and distributed rewards`,
          errors: errors.length > 0 ? errors : undefined,
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

  // DELETE /api/admin/contests/bulk - Bulk delete contests
  app.delete(
    "/api/admin/contests/bulk",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { contestIds } = z
          .object({ contestIds: z.array(z.string()).min(1) })
          .parse(req.body);

        let deletedCount = 0;
        const deletedContests = [];

        for (const contestId of contestIds) {
          const contest = await storage.getContest(contestId);
          if (contest) {
            await storage.deleteContest(contestId);
            deletedCount++;
            deletedContests.push({ id: contest.id, title: contest.title });
          }
        }

        // Log admin action
        await storage.createAuditLog({
          actorUserId: req.user!.id,
          action: "BULK_DELETE_CONTESTS",
          meta: { contestIds, deletedContests, deletedCount },
        });

        res.json({
          success: true,
          deletedCount,
          message: `Successfully deleted ${deletedCount} contests`,
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

  // GET /api/contests/:id - Get single contest by ID (MUST BE AFTER all specific contest routes to avoid route conflicts)
  app.get("/api/contests/:id", async (req, res) => {
    try {
      let contest = await storage.getContest(req.params.id);
      if (!contest) {
        return res.status(404).json({ error: "Contest not found" });
      }

      // Auto-end contest if it has passed its endAt time
      const now = new Date();
      if (contest.status === "active" && new Date(contest.endAt) < now) {
        const updated = await storage.updateContest(contest.id, {
          status: "ended",
        });
        contest = updated || contest;
      }

      // Get top 10 submissions for this contest
      const topSubmissions = await storage.getTopSubmissionsByContest(
        contest.id,
        10,
      );

      res.json({
        ...contest,
        prizeDistribution: (contest.config as any)?.prizeDistribution || [],
        topSubmissions,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contest" });
    }
  });
}




