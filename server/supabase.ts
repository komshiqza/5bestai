import { createClient } from '@supabase/supabase-js';

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
const PERMANENT_BUCKET = '5best-submissions';

export async function uploadImageToSupabase(
  imageUrl: string,
  userId: string,
  imageId: string,
  versionId: string
): Promise<{ url: string; path: string }> {
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
    
    const filePath = `${userId}/${imageId}/${versionId}.${extension}`;
    
    console.log(`[Supabase] Uploading to bucket: ${TEMP_BUCKET}, path: ${filePath}`);
    
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
    
    console.log(`[Supabase] Upload successful:`, data);
    
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(TEMP_BUCKET)
      .getPublicUrl(filePath);
    
    const publicUrl = publicUrlData.publicUrl;
    
    console.log(`[Supabase] Public URL generated: ${publicUrl}`);
    
    return {
      url: publicUrl,
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
