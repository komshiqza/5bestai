import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL is not set");
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_ANON_KEY is not set");
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("SUPABASE_SERVICE_KEY is not set");
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const TEMP_BUCKET = 'pro-edit-images';
const PERMANENT_BUCKET = '5best-uploads';

export async function uploadImageToSupabase(
  imageUrl: string,
  userId: string,
  imageId: string,
  versionId: string
): Promise<{ url: string; thumbnailUrl: string; path: string }> {
  try {
    console.log(`[Supabase] Downloading image from: ${imageUrl}`);
    
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const extension = contentType.includes('png') ? 'png' : 'jpg';
    
    // Original file path
    const filePath = `${userId}/${imageId}/${versionId}.${extension}`;
    
    console.log(`[Supabase] Uploading original to bucket: ${TEMP_BUCKET}, path: ${filePath}`);
    
    // Upload original image
    const { data, error } = await supabaseAdmin.storage
      .from(TEMP_BUCKET)
      .upload(filePath, buffer, {
        contentType,
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error('[Supabase] Upload error:', error);
      throw error;
    }
    
    console.log(`[Supabase] Original upload successful:`, data);
    
    // Generate thumbnail (400x400) using Sharp
    console.log(`[Supabase] Generating thumbnail (400x400)...`);
    const thumbnailBuffer = await sharp(buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 }) // Always save thumbnails as JPEG for smaller size
      .toBuffer();
    
    // Thumbnail file path
    const thumbnailPath = `${userId}/${imageId}/thumb_${versionId}.jpg`;
    
    console.log(`[Supabase] Uploading thumbnail to bucket: ${TEMP_BUCKET}, path: ${thumbnailPath}`);
    
    // Upload thumbnail
    const { error: thumbError } = await supabaseAdmin.storage
      .from(TEMP_BUCKET)
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });
    
    if (thumbError) {
      console.warn('[Supabase] Thumbnail upload failed, continuing without it:', thumbError);
    } else {
      console.log(`[Supabase] Thumbnail upload successful`);
    }
    
    // Get public URLs
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(TEMP_BUCKET)
      .getPublicUrl(filePath);
    
    const { data: thumbnailUrlData } = supabaseAdmin.storage
      .from(TEMP_BUCKET)
      .getPublicUrl(thumbnailPath);
    
    const publicUrl = publicUrlData.publicUrl;
    const thumbnailUrl = thumbError ? publicUrl : thumbnailUrlData.publicUrl; // Fallback to original if thumbnail failed
    
    console.log(`[Supabase] Public URL generated: ${publicUrl}`);
    console.log(`[Supabase] Thumbnail URL generated: ${thumbnailUrl}`);
    
    return {
      url: publicUrl,
      thumbnailUrl,
      path: filePath
    };
  } catch (error) {
    console.error('[Supabase] Error uploading image:', error);
    throw new Error(
      `Failed to upload image to Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function copySupabaseFile(
  sourceUrl: string,
  destPath: string
): Promise<{ url: string; path: string }> {
  try {
    console.log(`[Supabase] Copying file from ${sourceUrl} to ${destPath}`);
    
    // Download the source file
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to download source file: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Upload to permanent bucket
    const { data, error } = await supabaseAdmin.storage
      .from(PERMANENT_BUCKET)
      .upload(destPath, buffer, {
        contentType,
        cacheControl: '31536000', // 1 year for permanent files
        upsert: false // Don't overwrite existing files
      });
    
    if (error) {
      console.error('[Supabase] Copy error:', error);
      throw error;
    }
    
    console.log(`[Supabase] File copied successfully:`, data);
    
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(PERMANENT_BUCKET)
      .getPublicUrl(destPath);
    
    const publicUrl = publicUrlData.publicUrl;
    
    console.log(`[Supabase] Permanent URL generated: ${publicUrl}`);
    
    return {
      url: publicUrl,
      path: destPath
    };
  } catch (error) {
    console.error('[Supabase] Error copying file:', error);
    throw new Error(
      `Failed to copy file to permanent storage: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function copyCloudinaryFile(
  sourceUrl: string,
  userId: string
): Promise<{ url: string; thumbnailUrl: string; publicId: string; resourceType: string }> {
  try {
    const { v2: cloudinary } = await import('cloudinary');
    
    console.log(`[Cloudinary] Copying AI image to permanent folder: ${sourceUrl}`);
    
    // Download the image from source URL
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate new public_id in permanent folder
    const timestamp = Date.now();
    const newPublicId = `5best-submissions/${userId}_${timestamp}`;
    
    console.log(`[Cloudinary] Uploading to permanent folder: ${newPublicId}`);
    
    // Upload to Cloudinary using stream for buffer upload
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: newPublicId,
          resource_type: 'image',
          quality: 'auto:good',
          fetch_format: 'auto'
        },
        (error: any, result: any) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      
      uploadStream.end(buffer);
    });
    
    const permanentUrl = result.secure_url;
    
    // Generate thumbnail URL using Cloudinary transformations (no upload needed)
    const thumbnailUrl = cloudinary.url(result.public_id, {
      transformation: [
        { width: 400, height: 400, crop: 'fill', quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });
    
    console.log(`[Cloudinary] Copy successful. URL: ${permanentUrl}`);
    console.log(`[Cloudinary] Thumbnail URL: ${thumbnailUrl}`);
    
    return {
      url: permanentUrl,
      thumbnailUrl,
      publicId: result.public_id,
      resourceType: 'image'
    };
  } catch (error) {
    console.error('[Cloudinary] Error copying file:', error);
    throw new Error(
      `Failed to copy Cloudinary file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export async function ensureBucketExists(): Promise<void> {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('[Supabase] Error listing buckets:', listError);
      return;
    }
    
    const tempBucketExists = buckets?.some(b => b.name === TEMP_BUCKET);
    const permanentBucketExists = buckets?.some(b => b.name === PERMANENT_BUCKET);
    
    if (tempBucketExists) {
      console.log(`[Supabase] Bucket verified: ${TEMP_BUCKET}`);
    } else {
      console.warn(`[Supabase] Bucket not found: ${TEMP_BUCKET}. Please create it manually in Supabase Dashboard.`);
    }
    
    if (permanentBucketExists) {
      console.log(`[Supabase] Bucket verified: ${PERMANENT_BUCKET}`);
    } else {
      console.warn(`[Supabase] Bucket not found: ${PERMANENT_BUCKET}. Please create it manually in Supabase Dashboard.`);
    }
  } catch (error) {
    console.error('[Supabase] Error checking bucket:', error);
  }
}
