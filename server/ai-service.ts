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

// AI Model configurations
export interface ModelConfig {
  id: string;
  name: string;
  description: string;
  replicateModel: string;
  supportsAspectRatio: boolean;
  supportsOutputFormat: boolean;
  supportsGoFast: boolean;
  supportsNegativePrompt: boolean;
  costPerImage: number;
}

export const AI_MODELS: Record<string, ModelConfig> = {
  "flux-schnell": {
    id: "flux-schnell",
    name: "Flux Schnell",
    description: "Fastest, most affordable (4 steps)",
    replicateModel: "black-forest-labs/flux-schnell",
    supportsAspectRatio: true,
    supportsOutputFormat: true,
    supportsGoFast: true,
    supportsNegativePrompt: false,
    costPerImage: 0.003,
  },
  "flux-dev": {
    id: "flux-dev",
    name: "Flux Dev",
    description: "Balanced quality and speed",
    replicateModel: "black-forest-labs/flux-dev",
    supportsAspectRatio: true,
    supportsOutputFormat: true,
    supportsGoFast: false,
    supportsNegativePrompt: false,
    costPerImage: 0.025,
  },
  "flux-pro": {
    id: "flux-pro",
    name: "Flux Pro",
    description: "Highest quality, slower",
    replicateModel: "black-forest-labs/flux-pro",
    supportsAspectRatio: true,
    supportsOutputFormat: true,
    supportsGoFast: false,
    supportsNegativePrompt: false,
    costPerImage: 0.05,
  },
  "sdxl-lightning": {
    id: "sdxl-lightning",
    name: "SDXL Lightning",
    description: "Super fast SDXL (4 steps)",
    replicateModel: "bytedance/sdxl-lightning-4step",
    supportsAspectRatio: false,
    supportsOutputFormat: false,
    supportsGoFast: false,
    supportsNegativePrompt: true,
    costPerImage: 0.003,
  },
  "sd3": {
    id: "sd3",
    name: "Stable Diffusion 3",
    description: "Great for text in images",
    replicateModel: "stability-ai/stable-diffusion-3",
    supportsAspectRatio: true,
    supportsOutputFormat: false,
    supportsGoFast: false,
    supportsNegativePrompt: true,
    costPerImage: 0.02,
  },
  "nano-banana": {
    id: "nano-banana",
    name: "Nano Banana",
    description: "Google's Gemini 2.5 Flash Image (fast, versatile)",
    replicateModel: "google/nano-banana",
    supportsAspectRatio: false,
    supportsOutputFormat: true,
    supportsGoFast: false,
    supportsNegativePrompt: false,
    costPerImage: 0.002,
  },
};

export interface GenerateImageOptions {
  prompt: string;
  model?: string;
  negativePrompt?: string;
  aspectRatio?: string;
  outputFormat?: string;
  outputQuality?: number;
  goFast?: boolean;
  seed?: number;
}

export interface GeneratedImage {
  url: string;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  parameters: {
    model: string;
    prompt: string;
    aspectRatio: string;
    outputFormat: string;
    outputQuality: number;
    goFast: boolean;
    seed?: number;
  };
}

