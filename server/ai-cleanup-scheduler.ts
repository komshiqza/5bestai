import type { IStorage } from "./storage";
import { db } from "./db";
import { aiGenerations, images, imageVersions, editJobs, submissions } from "@shared/schema";
import { lt, eq, or, inArray } from "drizzle-orm";
import { v2 as cloudinary } from "cloudinary";
import { supabaseAdmin } from "./supabase";

export class AiCleanupScheduler {
  private storage: IStorage;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  async initialize() {
    console.log("[AI Cleanup] Scheduler initialized - running daily at midnight");
    
    // Run cleanup immediately on startup
    await this.runCleanup();
    
    // Then schedule to run daily (24 hours)
    this.intervalId = setInterval(async () => {
      await this.runCleanup();
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
  }

  async runCleanup() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      console.log(`[AI Cleanup] Starting cleanup of generations older than ${sevenDaysAgo.toISOString()}`);

      // Find all AI generations older than 7 days
      const oldGenerations = await db.select()
        .from(aiGenerations)
        .where(lt(aiGenerations.createdAt, sevenDaysAgo));

      console.log(`[AI Cleanup] Found ${oldGenerations.length} generations to delete`);

      let deletedCount = 0;
      let failedCount = 0;

      for (const generation of oldGenerations) {
        try {
          // Skip if this generation is used in a contest submission (permanent)
          const [linkedSubmission] = await db.select()
            .from(submissions)
            .where(eq(submissions.generationId, generation.id))
            .limit(1);
          if (linkedSubmission) {
            console.log(`[AI Cleanup] Skipping permanent generation (linked to submission): ${generation.id}`);
            continue;
          }

          // Delete from Cloudinary if cloudinaryPublicId exists
          if (generation.cloudinaryPublicId) {
            try {
              await cloudinary.uploader.destroy(generation.cloudinaryPublicId);
              console.log(`[AI Cleanup] Deleted from Cloudinary: ${generation.cloudinaryPublicId}`);
            } catch (cloudinaryError) {
              console.error(`[AI Cleanup] Cloudinary deletion failed for ${generation.cloudinaryPublicId}:`, cloudinaryError);
            }
          }

          // Find associated image record for this generation
          const [imageRecord] = await db.select()
            .from(images)
            .where(eq(images.generationId, generation.id))
            .limit(1);

          if (imageRecord) {
            // First get all versions for this image
            const versions = await db.select()
              .from(imageVersions)
              .where(eq(imageVersions.imageId, imageRecord.id));

            if (versions.length > 0) {
              const versionIds = versions.map(v => v.id);
              
              // Delete all edit_jobs that reference these versions (input OR output)
              await db.delete(editJobs)
                .where(
                  or(
                    inArray(editJobs.inputVersionId, versionIds),
                    inArray(editJobs.outputVersionId, versionIds)
                  )
                );
            }

            // Now safe to delete versions
            for (const version of versions) {
              // Delete from Supabase Storage if it's stored there
              if (version.url.includes('supabase.co')) {
                try {
                  const urlParts = version.url.split('/');
                  const bucketName = urlParts[urlParts.indexOf('public') + 1];
                  const filePath = urlParts.slice(urlParts.indexOf('public') + 2).join('/');
                  
                  await supabaseAdmin.storage
                    .from(bucketName)
                    .remove([filePath]);
                  
                  console.log(`[AI Cleanup] Deleted from Supabase: ${filePath}`);
                } catch (supabaseError) {
                  console.error(`[AI Cleanup] Supabase deletion failed for ${version.url}:`, supabaseError);
                }
              }

              // Delete version from DB
              await db.delete(imageVersions)
                .where(eq(imageVersions.id, version.id));
            }

            // Delete image record from DB
            await db.delete(images)
              .where(eq(images.id, imageRecord.id));
          }

          // Delete generation from DB
          await db.delete(aiGenerations)
            .where(eq(aiGenerations.id, generation.id));

          deletedCount++;
        } catch (error) {
          console.error(`[AI Cleanup] Failed to delete generation ${generation.id}:`, error);
          failedCount++;
        }
      }

      console.log(`[AI Cleanup] Cleanup complete: ${deletedCount} deleted, ${failedCount} failed`);
    } catch (error) {
      console.error("[AI Cleanup] Cleanup job failed:", error);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[AI Cleanup] Scheduler stopped");
    }
  }
}
