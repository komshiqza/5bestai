import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL) {
  throw new Error("SUPABASE_URL is not set");
}

if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_ANON_KEY is not set");
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BUCKET_NAME = 'pro-edit-images';

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
    
    console.log(`[Supabase] Uploading to bucket: ${BUCKET_NAME}, path: ${filePath}`);
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
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
    
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
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

export async function ensureBucketExists(): Promise<void> {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('[Supabase] Error listing buckets:', listError);
      return;
    }
    
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`[Supabase] Creating bucket: ${BUCKET_NAME}`);
      
      const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: true
      });
      
      if (createError) {
        console.error('[Supabase] Error creating bucket:', createError);
      } else {
        console.log(`[Supabase] Bucket created successfully: ${BUCKET_NAME}`);
      }
    } else {
      console.log(`[Supabase] Bucket already exists: ${BUCKET_NAME}`);
    }
  } catch (error) {
    console.error('[Supabase] Error ensuring bucket exists:', error);
  }
}
