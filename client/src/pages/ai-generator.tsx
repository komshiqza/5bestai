import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, Download, Trash2, Wand2, Settings, Image as ImageIcon, Loader2, Upload, X, Pencil } from "lucide-react";
import { UploadWizardModal } from "@/components/UploadWizardModal";
import type { AiGeneration } from "@shared/schema";

interface ModelConfig {
  id: string;
  name: string;
  description: string;
  costPerImage: number;
  
  supportsAspectRatio: boolean;
  supportsCustomDimensions: boolean;
  supportsResolution: boolean;
  supportsOutputFormat: boolean;
  supportsOutputQuality: boolean;
  supportsNegativePrompt: boolean;
  supportsImageInput: boolean;
  supportsMask: boolean;
  supportsSeed: boolean;
  supportsStyleReferenceImages: boolean;
  
  supportsStyleType: boolean;
  supportsStylePreset: boolean;
  supportsMagicPrompt: boolean;
  supportsPromptUpsampling: boolean;
  supportsSafetyTolerance: boolean;
  supportsCfg: boolean;
  supportsPromptStrength: boolean;
  supportsLeonardoStyle: boolean;
  supportsContrast: boolean;
  supportsGenerationMode: boolean;
  supportsPromptEnhance: boolean;
  supportsNumImages: boolean;
}

const ideogramAspectRatios = [
  { value: "1:3", label: "Tall (1:3)" },
  { value: "3:1", label: "Wide (3:1)" },
  { value: "1:2", label: "Tall (1:2)" },
  { value: "2:1", label: "Wide (2:1)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "10:16", label: "Portrait (10:16)" },
  { value: "16:10", label: "Landscape (16:10)" },
  { value: "2:3", label: "Portrait (2:3)" },
  { value: "3:2", label: "Landscape (3:2)" },
  { value: "3:4", label: "Portrait (3:4)" },
  { value: "4:3", label: "Landscape (4:3)" },
  { value: "4:5", label: "Portrait (4:5)" },
  { value: "5:4", label: "Landscape (5:4)" },
  { value: "1:1", label: "Square (1:1)" },
];

const nanoBananaAspectRatios = [
  { value: "match_input_image", label: "Match Input Image" },
  { value: "1:1", label: "Square (1:1)" },
  { value: "2:3", label: "Portrait (2:3)" },
  { value: "3:2", label: "Landscape (3:2)" },
  { value: "3:4", label: "Portrait (3:4)" },
  { value: "4:3", label: "Landscape (4:3)" },
  { value: "4:5", label: "Portrait (4:5)" },
  { value: "5:4", label: "Landscape (5:4)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "21:9", label: "Ultrawide (21:9)" },
];

const flux11AspectRatios = [
  { value: "custom", label: "Custom (set width/height)" },
  { value: "1:1", label: "Square (1:1)" },
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "3:2", label: "Landscape (3:2)" },
  { value: "2:3", label: "Portrait (2:3)" },
  { value: "4:5", label: "Portrait (4:5)" },
  { value: "5:4", label: "Landscape (5:4)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "3:4", label: "Portrait (3:4)" },
  { value: "4:3", label: "Landscape (4:3)" },
];

const sd35AspectRatios = [
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "1:1", label: "Square (1:1)" },
  { value: "21:9", label: "Ultrawide (21:9)" },
  { value: "2:3", label: "Portrait (2:3)" },
  { value: "3:2", label: "Landscape (3:2)" },
  { value: "4:5", label: "Portrait (4:5)" },
  { value: "5:4", label: "Landscape (5:4)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "9:21", label: "Ultra Tall (9:21)" },
];

const leonardoAspectRatios = [
  { value: "1:1", label: "Square (1:1)" },
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "3:2", label: "Landscape (3:2)" },
  { value: "2:3", label: "Portrait (2:3)" },
  { value: "4:5", label: "Portrait (4:5)" },
  { value: "5:4", label: "Landscape (5:4)" },
  { value: "3:4", label: "Portrait (3:4)" },
  { value: "4:3", label: "Landscape (4:3)" },
  { value: "2:1", label: "Wide (2:1)" },
  { value: "1:2", label: "Tall (1:2)" },
  { value: "3:1", label: "Wide (3:1)" },
  { value: "1:3", label: "Tall (1:3)" },
];

const defaultAspectRatios = [
  { value: "1:1", label: "Square (1:1)" },
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "4:3", label: "Classic (4:3)" },
  { value: "3:2", label: "Photo (3:2)" },
  { value: "2:3", label: "Photo Portrait (2:3)" },
  { value: "4:5", label: "Portrait (4:5)" },
  { value: "5:4", label: "Landscape (5:4)" },
  { value: "21:9", label: "Ultrawide (21:9)" },
];

