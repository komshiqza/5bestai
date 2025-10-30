import Replicate from 'replicate';

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Preset configurations for different AI models
export const PRESET_CONFIG = {
  clean: {
    name: 'Clean & Denoise',
    model: 'nightmareai/real-esrgan',
    version: '42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
    credits: 2,
    description: 'Remove noise and artifacts from images',
    getInput: (imageUrl: string, params: any = {}) => ({
      image: imageUrl,
      scale: params.scale || 2,
      face_enhance: params.faceEnhance !== false,
    })
  },
  
  upscale: {
    name: 'Upscale 4×',
    model: 'nightmareai/real-esrgan',
    version: '42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
    credits: 4,
    description: 'Upscale image to 4× resolution',
    getInput: (imageUrl: string, params: any = {}) => ({
      image: imageUrl,
      scale: 4,
      face_enhance: params.faceEnhance !== false,
    })
  },
  
  portrait_pro: {
    name: 'Portrait Pro',
    model: 'sczhou/codeformer',
    version: '7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56',
    credits: 4,
    description: 'Professional portrait enhancement',
    getInput: (imageUrl: string, params: any = {}) => ({
      image: imageUrl,
      codeformer_fidelity: params.fidelity || 0.7,
      background_enhance: params.backgroundEnhance !== false,
      face_upsample: params.faceUpsample !== false,
      upscale: params.upscale || 2,
    })
  },
  
  bg_remove: {
    name: 'Remove Background',
    model: 'cjwbw/rembg',
    version: 'fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
    credits: 2,
    description: 'Remove image background with AI',
    getInput: (imageUrl: string, params: any = {}) => ({
      image: imageUrl,
    })
  },
  
  relight: {
    name: 'Relight Scene',
    model: 'gbieler/change-background-and-relight',
    version: '8904b5e61fdca36af494913e9a4ecf9762e3abf356da5b1aca277f29425ae054',
    credits: 4,
    description: 'Change lighting and background',
    getInput: (imageUrl: string, params: any = {}) => ({
      image: imageUrl,
      prompt: params.prompt || 'well lit studio lighting',
    })
  },
  
  enhance: {
    name: 'Smart Enhance',
    model: 'sczhou/codeformer',
    version: '7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56',
    credits: 3,
    description: 'General AI enhancement for any image',
    getInput: (imageUrl: string, params: any = {}) => ({
      image: imageUrl,
      codeformer_fidelity: params.fidelity || 0.5,
      background_enhance: true,
      face_upsample: true,
      upscale: params.upscale || 2,
    })
  },
} as const;

export type PresetKey = keyof typeof PRESET_CONFIG;

// Create a new prediction
export async function createPrediction(
  preset: PresetKey,
  imageUrl: string,
  params: any = {},
  webhookUrl?: string
) {
  const config = PRESET_CONFIG[preset];
  
  if (!config) {
    throw new Error(`Unknown preset: ${preset}`);
  }

  const input = config.getInput(imageUrl, params);
  
  console.log(`[Replicate] Creating prediction for preset: ${preset}`);
  console.log(`[Replicate] Input:`, input);

  const prediction = await replicate.predictions.create({
    version: config.version,
    input,
    ...(webhookUrl && {
      webhook: webhookUrl,
      webhook_events_filter: ['completed'],
    }),
  });

  console.log(`[Replicate] Prediction created:`, prediction.id);
  
  return prediction;
}

// Get prediction status
export async function getPrediction(predictionId: string) {
  const prediction = await replicate.predictions.get(predictionId);
  return prediction;
}

// Cancel a running prediction
export async function cancelPrediction(predictionId: string) {
  const prediction = await replicate.predictions.cancel(predictionId);
  return prediction;
}

// Get preset details
export function getPresetInfo(preset: PresetKey) {
  return PRESET_CONFIG[preset];
}

// Validate preset exists
export function isValidPreset(preset: string): preset is PresetKey {
  return preset in PRESET_CONFIG;
}
