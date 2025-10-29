import type { Express } from "express";
import { storage } from "../storage";
import {
  authenticateToken,
  requireAdmin,
  type AuthRequest,
} from "../middleware/auth";
import {
  updateUserStatusSchema,
  updateSubmissionStatusSchema,
  bulkSubmissionIdsSchema,
  updateCashoutStatusSchema,
  approveCashoutSchema,
  rejectCashoutSchema,
  bulkCashoutIdsSchema,
  bulkRejectCashoutSchema,
  insertSiteSettingsSchema,
} from "@shared/schema";
import { refundEntryFee } from "./utils";
import { deleteFile } from "../services/file-upload";
import { z } from "zod";

// Global rate limiting for duplicate request prevention
const recentGloryRequests = new Map<string, number>();

export function registerAdminRoutes(app: Express): void {
  // User management routes
  app.get(
    "/api/admin/users",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { status, role } = req.query;
        const users = await storage.getUsersWithFilters({
          status: status as string,
          role: role as string,
        });
        res.json(users);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch users" });
      }
    },
  );

  app.patch(
    "/api/admin/users/:id/status",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { status } = updateUserStatusSchema.parse(req.body);
        const updatedUser = await storage.updateUser(req.params.id, { status });

        if (!updatedUser) {
          return res.status(404).json({ error: "User not found" });
        }

        // Log admin action
        await storage.createAuditLog({
          actorUserId: req.user!.id,
          action: "UPDATE_USER_STATUS",
          meta: { userId: updatedUser.id, status },
        });

        res.json(updatedUser);
      } catch (error) {
        res
          .status(400)
          .json({
            error: error instanceof Error ? error.message : "Invalid input",
          });
      }
    },
  );

  // Submission admin routes
  app.get(
    "/api/admin/submissions",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { contestId, userId, status, page, limit } = req.query;

        const filters: any = {};
        if (contestId) filters.contestId = contestId as string;
        if (userId) filters.userId = userId as string;
        if (status && status !== "all") filters.status = status as string;
        if (page) filters.page = parseInt(page as string, 10);
        if (limit) filters.limit = parseInt(limit as string, 10);

        const submissions = await storage.getSubmissions(filters);
        res.json(submissions);
      } catch (error) {
        console.error("Error fetching admin submissions:", error);
        res.status(500).json({ error: "Failed to fetch submissions" });
      }
    },
  );

  app.patch(
    "/api/admin/submissions/:id",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { status } = updateSubmissionStatusSchema.parse(req.body);
        const updatedSubmission = await storage.updateSubmission(
          req.params.id,
          { status },
        );

        if (!updatedSubmission) {
          return res.status(404).json({ error: "Submission not found" });
        }

        // Refund entry fee if submission is rejected
        if (status === "rejected") {
          await refundEntryFee(req.params.id);
        }

        // Log admin action
        await storage.createAuditLog({
          actorUserId: req.user!.id,
          action: "UPDATE_SUBMISSION_STATUS",
          meta: {
            submissionId: updatedSubmission.id,
            status,
            userId: updatedSubmission.userId,
          },
        });

        res.json(updatedSubmission);
      } catch (error) {
        res
          .status(400)
          .json({
            error: error instanceof Error ? error.message : "Invalid input",
          });
      }
    },
  );

  app.delete(
    "/api/admin/submissions/:id",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const submission = await storage.getSubmission(req.params.id);
        if (!submission) {
          return res.status(404).json({ error: "Submission not found" });
        }

        // Delete the file from storage (Cloudinary or local)
        const isLegacy =
          submission.mediaUrl.includes("cloudinary.com") &&
          !submission.cloudinaryPublicId;

        await deleteFile(
          submission.mediaUrl,
          submission.cloudinaryPublicId || undefined,
          submission.cloudinaryResourceType || undefined,
          isLegacy,
        );

        // Delete from database
        await storage.deleteSubmission(req.params.id);

        // Log admin action
        await storage.createAuditLog({
          actorUserId: req.user!.id,
          action: "DELETE_SUBMISSION",
          meta: { submissionId: submission.id, userId: submission.userId },
        });

        res.json({ message: "Submission deleted successfully" });
      } catch (error) {
        console.error("Error deleting submission:", error);
        res.status(500).json({
          error: "Failed to delete submission",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Bulk submission operations
  app.patch(
    "/api/admin/submissions/bulk/approve",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { submissionIds } = bulkSubmissionIdsSchema.parse(req.body);

        let count = 0;
        for (const id of submissionIds) {
          const updated = await storage.updateSubmission(id, {
            status: "approved",
          });
          if (updated) {
            count++;
            await storage.createAuditLog({
              actorUserId: req.user!.id,
              action: "UPDATE_SUBMISSION_STATUS",
              meta: {
                submissionId: id,
                status: "approved",
                userId: updated.userId,
              },
            });
          }
        }

        res.json({ count, message: `${count} submission(s) approved` });
      } catch (error) {
        res
          .status(400)
          .json({
            error: error instanceof Error ? error.message : "Invalid input",
          });
      }
    },
  );

  app.patch(
    "/api/admin/submissions/bulk/reject",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { submissionIds } = bulkSubmissionIdsSchema.parse(req.body);

        let count = 0;
        for (const id of submissionIds) {
          const updated = await storage.updateSubmission(id, {
            status: "rejected",
          });
          if (updated) {
            count++;
            // Refund entry fee
            await refundEntryFee(id);

            await storage.createAuditLog({
              actorUserId: req.user!.id,
              action: "UPDATE_SUBMISSION_STATUS",
              meta: {
                submissionId: id,
                status: "rejected",
                userId: updated.userId,
              },
            });
          }
        }

        res.json({ count, message: `${count} submission(s) rejected` });
      } catch (error) {
        res
          .status(400)
          .json({
            error: error instanceof Error ? error.message : "Invalid input",
          });
      }
    },
  );

  app.delete(
    "/api/admin/submissions/bulk",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { submissionIds } = bulkSubmissionIdsSchema.parse(req.body);

        let count = 0;
        for (const id of submissionIds) {
          const submission = await storage.getSubmission(id);
          if (submission) {
            // Delete files from storage (Cloudinary or local)
            const isLegacy =
              submission.mediaUrl.includes("cloudinary.com") &&
              !submission.cloudinaryPublicId;

            await deleteFile(
              submission.mediaUrl,
              submission.cloudinaryPublicId || undefined,
              submission.cloudinaryResourceType || undefined,
              isLegacy,
            );

            // Delete from database
            await storage.deleteSubmission(id);

            // Log admin action
            await storage.createAuditLog({
              actorUserId: req.user!.id,
              action: "DELETE_SUBMISSION",
              meta: { submissionId: id, userId: submission.userId },
            });

            count++;
          }
        }

        res.json({ count, message: `${count} submission(s) deleted` });
      } catch (error) {
        console.error("Error deleting submissions:", error);
        res.status(500).json({
          error: "Failed to delete submissions",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Cleanup broken submissions
  app.post(
    "/api/admin/cleanup-broken-submissions",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const allSubmissions = await storage.getSubmissions({
          status: "approved",
        });
        const brokenSubmissions: string[] = [];

        // Check each submission's media URL
        for (const submission of allSubmissions) {
          try {
            // Try to fetch the URL to see if it exists
            const response = await fetch(submission.mediaUrl, {
              method: "HEAD",
            });
            if (!response.ok) {
              brokenSubmissions.push(submission.id);
            }
          } catch (error) {
            // URL is broken or unreachable
            brokenSubmissions.push(submission.id);
          }
        }

        // Delete broken submissions
        let deletedCount = 0;
        for (const id of brokenSubmissions) {
          const submission = await storage.getSubmission(id);
          if (submission) {
            await storage.deleteSubmission(id);
            await storage.createAuditLog({
              actorUserId: req.user!.id,
              action: "DELETE_SUBMISSION",
              meta: {
                submissionId: id,
                userId: submission.userId,
                reason: "broken_media_url",
              },
            });
            deletedCount++;
          }
        }

        res.json({
          message: `Cleanup completed: ${deletedCount} broken submission(s) removed`,
          deletedCount,
          brokenSubmissionIds: brokenSubmissions,
        });
      } catch (error) {
        console.error("Error during cleanup:", error);
        res.status(500).json({
          error: "Failed to cleanup broken submissions",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // Cashout admin routes
  app.get(
    "/api/admin/cashouts",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { status } = req.query;
        const filters: any = {};
        if (status && status !== "all") {
          filters.status = status;
        }

        const requests = await storage.getCashoutRequests(filters);
        res.json({ requests });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch cashout requests" });
      }
    },
  );

  app.patch(
    "/api/admin/cashouts/:id/status",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { status, notes } = updateCashoutStatusSchema.parse(req.body);

        const request = await storage.getCashoutRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "Cashout request not found" });
        }

        // Update status
        const updated = await storage.updateCashoutRequest(req.params.id, {
          status,
        });

        // Create event log
        await storage.createCashoutEvent({
          cashoutRequestId: req.params.id,
          fromStatus: request.status,
          toStatus: status,
          actorUserId: req.user!.id,
          notes: notes || `Status updated to ${status}`,
        });

        // If approved, deduct from user's GLORY balance
        if (status === "approved") {
          await storage.createGloryTransaction({
            userId: request.userId,
            delta: -request.amountGlory,
            currency: "GLORY",
            reason: `Cashout request approved: ${request.amountToken} ${request.tokenType}`,
          });
        }

        res.json({ request: updated });
      } catch (error) {
        res
          .status(400)
          .json({
            error: error instanceof Error ? error.message : "Invalid input",
          });
      }
    },
  );

  // Audit logs
  app.get(
    "/api/admin/audit-logs",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { limit } = req.query;
        const limitNum = limit ? parseInt(limit as string, 10) : 100;
        const logs = await storage.getAuditLogs(limitNum);
        res.json(logs);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch audit logs" });
      }
    },
  );

  // Site settings
  app.get(
    "/api/admin/settings",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const settings = await storage.getSiteSettings();
        res.json(settings || {});
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch site settings" });
      }
    },
  );

  app.patch(
    "/api/admin/settings",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        // Validate the request body using partial schema for updates
        const updateSchema = insertSiteSettingsSchema.partial();
        const updates = updateSchema.parse(req.body);

        const settings = await storage.updateSiteSettings(updates);

        // Log the change in audit log
        await storage.createAuditLog({
          actorUserId: req.user!.id,
          action: "UPDATE_SITE_SETTINGS",
          meta: { updates },
        });

        res.json(settings);
      } catch (error) {
        res.status(500).json({ error: "Failed to update settings" });
      }
    },
  );

  // ============================================================================
  // BULK USER OPERATIONS
  // ============================================================================

  // Bulk approve users
  app.patch(
    "/api/admin/users/bulk/approve",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { userIds } = z
          .object({ userIds: z.array(z.string()).min(1) })
          .parse(req.body);

        let updatedCount = 0;
        const updatedUsers = [];

        for (const userId of userIds) {
          const user = await storage.updateUser(userId, { status: "approved" });
          if (user) {
            updatedCount++;
            updatedUsers.push({
              id: user.id,
              username: user.username,
              email: user.email,
            });
          }
        }

        // Log admin action
        await storage.createAuditLog({
          actorUserId: req.user!.id,
          action: "BULK_APPROVE_USERS",
          meta: { userIds, updatedUsers, updatedCount },
        });

        res.json({
          success: true,
          updatedCount,
          message: `Successfully approved ${updatedCount} users`,
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

  // Bulk delete users
  app.delete(
    "/api/admin/users/bulk",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        // Ensure we always send JSON responses
        res.setHeader("Content-Type", "application/json");

        const { userIds } = req.body;

        if (!Array.isArray(userIds) || userIds.length === 0) {
          return res.status(400).json({ error: "User IDs array is required" });
        }

        // Check if storage methods exist
        if (typeof storage.getUsersByIds !== "function") {
          console.error("ERROR: storage.getUsersByIds is not a function");
          return res
            .status(500)
            .json({ error: "Storage method getUsersByIds not implemented" });
        }

        if (typeof storage.bulkDeleteUsers !== "function") {
          console.error("ERROR: storage.bulkDeleteUsers is not a function");
          return res
            .status(500)
            .json({ error: "Storage method bulkDeleteUsers not implemented" });
        }

        // Get user details before deletion for audit logging
        const usersToDelete = await storage.getUsersByIds(userIds);

        if (usersToDelete.length === 0) {
          return res.status(404).json({ error: "No users found to delete" });
        }

        // Delete users and all associated data
        const deletedCount = await storage.bulkDeleteUsers(userIds);

        // Log the bulk deletion
        await storage.createAuditLog({
          actorUserId: req.user!.id,
          action: "BULK_DELETE_USERS",
          meta: {
            deletedUserIds: userIds,
            deletedUsers: usersToDelete.map((u) => ({
              id: u.id,
              username: u.username,
              email: u.email,
            })),
            deletedCount,
          },
        });

        res.json({
          success: true,
          deletedCount,
          message: `Successfully deleted ${deletedCount} users and all associated data`,
        });
      } catch (error) {
        // Ensure we send JSON error response
        res.setHeader("Content-Type", "application/json");
        res
          .status(500)
          .json({
            error: "Failed to delete users",
            details: error instanceof Error ? error.message : "Unknown error",
          });
      }
    },
  );

  // Update user balance (supports GLORY, SOL, USDC)
  app.patch(
    "/api/admin/users/:id/balance",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { amount, operation, currency = "GLORY" } = req.body;
        const userId = req.params.id;

        // Generate unique request ID to track duplicates
        const requestId = `${Date.now()}-${Math.random()}`;

        // Additional protection: Global rate limit per admin user (max 1 balance operation per 3 seconds)
        const adminRateLimitKey = `admin-balance:${req.user!.id}`;
        const lastAdminRequest = recentGloryRequests.get(adminRateLimitKey);
        if (lastAdminRequest && Date.now() - lastAdminRequest < 3000) {
          return res
            .status(429)
            .json({
              error: "Please wait before making another balance change.",
            });
        }

        // Create request signature to detect duplicates
        const requestSignature = `${userId}-${amount}-${operation}-${currency}`;
        const now = Date.now();
        const lastRequest = recentGloryRequests.get(requestSignature);

        // If same request within 5 seconds, reject as duplicate (increased from 2 seconds)
        if (lastRequest && now - lastRequest < 5000) {
          return res
            .status(429)
            .json({
              error:
                "Duplicate request detected. Please wait before trying again.",
            });
        }

        // Store this request and admin rate limit
        recentGloryRequests.set(requestSignature, now);
        recentGloryRequests.set(adminRateLimitKey, now);

        // Clean up old entries (older than 10 seconds)
        const keysToDelete: string[] = [];
        recentGloryRequests.forEach((timestamp, key) => {
          if (now - timestamp > 10000) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach((key) => recentGloryRequests.delete(key));

        if (typeof amount !== "number" || amount < 0 || isNaN(amount)) {
          return res
            .status(400)
            .json({ error: "Valid amount (including 0) is required" });
        }

        if (!["set", "add", "subtract"].includes(operation)) {
          return res
            .status(400)
            .json({
              error: "Invalid operation. Must be 'set', 'add', or 'subtract'",
            });
        }

        // Get current user
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        let newBalance: number;
        let delta: number;
        let reason: string;
        let currentBalance = user.gloryBalance;

        if (currency === "SOL") currentBalance = user.solBalance;
        else if (currency === "USDC") currentBalance = user.usdcBalance;

        switch (operation) {
          case "set":
            newBalance = amount;
            delta = amount - currentBalance;
            reason = `Admin set balance to ${amount} ${currency}`;
            break;
          case "add":
            newBalance = currentBalance + amount;
            delta = amount;
            reason = `Admin added ${amount} ${currency}`;
            break;
          case "subtract":
            newBalance = Math.max(0, currentBalance - amount);
            delta = -Math.min(amount, currentBalance);
            reason = `Admin subtracted ${Math.min(amount, currentBalance)} ${currency}`;
            break;
          default:
            return res.status(400).json({ error: "Invalid operation" });
        }

        // Create transaction record which will also update user balance
        if (delta !== 0) {
          await storage.createGloryTransaction({
            userId,
            delta,
            currency,
            reason,
            contestId: null,
            submissionId: null,
          });
        }

        // Get updated user to return latest balance
        const updatedUser = await storage.getUser(userId);
        if (!updatedUser) {
          return res
            .status(500)
            .json({ error: "Failed to get updated user balance" });
        }

        // Get final balance based on currency
        let finalBalance = updatedUser.gloryBalance;
        if (currency === "SOL") finalBalance = updatedUser.solBalance;
        else if (currency === "USDC") finalBalance = updatedUser.usdcBalance;

        // Log admin action
        await storage.createAuditLog({
          actorUserId: req.user!.id,
          action: "UPDATE_USER_BALANCE",
          meta: {
            targetUserId: userId,
            operation,
            amount,
            currency,
            oldBalance: currentBalance,
            newBalance: finalBalance,
            delta,
          },
        });

        res.json({
          success: true,
          newBalance: finalBalance,
          delta,
          operation,
          currency,
          message: `${currency} balance ${operation === "set" ? "set to" : operation === "add" ? "increased by" : "decreased by"} ${amount}`,
          userData: {
            id: updatedUser.id,
            username: updatedUser.username,
            gloryBalance: updatedUser.gloryBalance,
            solBalance: updatedUser.solBalance,
            usdcBalance: updatedUser.usdcBalance,
          },
        });
      } catch (error) {
        console.error("Error updating balance:", error);
        res.status(500).json({ error: "Failed to update balance" });
      }
    },
  );

  // ============================================================================
  // BULK CASHOUT OPERATIONS
  // ============================================================================

  // Direct approve cashout
  app.post(
    "/api/admin/cashout/approve",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { requestId } = approveCashoutSchema.parse(req.body);
        const adminId = req.user!.id;

        const request = await storage.getCashoutRequest(requestId);
        if (!request) {
          return res.status(404).json({ error: "Cashout request not found" });
        }

        if (request.status !== "pending") {
          return res
            .status(400)
            .json({ error: "Only pending requests can be approved" });
        }

        const updatedRequest = await storage.updateCashoutRequest(requestId, {
          status: "approved",
          adminId,
        });

        await storage.createCashoutEvent({
          cashoutRequestId: requestId,
          fromStatus: "pending",
          toStatus: "approved",
          actorUserId: adminId,
          notes: "Request approved by admin",
        });

        await storage.createGloryTransaction({
          userId: request.userId,
          delta: -request.amountGlory,
          currency: "GLORY",
          reason: `Cashout request approved`,
          contestId: null,
          submissionId: null,
        });

        await storage.createAuditLog({
          actorUserId: adminId,
          action: "APPROVE_CASHOUT",
          meta: {
            cashoutRequestId: requestId,
            userId: request.userId,
            amountGlory: request.amountGlory,
          },
        });

        res.json({ request: updatedRequest });
      } catch (error) {
        res
          .status(400)
          .json({
            error:
              error instanceof Error
                ? error.message
                : "Failed to approve cashout request",
          });
      }
    },
  );

  // Direct reject cashout
  app.post(
    "/api/admin/cashout/reject",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { requestId, rejectionReason } = rejectCashoutSchema.parse(
          req.body,
        );
        const adminId = req.user!.id;

        const request = await storage.getCashoutRequest(requestId);
        if (!request) {
          return res.status(404).json({ error: "Cashout request not found" });
        }

        if (request.status !== "pending") {
          return res
            .status(400)
            .json({ error: "Only pending requests can be rejected" });
        }

        const updatedRequest = await storage.updateCashoutRequest(requestId, {
          status: "rejected",
          adminId,
          rejectionReason,
        });

        await storage.createCashoutEvent({
          cashoutRequestId: requestId,
          fromStatus: "pending",
          toStatus: "rejected",
          actorUserId: adminId,
          notes: rejectionReason || "Request rejected by admin",
        });

        await storage.createAuditLog({
          actorUserId: adminId,
          action: "REJECT_CASHOUT",
          meta: {
            cashoutRequestId: requestId,
            userId: request.userId,
            amountGlory: request.amountGlory,
            reason: rejectionReason,
          },
        });

        res.json({ request: updatedRequest });
      } catch (error) {
        res
          .status(400)
          .json({
            error:
              error instanceof Error
                ? error.message
                : "Failed to reject cashout request",
          });
      }
    },
  );

  // Bulk approve cashouts
  app.post(
    "/api/admin/cashout/bulk-approve",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { requestIds } = bulkCashoutIdsSchema.parse(req.body);
        const adminId = req.user!.id;

        let approvedCount = 0;
        const errors: string[] = [];

        for (const requestId of requestIds) {
          try {
            const request = await storage.getCashoutRequest(requestId);
            if (!request) {
              errors.push(`Request ${requestId} not found`);
              continue;
            }

            if (request.status !== "pending") {
              errors.push(`Request ${requestId} is not pending`);
              continue;
            }

            await storage.updateCashoutRequest(requestId, {
              status: "approved",
              adminId,
            });

            await storage.createCashoutEvent({
              cashoutRequestId: requestId,
              fromStatus: "pending",
              toStatus: "approved",
              actorUserId: adminId,
              notes: "Request approved by admin (bulk operation)",
            });

            await storage.createGloryTransaction({
              userId: request.userId,
              delta: -request.amountGlory,
              currency: "GLORY",
              reason: `Cashout request approved`,
              contestId: null,
              submissionId: null,
            });

            await storage.createAuditLog({
              actorUserId: adminId,
              action: "APPROVE_CASHOUT",
              meta: {
                cashoutRequestId: requestId,
                userId: request.userId,
                amountGlory: request.amountGlory,
                bulkOperation: true,
              },
            });

            approvedCount++;
          } catch (error) {
            errors.push(
              `Failed to approve request ${requestId}: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }

        res.json({
          approvedCount,
          totalRequested: requestIds.length,
          errors: errors.length > 0 ? errors : undefined,
        });
      } catch (error) {
        res
          .status(400)
          .json({
            error:
              error instanceof Error
                ? error.message
                : "Failed to bulk approve cashout requests",
          });
      }
    },
  );

  // Bulk reject cashouts
  app.post(
    "/api/admin/cashout/bulk-reject",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { requestIds, rejectionReason } = bulkRejectCashoutSchema.parse(
          req.body,
        );
        const adminId = req.user!.id;

        let rejectedCount = 0;
        const errors: string[] = [];

        for (const requestId of requestIds) {
          try {
            const request = await storage.getCashoutRequest(requestId);
            if (!request) {
              errors.push(`Request ${requestId} not found`);
              continue;
            }

            if (request.status !== "pending") {
              errors.push(`Request ${requestId} is not pending`);
              continue;
            }

            await storage.updateCashoutRequest(requestId, {
              status: "rejected",
              adminId,
              rejectionReason,
            });

            await storage.createCashoutEvent({
              cashoutRequestId: requestId,
              fromStatus: "pending",
              toStatus: "rejected",
              actorUserId: adminId,
              notes:
                rejectionReason || "Request rejected by admin (bulk operation)",
            });

            await storage.createAuditLog({
              actorUserId: adminId,
              action: "REJECT_CASHOUT",
              meta: {
                cashoutRequestId: requestId,
                userId: request.userId,
                amountGlory: request.amountGlory,
                reason: rejectionReason,
                bulkOperation: true,
              },
            });

            rejectedCount++;
          } catch (error) {
            errors.push(
              `Failed to reject request ${requestId}: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }

        res.json({
          rejectedCount,
          totalRequested: requestIds.length,
          errors: errors.length > 0 ? errors : undefined,
        });
      } catch (error) {
        res
          .status(400)
          .json({
            error:
              error instanceof Error
                ? error.message
                : "Failed to bulk reject cashout requests",
          });
      }
    },
  );

  // Admin pricing management
  app.get(
    "/api/admin/settings/pricing",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const allPricing = await storage.getAllPricingSettings();
        const pricingObject: Record<string, number> = {};
        allPricing.forEach((value, key) => {
          pricingObject[key] = value;
        });
        res.json(pricingObject);
      } catch (error) {
        console.error("Error fetching pricing settings:", error);
        res.status(500).json({ error: "Failed to fetch pricing settings" });
      }
    },
  );

  app.put(
    "/api/admin/settings/pricing/:key",
    authenticateToken,
    requireAdmin,
    async (req: AuthRequest, res) => {
      try {
        const { key } = req.params;
        const { value } = z
          .object({ value: z.number().min(0) })
          .parse(req.body);

        await storage.updatePricingSetting(key, value);
        res.json({ message: "Pricing updated successfully", key, value });
      } catch (error) {
        console.error("Error updating pricing:", error);
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ error: "Invalid value", details: error.errors });
        }
        res.status(500).json({ error: "Failed to update pricing" });
      }
    },
  );
}

