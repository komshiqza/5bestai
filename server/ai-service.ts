import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
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
    costPerImage: 0.02,
  },
};

export interface GenerateImageOptions {
  prompt: string;
  model?: string;
  aspectRatio?: string;
  outputFormat?: string;
  outputQuality?: number;
  goFast?: boolean;
  seed?: number;
}

export interface GeneratedImage {
  url: string;
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
    aspectRatio = "1:1",
    outputFormat = "webp",
    outputQuality = 90,
    goFast = true,
    seed,
  } = options;

  // Get model configuration
  const modelConfig = AI_MODELS[model] || AI_MODELS["flux-schnell"];
  
  console.log(`Generating AI image with ${modelConfig.name}...`, { prompt, model, aspectRatio, outputFormat });

  try {
    // Build input parameters based on model capabilities
    const input: any = {
      prompt,
      num_outputs: 1,
      ...(seed !== undefined && { seed }),
    };

    // Add optional parameters based on model support
    if (modelConfig.supportsAspectRatio) {
      input.aspect_ratio = aspectRatio;
    }
    if (modelConfig.supportsOutputFormat) {
      input.output_format = outputFormat;
      input.output_quality = outputQuality;
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

    return {
      url: imageUrl,
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
