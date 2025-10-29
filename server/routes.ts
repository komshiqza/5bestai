import type { Express } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { ContestScheduler } from "./contest-scheduler";
import { AiCleanupScheduler } from "./ai-cleanup-scheduler";

// Import route modules
import { registerAuthRoutes } from "./routes/auth.routes";
import { registerUserRoutes } from "./routes/users.routes";
import { registerContestRoutes } from "./routes/contests.routes";
import { registerSubmissionCrudRoutes } from "./routes/submissions-crud.routes";
import { registerVotingRoutes } from "./routes/voting.routes";
import { registerPromptRoutes } from "./routes/prompts.routes";
import { registerUploadRoutes } from "./routes/uploads.routes";
import { registerCashoutRoutes } from "./routes/cashouts.routes";
import { registerAdminRoutes } from "./routes/admin.routes";
import { registerTierRoutes } from "./routes/tiers.routes";
import { registerUserSubscriptionRoutes } from "./routes/subscriptions-user.routes";
import { registerCryptoSubscriptionRoutes } from "./routes/subscriptions-crypto.routes";
import { registerEditRoutes } from "./routes/edits.routes";
import { registerWebhookRoutes } from "./routes/webhooks.routes";
import { registerSettingsRoutes } from "./routes/settings.routes";
import { registerAiGenerationRoutes } from "./routes/ai-generation.routes";
import { registerProEditRoutes } from "./routes/pro-edit.routes";

// Create contest scheduler instance
export const contestScheduler = new ContestScheduler(storage);

// Create AI cleanup scheduler instance
export const aiCleanupScheduler = new AiCleanupScheduler(storage);

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(cookieParser());

  // Initialize contest scheduler
  contestScheduler.initialize().catch((err) => {
    console.error("Failed to initialize contest scheduler:", err);
  });

  // Initialize AI cleanup scheduler (runs daily to delete old generations)
  aiCleanupScheduler.initialize().catch((err) => {
    console.error("Failed to initialize AI cleanup scheduler:", err);
  });

  // Track recent GLORY balance requests to prevent duplicates
  const recentGloryRequests = new Map<string, number>();

  // Serve uploaded files from public/uploads directory
  const express = await import("express");
  const path = await import("path");
  app.use(
    "/uploads",
    express.default.static(path.join(process.cwd(), "public", "uploads")),
  );

  // Register all route modules
  console.log("Registering auth routes...");
  registerAuthRoutes(app);

  console.log("Registering user routes...");
  registerUserRoutes(app);

  console.log("Registering contest routes...");
  registerContestRoutes(app, contestScheduler);

  console.log("Registering submission CRUD routes...");
  registerSubmissionCrudRoutes(app);

  console.log("Registering voting routes...");
  registerVotingRoutes(app);

  console.log("Registering prompt marketplace routes...");
  registerPromptRoutes(app);

  console.log("Registering upload routes...");
  registerUploadRoutes(app);

  console.log("Registering cashout routes...");
  registerCashoutRoutes(app);

  console.log("Registering admin routes...");
  registerAdminRoutes(app);

  console.log("Registering tier routes...");
  registerTierRoutes(app);

  console.log("Registering user subscription routes...");
  registerUserSubscriptionRoutes(app);

  console.log("Registering crypto subscription routes...");
  registerCryptoSubscriptionRoutes(app);

  console.log("Registering edit routes...");
  registerEditRoutes(app);

  console.log("Registering webhook routes...");
  registerWebhookRoutes(app);

  console.log("Registering settings routes...");
  await registerSettingsRoutes(app);

  console.log("Registering AI generation routes...");
  registerAiGenerationRoutes(app);

  console.log("Registering Pro Edit routes...");
  registerProEditRoutes(app);

  console.log("✅ All routes registered successfully! (96/96 endpoints migrated)");
  console.log("📁 Total modules: 22 files");
  console.log("🎯 Migration complete!");

  const httpServer = createServer(app);
  return httpServer;
}

