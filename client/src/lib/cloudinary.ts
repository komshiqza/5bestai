/**
 * Cloudinary URL transformation utilities for responsive images
 */

export interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | 'auto:good' | 'auto:best' | 'auto:eco' | 'auto:low' | number;
  format?: 'auto' | 'jpg' | 'png' | 'webp' | 'avif';
  crop?: 'fill' | 'fit' | 'scale' | 'limit';
}

/**
 * Transform a Cloudinary URL with responsive image optimizations
 * Returns original URL if not a Cloudinary URL or already has transformations
 */
export function transformCloudinaryUrl(
  url: string,
  options: CloudinaryTransformOptions = {}
): string {
  // Only transform Cloudinary URLs
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  // Check if URL already has transformations (avoid double transformation)
  // Look for transformation prefixes: w_, h_, c_, q_, f_, t_, e_, g_, ar_, dpr_, fl_, bo_, if_
  // This catches parameter-based and named transforms but allows folders (e.g., /upload/user_assets/)
  const hasTransformations = /\/upload\/[^/]*(?:w_|h_|c_|q_|f_|t_|e_|g_|ar_|dpr_|fl_|bo_|if_)/.test(url);
  if (hasTransformations) {
    return url; // Already transformed, return as-is
  }

  const {
    width,
    height,
    quality = 'auto:good',
    format = 'auto',
    crop = 'fill'
  } = options;

  // Build transformation string
  const transformations: string[] = [];
  
  if (quality) {
    transformations.push(`q_${quality}`);
  }
  
  if (format) {
    transformations.push(`f_${format}`);
  }
  
  if (width || height || crop) {
    const parts: string[] = [];
    if (crop) parts.push(`c_${crop}`);
    if (width) parts.push(`w_${width}`);
    if (height) parts.push(`h_${height}`);
    transformations.push(parts.join(','));
  }

  // Find 'upload/' in URL and insert transformations after it
  const uploadPattern = /\/upload\//;
  if (uploadPattern.test(url)) {
    const transformStr = transformations.join(',');
    return url.replace(/\/upload\//, `/upload/${transformStr}/`);
  }

  return url;
}

/**
 * Preset transformations for common use cases
 */
export const cloudinaryPresets = {
  /** Thumbnail for cards and grids (400px width) */
  thumbnail: (url: string) => transformCloudinaryUrl(url, { 
    width: 400, 
    crop: 'fill',
    quality: 'auto:good',
    format: 'auto'
  }),
  
  /** Medium size for detail views (800px width) */
  medium: (url: string) => transformCloudinaryUrl(url, { 
    width: 800, 
    crop: 'fit',
    quality: 'auto:good',
    format: 'auto'
  }),
  
  /** Large for lightbox/fullscreen (1920px width) */
  large: (url: string) => transformCloudinaryUrl(url, { 
    width: 1920, 
    crop: 'fit',
    quality: 'auto:good',
    format: 'auto'
  }),
  
  /** Extra small for mobile thumbnails (200px width) */
  xsmall: (url: string) => transformCloudinaryUrl(url, { 
    width: 200, 
    crop: 'fill',
    quality: 'auto:eco',
    format: 'auto'
  })
};
