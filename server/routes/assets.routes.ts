import type { Express } from "express";

// Placeholder Assets routes. This prevents build errors when the router is imported.
// If/when real asset endpoints are needed, implement them here.
export default function registerAssetsRoutes(app: Express) {
  // Health endpoint for assets router (optional)
  app.get("/api/assets/health", (_req, res) => {
    res.json({ ok: true });
  });
}
