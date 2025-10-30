import type { Express } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { storage } from "../storage";
import {
  authenticateToken,
  requireApproved,
  type AuthRequest,
} from "../middleware/auth";
import {
  upload,
  uploadFile,
  deleteFile,
} from "../services/file-upload";
import { copySupabaseFile } from "../supabase";

export function registerSubmissionCrudRoutes(app: Express): void {
  // GET /api/submissions - List all submissions with filters
  app.get("/api/submissions", async (req: AuthRequest, res) => {
    try {
      // Try to authenticate but don't require it
      const authToken = req.cookies.authToken;
      let isUserAdmin = false;
      let currentUserId: string | undefined;

      if (authToken) {
        try {
          const decoded = jwt.verify(
            authToken,
            process.env.SESSION_SECRET!,
          ) as any;
          isUserAdmin = decoded.role === "admin";
          currentUserId = decoded.userId;
        } catch (error) {
          // Token invalid, treat as unauthenticated
        }
      }

      const { contestId, userId, status, tag, page, limit } = req.query;

      // Parse pagination parameters
      const pageNum = page ? parseInt(page as string, 10) : 1;
      const limitNum = limit ? parseInt(limit as string, 10) : 20;

      // Validate pagination parameters
      const validPage = Math.max(1, pageNum);
      const validLimit = Math.min(Math.max(1, limitNum), 100);

      // Helper function to enrich submissions with hasPurchasedPrompt
      const enrichSubmissions = async (submissions: any[]) => {
        if (!currentUserId) return submissions;

        return Promise.all(
          submissions.map(async (submission) => {
            let hasPurchasedPrompt = false;

            if (submission.promptForSale) {
              hasPurchasedPrompt = await storage.checkIfPromptPurchased(
                currentUserId,
                submission.id,
              );
            }

            return {
              ...submission,
              hasPurchasedPrompt,
            };
          }),
        );
      };

      // Set Cache-Control header
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

      // Admins can see all submissions
      if (isUserAdmin) {
        const submissions = await storage.getSubmissions({
          contestId: contestId as string | undefined,
          userId: userId as string | undefined,
          status: status as string | undefined,
          tag: tag as string | undefined,
          page: validPage,
          limit: validLimit,
        });
        const enrichedSubmissions = await enrichSubmissions(submissions);
        return res.json(enrichedSubmissions);
      }

      // Regular users see approved submissions + their own
      const approvedSubmissions = await storage.getSubmissions({
        contestId: contestId as string | undefined,
        userId: userId as string | undefined,
        status: "approved",
        tag: tag as string | undefined,
        page: validPage,
        limit: validLimit,
      });

      if (currentUserId) {
        const ownSubmissions = await storage.getSubmissions({
          contestId: contestId as string | undefined,
          userId: currentUserId,
          status: undefined,
          tag: tag as string | undefined,
          page: 1,
          limit: 1000,
        });

        // Merge and deduplicate
        const submissionMap = new Map();
        [...approvedSubmissions, ...ownSubmissions].forEach((sub) => {
          submissionMap.set(sub.id, sub);
        });

        const mergedSubmissions = Array.from(submissionMap.values());
        const enrichedSubmissions = await enrichSubmissions(mergedSubmissions);
        return res.json(enrichedSubmissions);
      }

      res.json(approvedSubmissions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // POST /api/submissions - Create new submission
  app.post(
    "/api/submissions",
    authenticateToken,
    requireApproved,
    upload.single("file"),
    async (req: AuthRequest, res) => {
      try {
        const {
          contestId,
          title,
          description,
          type,
          mediaUrl,
          thumbnailUrl,
          paymentTxHash,
          category,
          aiModel,
          prompt,
          tags,
          generationId,
          promptForSale,
          promptPrice,
          promptCurrency,
        } = req.body;

        // Check if either file or mediaUrl is provided (gallery selection)
        if (!req.file && !mediaUrl) {
          return res
            .status(400)
            .json({ error: "File or mediaUrl is required" });
        }

        if (!title || !type) {
          return res.status(400).json({ error: "Title and type are required" });
        }

        // Contest validation only if contestId is provided
        let contest = null;
        if (contestId) {
          contest = await storage.getContest(contestId);
          if (!contest) {
            return res.status(404).json({ error: "Contest not found" });
          }

          if (contest.status !== "active") {
            return res
              .status(400)
              .json({ error: "Contest is not accepting submissions" });
          }

          // Check contest timing for submissions
          const now = new Date();
          if (now < contest.startAt) {
            return res
              .status(400)
              .json({ error: "Contest has not started yet" });
          }
          if (now > contest.endAt) {
            return res.status(400).json({ error: "Contest has ended" });
          }

          // Check submission deadline from contest config
          const config = contest.config as any;
          if (config && config.submissionEndAt) {
            if (now > new Date(config.submissionEndAt)) {
              return res
                .status(400)
                .json({ error: "Submission deadline has passed" });
            }
          }

          // Validate contest type - check if submission type matches contest allowed type
          if (config && config.contestType) {
            const contestType = config.contestType.toLowerCase();
            const submissionType = type.toLowerCase();

            if (contestType === "image" && submissionType !== "image") {
              return res
                .status(400)
                .json({ error: "This contest only accepts image submissions" });
            }
            if (contestType === "video" && submissionType !== "video") {
              return res
                .status(400)
                .json({ error: "This contest only accepts video submissions" });
            }
          }

          // Validate max submissions per user
          if (config && config.maxSubmissions) {
            const userSubmissionsCount =
              await storage.getUserSubmissionsInContest(
                req.user!.id,
                contestId,
              );
            if (userSubmissionsCount >= config.maxSubmissions) {
              return res.status(400).json({
                error: `You have reached the maximum of ${config.maxSubmissions} submission(s) for this contest`,
              });
            }
          }

          // Validate file size limit (if uploading new file)
          if (req.file && config && config.fileSizeLimit) {
            const fileSizeMB = req.file.size / (1024 * 1024);
            if (fileSizeMB > config.fileSizeLimit) {
              return res.status(400).json({
                error: `File size exceeds the limit of ${config.fileSizeLimit}MB for this contest`,
              });
            }
          }

          // Wallet payment validation for contests requiring crypto payments
          if (config && config.entryFee && config.entryFeeAmount) {
            // Smart fallback: if no payment methods configured, allow both balance and wallet for crypto contests
            const isStandardCrypto =
              config.entryFeeCurrency &&
              ["SOL", "USDC"].includes(config.entryFeeCurrency);
            const defaultMethods = isStandardCrypto
              ? ["balance", "wallet"]
              : ["balance"];
            const paymentMethods =
              config.entryFeePaymentMethods || defaultMethods;

            const allowsBalance = paymentMethods.includes("balance");
            const allowsWallet = paymentMethods.includes("wallet");

            // If wallet is the only payment method, require verified transaction
            if (allowsWallet && !allowsBalance) {
              if (!paymentTxHash) {
                return res.status(400).json({
                  error:
                    "This contest requires wallet payment. Please complete the payment with your Solana wallet.",
                });
              }

              // Verify the transaction exists and is valid
              const txRecord =
                await storage.getGloryTransactionByHash(paymentTxHash);
              if (!txRecord) {
                return res.status(400).json({
                  error:
                    "Payment transaction not verified. Please ensure your payment is confirmed on the blockchain.",
                });
              }

              // Verify transaction is for this contest and user
              if (
                txRecord.userId !== req.user!.id ||
                txRecord.contestId !== contestId
              ) {
                return res.status(400).json({
                  error:
                    "Payment transaction verification failed. Transaction does not match contest or user.",
                });
              }
            }
            // If balance payment is allowed, check balance (skip if wallet payment provided)
            else if (allowsBalance && !paymentTxHash) {
              const user = await storage.getUser(req.user!.id);
              if (!user) {
                return res.status(404).json({ error: "User not found" });
              }

              const currency = config.entryFeeCurrency || "GLORY";
              let balance: number = user.gloryBalance;
              if (currency === "SOL") balance = Number(user.solBalance);
              else if (currency === "USDC") balance = Number(user.usdcBalance);

              if (balance < config.entryFeeAmount) {
                return res.status(400).json({
                  error: `Insufficient ${currency} balance. Entry fee is ${config.entryFeeAmount} ${currency}, you have ${balance} ${currency}`,
                });
              }
            }
          }
        }

        let finalMediaUrl: string;
        let finalThumbnailUrl: string | null = null;
        let cloudinaryPublicId: string | null = null;
        let cloudinaryResourceType: string | null = null;
        let isGalleryReuse = false;

        // Upload new file or use existing mediaUrl from gallery
        if (req.file) {
          const uploadResult = await uploadFile(req.file);
          finalMediaUrl = uploadResult.url;
          finalThumbnailUrl = uploadResult.thumbnailUrl || null;
          cloudinaryPublicId = uploadResult.cloudinaryPublicId || null;
          cloudinaryResourceType = uploadResult.cloudinaryResourceType || null;
        } else {
          // Security: Validate URL belongs to allowed domains and user's storage path
          const supabaseUrl = process.env.SUPABASE_URL;
          const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;

          const isSupabase =
            mediaUrl.includes(supabaseUrl!) &&
            mediaUrl.includes("pro-edit-images") &&
            mediaUrl.includes(req.user!.id);

          const isCloudinaryAI =
            mediaUrl.includes("cloudinary.com") &&
            mediaUrl.includes(cloudinaryCloudName!) &&
            mediaUrl.includes("5best-ai-generated");

          // Verify ownership before copying from temporary storage
          if (isSupabase) {
            const pathMatch = mediaUrl.match(/pro-edit-images\/([^/]+)/);
            if (!pathMatch || pathMatch[1] !== req.user!.id) {
              return res
                .status(403)
                .json({ error: "Unauthorized: Image does not belong to you" });
            }
          } else if (isCloudinaryAI) {
            const generations = await storage.getAiGenerations(req.user!.id);
            const ownsImage = generations.some(
              (gen) => gen.imageUrl === mediaUrl,
            );
            if (!ownsImage) {
              return res
                .status(403)
                .json({ error: "Unauthorized: Image does not belong to you" });
            }
          }

          if (isSupabase) {
            // Copy from temporary Supabase to permanent bucket
            const timestamp = Date.now();
            const extension = mediaUrl.split(".").pop()?.split("?")[0] || "png";
            const destPath = `${req.user!.id}/submissions/${timestamp}.${extension}`;

            const { url } = await copySupabaseFile(mediaUrl, destPath);
            finalMediaUrl = url;
            finalThumbnailUrl = url; // Use Supabase URL directly, no Cloudinary thumbnail needed
            isGalleryReuse = false;
          } else if (isCloudinaryAI) {
            // Copy AI image from temporary folder to permanent folder
            const { copyCloudinaryFile } = await import("../supabase");
            const copyResult = await copyCloudinaryFile(mediaUrl, req.user!.id);
            finalMediaUrl = copyResult.url;
            finalThumbnailUrl = copyResult.thumbnailUrl;
            cloudinaryPublicId = copyResult.publicId;
            cloudinaryResourceType = copyResult.resourceType;
            isGalleryReuse = false;
          } else {
            // Using existing image from permanent gallery - don't delete shared asset
            finalMediaUrl = mediaUrl;
            finalThumbnailUrl = thumbnailUrl || null;
            isGalleryReuse = true;
            // Note: cloudinaryPublicId stays null to prevent deletion of shared asset
          }
        }

        // Capture entry fee at submission time to preserve original amount
        const config = contest ? (contest.config as any) : null;
        const entryFeeAmount =
          config?.entryFee && config?.entryFeeAmount
            ? String(config.entryFeeAmount)
            : null;
        const entryFeeCurrency = entryFeeAmount
          ? config?.entryFeeCurrency || "GLORY"
          : null;

        // Parse tags if they're a JSON string (from FormData)
        let parsedTags: string[] = [];
        if (tags) {
          try {
            parsedTags = typeof tags === "string" ? JSON.parse(tags) : tags;
          } catch {
            parsedTags = [];
          }
        }

        // Normalize promptForSale to boolean
        const isPromptForSale =
          promptForSale === "true" || promptForSale === true;

        // Create submission
        const submission = await storage.createSubmission({
          userId: req.user!.id,
          contestId: contestId || null,
          contestName: contest ? contest.title : null, // Preserve contest name for historical reference
          type,
          title,
          description: description || "",
          mediaUrl: finalMediaUrl,
          thumbnailUrl: finalThumbnailUrl,
          cloudinaryPublicId,
          cloudinaryResourceType,
          status: "pending", // Requires admin approval
          entryFeeAmount, // Store entry fee amount at submission time
          entryFeeCurrency, // Store entry fee currency at submission time
          category: category || null,
          aiModel: aiModel || null,
          prompt: prompt || null,
          generationId: generationId || null,
          tags: parsedTags,
          promptForSale: isPromptForSale,
          promptPrice: isPromptForSale ? promptPrice || null : null,
          promptCurrency: isPromptForSale ? promptCurrency || "GLORY" : null,
        });

        // Deduct entry fee AFTER submission is successfully created
        if (
          contest &&
          (contest.config as any)?.entryFee &&
          (contest.config as any)?.entryFeeAmount
        ) {
          const config = contest.config as any;
          const currency = config.entryFeeCurrency || "GLORY";

          // Deduct from user balance when paying from balance (no paymentTxHash)
          // If paymentTxHash exists, payment was made via Solana wallet and already verified
          if (!paymentTxHash) {
            // createGloryTransaction automatically updates the user balance
            await storage.createGloryTransaction({
              userId: req.user!.id,
              delta: -config.entryFeeAmount,
              currency,
              reason: `Entry fee for contest: ${contest.title}`,
              contestId: contestId || null,
              submissionId: submission.id,
            });
          }
        }

        res.status(201).json(submission);
      } catch (error) {
        console.error("Submission creation error:", error);
        res.status(500).json({ error: "Failed to create submission" });
      }
    },
  );

  // POST /api/submissions/save-from-ai - Save AI-generated image to permanent storage
  app.post(
    "/api/submissions/save-from-ai",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const { imageUrl, title, description } = req.body;

        if (!imageUrl || !title) {
          return res
            .status(400)
            .json({ error: "imageUrl and title are required" });
        }

        const userId = req.user!.id;

        // Security: Validate URL belongs to allowed domains and user's storage path
        const supabaseUrl = process.env.SUPABASE_URL;
        const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME;

        const isSupabase =
          imageUrl.includes(supabaseUrl!) &&
          imageUrl.includes("pro-edit-images") &&
          imageUrl.includes(userId); // Must be user's own folder

        const isCloudinaryAI =
          imageUrl.includes("cloudinary.com") &&
          imageUrl.includes(cloudinaryCloudName!) &&
          imageUrl.includes("5best-ai-generated");

        if (!isSupabase && !isCloudinaryAI) {
          return res
            .status(403)
            .json({ error: "Invalid image URL or unauthorized access" });
        }

        // Additional validation: Verify the image belongs to this user
        if (isSupabase) {
          // Extract path and verify it starts with userId
          const pathMatch = imageUrl.match(/pro-edit-images\/([^/]+)/);
          if (!pathMatch || pathMatch[1] !== userId) {
            return res
              .status(403)
              .json({ error: "Unauthorized: Image does not belong to you" });
          }
        } else if (isCloudinaryAI) {
          // For Cloudinary AI images, verify user owns a generation with this URL
          const generations = await storage.getAiGenerations(userId);
          const ownsImage = generations.some(
            (gen) => gen.imageUrl === imageUrl,
          );
          if (!ownsImage) {
            return res
              .status(403)
              .json({ error: "Unauthorized: Image does not belong to you" });
          }
        }

        let permanentUrl: string;
        let thumbnailUrl: string | null = null;
        let cloudinaryPublicId: string | null = null;
        let cloudinaryResourceType: string | null = null;

        if (isSupabase) {
          // Copy from temporary Supabase bucket to permanent bucket
          const timestamp = Date.now();
          const extension = imageUrl.split(".").pop()?.split("?")[0] || "png";
          const destPath = `${userId}/submissions/${timestamp}.${extension}`;

          const { url } = await copySupabaseFile(imageUrl, destPath);
          permanentUrl = url;

          // Use Supabase URL directly as thumbnail
          thumbnailUrl = url;
        } else {
          // Copy AI image from temporary folder to permanent folder
          const { copyCloudinaryFile } = await import("../supabase");
          const copyResult = await copyCloudinaryFile(imageUrl, userId);
          permanentUrl = copyResult.url;
          thumbnailUrl = copyResult.thumbnailUrl;
          cloudinaryPublicId = copyResult.publicId;
          cloudinaryResourceType = copyResult.resourceType;
        }

        // Create submission without contestId and generationId
        const submission = await storage.createSubmission({
          userId,
          contestId: null, // No contest - this is for My Submissions
          contestName: null,
          type: "image",
          title,
          description: description || "",
          mediaUrl: permanentUrl,
          thumbnailUrl,
          cloudinaryPublicId,
          cloudinaryResourceType,
          status: "approved", // Auto-approve since it's user's own gallery
          entryFeeAmount: null,
          entryFeeCurrency: null,
        });

        res.status(201).json({
          message: "Image saved to My Submissions",
          submission,
        });
      } catch (error) {
        console.error("Error saving AI image:", error);
        res.status(500).json({ error: "Failed to save image" });
      }
    },
  );

  // GET /api/submissions/:id - Get single submission with enriched data
  app.get("/api/submissions/:id", async (req: AuthRequest, res) => {
    try {
      // Try to authenticate but don't require it
      const authToken = req.cookies.authToken;
      let isUserAdmin = false;
      let currentUserId: string | undefined;

      if (authToken) {
        try {
          const decoded = jwt.verify(
            authToken,
            process.env.SESSION_SECRET!,
          ) as any;
          isUserAdmin = decoded.role === "admin";
          currentUserId = decoded.userId;
        } catch (error) {
          // Token invalid, treat as unauthenticated
        }
      }

      const submission = await storage.getSubmission(req.params.id);

      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Check access permissions
      const isOwnSubmission = currentUserId === submission.userId;
      const isApproved = submission.status === "approved";

      // Allow access if: admin, own submission, or approved submission
      if (!isUserAdmin && !isOwnSubmission && !isApproved) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Get user votes if authenticated
      let hasVoted = false;
      let hasPurchasedPrompt = false;
      if (currentUserId) {
        const vote = await storage.getVote(currentUserId, submission.id);
        hasVoted = !!vote;

        // Check if user has purchased this prompt
        if (submission.promptForSale) {
          hasPurchasedPrompt = await storage.checkIfPromptPurchased(
            currentUserId,
            submission.id,
          );
        }
      }

      // Get user and contest info
      const user = await storage.getUser(submission.userId);
      let contest = null;
      if (submission.contestId) {
        contest = await storage.getContest(submission.contestId);
      }

      const enrichedSubmission = {
        ...submission,
        hasVoted,
        hasPurchasedPrompt,
        voteCount: submission.votesCount,
        user: user
          ? {
              id: user.id,
              username: user.username,
            }
          : null,
        contest: contest
          ? {
              id: contest.id,
              title: contest.title,
              slug: contest.slug,
            }
          : null,
      };

      res.json(enrichedSubmission);
    } catch (error) {
      console.error("Error fetching submission:", error);
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  });

  // PATCH /api/submissions/:id - Update own submission
  app.patch(
    "/api/submissions/:id",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const submission = await storage.getSubmission(req.params.id);
        if (!submission) {
          return res.status(404).json({ error: "Submission not found" });
        }

        if (submission.userId !== req.user!.id) {
          return res
            .status(403)
            .json({ error: "Not authorized to update this submission" });
        }

        const updateSchema = z.object({
          title: z.string().min(1).max(255).optional(),
          description: z.string().max(5000).optional(),
          tags: z.array(z.string()).optional(),
        });

        const validatedData = updateSchema.parse(req.body);
        const updatedSubmission = await storage.updateSubmission(
          req.params.id,
          validatedData,
        );
        res.json(updatedSubmission);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res
            .status(400)
            .json({ error: "Invalid input", details: error.errors });
        }
        console.error("Error updating submission:", error);
        res.status(500).json({ error: "Failed to update submission" });
      }
    },
  );

  // DELETE /api/submissions/:id - Delete own submission
  app.delete(
    "/api/submissions/:id",
    authenticateToken,
    requireApproved,
    async (req: AuthRequest, res) => {
      try {
        const submission = await storage.getSubmission(req.params.id);
        if (!submission) {
          return res.status(404).json({ error: "Submission not found" });
        }

        if (submission.userId !== req.user!.id) {
          return res
            .status(403)
            .json({ error: "Not authorized to delete this submission" });
        }

        // Delete media files
        if (submission.mediaUrl) {
          const isLegacy =
            submission.mediaUrl.includes("cloudinary.com") &&
            !submission.cloudinaryPublicId;

          await deleteFile(
            submission.mediaUrl,
            submission.cloudinaryPublicId || undefined,
            submission.cloudinaryResourceType || undefined,
            isLegacy,
          ).catch((err) => console.error("Failed to delete media:", err));
        }

        await storage.deleteSubmission(req.params.id);
        res.json({ message: "Submission deleted successfully" });
      } catch (error) {
        console.error("Error deleting submission:", error);
        res.status(500).json({ error: "Failed to delete submission" });
      }
    },
  );
}
