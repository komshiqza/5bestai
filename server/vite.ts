import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  // Dynamic OG tags for submission detail (development)
  app.get("/submission/:id", async (req, res, next) => {
    try {
      const url = req.originalUrl;
      const { id } = req.params as { id: string };

      // Load base template
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");

      // Fetch submission details server-side (no auth)
      const { storage } = await import("./storage");
      const submission = await storage.getSubmission(id);

      // Build absolute URLs
      const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
      const host = req.get("host");
      const baseUrl = `${proto}://${host}`;
      const pageUrl = `${baseUrl}/submission/${id}`;
      const imageUrl = submission?.mediaUrl?.startsWith("http")
        ? submission.mediaUrl
        : submission?.mediaUrl
          ? `${baseUrl}${submission.mediaUrl}`
          : undefined;

      // Compose meta content
      const title = submission?.title ? `${submission.title} — 5BEST.ai` : "5BEST.ai";
      const descRaw = submission?.description || (submission?.userId ? "AI-generated image — buy the prompt and create your own on 5BEST.ai" : "Create, share, and monetize AI images on 5BEST.ai");
      const description = (descRaw || "").slice(0, 200);

      // Inject OG/Twitter tags only if we have a submission
      if (submission) {
        const tags = [
          `<meta property="og:title" content="${escapeHtml(title)}">`,
          `<meta property="og:description" content="${escapeHtml(description)}">`,
          imageUrl ? `<meta property="og:image" content="${escapeHtml(imageUrl)}">` : "",
          `<meta property="og:url" content="${escapeHtml(pageUrl)}">`,
          `<meta property="og:type" content="website">`,
          `<meta name="twitter:card" content="summary_large_image">`,
          `<meta name="twitter:title" content="${escapeHtml(title)}">`,
          `<meta name="twitter:description" content="${escapeHtml(description)}">`,
          imageUrl ? `<meta name="twitter:image" content="${escapeHtml(imageUrl)}">` : "",
        ].filter(Boolean).join("\n");

        template = template.replace(
          /<\/head>/i,
          `${tags}\n</head>`
        );
      }

      // dev: add cache-busting to entry and transform by vite
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Dynamic OG tags for submission detail (production)
  app.get("/submission/:id", async (req, res, next) => {
    try {
      const indexPath = path.resolve(distPath, "index.html");
      let template = await fs.promises.readFile(indexPath, "utf-8");

      // Fetch submission details server-side (no auth)
      const { storage } = await import("./storage.js");
      const { id } = req.params as { id: string };
      const submission = await storage.getSubmission(id);

      const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
      const host = req.get("host");
      const baseUrl = `${proto}://${host}`;
      const pageUrl = `${baseUrl}/submission/${id}`;
      const imageUrl = submission?.mediaUrl?.startsWith("http")
        ? submission.mediaUrl
        : submission?.mediaUrl
          ? `${baseUrl}${submission.mediaUrl}`
          : undefined;

      const title = submission?.title ? `${submission.title} — 5BEST.ai` : "5BEST.ai";
      const descRaw = submission?.description || (submission?.userId ? "AI-generated image — buy the prompt and create your own on 5BEST.ai" : "Create, share, and monetize AI images on 5BEST.ai");
      const description = (descRaw || "").slice(0, 200);

      if (submission) {
        const tags = [
          `<meta property=\"og:title\" content=\"${escapeHtml(title)}\">`,
          `<meta property=\"og:description\" content=\"${escapeHtml(description)}\">`,
          imageUrl ? `<meta property=\"og:image\" content=\"${escapeHtml(imageUrl)}\">` : "",
          `<meta property=\"og:url\" content=\"${escapeHtml(pageUrl)}\">`,
          `<meta property=\"og:type\" content=\"website\">`,
          `<meta name=\"twitter:card\" content=\"summary_large_image\">`,
          `<meta name=\"twitter:title\" content=\"${escapeHtml(title)}\">`,
          `<meta name=\"twitter:description\" content=\"${escapeHtml(description)}\">`,
          imageUrl ? `<meta name=\"twitter:image\" content=\"${escapeHtml(imageUrl)}\">` : "",
        ].filter(Boolean).join("\n");

        template = template.replace(/<\/head>/i, `${tags}\n</head>`);
      }

      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      next(e);
    }
  });

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// Small HTML escaper to keep meta content safe
function escapeHtml(str: string) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
