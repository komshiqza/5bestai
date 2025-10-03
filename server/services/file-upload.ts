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

export async function uploadToCloudinary(filePath: string, type: "image" | "video"): Promise<{
  url: string;
  publicId: string;
  thumbnailUrl?: string;
}> {
  try {
    const options: any = {
      resource_type: type,
      folder: "5best-submissions",
    };

    if (type === "video") {
      options.transformation = [
        { quality: "auto", fetch_format: "auto" }
      ];
    }

    const result = await cloudinary.uploader.upload(filePath, options);
    
    let thumbnailUrl: string | undefined;
    
    if (type === "video") {
      // Generate video thumbnail
      thumbnailUrl = cloudinary.url(result.public_id, {
        resource_type: "video",
        transformation: [
          { width: 400, height: 400, crop: "fill" },
          { format: "jpg", quality: "auto" }
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
      const type = file.mimetype.startsWith("image/") ? "image" : "video";
      const result = await uploadToCloudinary(file.path, type);
      
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
