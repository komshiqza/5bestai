import Replicate from "replicate";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Extended AI Model configuration interface
export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  replicateModel: string;
  costPerImage: number;
  
  // Parameter support flags
  supportsAspectRatio: boolean;
  supportsCustomDimensions: boolean; // width/height
  supportsResolution: boolean; // predefined resolutions
  supportsOutputFormat: boolean;
  supportsOutputQuality: boolean;
  supportsNegativePrompt: boolean;
  supportsImageInput: boolean; // image-to-image
  supportsMask: boolean; // inpainting
  
  // Model-specific parameter support
  supportsSeed: boolean; // Random seed for reproducibility
  supportsStyleType: boolean; // Ideogram
  supportsStylePreset: boolean; // Ideogram
  supportsMagicPrompt: boolean; // Ideogram
  supportsStyleReferenceImages: boolean; // Ideogram
  supportsPromptUpsampling: boolean; // Flux 1.1
  supportsSafetyTolerance: boolean; // Flux 1.1
  supportsCfg: boolean; // Stable Diffusion
  supportsPromptStrength: boolean; // Stable Diffusion img2img
  supportsLeonardoStyle: boolean; // Leonardo
  supportsContrast: boolean; // Leonardo
  supportsGenerationMode: boolean; // Leonardo
  supportsPromptEnhance: boolean; // Leonardo
  supportsNumImages: boolean; // Leonardo
}

export const AI_MODELS: Record<string, ModelConfig> = {
  "ideogram-v3": {
    id: "ideogram-v3",
    name: "Ideogram v3 Quality",
    description: "High-quality with 60+ art styles, resolution control",
    replicateModel: "ideogram-ai/ideogram-v3-quality",
    costPerImage: 0.08,
    
    supportsAspectRatio: true,
    supportsCustomDimensions: false,
    supportsResolution: true,
    supportsOutputFormat: false,
    supportsOutputQuality: false,
    supportsNegativePrompt: false,
    supportsImageInput: true,
    supportsMask: true,
    
    supportsSeed: true,
    supportsStyleType: true,
    supportsStylePreset: true,
    supportsMagicPrompt: true,
    supportsStyleReferenceImages: true,
    supportsPromptUpsampling: false,
    supportsSafetyTolerance: false,
    supportsCfg: false,
    supportsPromptStrength: false,
    supportsLeonardoStyle: false,
    supportsContrast: false,
    supportsGenerationMode: false,
    supportsPromptEnhance: false,
    supportsNumImages: false,
  },
  
  "nano-banana": {
    id: "nano-banana",
    name: "Nano Banana",
    description: "Google's Gemini 2.5 Flash - fast, versatile",
    replicateModel: "google/nano-banana",
    costPerImage: 0.039,
    
    supportsAspectRatio: true,
    supportsCustomDimensions: false,
    supportsResolution: false,
    supportsOutputFormat: true,
    supportsOutputQuality: false,
    supportsNegativePrompt: false,
    supportsImageInput: true,
    supportsMask: false,
    
    supportsSeed: false,
    supportsStyleType: false,
    supportsStylePreset: false,
    supportsMagicPrompt: false,
    supportsStyleReferenceImages: false,
    supportsPromptUpsampling: false,
    supportsSafetyTolerance: false,
    supportsCfg: false,
    supportsPromptStrength: false,
    supportsLeonardoStyle: false,
    supportsContrast: false,
    supportsGenerationMode: false,
    supportsPromptEnhance: false,
    supportsNumImages: false,
  },
  
  "flux-1.1-pro": {
    id: "flux-1.1-pro",
    name: "Flux 1.1 Pro",
    description: "6x faster than Flux Pro, highest quality",
    replicateModel: "black-forest-labs/flux-1.1-pro",
    costPerImage: 0.04,
    
    supportsAspectRatio: true,
    supportsCustomDimensions: true,
    supportsResolution: false,
    supportsOutputFormat: true,
    supportsOutputQuality: true,
    supportsNegativePrompt: false,
    supportsImageInput: true,
    supportsMask: false,
    
    supportsSeed: true,
    supportsStyleType: false,
    supportsStylePreset: false,
    supportsMagicPrompt: false,
    supportsStyleReferenceImages: false,
    supportsPromptUpsampling: true,
    supportsSafetyTolerance: true,
    supportsCfg: false,
    supportsPromptStrength: false,
    supportsLeonardoStyle: false,
    supportsContrast: false,
    supportsGenerationMode: false,
    supportsPromptEnhance: false,
    supportsNumImages: false,
  },
  
  "sd-3.5-large": {
    id: "sd-3.5-large",
    name: "Stable Diffusion 3.5 Large",
    description: "Latest SD with improved quality and detail",
    replicateModel: "stability-ai/stable-diffusion-3.5-large",
    costPerImage: 0.055,
    
    supportsAspectRatio: true,
    supportsCustomDimensions: false,
    supportsResolution: false,
    supportsOutputFormat: true,
    supportsOutputQuality: false,
    supportsNegativePrompt: true,
    supportsImageInput: true,
    supportsMask: false,
    
    supportsSeed: true,
    supportsStyleType: false,
    supportsStylePreset: false,
    supportsMagicPrompt: false,
    supportsStyleReferenceImages: false,
    supportsPromptUpsampling: false,
    supportsSafetyTolerance: false,
    supportsCfg: true,
    supportsPromptStrength: true,
    supportsLeonardoStyle: false,
    supportsContrast: false,
    supportsGenerationMode: false,
    supportsPromptEnhance: false,
    supportsNumImages: false,
  },
  
  "leonardo-lucid": {
    id: "leonardo-lucid",
    name: "Leonardo Lucid Origin",
    description: "Professional styles, ultra mode, prompt enhance",
    replicateModel: "leonardoai/lucid-origin",
    costPerImage: 0.045,
    
    supportsAspectRatio: true,
    supportsCustomDimensions: false,
    supportsResolution: false,
    supportsOutputFormat: false,
    supportsOutputQuality: false,
    supportsNegativePrompt: false,
    supportsImageInput: false,
    supportsMask: false,
    
    supportsSeed: false,
    supportsStyleType: false,
    supportsStylePreset: false,
    supportsMagicPrompt: false,
    supportsStyleReferenceImages: false,
    supportsPromptUpsampling: false,
    supportsSafetyTolerance: false,
    supportsCfg: false,
    supportsPromptStrength: false,
    supportsLeonardoStyle: true,
    supportsContrast: true,
    supportsGenerationMode: true,
    supportsPromptEnhance: true,
    supportsNumImages: true,
  },
};

