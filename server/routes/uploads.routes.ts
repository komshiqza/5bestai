import type { Express } from "express";
import {
  authenticateToken,
  type AuthRequest,
} from "../middleware/auth";
import {
  upload,
  uploadFile,
} from "../services/file-upload";

export function registerUploadRoutes(app: Express): void {
  // POST /api/upload - Simple file upload endpoint
  app.post(
    "/api/upload",
    authenticateToken,
    upload.single("file"),
    async (req: AuthRequest, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "File is required" });
        }

        const uploadResult = await uploadFile(req.file);
        res.status(200).json({
          url: uploadResult.url,
          thumbnailUrl: uploadResult.thumbnailUrl,
        });
      } catch (error) {
        console.error("File upload error:", error);
        res.status(500).json({ error: "Failed to upload file" });
      }
    },
  );
}