const ideogramResolutions = [
  { value: "None", label: "None (use aspect ratio)" },
  { value: "1024x1024", label: "1024x1024 (Square)" },
  { value: "1152x896", label: "1152x896 (Landscape)" },
  { value: "896x1152", label: "896x1152 (Portrait)" },
  { value: "1216x832", label: "1216x832 (Wide)" },
  { value: "832x1216", label: "832x1216 (Tall)" },
  { value: "1344x768", label: "1344x768 (Ultrawide)" },
  { value: "768x1344", label: "768x1344 (Ultra Tall)" },
  { value: "1536x640", label: "1536x640 (Panorama)" },
  { value: "640x1536", label: "640x1536 (Vertical Panorama)" },
];

const ideogramStyleTypes = [
  { value: "None", label: "None" },
  { value: "Auto", label: "Auto" },
  { value: "General", label: "General" },
  { value: "Realistic", label: "Realistic" },
  { value: "Design", label: "Design" },
];

const ideogramStylePresets = [
  { value: "None", label: "None" },
  { value: "Realistic", label: "Realistic" },
  { value: "Oil Painting", label: "Oil Painting" },
  { value: "Watercolor", label: "Watercolor" },
  { value: "Pop Art", label: "Pop Art" },
  { value: "Anime", label: "Anime" },
  { value: "Cubism", label: "Cubism" },
  { value: "Art Deco", label: "Art Deco" },
  { value: "Bauhaus", label: "Bauhaus" },
  { value: "Vintage Poster", label: "Vintage Poster" },
  { value: "Travel Poster", label: "Travel Poster" },
  { value: "Magazine Editorial", label: "Magazine Editorial" },
  { value: "Dramatic Cinema", label: "Dramatic Cinema" },
  { value: "Golden Hour", label: "Golden Hour" },
  { value: "Long Exposure", label: "Long Exposure" },
  { value: "Monochrome", label: "Monochrome" },
  { value: "Minimal Illustration", label: "Minimal Illustration" },
  { value: "Flat Art", label: "Flat Art" },
  { value: "C4D Cartoon", label: "C4D Cartoon" },
  { value: "Graffiti I", label: "Graffiti I" },
  { value: "80s Illustration", label: "80s Illustration" },
  { value: "90s Nostalgia", label: "90s Nostalgia" },
];

const magicPromptOptions = [
  { value: "Auto", label: "Auto" },
  { value: "On", label: "On" },
  { value: "Off", label: "Off" },
];

const leonardoStyles = [
  { value: "none", label: "None" },
  { value: "bokeh", label: "Bokeh" },
  { value: "cinematic", label: "Cinematic" },
  { value: "cinematic_close_up", label: "Cinematic Close Up" },
  { value: "creative", label: "Creative" },
  { value: "dynamic", label: "Dynamic" },
  { value: "fashion", label: "Fashion" },
  { value: "film", label: "Film" },
  { value: "food", label: "Food" },
  { value: "hdr", label: "HDR" },
  { value: "long_exposure", label: "Long Exposure" },
  { value: "macro", label: "Macro" },
  { value: "minimalist", label: "Minimalist" },
  { value: "monochrome", label: "Monochrome" },
  { value: "moody", label: "Moody" },
  { value: "neutral", label: "Neutral" },
  { value: "portrait", label: "Portrait" },
  { value: "retro", label: "Retro" },
  { value: "stock_photo", label: "Stock Photo" },
  { value: "unprocessed", label: "Unprocessed" },
  { value: "vibrant", label: "Vibrant" },
];

