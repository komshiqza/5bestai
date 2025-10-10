import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import path from "path";
import fs from "fs";

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
}> {
  try {
    const isVideo = file.mimetype.startsWith("video/");
    
    // Upload to Cloudinary with optimization
    const result = await cloudinary.uploader.upload(file.path, {
      resource_type: isVideo ? "video" : "image",
      folder: "5best-submissions",
      // Auto-optimization settings
      quality: "auto:good", // Automatic quality optimization
      fetch_format: "auto", // Automatic format selection (WebP, AVIF when supported)
      // For images, enable responsive breakpoints
      ...(isVideo ? {} : {
        responsive_breakpoints: {
          create_derived: true,
          bytes_step: 20000,
          min_width: 400,
          max_width: 1920,
          transformation: {
            quality: "auto:good",
            fetch_format: "auto"
          }
        }
      })
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
    };
  } catch (error) {
    throw new Error(`Cloudinary upload failed: ${error}`);
  }
}

export async function uploadFile(file: Express.Multer.File): Promise<{
  url: string;
  thumbnailUrl?: string;
}> {
  if (isCloudinaryConfigured()) {
    try {
      const result = await uploadToCloudinary(file);
      
      // Clean up local file
      fs.unlinkSync(file.path);
      
      return {
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
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

export async function deleteFile(mediaUrl: string): Promise<void> {
  try {
    // Check if it's a Cloudinary URL
    if (mediaUrl.includes('cloudinary.com')) {
      // Extract public_id from Cloudinary URL
      // URL format: https://res.cloudinary.com/[cloud]/image/upload/v[version]/[folder]/[public_id].[ext]
      const urlParts = mediaUrl.split('/');
      const uploadIndex = urlParts.indexOf('upload');
      
      if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
        // Get everything after 'upload/v{version}/' as the public_id
        const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
        // Remove file extension
        const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');
        
        if (publicId) {
          // Determine resource type from URL
          const resourceType = urlParts.includes('video') ? 'video' : 'image';
          
          await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
          });
        }
      }
    } else if (mediaUrl.startsWith('/uploads/')) {
      // Local file - extract filename and delete
      const fileName = mediaUrl.replace('/uploads/', '');
      const filePath = path.join(process.cwd(), "public", "uploads", fileName);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  } catch (error) {
    console.error(`File deletion failed: ${error}`);
    // Don't throw error - we still want to delete the database record even if file deletion fails
  }
}
