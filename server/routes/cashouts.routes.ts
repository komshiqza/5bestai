import type { Express } from "express";
import { storage } from "../storage";
import {
  authenticateToken,
  requireApproved,
  type AuthRequest,
} from "../middleware/auth";
import {
  createCashoutRequestSchema,
} from "@shared/schema";

export function registerCashoutRoutes(app: Express): void {
  // POST /api/cashout/request - Create cashout request
  app.post(
    "/api/cashout/request",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const { withdrawalAddress, amountGlory, tokenType } =
          createCashoutRequestSchema.parse(req.body);
        const userId = req.user!.id;

        // Check user balance
        const user = await storage.getUser(userId);
        if (!user || user.gloryBalance < amountGlory) {
          return res.status(400).json({ error: "Insufficient GLORY balance" });
        }

        // Calculate token amount (for MVP, use 1:1 ratio or configure exchange rate)
        const exchangeRate = 1; // 1 GLORY = 1 USDC (adjust as needed)
        const amountToken = (amountGlory * exchangeRate).toString();

        // Create cashout request
        const request = await storage.createCashoutRequest({
          userId,
          withdrawalAddress,
          amountGlory,
          amountToken,
          tokenType: tokenType || "USDC",
          status: "pending",
        });

        // Create event log
        await storage.createCashoutEvent({
          cashoutRequestId: request.id,
          fromStatus: "created",
          toStatus: "pending",
          actorUserId: userId,
          notes: "Cashout request created",
        });

        res.json({ request });
      } catch (error) {
        res
          .status(400)
          .json({
            error:
              error instanceof Error
                ? error.message
                : "Failed to create cashout request",
          });
      }
    },
  );

  // GET /api/cashout/requests - Get user's cashout requests
  app.get(
    "/api/cashout/requests",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const requests = await storage.getCashoutRequests({
          userId: req.user!.id,
        });
        res.json({ requests });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch cashout requests" });
      }
    },
  );

  // GET /api/cashout/requests/:id - Get specific cashout request
  app.get(
    "/api/cashout/requests/:id",
    authenticateToken,
    async (req: AuthRequest, res) => {
      try {
        const request = await storage.getCashoutRequest(req.params.id);
        if (!request) {
          return res.status(404).json({ error: "Cashout request not found" });
        }

        // Check if user owns the request or is admin
        if (request.userId !== req.user!.id && req.user!.role !== "admin") {
          return res.status(403).json({ error: "Unauthorized" });
        }

        const events = await storage.getCashoutEvents(request.id);
        res.json({ request, events });
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch cashout request" });
      }
    },
  );
}