const contrastLevels = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const generationModes = [
  { value: "standard", label: "Standard" },
  { value: "ultra", label: "Ultra" },
];

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload file");
  }

  const data = await response.json();
  return data.url;
}

export default function AiGeneratorPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("flux-1.1-pro");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [outputFormat, setOutputFormat] = useState("webp");
  const [outputQuality, setOutputQuality] = useState(80);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  
  // New parameters
  const [seed, setSeed] = useState<number>(0);
  const [imageInput, setImageInput] = useState<File | null>(null);
  const [styleReferenceImages, setStyleReferenceImages] = useState<File[]>([]);
  
  // Ideogram parameters
  const [resolution, setResolution] = useState("None");
  const [styleType, setStyleType] = useState("None");
  const [stylePreset, setStylePreset] = useState("None");
  const [magicPromptOption, setMagicPromptOption] = useState("Auto");
  
  // Flux 1.1 parameters
  const [promptUpsampling, setPromptUpsampling] = useState(false);
  const [safetyTolerance, setSafetyTolerance] = useState(2);
  
  // Stable Diffusion parameters
  const [cfg, setCfg] = useState(5);
  const [promptStrength, setPromptStrength] = useState(0.85);
  
  // Leonardo parameters
  const [leonardoStyle, setLeonardoStyle] = useState("none");
  const [contrast, setContrast] = useState("medium");
  const [generationMode, setGenerationMode] = useState("standard");
  const [promptEnhance, setPromptEnhance] = useState(true);
  const [numImages, setNumImages] = useState(2);
  
  // Submit to contest wizard modal state
  const [wizardModalOpen, setWizardModalOpen] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<AiGeneration | null>(null);
  const [upscalingId, setUpscalingId] = useState<string | null>(null);

  useEffect(() => {
    document.title = "AI Studio - 5best";
  }, []);

  const { data: modelConfigs, isLoading: loadingModels } = useQuery<ModelConfig[]>({
    queryKey: ["/api/ai/models"],
  });

  const { data: generations, isLoading: loadingHistory } = useQuery<AiGeneration[]>({
    queryKey: ["/api/ai/generations"],
  });

  const { data: userData } = useQuery<any>({
    queryKey: ["/api/me"],
  });

  const { data: pricing } = useQuery<Record<string, number>>({
    queryKey: ["/api/pricing"],
  });

  // Map model IDs to pricing keys
  const modelToPricingKey: Record<string, string> = useMemo(() => ({
    "leonardo-lucid": "leonardo",
    "ideogram-v3": "ideogram-v3",
    "nano-banana": "nano-banana",
    "flux-1.1-pro": "flux-1.1-pro",
    "sd-3.5-large": "sd-3.5-large",
  }), []);

  const currentModelConfig = useMemo(() => 
    modelConfigs?.find(m => m.id === selectedModel),
    [modelConfigs, selectedModel]
  );
  
  const userCredits = userData?.imageCredits || 0;
  
  const { totalCost, hasEnoughCredits } = useMemo(() => {
    const pricingKey = modelToPricingKey[selectedModel] || selectedModel;
    const modelCost = pricing?.[pricingKey] || 0;
    
    // Calculate total cost (multiply by numImages - all models support multiple images)
    const total = modelCost * numImages;
    
    return {
      totalCost: total,
      hasEnoughCredits: userCredits >= total
    };
  }, [userCredits, pricing, selectedModel, numImages, currentModelConfig, modelToPricingKey]);

  const getAspectRatiosForModel = (modelId: string) => {
    if (modelId.includes("ideogram")) return ideogramAspectRatios;
    if (modelId.includes("nano-banana")) return nanoBananaAspectRatios;
    if (modelId.includes("flux-1.1")) return flux11AspectRatios;
    if (modelId.includes("sd-3.5") || modelId.includes("stable-diffusion")) return sd35AspectRatios;
    if (modelId.includes("leonardo")) return leonardoAspectRatios;
    return defaultAspectRatios;
  };

  const aspectRatiosForCurrentModel = getAspectRatiosForModel(selectedModel);

  const getImageInputLabel = () => {
    if (selectedModel.includes("sd-3.5")) return "Image for img2img";
    if (selectedModel.includes("flux-1.1")) return "Image Prompt (Redux)";
    if (selectedModel.includes("ideogram")) return "Inpainting Image";
    if (selectedModel.includes("nano-banana")) return "Reference Images";
    return "Image Input";
  };

  const generateMutation = useMutation({
    mutationFn: async (params: any) => {
      const res = await apiRequest("POST", "/api/ai/generate", params);
      return res.json();
    },
    onSuccess: (data) => {
      // Handle multiple images - show the first one
      if (data.images && data.images.length > 0) {
        setCurrentImage(data.images[0].imageUrl);
        setCurrentGenerationId(data.images[0].id);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/ai/generations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      
      const imageCount = data.images?.length || 1;
      const imageText = imageCount > 1 ? `${imageCount} images` : "Image";
      
      toast({
        title: `${imageText} Generated!`,
        description: `Your AI image${imageCount > 1 ? 's have' : ' has'} been created successfully. ${data.creditsUsed} credits used.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/ai/generations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/generations"] });
      toast({
        title: "Deleted",
        description: "Image removed from your history.",
      });
    },
  });

  const upscaleMutation = useMutation({
    mutationFn: async (params: { generationId: string; scale?: number; faceEnhance?: boolean }) => {
      setUpscalingId(params.generationId);
      const res = await apiRequest("POST", "/api/ai/upscale", params);
      return res.json();
    },
    onSuccess: (data, variables) => {
      setCurrentImage(data.upscaledImageUrl);
      setUpscalingId(null);
      
      queryClient.setQueryData(["/api/ai/generations"], (old: AiGeneration[] | undefined) => {
        if (!old) return old;
        return old.map(gen => 
          gen.id === variables.generationId 
            ? { ...gen, editedImageUrl: data.upscaledImageUrl, isUpscaled: true }
            : gen
        );
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/ai/generations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      toast({
        title: "Upscaling Complete!",
        description: `Your image has been upscaled to 4x resolution. ${data.creditsUsed} credits used.`,
      });
    },
    onError: (error: Error) => {
      setUpscalingId(null);
      toast({
        title: "Upscaling Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenSubmitWizard = (generation: AiGeneration) => {
    if (!generation.cloudinaryPublicId) {
      toast({
        title: "Upload Error",
        description: "This image wasn't properly uploaded to storage. Please regenerate.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedGeneration(generation);
    setWizardModalOpen(true);
  };

  const handleCloseWizard = () => {
    setWizardModalOpen(false);
    setSelectedGeneration(null);
    queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a description for your image.",
        variant: "destructive",
      });
      return;
    }

    try {
      const params: any = {
        prompt: prompt.trim(),
        model: selectedModel,
      };

      // Upload imageInput if present
      if (imageInput) {
        toast({
          title: "Uploading image...",
          description: "Please wait while we upload your image.",
        });
        params.imageInput = await uploadToCloudinary(imageInput);
      }

      // Upload styleReferenceImages if present
      if (styleReferenceImages.length > 0) {
        toast({
          title: "Uploading style references...",
          description: `Uploading ${styleReferenceImages.length} image(s)...`,
        });
        params.styleReferenceImages = await Promise.all(
          styleReferenceImages.map(file => uploadToCloudinary(file))
        );
      }

      // Add seed if not 0 (0 = random)
      if (currentModelConfig?.supportsSeed && seed !== 0) {
        params.seed = seed;
      }

      // Add aspect ratio if supported
      if (currentModelConfig?.supportsAspectRatio) {
        params.aspectRatio = aspectRatio;
      }

      // Add output format if supported
      if (currentModelConfig?.supportsOutputFormat) {
        params.outputFormat = outputFormat;
      }

      // Add output quality if supported
      if (currentModelConfig?.supportsOutputQuality) {
        params.outputQuality = outputQuality;
      }

      // Add negative prompt if supported and provided
      if (currentModelConfig?.supportsNegativePrompt && negativePrompt.trim()) {
        params.negativePrompt = negativePrompt.trim();
      }

      // Ideogram parameters
      if (currentModelConfig?.supportsResolution && resolution !== "None") {
        params.resolution = resolution;
      }
      if (currentModelConfig?.supportsStyleType && styleType !== "None") {
        params.styleType = styleType;
      }
      if (currentModelConfig?.supportsStylePreset && stylePreset !== "None") {
        params.stylePreset = stylePreset;
      }
      if (currentModelConfig?.supportsMagicPrompt) {
        params.magicPromptOption = magicPromptOption;
      }

      // Flux 1.1 parameters
      if (currentModelConfig?.supportsPromptUpsampling) {
        params.promptUpsampling = promptUpsampling;
      }
      if (currentModelConfig?.supportsSafetyTolerance) {
        params.safetyTolerance = safetyTolerance;
      }

      // Stable Diffusion parameters
      if (currentModelConfig?.supportsCfg) {
        params.cfg = cfg;
      }
      if (currentModelConfig?.supportsPromptStrength) {
        params.promptStrength = promptStrength;
      }

      // Leonardo parameters
      if (currentModelConfig?.supportsLeonardoStyle && leonardoStyle !== "none") {
        params.leonardoStyle = leonardoStyle;
      }
      if (currentModelConfig?.supportsContrast) {
        params.contrast = contrast;
      }
      if (currentModelConfig?.supportsGenerationMode) {
        params.generationMode = generationMode;
      }
      if (currentModelConfig?.supportsPromptEnhance) {
        params.promptEnhance = promptEnhance;
      }
      // All models now support multiple images
      params.numImages = numImages;

      generateMutation.mutate(params);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    }
  };

  // Helper to get file extension from URL
  const getFileExtension = (url: string): string => {
    try {
      const urlPath = new URL(url).pathname;
      const ext = urlPath.split('.').pop()?.toLowerCase();
      if (ext && ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
        return ext;
      }
    } catch (e) {
      // Invalid URL, fallback to default
    }
    return 'png'; // Default extension
  };

  const handleDownload = async (url: string, filename?: string) => {
    try {
      // Use proxy endpoint for all downloads to ensure consistent behavior
      const downloadUrl = `/api/proxy-download?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(downloadUrl, {
        credentials: 'include',
        cache: 'no-store', // Prevent browser caching
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Auto-generate filename with correct extension if not provided
      const extension = getFileExtension(url);
      const finalFilename = filename || `ai-generated-${Date.now()}.${extension}`;
      
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download image",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background font-['Space_Grotesk',sans-serif]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Image Generation</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Unleash your creativity with AI. Describe your vision and let our generators bring it to life.
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg glassmorphism">
            <span className="material-symbols-outlined text-primary">auto_awesome</span>
            <div>
              <p className="text-xs text-muted-foreground">Credits</p>
              <p className="text-2xl font-bold text-primary" data-testid="text-credits-balance">{userCredits}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Generator Controls */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-8">
              <div className="glassmorphism rounded-xl p-6 space-y-6">
                {/* Prompt */}
                <div>
                  <Label htmlFor="prompt" className="mb-2 block text-sm font-medium">
                    Prompt
                  </Label>
                  <Textarea
                    id="prompt"
                    placeholder="e.g., a futuristic cityscape at sunset, neon lights, glassmorphism"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-lg border-0 bg-black/20 dark:bg-white/5 p-3 text-sm placeholder:text-muted-foreground/50 ring-1 ring-inset ring-transparent transition-all focus:bg-black/30 dark:focus:bg-white/10 focus:ring-primary"
                    data-testid="input-prompt"
                  />
                </div>

                {/* Negative Prompt */}
                {currentModelConfig?.supportsNegativePrompt && (
                  <div>
                    <Label htmlFor="negative-prompt" className="mb-2 block text-sm font-medium">
                      Negative Prompt (Optional)
                    </Label>
                    <Textarea
                      id="negative-prompt"
                      placeholder="blurry, low quality, distorted..."
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      rows={2}
                      className="w-full resize-none rounded-lg border-0 bg-black/20 dark:bg-white/5 p-3 text-sm placeholder:text-muted-foreground/50 ring-1 ring-inset ring-transparent transition-all focus:bg-black/30 dark:focus:bg-white/10 focus:ring-primary"
                      data-testid="input-negative-prompt"
                    />
                  </div>
                )}

                {/* AI Model Selector */}
                <div>
                  <h3 className="mb-2 text-sm font-medium">AI Generator</h3>
                  {loadingModels ? (
                    <div className="h-10 rounded-md border border-input bg-muted/50 animate-pulse" />
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {modelConfigs?.slice(0, 3).map((model) => {
                        const pricingKey = modelToPricingKey[model.id] || model.id;
                        const credits = pricing?.[pricingKey] || 0;
                        const isSelected = selectedModel === model.id;
                        return (
                          <button
                            key={model.id}
                            onClick={() => setSelectedModel(model.id)}
                            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border p-3 text-center text-xs font-medium transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/20 text-primary'
                                : 'border-border hover:border-primary/50'
                            }`}
                            data-testid={`select-model-${model.id}`}
                          >
                            {model.name.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!loadingModels && modelConfigs && modelConfigs.length > 3 && (
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="mt-2" data-testid="select-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modelConfigs.map((model) => {
                          const pricingKey = modelToPricingKey[model.id] || model.id;
                          const credits = pricing?.[pricingKey] || 0;
                          return (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name} - {credits} {credits === 1 ? 'credit' : 'credits'}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Parameters */}
                {currentModelConfig && (
                  <div className="space-y-4">
                    <h3 className="mb-2 text-sm font-medium">Parameters</h3>
                    
                    {/* Number of Images - always show */}
                    <div>
                      <Label className="mb-1 block text-xs text-muted-foreground">
                        Num Images ({numImages})
                      </Label>
                      <Slider
                        value={[numImages]}
                        onValueChange={(value) => setNumImages(value[0])}
                        min={1}
                        max={4}
                        step={1}
                        className="mt-2"
                      />
                    </div>

                    {/* Aspect Ratio */}
                    {currentModelConfig.supportsAspectRatio && (
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Aspect Ratio</Label>
                        <Select value={aspectRatio} onValueChange={setAspectRatio}>
                          <SelectTrigger className="h-9 text-xs" data-testid="select-aspect-ratio">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {aspectRatiosForCurrentModel.map((ratio) => (
                              <SelectItem key={ratio.value} value={ratio.value}>
                                {ratio.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Resolution (Ideogram) */}
                    {currentModelConfig.supportsResolution && (
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Resolution</Label>
                        <Select value={resolution} onValueChange={setResolution}>
                          <SelectTrigger className="h-9 text-xs" data-testid="select-resolution">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ideogramResolutions.map((res) => (
                              <SelectItem key={res.value} value={res.value}>
                                {res.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Style Type (Ideogram) */}
                    {currentModelConfig.supportsStyleType && (
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Style Type</Label>
                        <Select value={styleType} onValueChange={setStyleType}>
                          <SelectTrigger className="h-9 text-xs" data-testid="select-style-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ideogramStyleTypes.map((style) => (
                              <SelectItem key={style.value} value={style.value}>
                                {style.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Style Preset (Ideogram) */}
                    {currentModelConfig.supportsStylePreset && (
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Style Preset</Label>
                        <Select value={stylePreset} onValueChange={setStylePreset}>
                          <SelectTrigger className="h-9 text-xs" data-testid="select-style-preset">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ideogramStylePresets.map((preset) => (
                              <SelectItem key={preset.value} value={preset.value}>
                                {preset.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Magic Prompt (Ideogram) */}
                    {currentModelConfig.supportsMagicPrompt && (
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Magic Prompt</Label>
                        <Select value={magicPromptOption} onValueChange={setMagicPromptOption}>
                          <SelectTrigger className="h-9 text-xs" data-testid="select-magic-prompt">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {magicPromptOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Automatically enhances your prompt
                        </p>
                      </div>
                    )}

                    {/* Leonardo Style */}
                    {currentModelConfig.supportsLeonardoStyle && (
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Leonardo Style</Label>
                        <Select value={leonardoStyle} onValueChange={setLeonardoStyle}>
                          <SelectTrigger className="h-9 text-xs" data-testid="select-leonardo-style">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {leonardoStyles.map((style) => (
                              <SelectItem key={style.value} value={style.value}>
                                {style.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Contrast (Leonardo) */}
                    {currentModelConfig.supportsContrast && (
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Contrast</Label>
                        <Select value={contrast} onValueChange={setContrast}>
                          <SelectTrigger className="h-9 text-xs" data-testid="select-contrast">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {contrastLevels.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Generation Mode (Leonardo) */}
                    {currentModelConfig.supportsGenerationMode && (
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">Generation Mode</Label>
                        <Select value={generationMode} onValueChange={setGenerationMode}>
                          <SelectTrigger className="h-9 text-xs" data-testid="select-generation-mode">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {generationModes.map((mode) => (
                              <SelectItem key={mode.value} value={mode.value}>
                                {mode.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Prompt Enhance (Leonardo) */}
                    {currentModelConfig.supportsPromptEnhance && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="prompt-enhance"
                          checked={promptEnhance}
                          onCheckedChange={(checked) => setPromptEnhance(checked as boolean)}
                          data-testid="checkbox-prompt-enhance"
                        />
                        <Label htmlFor="prompt-enhance" className="text-xs cursor-pointer">
                          Prompt Enhancement
                        </Label>
                      </div>
                    )}

                    {/* Prompt Upsampling (Flux) */}
                    {currentModelConfig.supportsPromptUpsampling && (
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="prompt-upsampling"
                          checked={promptUpsampling}
                          onCheckedChange={(checked) => setPromptUpsampling(checked as boolean)}
                          data-testid="checkbox-prompt-upsampling"
                        />
                        <Label htmlFor="prompt-upsampling" className="text-xs cursor-pointer">
                          Prompt Upsampling
                        </Label>
                      </div>
                    )}

                    {/* Safety Tolerance (Flux) */}
                    {currentModelConfig.supportsSafetyTolerance && (
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          Safety Tolerance ({safetyTolerance})
                        </Label>
                        <Slider
                          value={[safetyTolerance]}
                          onValueChange={(value) => setSafetyTolerance(value[0])}
                          min={0}
                          max={6}
                          step={1}
                        />
                      </div>
                    )}

                    {/* CFG Scale (SD) */}
                    {currentModelConfig.supportsCfg && (
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          CFG Scale ({cfg})
                        </Label>
                        <Slider
                          value={[cfg]}
                          onValueChange={(value) => setCfg(value[0])}
                          min={0}
                          max={10}
                          step={0.1}
                        />
                      </div>
                    )}

                    {/* Prompt Strength (SD) */}
                    {currentModelConfig.supportsPromptStrength && (
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          Prompt Strength ({promptStrength.toFixed(2)})
                        </Label>
                        <Slider
                          value={[promptStrength]}
                          onValueChange={(value) => setPromptStrength(value[0])}
                          min={0}
                          max={1}
                          step={0.05}
                        />
                      </div>
                    )}

                    {/* Seed */}
                    {currentModelConfig.supportsSeed && (
                      <div>
                        <Label htmlFor="seed" className="mb-1 block text-xs text-muted-foreground">
                          Seed (0 for random)
                        </Label>
                        <Input
                          id="seed"
                          type="number"
                          value={seed}
                          onChange={(e) => setSeed(Number(e.target.value))}
                          className="h-9"
                          data-testid="input-seed"
                        />
                      </div>
                    )}

                    {/* Image Input */}
                    {currentModelConfig.supportsImageInput && (
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          {getImageInputLabel()}
                        </Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setImageInput(e.target.files?.[0] || null)}
                          className="h-9 text-xs"
                          data-testid="input-image-input"
                        />
                        {imageInput && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{imageInput.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setImageInput(null)}
                              className="h-5 px-1"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Style Reference Images */}
                    {currentModelConfig.supportsStyleReferenceImages && (
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          Style Reference Images
                        </Label>
                        <Input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => setStyleReferenceImages(Array.from(e.target.files || []))}
                          className="h-9 text-xs"
                          data-testid="input-style-reference"
                        />
                        {styleReferenceImages.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {styleReferenceImages.map((file, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{file.name}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setStyleReferenceImages(prev => prev.filter((_, i) => i !== index));
                                  }}
                                  className="h-5 px-1"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !hasEnoughCredits}
                  className="glow flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-white transition-all hover:brightness-110"
                  data-testid="button-generate"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : !hasEnoughCredits ? (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Insufficient Credits
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">auto_awesome</span>
                      Generate Image ({totalCost} {totalCost === 1 ? 'credit' : 'credits'})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Panel - Generated Images Grid */}
          <div className="lg:col-span-2">
            <div className="space-y-8">
              {/* Progress Indicator */}
              {generateMutation.isPending && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold">Generated Images</h3>
                  <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-4">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-primary/20">
                      <div className="h-full w-1/2 animate-pulse rounded-full bg-primary"></div>
                    </div>
                    <div className="text-sm font-medium text-primary">Generating... 50%</div>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    This may take a few moments. Please be patient.
                  </p>
                </div>
              )}

              {/* Images Grid */}
              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                </div>
              ) : !generations || generations.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No generations yet. Create your first image!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {generations.map((gen) => (
                    <div
                      key={gen.id}
                      className="group relative aspect-square overflow-hidden rounded-xl"
                      data-testid={`generation-${gen.id}`}
                    >
                      <img
                        alt={gen.prompt}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        src={gen.editedImageUrl || gen.imageUrl}
                        data-testid={`img-generation-${gen.id}`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100"></div>
                      <div className="absolute bottom-0 left-0 right-0 flex translate-y-full items-center justify-between p-3 transition-transform duration-300 group-hover:translate-y-0">
                        <div className="flex gap-1">
                          {/* Download */}
                          <button
                            onClick={() => handleDownload(gen.editedImageUrl || gen.imageUrl)}
                            className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                            title="Download"
                            data-testid={`button-download-${gen.id}`}
                          >
                            <span className="material-symbols-outlined text-base">download</span>
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => setLocation(`/image-editor/${gen.id}`)}
                            className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                            title="Edit"
                            data-testid={`button-edit-${gen.id}`}
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          {/* Upscale */}
                          {!gen.isUpscaled && (
                            <button
                              onClick={() => upscaleMutation.mutate({ generationId: gen.id })}
                              disabled={upscalingId === gen.id || userCredits < (pricing?.["upscale"] || 0)}
                              className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30 disabled:opacity-50"
                              title="Upscale 4x"
                              data-testid={`button-upscale-${gen.id}`}
                            >
                              {upscalingId === gen.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <span className="material-symbols-outlined text-base">auto_awesome</span>
                              )}
                            </button>
                          )}
                          {/* Upload to Contest */}
                          <button
                            onClick={() => handleOpenSubmitWizard(gen)}
                            className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                            title="Upload to Contest"
                            data-testid={`button-submit-${gen.id}`}
                          >
                            <span className="material-symbols-outlined text-base">upload</span>
                          </button>
                        </div>
                        {/* Delete */}
                        <button
                          onClick={() => deleteMutation.mutate(gen.id)}
                          disabled={deleteMutation.isPending}
                          className="rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                          title="Delete"
                          data-testid={`button-delete-${gen.id}`}
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Wizard Modal for AI Submissions */}
      <UploadWizardModal
        isOpen={wizardModalOpen}
        onClose={handleCloseWizard}
        aiSubmissionMode={
          selectedGeneration
            ? {
                imageUrl: selectedGeneration.imageUrl,
                cloudinaryPublicId: selectedGeneration.cloudinaryPublicId!,
                prompt: selectedGeneration.prompt,
              }
            : undefined
        }
      />
    </div>
  );
}
