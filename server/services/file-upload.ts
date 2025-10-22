import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Check if Cloudinary is configured
const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

// Local upload configuration
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter
const fileFilter = (req: any, file: any, cb: any) => {
  // Accept images and videos
  if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image and video files are allowed"), false);
  }
};

export const upload = multer({
  storage: localStorage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

export async function uploadToCloudinary(file: Express.Multer.File): Promise<{
  url: string;
  publicId: string;
  thumbnailUrl?: string;
  resourceType: string;
}> {
  try {
    const isVideo = file.mimetype.startsWith("video/");
    const resourceType = isVideo ? "video" : "image";
    
    // Upload to Cloudinary with optimization
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: resourceType,
      folder: "5best-submissions",
      // Auto-optimization settings
      quality: "auto:good", // Automatic quality optimization
      fetch_format: "auto", // Automatic format selection (WebP, AVIF when supported)
    });

    let thumbnailUrl: string | undefined;
    
    if (isVideo) {
      // Generate video thumbnail using Cloudinary transformation
      thumbnailUrl = cloudinary.url(result.public_id, {
        resource_type: "video",
        format: "jpg",
        transformation: [
          { width: 400, height: 400, crop: "fill", quality: "auto:good" },
          { fetch_format: "auto" }
        ]
      });
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      thumbnailUrl,
      resourceType,
    };
  } catch (error) {
    throw new Error(`Cloudinary upload failed: ${error}`);
  }
}

export async function uploadFile(file: Express.Multer.File): Promise<{
  url: string;
  thumbnailUrl?: string;
  cloudinaryPublicId?: string;
  cloudinaryResourceType?: string;
}> {
  if (isCloudinaryConfigured()) {
    try {
      const result = await uploadToCloudinary(file);
      
      // Clean up local file
      fs.unlinkSync(file.path);
      
      return {
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        cloudinaryPublicId: result.publicId,
        cloudinaryResourceType: result.resourceType,
      };
    } catch (error) {
      console.error("Cloudinary upload failed, falling back to local:", error);
    }
  }

  // Fallback to local storage
  const url = `/uploads/${file.filename}`;
  
  let thumbnailUrl: string | undefined;
  if (file.mimetype.startsWith("video/")) {
    // For videos, use a placeholder thumbnail in local mode
    thumbnailUrl = "/api/placeholder/video-thumbnail";
  }

  return { url, thumbnailUrl };
}

export async function deleteFile(
  mediaUrl: string, 
  cloudinaryPublicId?: string | null,
  cloudinaryResourceType?: string,
  isLegacySubmission: boolean = false
): Promise<void> {
  try {
    // Handle Cloudinary URLs
    if (mediaUrl.includes('cloudinary.com')) {
      let publicIdToDelete = cloudinaryPublicId;
      let resourceType = cloudinaryResourceType || 'image';
      
      // If no publicId stored, check if this is legacy or gallery reuse
      if (!publicIdToDelete) {
        if (isLegacySubmission) {
          // Legacy submission: parse URL to extract publicId
          console.log('Legacy Cloudinary submission - parsing URL for deletion');
          
          const urlParts = mediaUrl.split('/');
          const uploadIndex = urlParts.indexOf('upload');
          
          // Determine resource type from URL
          const resourceTypeIndex = uploadIndex - 1;
          if (resourceTypeIndex >= 0) {
            resourceType = urlParts[resourceTypeIndex] === 'video' ? 'video' : 'image';
          }
          
          if (uploadIndex !== -1) {
            // Find the version part (starts with 'v' followed by numbers)
            let versionIndex = -1;
            for (let i = uploadIndex + 1; i < urlParts.length; i++) {
              if (urlParts[i].match(/^v\d+$/)) {
                versionIndex = i;
                break;
              }
            }
            
            if (versionIndex !== -1 && versionIndex + 1 < urlParts.length) {
              // Get everything after version as the public_id path
              const pathAfterVersion = urlParts.slice(versionIndex + 1).join('/');
              // Remove file extension
              publicIdToDelete = pathAfterVersion.replace(/\.[^/.]+$/, '');
            }
          }
        } else {
          // No publicId and not legacy = gallery reuse, don't delete
          console.log(`Skipping Cloudinary deletion - no publicId stored (likely gallery reuse): ${mediaUrl}`);
          return;
        }
      }
      
      if (publicIdToDelete) {
        await cloudinary.uploader.destroy(publicIdToDelete, {
          resource_type: resourceType
        });
        console.log(`Deleted Cloudinary asset: ${publicIdToDelete} (${resourceType})`);
      }
    } else if (mediaUrl.startsWith('/uploads/')) {
      // Local file - extract filename and delete
      const fileName = mediaUrl.replace('/uploads/', '');
      const filePath = path.join(process.cwd(), "public", "uploads", fileName);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Deleted local file: ${fileName}`);
      }
    }
  } catch (error) {
    console.error(`File deletion failed: ${error}`);
    // Don't throw error - we still want to delete the database record even if file deletion fails
  }
}

/**
 * Generate thumbnail from image URL and upload to Cloudinary
 * @param imageUrl - Source image URL (can be from Supabase or Cloudinary)
 * @param thumbnailSize - Size of thumbnail (default: 200x200)
 * @returns Cloudinary thumbnail URL
 */
export async function generateAndUploadThumbnail(
  imageUrl: string,
  thumbnailSize: number = 200
): Promise<string> {
  if (!isCloudinaryConfigured()) {
    console.warn("Cloudinary not configured, skipping thumbnail generation");
    return imageUrl; // Return original URL as fallback
  }

  try {
    // Download image from URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Resize to thumbnail using sharp
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(thumbnailSize, thumbnailSize, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 85 }) // Convert to JPEG for smaller size
      .toBuffer();
    
    // Upload to Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: '5best-thumbnails',
          resource_type: 'image',
          quality: 'auto:good',
          fetch_format: 'auto'
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      uploadStream.end(thumbnailBuffer);
    });
    
    console.log(`Thumbnail uploaded to Cloudinary: ${uploadResult.secure_url}`);
    return uploadResult.secure_url;
  } catch (error) {
    console.error("Thumbnail generation failed:", error);
    return imageUrl; // Return original URL as fallback
  }
}