export async function generateImage(options: GenerateImageOptions): Promise<GeneratedImage> {
  const {
    prompt,
    model = "flux-schnell",
    negativePrompt,
    aspectRatio = "1:1",
    outputFormat = "webp",
    outputQuality = 90,
    goFast = true,
    seed,
  } = options;

  // Get model configuration
  const modelConfig = AI_MODELS[model] || AI_MODELS["flux-schnell"];
  
  console.log(`Generating AI image with ${modelConfig.name}...`, { prompt, negativePrompt, model, aspectRatio, outputFormat });

  try {
    // Build input parameters based on model capabilities
    const input: any = {
      prompt,
      num_outputs: 1,
      ...(seed !== undefined && { seed }),
    };

    // Add optional parameters based on model support
    if (modelConfig.supportsNegativePrompt && negativePrompt) {
      input.negative_prompt = negativePrompt;
    }
    if (modelConfig.supportsAspectRatio) {
      input.aspect_ratio = aspectRatio;
    }
    if (modelConfig.supportsOutputFormat) {
      // Nano Banana only supports jpg/png, not webp
      if (model === "nano-banana") {
        input.output_format = outputFormat === "webp" ? "jpg" : outputFormat;
      } else {
        input.output_format = outputFormat;
        input.output_quality = outputQuality;
      }
    }
    if (modelConfig.supportsGoFast && goFast) {
      input.go_fast = goFast;
    }

    const output = await replicate.run(
      modelConfig.replicateModel as `${string}/${string}`,
      { input }
    ) as any;

    if (!output) {
      throw new Error("No image generated");
    }

    // Extract URL from Replicate FileOutput response
    let imageUrl: string;
    
    if (Array.isArray(output)) {
      const firstOutput = output[0];
      
      // Handle FileOutput object with url() method
      if (typeof firstOutput === 'object' && firstOutput !== null) {
        // FileOutput objects have a url() method that returns a URL object
        if (typeof firstOutput.url === 'function') {
          const urlResult = await firstOutput.url();
          // Extract href from URL object or use directly if string
          imageUrl = typeof urlResult === 'object' && urlResult.href ? urlResult.href : String(urlResult);
        } else if (typeof firstOutput.url === 'string') {
          imageUrl = firstOutput.url;
        } else {
          throw new Error("FileOutput object missing url property");
        }
      } 
      // Handle direct string URL (backward compatibility)
      else if (typeof firstOutput === 'string') {
        imageUrl = firstOutput;
      }
      else {
        throw new Error("Invalid output format from Replicate");
      }
    } else if (typeof output === 'string') {
      imageUrl = output;
    } else if (typeof output === 'object' && output !== null && typeof output.url === 'function') {
      // Handle single FileOutput object (not in array)
      const urlResult = await output.url();
      imageUrl = typeof urlResult === 'object' && urlResult.href ? urlResult.href : String(urlResult);
    } else {
      throw new Error("Invalid output format from Replicate");
    }

    console.log("AI image generated successfully:", imageUrl);

    // Download image and upload to Cloudinary
    let cloudinaryUrl: string | undefined;
    let cloudinaryPublicId: string | undefined;

    try {
      const uploadResult = await downloadAndUploadToCloudinary(imageUrl);
      cloudinaryUrl = uploadResult.url;
      cloudinaryPublicId = uploadResult.publicId;
      console.log("Image uploaded to Cloudinary:", cloudinaryUrl);
    } catch (uploadError) {
      console.error("Cloudinary upload failed, using Replicate URL:", uploadError);
      // Continue with Replicate URL if Cloudinary fails
    }

    return {
      url: cloudinaryUrl || imageUrl, // Prefer Cloudinary URL
      cloudinaryUrl,
      cloudinaryPublicId,
      parameters: {
        model: modelConfig.id,
        prompt,
        aspectRatio,
        outputFormat,
        outputQuality,
        goFast,
        seed,
      },
    };
  } catch (error) {
    console.error("Replicate API error:", error);
    throw new Error(
      `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function downloadAndUploadToCloudinary(imageUrl: string): Promise<{
  url: string;
  publicId: string;
}> {
  const tempDir = path.join(process.cwd(), "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFilePath = path.join(tempDir, `ai-${Date.now()}.png`);

  try {
    // Download image from Replicate CDN
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    const buffer = await response.arrayBuffer();
    await writeFileAsync(tempFilePath, Buffer.from(buffer));

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(tempFilePath, {
      resource_type: "image",
      folder: "5best-ai-generated",
      quality: "auto:good",
      fetch_format: "auto",
    });

    // Cleanup temp file
    await unlinkAsync(tempFilePath);

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(tempFilePath)) {
      await unlinkAsync(tempFilePath);
    }
    throw error;
  }
}

// Style presets optimized for Flux Schnell (uses prompt engineering instead of negative prompts)
export const stylePresets = {
  realistic: {
    name: "Realistic",
    promptSuffix: ", photorealistic, highly detailed, professional photography, 8k uhd, dslr, soft lighting, high quality",
  },
  artistic: {
    name: "Artistic",
    promptSuffix: ", digital art, artistic, painterly style, vibrant colors, creative composition, masterpiece",
  },
  anime: {
    name: "Anime",
    promptSuffix: ", anime style, manga art, cel shaded, vibrant colors, expressive, japanese animation style",
  },
  fantasy: {
    name: "Fantasy",
    promptSuffix: ", fantasy art, magical, ethereal, epic, enchanted, mystical atmosphere, dramatic lighting",
  },
  abstract: {
    name: "Abstract",
    promptSuffix: ", abstract art, geometric shapes, vibrant colors, modern art, creative patterns, artistic composition",
  },
  portrait: {
    name: "Portrait",
    promptSuffix: ", portrait photography, face focus, detailed facial features, professional headshot, studio lighting",
  },
};
