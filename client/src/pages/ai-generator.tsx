import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Sparkles, Download, Trash2, Wand2, Settings, Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
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
      const res = await apiRequest("POST", "/api/ai/upscale", params);
      return res.json();
    },
    onSuccess: (data, variables) => {
      setCurrentImage(data.upscaledImageUrl);
      
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

  const handleDownload = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-glory flex items-center justify-center">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AI Studio</h1>
              <p className="text-muted-foreground">Create stunning images with AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="text-primary" size={18} />
            <div>
              <p className="text-xs text-muted-foreground">Credits</p>
              <p className="text-2xl font-bold text-primary" data-testid="text-credits-balance">{userCredits}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Generator Panel */}
          <div className="lg:col-span-2 space-y-6">
            <Card data-testid="card-generator">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  Generate Image
                </CardTitle>
                <CardDescription>Describe what you want to create</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="prompt">Prompt</Label>
                  <Textarea
                    id="prompt"
                    placeholder="A majestic dragon flying over a cyberpunk city at sunset..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    data-testid="input-prompt"
                  />
                </div>

                {currentModelConfig?.supportsNegativePrompt && (
                  <div>
                    <Label htmlFor="negative-prompt">Negative Prompt (Optional)</Label>
                    <Textarea
                      id="negative-prompt"
                      placeholder="blurry, low quality, distorted, bad anatomy, watermark, text..."
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      rows={2}
                      data-testid="input-negative-prompt"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Describe what you DON'T want to see in the image
                    </p>
                  </div>
                )}

                <div>
                  <Label>AI Model</Label>
                  {loadingModels ? (
                    <div className="h-10 rounded-md border border-input bg-muted/50 animate-pulse" />
                  ) : (
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger data-testid="select-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modelConfigs?.map((model) => {
                          const pricingKey = modelToPricingKey[model.id] || model.id;
                          const credits = pricing?.[pricingKey] || 0;
                          return (
                            <SelectItem key={model.id} value={model.id}>
                              {/* Mobile: Model - Price */}
                              <span className="text-sm md:hidden">
                                {model.name} - {credits} {credits === 1 ? 'credit' : 'credits'}
                              </span>
                              {/* Desktop: Model - Description - Price */}
                              <span className="text-sm hidden md:inline">
                                {model.name} - {model.description} - {credits} {credits === 1 ? 'credit' : 'credits'} per image
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {currentModelConfig && (
                  <details className="group" open>
                    <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium">
                      <Settings className="h-4 w-4" />
                      Model Settings
                    </summary>
                    <div className="mt-4 space-y-4 pl-6 border-l-2 border-border">
                      {/* Aspect Ratio */}
                      {currentModelConfig.supportsAspectRatio && (
                        <div>
                          <Label>Aspect Ratio</Label>
                          <Select value={aspectRatio} onValueChange={setAspectRatio}>
                            <SelectTrigger data-testid="select-aspect-ratio">
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
                          <Label>Resolution</Label>
                          <Select value={resolution} onValueChange={setResolution}>
                            <SelectTrigger data-testid="select-resolution">
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
                          <p className="text-xs text-muted-foreground mt-1">
                            Overrides aspect ratio when set
                          </p>
                        </div>
                      )}

                      {/* Style Type (Ideogram) */}
                      {currentModelConfig.supportsStyleType && (
                        <div>
                          <Label>Style Type</Label>
                          <Select value={styleType} onValueChange={setStyleType}>
                            <SelectTrigger data-testid="select-style-type">
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
                          <Label>Style Preset</Label>
                          <Select value={stylePreset} onValueChange={setStylePreset}>
                            <SelectTrigger data-testid="select-style-preset">
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
                          <Label>Magic Prompt</Label>
                          <Select value={magicPromptOption} onValueChange={setMagicPromptOption}>
                            <SelectTrigger data-testid="select-magic-prompt">
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
                          <Label>Leonardo Style</Label>
                          <Select value={leonardoStyle} onValueChange={setLeonardoStyle}>
                            <SelectTrigger data-testid="select-leonardo-style">
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
                          <Label>Contrast</Label>
                          <Select value={contrast} onValueChange={setContrast}>
                            <SelectTrigger data-testid="select-contrast">
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
                          <Label>Generation Mode</Label>
                          <Select value={generationMode} onValueChange={setGenerationMode}>
                            <SelectTrigger data-testid="select-generation-mode">
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

                      {/* Output Format */}
                      {currentModelConfig.supportsOutputFormat && (
                        <div>
                          <Label>Output Format</Label>
                          <Select value={outputFormat} onValueChange={setOutputFormat}>
                            <SelectTrigger data-testid="select-output-format">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="webp">WebP (Recommended)</SelectItem>
                              <SelectItem value="png">PNG (High Quality)</SelectItem>
                              <SelectItem value="jpg">JPG (Compatible)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Output Quality */}
                      {currentModelConfig.supportsOutputQuality && (
                        <div>
                          <Label>Output Quality: {outputQuality}%</Label>
                          <Slider
                            value={[outputQuality]}
                            onValueChange={([v]) => setOutputQuality(v)}
                            min={50}
                            max={100}
                            step={5}
                            data-testid="slider-quality"
                          />
                          <p className="text-xs text-muted-foreground mt-1">Higher quality = larger file size</p>
                        </div>
                      )}

                      {/* Safety Tolerance (Flux 1.1) */}
                      {currentModelConfig.supportsSafetyTolerance && (
                        <div>
                          <Label>Safety Tolerance: {safetyTolerance}</Label>
                          <Slider
                            value={[safetyTolerance]}
                            onValueChange={([v]) => setSafetyTolerance(v)}
                            min={1}
                            max={6}
                            step={1}
                            data-testid="slider-safety-tolerance"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            1 = most strict, 6 = most permissive
                          </p>
                        </div>
                      )}

                      {/* CFG (Stable Diffusion) */}
                      {currentModelConfig.supportsCfg && (
                        <div>
                          <Label>CFG Scale: {cfg}</Label>
                          <Slider
                            value={[cfg]}
                            onValueChange={([v]) => setCfg(v)}
                            min={1}
                            max={10}
                            step={0.5}
                            data-testid="slider-cfg"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            How closely to follow the prompt
                          </p>
                        </div>
                      )}

                      {/* Prompt Strength (Stable Diffusion) */}
                      {currentModelConfig.supportsPromptStrength && (
                        <div>
                          <Label>Prompt Strength: {promptStrength.toFixed(2)}</Label>
                          <Slider
                            value={[promptStrength * 100]}
                            onValueChange={([v]) => setPromptStrength(v / 100)}
                            min={0}
                            max={100}
                            step={5}
                            data-testid="slider-prompt-strength"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Used for image-to-image generation
                          </p>
                        </div>
                      )}

                      {/* Number of Images (All Models) */}
                      <div>
                        <Label>Number of Images: {numImages}</Label>
                        <Slider
                            value={[numImages]}
                            onValueChange={([v]) => setNumImages(v)}
                            min={1}
                            max={8}
                            step={1}
                            data-testid="slider-num-images"
                          />
                        </div>

                      {/* Prompt Upsampling (Flux 1.1) */}
                      {currentModelConfig.supportsPromptUpsampling && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="prompt-upsampling"
                            checked={promptUpsampling}
                            onCheckedChange={(checked) => setPromptUpsampling(checked as boolean)}
                            data-testid="checkbox-prompt-upsampling"
                          />
                          <Label htmlFor="prompt-upsampling" className="cursor-pointer">
                            Prompt Upsampling (Auto-enhance prompt)
                          </Label>
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
                          <Label htmlFor="prompt-enhance" className="cursor-pointer">
                            Prompt Enhance
                          </Label>
                        </div>
                      )}

                      {/* Seed Control */}
                      {currentModelConfig.supportsSeed && (
                        <div>
                          <Label htmlFor="seed">Seed (0 = random)</Label>
                          <Input
                            id="seed"
                            type="number"
                            min={0}
                            max={2147483647}
                            value={seed}
                            onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                            data-testid="input-seed"
                          />
                        </div>
                      )}

                      {/* Image Input Upload */}
                      {currentModelConfig.supportsImageInput && (
                        <div>
                          <Label htmlFor="image-input">{getImageInputLabel()}</Label>
                          {!imageInput ? (
                            <div className="mt-2">
                              <Input
                                id="image-input"
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) setImageInput(file);
                                }}
                                data-testid="input-image-upload"
                              />
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center gap-2 p-2 border rounded-md">
                              <span className="flex-1 text-sm truncate">{imageInput.name}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setImageInput(null)}
                                data-testid="button-remove-image"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Style Reference Images Upload */}
                      {currentModelConfig.supportsStyleReferenceImages && (
                        <div>
                          <Label htmlFor="style-references">Style Reference Images</Label>
                          <div className="mt-2">
                            <Input
                              id="style-references"
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                setStyleReferenceImages([...styleReferenceImages, ...files]);
                                e.target.value = '';
                              }}
                              data-testid="input-style-references"
                            />
                          </div>
                          {styleReferenceImages.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {styleReferenceImages.map((file, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                                  <span className="flex-1 text-sm truncate">{file.name}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setStyleReferenceImages(styleReferenceImages.filter((_, i) => i !== index));
                                    }}
                                    data-testid={`button-remove-style-ref-${index}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </details>
                )}

                <div className="space-y-2">
                  {totalCost > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 text-sm">
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="font-semibold" data-testid="text-model-cost">
                        {totalCost} credits
                        {numImages > 1 && (
                          <span className="text-muted-foreground font-normal ml-1">
                            ({numImages} images)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  <Button
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending || !hasEnoughCredits}
                    className="w-full gradient-glory"
                    size="lg"
                    data-testid="button-generate"
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating...
                      </>
                    ) : !hasEnoughCredits ? (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Insufficient Credits
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generate Image
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Result */}
            {currentImage && currentGenerationId && (
              <Card data-testid="card-current-result">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Generated Image
                    </span>
                    <div className="flex gap-2">
                      {(() => {
                        const currentGen = generations?.find(g => g.id === currentGenerationId);
                        const upscaleCost = pricing?.["upscale"] || 0;
                        const canUpscale = currentGen && !currentGen.isUpscaled && userCredits >= upscaleCost;
                        
                        return (
                          <>
                            {currentGen && !currentGen.isUpscaled && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => upscaleMutation.mutate({ generationId: currentGenerationId })}
                                disabled={upscaleMutation.isPending || !canUpscale}
                                data-testid="button-upscale-current"
                              >
                                {upscaleMutation.isPending ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Upscaling...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Upscale (4x)
                                  </>
                                )}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(currentImage, `ai-generated-${Date.now()}.${outputFormat}`)}
                              data-testid="button-download-current"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </>
                        );
                      })()}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={currentImage}
                    alt="Generated"
                    className="w-full rounded-lg shadow-lg"
                    data-testid="img-current"
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* History Panel */}
          <div className="lg:col-span-1">
            <Card data-testid="card-history">
              <CardHeader>
                <CardTitle>Your Creations</CardTitle>
                <CardDescription>Recent AI generations</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !generations || generations.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No generations yet. Create your first image!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {generations.map((gen) => (
                      <div
                        key={gen.id}
                        className="relative group rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                        data-testid={`generation-${gen.id}`}
                      >
                        <img
                          src={gen.editedImageUrl || gen.imageUrl}
                          alt={gen.prompt}
                          className="w-full aspect-square object-cover cursor-pointer"
                          onClick={() => {
                            setCurrentImage(gen.editedImageUrl || gen.imageUrl);
                            setCurrentGenerationId(gen.id);
                          }}
                          data-testid={`img-generation-${gen.id}`}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownload(gen.editedImageUrl || gen.imageUrl, `${gen.id}.webp`)}
                            data-testid={`button-download-${gen.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {!gen.isUpscaled && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => upscaleMutation.mutate({ generationId: gen.id })}
                              disabled={upscaleMutation.isPending || userCredits < (pricing?.["upscale"] || 0)}
                              data-testid={`button-upscale-${gen.id}`}
                            >
                              <Sparkles className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleOpenSubmitWizard(gen)}
                            data-testid={`button-submit-${gen.id}`}
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(gen.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${gen.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="p-2 bg-card">
                          <p className="text-xs text-muted-foreground line-clamp-2">{gen.prompt}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
