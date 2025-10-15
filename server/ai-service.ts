import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export interface GenerateImageOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  guidanceScale?: number;
  seed?: number;
}

export interface GeneratedImage {
  url: string;
  parameters: {
    model: string;
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    numInferenceSteps: number;
    guidanceScale: number;
    seed?: number;
  };
}

export async function generateImage(options: GenerateImageOptions): Promise<GeneratedImage> {
  const {
    prompt,
    negativePrompt = "ugly, blurry, low quality, distorted",
    width = 1024,
    height = 1024,
    numInferenceSteps = 30,
    guidanceScale = 7.5,
    seed,
  } = options;

  console.log("Generating AI image with Replicate...", { prompt, width, height });

  try {
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt,
          negative_prompt: negativePrompt,
          width,
          height,
          num_inference_steps: numInferenceSteps,
          guidance_scale: guidanceScale,
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
        model: "stability-ai/sdxl",
        prompt,
        negativePrompt,
        width,
        height,
        numInferenceSteps,
        guidanceScale,
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

// Style presets for easy access
export const stylePresets = {
  realistic: {
    name: "Realistic",
    negativePrompt: "cartoon, illustration, anime, painting, drawing, art, sketch",
  },
  artistic: {
    name: "Artistic",
    negativePrompt: "photo, photograph, realistic, hyperrealistic",
  },
  anime: {
    name: "Anime",
    negativePrompt: "realistic, photo, 3d render",
  },
  fantasy: {
    name: "Fantasy",
    negativePrompt: "modern, contemporary, realistic photo",
  },
  abstract: {
    name: "Abstract",
    negativePrompt: "realistic, photo, detailed",
  },
  portrait: {
    name: "Portrait",
    negativePrompt: "landscape, scenery, background focus",
  },
};