export interface GenerateImageOptions {
  prompt: string;
  model?: string;
  seed?: number;
  
  // Dimension options
  aspectRatio?: string;
  width?: number;
  height?: number;
  resolution?: string;
  
  // Output options
  outputFormat?: string;
  outputQuality?: number;
  
  // Prompt modifiers
  negativePrompt?: string;
  promptUpsampling?: boolean;
  promptEnhance?: boolean;
  magicPromptOption?: string;
  
  // Image input
  imageInput?: string | string[];
  mask?: string;
  
  // Style options (Ideogram)
  styleType?: string;
  stylePreset?: string;
  styleReferenceImages?: string[];
  
  // Leonardo options
  leonardoStyle?: string;
  contrast?: string;
  generationMode?: string;
  numImages?: number;
  
  // Flux options
  safetyTolerance?: number;
  
  // Stable Diffusion options
  cfg?: number;
  promptStrength?: number;
}

export interface GeneratedImage {
  url: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  parameters: Record<string, any>;
}

export async function generateImage(options: GenerateImageOptions): Promise<GeneratedImage[]> {
  const {
    prompt,
    model = "flux-1.1-pro",
    seed,
    aspectRatio = "1:1",
    width,
    height,
    resolution,
    outputFormat = "webp",
    outputQuality = 80,
    negativePrompt,
    promptUpsampling = false,
    promptEnhance = false,
    magicPromptOption = "Auto",
    imageInput,
    mask,
    styleType,
    stylePreset,
    styleReferenceImages,
    leonardoStyle,
    contrast = "medium",
    generationMode = "standard",
    numImages = 1,
    safetyTolerance = 2,
    cfg = 5,
    promptStrength = 0.85,
  } = options;

  // Get model configuration
  const modelConfig = AI_MODELS[model] || AI_MODELS["flux-1.1-pro"];
  
  console.log(`Generating AI image with ${modelConfig.name}...`, { prompt, model });

  try {
    // Helper function to build input parameters for a single generation
    const buildInputParams = () => {
      const input: any = {
        prompt,
      };

      // Add seed if provided
      if (seed !== undefined) {
        input.seed = seed;
      }

      // Model-specific parameter handling
      switch (model) {
        case "ideogram-v3":
          if (resolution && resolution !== "None") {
            input.resolution = resolution;
          } else if (aspectRatio) {
            input.aspect_ratio = aspectRatio;
          }
          if (magicPromptOption) input.magic_prompt_option = magicPromptOption;
          if (styleType && styleType !== "None") input.style_type = styleType;
          if (stylePreset && stylePreset !== "None") input.style_preset = stylePreset;
          if (imageInput) input.image = imageInput;
          if (mask) input.mask = mask;
          if (styleReferenceImages && styleReferenceImages.length > 0) {
            input.style_reference_images = styleReferenceImages;
          }
          break;

        case "nano-banana":
          if (aspectRatio) input.aspect_ratio = aspectRatio;
          if (outputFormat) {
            // Nano Banana only supports jpg/png
            input.output_format = outputFormat === "webp" ? "jpg" : outputFormat;
          }
          if (imageInput) {
            // Handle single image or array
            input.image_input = Array.isArray(imageInput) ? imageInput : [imageInput];
          }
          break;

        case "flux-1.1-pro":
          if (aspectRatio === "custom" && width && height) {
            input.aspect_ratio = "custom";
            input.width = width;
            input.height = height;
          } else if (aspectRatio) {
            input.aspect_ratio = aspectRatio;
          }
          if (outputFormat) input.output_format = outputFormat;
          if (outputQuality) input.output_quality = outputQuality;
          if (promptUpsampling) input.prompt_upsampling = true;
          if (safetyTolerance) input.safety_tolerance = safetyTolerance;
          if (imageInput) input.image_prompt = imageInput;
          break;

        case "sd-3.5-large":
          if (aspectRatio) input.aspect_ratio = aspectRatio;
          if (outputFormat) input.output_format = outputFormat;
          if (negativePrompt) input.negative_prompt = negativePrompt;
          if (cfg) input.cfg = cfg;
          if (imageInput) {
            input.image = imageInput;
            input.prompt_strength = promptStrength;
          }
          break;

        case "leonardo-lucid":
          if (aspectRatio) input.aspect_ratio = aspectRatio;
          if (leonardoStyle && leonardoStyle !== "none") input.style = leonardoStyle;
          if (contrast) input.contrast = contrast;
          if (generationMode) input.generation_mode = generationMode;
          if (promptEnhance !== undefined) input.prompt_enhance = promptEnhance;
          if (numImages) input.num_images = numImages;
          break;
      }

      return input;
    };

    // Leonardo supports native multi-image generation
    const leonardoSupportsMultiImage = model === "leonardo-lucid";
    
    // Collect all Replicate outputs
    let allOutputs: any[] = [];

    if (leonardoSupportsMultiImage) {
      // Leonardo: Single API call with num_images parameter
      const input = buildInputParams();
      console.log("Replicate input parameters:", input);
      
      const output = await replicate.run(
        modelConfig.replicateModel as `${string}/${string}`,
        { input }
      ) as any;
      
      allOutputs = Array.isArray(output) ? output : [output];
    } else {
      // Other models: Call API multiple times for each image
      console.log(`Generating ${numImages} image(s) with sequential API calls...`);
      
      for (let i = 0; i < numImages; i++) {
        const input = buildInputParams();
        console.log(`Replicate input parameters (image ${i + 1}/${numImages}):`, input);
        
        const output = await replicate.run(
          modelConfig.replicateModel as `${string}/${string}`,
          { input }
        ) as any;
        
        // Each call returns a single image (or array with one image)
        if (Array.isArray(output)) {
          allOutputs.push(...output);
        } else {
          allOutputs.push(output);
        }
      }
    }

    if (!allOutputs || allOutputs.length === 0) {
      throw new Error("No image generated");
    }

    // Extract URLs from Replicate response (always an array now)
    let imageUrls: string[] = [];
    
    // Process all images in the array
    for (const item of allOutputs) {
      let url: string;
      
      if (typeof item === 'object' && item !== null) {
        if (typeof item.url === 'function') {
          const urlResult = await item.url();
          url = typeof urlResult === 'object' && urlResult.href ? urlResult.href : String(urlResult);
        } else if (typeof item.url === 'string') {
          url = item.url;
        } else {
          throw new Error("FileOutput object missing url property");
        }
      } else if (typeof item === 'string') {
        url = item;
      } else {
        throw new Error("Invalid output format from Replicate");
      }
      
      imageUrls.push(url);
    }

    console.log(`AI image(s) generated successfully: ${imageUrls.length} image(s)`);

    // Upload all images to Cloudinary
    const results: GeneratedImage[] = [];
    
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      let cloudinaryUrl: string | undefined;
      let cloudinaryPublicId: string | undefined;

      try {
        const uploadResult = await downloadAndUploadToCloudinary(imageUrl);
        cloudinaryUrl = uploadResult.url;
        cloudinaryPublicId = uploadResult.publicId;
        console.log(`Image ${i + 1}/${imageUrls.length} uploaded to Cloudinary:`, cloudinaryUrl);
      } catch (uploadError) {
        console.error(`Cloudinary upload failed for image ${i + 1}, using Replicate URL:`, uploadError);
      }

      results.push({
        url: cloudinaryUrl || imageUrl,
        cloudinaryUrl,
        cloudinaryPublicId,
        parameters: {
          model: modelConfig.id,
          ...options, // Include all original parameters
        },
      });
    }

    return results;
  } catch (error) {
    console.error("Replicate API error:", error);
    throw new Error(
      `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function downloadAndUploadToCloudinary(imageUrl: string, isUpscaled: boolean = false): Promise<{
  url: string;
  publicId: string;
}> {
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFilePath = path.join(tempDir, `ai-${Date.now()}.png`);

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await writeFileAsync(tempFilePath, Buffer.from(buffer));

    const uploadOptions: any = {
      resource_type: "image",
      folder: "5best-ai-generated",
      quality: isUpscaled ? "auto:eco" : "auto:good",
      fetch_format: "auto",
    };

    // For upscaled images, use upload_stream with proper stream handling
    let result: any;
    try {
      if (isUpscaled) {
        uploadOptions.chunk_size = 6000000; // 6MB chunks for reliable upload
        uploadOptions.transformation = [
          { quality: 80, fetch_format: "jpg" } // Light compression to balance quality and size
        ];
        console.log("Using upload_stream (chunk upload) for upscaled image");
        
        // Create read stream and upload using stream API for proper synchronization
        result = await new Promise((resolve, reject) => {
          const readStream = fs.createReadStream(tempFilePath);
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error: any, result: any) => {
              if (error) {
                reject(error);
              } else {
                // Wait for read stream to fully close before resolving
                readStream.on('close', () => {
                  console.log("Upload stream complete and read stream closed");
                  resolve(result);
                });
                // If stream already closed, resolve immediately
                if (readStream.closed) {
                  console.log("Upload complete, stream already closed");
                  resolve(result);
                }
              }
            }
          );

          readStream.on('error', reject);
          uploadStream.on('error', reject);
          readStream.pipe(uploadStream);
        });
      } else {
        result = await cloudinary.uploader.upload(tempFilePath, uploadOptions);
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } finally {
      // Always clean up temp file, whether upload succeeded or failed
      if (fs.existsSync(tempFilePath)) {
        await unlinkAsync(tempFilePath);
      }
    }
  } catch (error) {
    throw error;
  }
}

export async function upscaleImage(
  imageUrl: string,
  options?: { scale?: number; faceEnhance?: boolean }
): Promise<{
  url: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
}> {
  try {
    console.log("Starting image upscaling with Real-ESRGAN:", imageUrl);

    const input: any = {
      image: imageUrl,
      scale: options?.scale || 4,
    };

    if (options?.faceEnhance !== undefined) {
      input.face_enhance = options.faceEnhance;
    }

    const output = await replicate.run(
      "nightmareai/real-esrgan:c15c48c0e85a93f3d4e283ac6ca684ce180d94d1975783663c747e7bfa6f5e5c",
      { input }
    );

    const upscaledUrl = typeof output === "string" ? output : (output as any)?.output || output;

    if (!upscaledUrl) {
      throw new Error("Real-ESRGAN did not return a valid image URL");
    }

    console.log("Real-ESRGAN upscaling completed:", upscaledUrl);

    let cloudinaryUrl: string | undefined;
    let cloudinaryPublicId: string | undefined;

    try {
      const uploadResult = await downloadAndUploadToCloudinary(upscaledUrl, true);
      cloudinaryUrl = uploadResult.url;
      cloudinaryPublicId = uploadResult.publicId;
      console.log("Upscaled image uploaded to Cloudinary:", cloudinaryUrl);
    } catch (uploadError) {
      console.error("Cloudinary upload failed, using Replicate URL:", uploadError);
    }

    return {
      url: cloudinaryUrl || upscaledUrl,
      cloudinaryUrl,
      cloudinaryPublicId,
    };
  } catch (error) {
    console.error("Real-ESRGAN upscaling error:", error);
    throw new Error(
      `Failed to upscale image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
