import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabaseClient: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseServiceKey) {
  supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
}

// Check if Supabase Storage is configured
const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseServiceKey && supabaseClient);
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

export async function uploadToSupabase(file: Express.Multer.File): Promise<{
  url: string;
  publicId: string;
  thumbnailUrl?: string;
}> {
  if (!supabaseClient) {
    throw new Error("Supabase client not initialized");
  }

  try {
    const fileBuffer = fs.readFileSync(file.path);
    const ext = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    
    // Upload to Supabase Storage bucket
    const { data, error } = await supabaseClient.storage
      .from("5best-uploads")
      .upload(fileName, fileBuffer, {
        contentType: file.mimetype,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from("5best-uploads")
      .getPublicUrl(fileName);

    let thumbnailUrl: string | undefined;
    
    if (file.mimetype.startsWith("video/")) {
      // For videos, we'll use a placeholder for now
      // Supabase doesn't auto-generate video thumbnails like Cloudinary
      thumbnailUrl = undefined;
    }

    return {
      url: publicUrl,
      publicId: fileName,
      thumbnailUrl,
    };
  } catch (error) {
    throw new Error(`Supabase upload failed: ${error}`);
  }
}

export async function uploadFile(file: Express.Multer.File): Promise<{
  url: string;
  thumbnailUrl?: string;
}> {
  if (isSupabaseConfigured()) {
    try {
      const result = await uploadToSupabase(file);
      
      // Clean up local file
      fs.unlinkSync(file.path);
      
      return {
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
      };
    } catch (error) {
      console.error("Supabase upload failed, falling back to local:", error);
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
    // Check if it's a Supabase Storage URL
    if (supabaseClient && mediaUrl.includes('supabase.co/storage')) {
      // Extract filename from Supabase URL
      // URL format: https://[project].supabase.co/storage/v1/object/public/5best-uploads/[filename]
      const urlParts = mediaUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      if (fileName) {
        const { error } = await supabaseClient.storage
          .from("5best-uploads")
          .remove([fileName]);
        
        if (error) {
          console.error(`Supabase file deletion error: ${error.message}`);
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
