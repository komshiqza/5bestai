import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export interface GenerateImageOptions {
  prompt: string;
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
    aspectRatio = "1:1",
    outputFormat = "webp",
    outputQuality = 90,
    goFast = true,
    seed,
  } = options;

  console.log("Generating AI image with Flux Schnell...", { prompt, aspectRatio, outputFormat });

  try {
    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt,
          aspect_ratio: aspectRatio,
          output_format: outputFormat,
          output_quality: outputQuality,
          go_fast: goFast,
          num_outputs: 1,
          ...(seed !== undefined && { seed }),
        },
      }
    ) as string[];

    if (!output || output.length === 0) {
      throw new Error("No image generated");
    }

    const imageUrl = Array.isArray(output) ? output[0] : output;

    console.log("AI image generated successfully:", imageUrl);

    return {
      url: imageUrl,
      parameters: {
        model: "black-forest-labs/flux-schnell",
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
