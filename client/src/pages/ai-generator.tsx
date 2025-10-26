import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassButton as FancyGlassButton } from "@/components/GlassButton";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, Download, Trash2, Wand2, Settings, Image as ImageIcon, Loader2, Upload, X, Pencil, Maximize2, User, Undo, Redo, Save, Menu } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UploadWizardModal } from "@/components/UploadWizardModal";
import { AiLightboxModal } from "@/components/AiLightboxModal";
import { Sidebar } from "@/components/layout/Sidebar";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import * as fabric from "fabric";
import type { AiGeneration, EditJob } from "@shared/schema";

type EditJobStatus = EditJob & {
  outputUrl: string | null;
  originalUrl: string;
};

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

function AiGeneratorPageContent() {
  const { isCollapsed } = useSidebar();
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxGenerationId, setLightboxGenerationId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<string>("history");
  
  // Pro Edit canvas state
  const [processingPreset, setProcessingPreset] = useState<string | null>(null);
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [imageVersions, setImageVersions] = useState<string[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  
  // Canvas zoom state
  const [zoomLevel, setZoomLevel] = useState<'fit' | '100' | '150' | '200'>('fit');
  
  // Canvas state for fabric.js
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const historyIndexRef = useRef(-1);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    document.title = "AI Studio - 5best";
  }, []);

  const { data: modelConfigs, isLoading: loadingModels } = useQuery<ModelConfig[]>({
    queryKey: ["/api/ai/models"],
  });

  const { data: generations, isLoading: loadingHistory } = useQuery<AiGeneration[]>({
    queryKey: ["/api/ai/generations"],
  });

  // Derive lightbox generation from query data
  const lightboxGeneration = useMemo(() => {
    if (!lightboxGenerationId || !generations) return null;
    return generations.find(gen => gen.id === lightboxGenerationId) || null;
  }, [lightboxGenerationId, generations]);

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

  // Pro Edit mutations
  const startEditMutation = useMutation({
    mutationFn: async ({ preset, imageUrl }: { preset: string; imageUrl: string }) => {
      const response = await fetch("/api/edits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageUrl,
          preset,
          generationId: currentGenerationId
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start processing");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setEditJobId(data.jobId);
      setImageId(data.imageId);
      toast({
        title: "Processing started",
        description: `Your image is being enhanced. Credits used: ${data.creditsDeducted}`
      });
    },
    onError: (error: Error) => {
      setProcessingPreset(null);
      toast({
        title: "Edit Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Polling query for job status
  const { data: jobStatus } = useQuery<EditJobStatus>({
    queryKey: ["/api/edit-jobs", editJobId],
    enabled: !!editJobId && processingPreset !== null,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling if job is done
      if (data?.status === 'succeeded' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    }
  });

  // Initialize fabric.js canvas when currentImage changes
  useEffect(() => {
    if (!canvasRef.current || !currentImage) return;

    let fabricCanvas: fabric.Canvas | null = null;
    let isMounted = true;

    // Clear existing canvas
    if (canvas) {
      try {
        canvas.dispose();
      } catch (e) {
        // Ignore disposal errors
        console.warn('Canvas disposal warning:', e);
      }
      setCanvas(null);
    }

    // Load image to get dimensions
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!isMounted || !canvasRef.current) return;

      // Get available space - look for the flex-1 container
      const previewContainer = canvasRef.current.closest('.flex-1');
      const maxWidth = (previewContainer?.clientWidth || 1200) - 100; // Account for padding
      const maxHeight = (previewContainer?.clientHeight || 800) - 150; // Account for header/padding

      // Calculate scale to fit image in available space
      const scaleX = maxWidth / img.width;
      const scaleY = maxHeight / img.height;
      const scale = Math.min(scaleX, scaleY);

      const canvasWidth = img.width * scale;
      const canvasHeight = img.height * scale;

      // Create fabric canvas with scaled dimensions
      fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: canvasWidth,
        height: canvasHeight,
      });

      // Load image onto canvas
      fabric.FabricImage.fromURL(currentImage, { crossOrigin: "anonymous" }).then((fabricImg: any) => {
        if (!isMounted || !fabricCanvas) return;

        fabricImg.set({
          left: fabricCanvas.width! / 2,
          top: fabricCanvas.height! / 2,
          originX: "center",
          originY: "center",
          scaleX: scale,
          scaleY: scale,
          selectable: false,
          evented: false,
        });

        fabricCanvas.add(fabricImg);
        fabricCanvas.sendObjectToBack(fabricImg);
        fabricCanvas.renderAll();

        // Save initial state to history
        setTimeout(() => {
          if (!isMounted) return;
          const initialState = JSON.stringify(fabricCanvas!.toJSON());
          setHistoryStack([initialState]);
          historyIndexRef.current = 0;
        }, 100);
      });

      if (isMounted) {
        setCanvas(fabricCanvas);
      }

      // Add event listeners for history
      fabricCanvas.on("object:added", () => {
        if (isRestoring) return;
        saveToHistory(fabricCanvas!);
      });
      fabricCanvas.on("object:modified", () => {
        if (isRestoring) return;
        saveToHistory(fabricCanvas!);
      });
      fabricCanvas.on("object:removed", () => {
        if (isRestoring) return;
        saveToHistory(fabricCanvas!);
      });
    };

    img.src = currentImage;

    return () => {
      isMounted = false;
      if (fabricCanvas) {
        try {
          fabricCanvas.dispose();
        } catch (e) {
          // Ignore disposal errors during cleanup
          console.warn('Canvas cleanup warning:', e);
        }
      }
    };
  }, [currentImage]);

  // Save state to history
  const saveToHistory = (fabricCanvas: fabric.Canvas) => {
    if (isRestoring) return;

    const state = JSON.stringify(fabricCanvas.toJSON());
    setHistoryStack((prev) => {
      const newStack = prev.slice(0, historyIndexRef.current + 1);
      newStack.push(state);
      const finalStack = newStack.length > 50 ? newStack.slice(-50) : newStack;
      historyIndexRef.current = finalStack.length - 1;
      return finalStack;
    });
  };

  // Force reload canvas by changing image URL (useEffect handles canvas recreation)
  const reloadCanvas = (imageUrl: string) => {
    setCurrentImage(imageUrl);
  };

  // Handle Pro Edit job completion
  useEffect(() => {
    if (jobStatus?.status === 'succeeded' && jobStatus.outputUrl) {
      const outputUrl = jobStatus.outputUrl;
      setCurrentImage(outputUrl);
      setImageVersions(prev => {
        const newVersions = [...prev, outputUrl];
        setCurrentVersionIndex(newVersions.length - 1);
        historyIndexRef.current = newVersions.length - 1;
        return newVersions;
      });
      setProcessingPreset(null);
      setEditJobId(null);
      toast({ 
        title: "Edit Complete!",
        description: "Your image has been processed successfully."
      });
    } else if (jobStatus?.status === 'failed') {
      setProcessingPreset(null);
      setEditJobId(null);
      toast({ 
        title: "Edit Failed", 
        description: jobStatus.error || "Processing failed. Please try again.",
        variant: "destructive" 
      });
    }
  }, [jobStatus, toast]);

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

  const handleSelectGeneration = async (gen: AiGeneration) => {
    setCurrentImage(gen.imageUrl);
    setCurrentGenerationId(gen.id);
    setProcessingPreset(null);
    setEditJobId(null);
    
    // Fetch imageId and versions for this generation
    try {
      const imageIdResponse = await fetch(`/api/pro-edit/image-id?generationId=${gen.id}`, {
        credentials: "include",
      });
      
      if (imageIdResponse.ok) {
        const { imageId: fetchedImageId } = await imageIdResponse.json();
        
        if (fetchedImageId) {
          setImageId(fetchedImageId);
          
          // Fetch versions
          const versionsResponse = await fetch(`/api/images/${fetchedImageId}/versions`, {
            credentials: "include",
          });
          
          if (versionsResponse.ok) {
            const { versions } = await versionsResponse.json();
            const versionUrls = versions.map((v: any) => v.url);
            setImageVersions(versionUrls.length > 0 ? versionUrls : [gen.imageUrl]);
            setCurrentVersionIndex(versionUrls.length > 0 ? versionUrls.length - 1 : 0);
            
            // Only switch to Versions tab if there are actual versions (more than just the original)
            if (versionUrls.length > 0) {
              setCurrentTab("versions");
            } else {
              setCurrentTab("history");
            }
          } else {
            setImageVersions([gen.imageUrl]);
            setCurrentVersionIndex(0);
            setCurrentTab("history");
          }
        } else {
          // No imageId yet, start fresh
          setImageId(null);
          setImageVersions([gen.imageUrl]);
          setCurrentVersionIndex(0);
          setCurrentTab("history");
        }
      } else {
        setImageVersions([gen.imageUrl]);
        setCurrentVersionIndex(0);
        setCurrentTab("history");
      }
    } catch (error) {
      console.error("Error fetching versions:", error);
      setImageVersions([gen.imageUrl]);
      setCurrentVersionIndex(0);
      setCurrentTab("history");
    }
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

  const handleDownload = async (url: string, generationId: string, filename?: string) => {
    try {
      setDownloadingId(generationId);
      
      // Use proxy endpoint to ensure download works with CORS
      const downloadUrl = `/api/proxy-download?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(downloadUrl, {
        credentials: 'include',
        cache: 'no-store',
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
      
      toast({
        title: "Download Complete",
        description: "Image saved successfully",
      });
    } catch (error) {
      console.error("Download failed:", error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Failed to download image",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className={`min-h-screen bg-background font-['Space_Grotesk',sans-serif] transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {/* Header with Pro Edit Toolbar */}
        <div className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold tracking-tight">AI Studio</h1>
              
              {/* Pro Edit Toolbar */}
              {currentImage && (
                <div className="hidden lg:flex items-center gap-2">
                  <div className="h-6 w-px bg-border" />
                  <span className="text-xs text-muted-foreground font-medium mr-1">Pro Edit:</span>
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProcessingPreset('clean');
                      startEditMutation.mutate({ preset: 'clean', imageUrl: currentImage! });
                    }}
                    disabled={processingPreset !== null || !currentImage}
                    className="gap-1.5"
                    title="Clean & Denoise"
                  >
                    {processingPreset === 'clean' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Clean
                  </GlassButton>
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProcessingPreset('upscale4x');
                      startEditMutation.mutate({ preset: 'upscale4x', imageUrl: currentImage! });
                    }}
                    disabled={processingPreset !== null || !currentImage}
                    className="gap-1.5"
                    title="Upscale 4×"
                  >
                    {processingPreset === 'upscale4x' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                    Upscale
                  </GlassButton>
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProcessingPreset('portrait_pro');
                      startEditMutation.mutate({ preset: 'portrait_pro', imageUrl: currentImage! });
                    }}
                    disabled={processingPreset !== null || !currentImage}
                    className="gap-1.5"
                    title="Portrait Pro"
                  >
                    {processingPreset === 'portrait_pro' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <User className="h-3.5 w-3.5" />
                    )}
                    Portrait
                  </GlassButton>
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProcessingPreset('enhance');
                      startEditMutation.mutate({ preset: 'enhance', imageUrl: currentImage! });
                    }}
                    disabled={processingPreset !== null || !currentImage}
                    className="gap-1.5"
                    title="Smart Enhance"
                  >
                    {processingPreset === 'enhance' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5" />
                    )}
                    Enhance
                  </GlassButton>
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProcessingPreset('bg_remove');
                      startEditMutation.mutate({ preset: 'bg_remove', imageUrl: currentImage! });
                    }}
                    disabled={processingPreset !== null || !currentImage}
                    className="gap-1.5"
                    title="Remove Background"
                  >
                    {processingPreset === 'bg_remove' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Remove BG
                  </GlassButton>
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setProcessingPreset('relight');
                      startEditMutation.mutate({ preset: 'relight', imageUrl: currentImage! });
                    }}
                    disabled={processingPreset !== null || !currentImage}
                    className="gap-1.5"
                    title="Relight Scene"
                  >
                    {processingPreset === 'relight' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Relight
                  </GlassButton>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Credits Display */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg glassmorphism">
                <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
                <div>
                  <p className="text-xs text-muted-foreground">Credits</p>
                  <p className="text-xl font-bold text-primary" data-testid="text-credits-balance">{userCredits}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full">
        {/* Mobile Vertical Scroll Layout (< lg) */}
        <div className="lg:hidden">
          {/* Section 1: Generator */}
          <div className="border-b border-border/40">
            <div className="sticky top-16 bg-background/95 backdrop-blur z-30 p-4 border-b border-border/40">
              <h2 className="text-lg font-semibold">Generator</h2>
            </div>
              <div className="min-h-[calc(100vh-10rem)] overflow-y-auto">
                <div className="p-4 space-y-6">
                  {/* Prompt */}
                  <div>
                    <Label htmlFor="prompt-mobile" className="mb-2 block text-sm font-medium">
                      Prompt
                    </Label>
                    <Textarea
                      id="prompt-mobile"
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
                      <Label htmlFor="negative-prompt-mobile" className="mb-2 block text-sm font-medium">
                        Negative Prompt (Optional)
                      </Label>
                      <Textarea
                        id="negative-prompt-mobile"
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
                      
                      {/* Number of Images */}
                      <div>
                        <Label className="mb-1 block text-xs text-muted-foreground">
                          Num Images ({numImages})
                        </Label>
                        <Slider
                          value={[numImages]}
                          onValueChange={(value) => setNumImages(value[0])}
                          min={1}
                          max={8}
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
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Prompt Enhance</Label>
                          <Checkbox
                            checked={promptEnhance}
                            onCheckedChange={(checked) => setPromptEnhance(checked as boolean)}
                            data-testid="checkbox-prompt-enhance"
                          />
                        </div>
                      )}

                      {/* Prompt Upsampling (Flux) */}
                      {currentModelConfig.supportsPromptUpsampling && (
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Prompt Upsampling</Label>
                          <Checkbox
                            checked={promptUpsampling}
                            onCheckedChange={(checked) => setPromptUpsampling(checked as boolean)}
                            data-testid="checkbox-prompt-upsampling"
                          />
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

                      {/* CFG Scale (Stable Diffusion) */}
                      {currentModelConfig.supportsCfg && (
                        <div>
                          <Label className="mb-1 block text-xs text-muted-foreground">
                            CFG Scale ({cfg})
                          </Label>
                          <Slider
                            value={[cfg]}
                            onValueChange={(value) => setCfg(value[0])}
                            min={0}
                            max={20}
                            step={0.5}
                          />
                        </div>
                      )}

                      {/* Prompt Strength (Stable Diffusion) */}
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
                          <Label htmlFor="seed-mobile" className="mb-1 block text-xs text-muted-foreground">
                            Seed (0 for random)
                          </Label>
                          <Input
                            id="seed-mobile"
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
                  <FancyGlassButton
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending || !hasEnoughCredits}
                    className="w-full"
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
                  </FancyGlassButton>
                </div>
              </div>
          </div>

          {/* Section 2: Canvas */}
          <div className="border-b border-border/40">
            <div className="sticky top-16 bg-background/95 backdrop-blur z-30 p-4 border-b border-border/40">
              <h2 className="text-lg font-semibold">Canvas</h2>
            </div>
              <div className="min-h-[calc(100vh-10rem)] relative">
                {generateMutation.isPending ? (
                  <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-10rem)]">
                    <div className="text-center space-y-4">
                      <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                      <div>
                        <h3 className="text-xl font-bold mb-2">Generating...</h3>
                        <p className="text-sm text-muted-foreground">This may take a few moments</p>
                      </div>
                    </div>
                  </div>
                ) : currentImage ? (
                  <>
                    {/* Zoom Controls */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-background sticky top-0 z-10">
                      <div className="text-sm text-muted-foreground">
                        Preview
                      </div>
                      <div className="flex items-center gap-2">
                        <GlassButton
                          variant={zoomLevel === 'fit' ? 'primary' : 'ghost'}
                          size="sm"
                          onClick={() => setZoomLevel('fit')}
                          className="h-7 px-2 text-xs"
                        >
                          Fit
                        </GlassButton>
                        <GlassButton
                          variant={zoomLevel === '100' ? 'primary' : 'ghost'}
                          size="sm"
                          onClick={() => setZoomLevel('100')}
                          className="h-7 px-2 text-xs"
                        >
                          100%
                        </GlassButton>
                      </div>
                    </div>
                    
                    {/* Canvas Container */}
                    <div className="flex items-center justify-center overflow-auto bg-muted/10 min-h-[calc(100vh-16rem)] p-4">
                      <div className={`${zoomLevel === 'fit' ? 'max-w-full w-full' : 'w-auto'}`}>
                        <div className="relative rounded-2xl glassmorphism p-4">
                          <canvas
                            ref={canvasRef}
                            className="rounded-xl max-w-full"
                            style={{
                              transform: zoomLevel === 'fit' ? 'none' : 
                                        zoomLevel === '100' ? 'scale(1)' :
                                        zoomLevel === '150' ? 'scale(1.5)' :
                                        'scale(2)',
                              transformOrigin: 'center'
                            }}
                          />
                          
                          {processingPreset && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center">
                              <div className="text-center space-y-3">
                                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                                <div>
                                  <h4 className="text-lg font-semibold">Processing...</h4>
                                  <p className="text-sm text-muted-foreground">
                                    Applying {processingPreset === 'clean' ? 'Clean & Denoise' : 
                                              processingPreset === 'upscale4x' ? 'Upscale 4×' :
                                              processingPreset === 'portrait_pro' ? 'Portrait Pro' :
                                              processingPreset === 'enhance' ? 'Smart Enhance' :
                                              processingPreset === 'bg_remove' ? 'Remove Background' :
                                              'Relight Scene'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Overlay Controls - Bottom Right */}
                    {currentImage && (
                      <div className="fixed bottom-20 right-4 z-40 flex flex-col gap-2 glassmorphism p-3 rounded-xl shadow-lg">
                        <GlassButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (currentVersionIndex <= 0) return;
                            const newIndex = currentVersionIndex - 1;
                            setCurrentVersionIndex(newIndex);
                            historyIndexRef.current = newIndex;
                            reloadCanvas(imageVersions[newIndex]);
                          }}
                          disabled={currentVersionIndex <= 0 || imageVersions.length === 0}
                          className="h-9 w-9 p-0"
                          title="Undo"
                          data-testid="button-undo"
                        >
                          <Undo className="h-4 w-4" />
                        </GlassButton>
                        <GlassButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (currentVersionIndex >= imageVersions.length - 1) return;
                            const newIndex = currentVersionIndex + 1;
                            setCurrentVersionIndex(newIndex);
                            historyIndexRef.current = newIndex;
                            reloadCanvas(imageVersions[newIndex]);
                          }}
                          disabled={currentVersionIndex >= imageVersions.length - 1 || imageVersions.length === 0}
                          className="h-9 w-9 p-0"
                          title="Redo"
                          data-testid="button-redo"
                        >
                          <Redo className="h-4 w-4" />
                        </GlassButton>
                        <GlassButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!canvas) return;
                            const dataURL = canvas.toDataURL({
                              format: "png",
                              quality: 1,
                              multiplier: 2,
                            });
                            const link = document.createElement("a");
                            link.href = dataURL;
                            link.download = `edited-${Date.now()}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            toast({
                              title: "Downloaded",
                              description: "Image downloaded successfully",
                            });
                          }}
                          disabled={!canvas}
                          className="h-9 w-9 p-0"
                          title="Download"
                          data-testid="button-download"
                        >
                          <Download className="h-4 w-4" />
                        </GlassButton>
                        <GlassButton
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const gen = generations?.find(g => g.id === currentGenerationId);
                            if (gen) handleOpenSubmitWizard(gen);
                          }}
                          disabled={!currentGenerationId}
                          className="h-9 w-9 p-0"
                          title="Upload to Contest"
                          data-testid="button-upload"
                        >
                          <Upload className="h-4 w-4" />
                        </GlassButton>
                      </div>
                    )}

                    {/* Pro Edit FAB - Bottom Left */}
                    {currentImage && (
                      <div className="fixed bottom-20 left-4 z-50">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <FancyGlassButton
                              disabled={processingPreset !== null}
                              className="gap-2 shadow-xl"
                              data-testid="button-pro-edit-fab"
                            >
                              <Sparkles className="h-5 w-5" />
                              Pro Edit
                            </FancyGlassButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-56">
                            <DropdownMenuItem
                              onClick={() => {
                                setProcessingPreset('clean');
                                startEditMutation.mutate({ preset: 'clean', imageUrl: currentImage! });
                              }}
                              disabled={processingPreset !== null}
                              data-testid="menu-item-clean"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  {processingPreset === 'clean' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-4 w-4" />
                                  )}
                                  <span>Clean & Denoise</span>
                                </div>
                                <span className="text-xs text-muted-foreground">2 credits</span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setProcessingPreset('upscale4x');
                                startEditMutation.mutate({ preset: 'upscale4x', imageUrl: currentImage! });
                              }}
                              disabled={processingPreset !== null}
                              data-testid="menu-item-upscale"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  {processingPreset === 'upscale4x' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Maximize2 className="h-4 w-4" />
                                  )}
                                  <span>Upscale 4×</span>
                                </div>
                                <span className="text-xs text-muted-foreground">4 credits</span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setProcessingPreset('portrait_pro');
                                startEditMutation.mutate({ preset: 'portrait_pro', imageUrl: currentImage! });
                              }}
                              disabled={processingPreset !== null}
                              data-testid="menu-item-portrait"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  {processingPreset === 'portrait_pro' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <User className="h-4 w-4" />
                                  )}
                                  <span>Portrait Pro</span>
                                </div>
                                <span className="text-xs text-muted-foreground">4 credits</span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setProcessingPreset('enhance');
                                startEditMutation.mutate({ preset: 'enhance', imageUrl: currentImage! });
                              }}
                              disabled={processingPreset !== null}
                              data-testid="menu-item-enhance"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  {processingPreset === 'enhance' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Wand2 className="h-4 w-4" />
                                  )}
                                  <span>Smart Enhance</span>
                                </div>
                                <span className="text-xs text-muted-foreground">3 credits</span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setProcessingPreset('bg_remove');
                                startEditMutation.mutate({ preset: 'bg_remove', imageUrl: currentImage! });
                              }}
                              disabled={processingPreset !== null}
                              data-testid="menu-item-bg-remove"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  {processingPreset === 'bg_remove' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                  <span>Remove Background</span>
                                </div>
                                <span className="text-xs text-muted-foreground">2 credits</span>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setProcessingPreset('relight');
                                startEditMutation.mutate({ preset: 'relight', imageUrl: currentImage! });
                              }}
                              disabled={processingPreset !== null}
                              data-testid="menu-item-relight"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  {processingPreset === 'relight' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-4 w-4" />
                                  )}
                                  <span>Relight Scene</span>
                                </div>
                                <span className="text-xs text-muted-foreground">4 credits</span>
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-10rem)]">
                    <div className="text-center space-y-4">
                      <div className="mx-auto h-32 w-32 rounded-full bg-muted/50 flex items-center justify-center">
                        <ImageIcon className="h-16 w-16 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-2">Your images will be displayed here</h3>
                        <p className="text-sm text-muted-foreground">Generate an image to see it here</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
          </div>

          {/* Section 3: History */}
          <div>
            <div className="sticky top-16 bg-background/95 backdrop-blur z-30 p-4 border-b border-border/40">
              <h2 className="text-lg font-semibold">History</h2>
            </div>
              <div className="min-h-[calc(100vh-10rem)] overflow-y-auto">
                <div className="p-4">
                  {/* Warning Banner */}
                  <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2 font-medium">
                      <span className="text-base">⚠️</span>
                      <span>Images will be deleted after 7 days. Download soon!</span>
                    </p>
                  </div>
                  
                  <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                    <TabsList className="w-full grid grid-cols-2 mb-4">
                      <TabsTrigger value="history">History</TabsTrigger>
                      <TabsTrigger value="versions">Versions</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="history" className="mt-0">
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground">Your generated images</p>
                      </div>

                      {/* Images Grid */}
                      {loadingHistory ? (
                        <div className="flex justify-center py-12">
                          <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                        </div>
                      ) : !generations || generations.length === 0 ? (
                        <div className="text-center py-12">
                          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">No generations yet</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {generations.map((gen) => (
                            <div
                              key={gen.id}
                              className={`group cursor-pointer relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                                currentGenerationId === gen.id
                                  ? 'border-primary shadow-lg shadow-primary/20'
                                  : 'border-transparent hover:border-primary/50'
                              }`}
                              onClick={() => {
                                handleSelectGeneration(gen);
                              }}
                              data-testid={`generation-${gen.id}`}
                            >
                              <img
                                alt={gen.prompt}
                                className="h-full w-full object-cover"
                                src={gen.thumbnailUrl || gen.editedImageUrl || gen.imageUrl}
                                data-testid={`img-generation-${gen.id}`}
                              />
                              
                              {/* Hover Actions */}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                <GlassButton
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const downloadUrl = currentGenerationId === gen.id && currentImage 
                                      ? currentImage 
                                      : gen.editedImageUrl || gen.imageUrl;
                                    handleDownload(downloadUrl, gen.id);
                                  }}
                                  disabled={downloadingId === gen.id}
                                >
                                  {downloadingId === gen.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Download className="h-3 w-3" />
                                  )}
                                </GlassButton>
                                
                                <GlassButton
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteMutation.mutate(gen.id);
                                  }}
                                  disabled={deleteMutation.isPending}
                                >
                                  {deleteMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </GlassButton>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="versions" className="mt-0">
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground">Pro Edit versions ({imageVersions.length})</p>
                      </div>
                      
                      {/* Versions Grid */}
                      {!currentImage ? (
                        <div className="text-center py-12">
                          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">Select an image to see versions</p>
                        </div>
                      ) : imageVersions.length === 0 ? (
                        <div className="text-center py-12">
                          <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">No versions yet</p>
                          <p className="text-xs text-muted-foreground mt-2">Apply Pro Edit effects to create versions</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          {imageVersions.map((versionUrl, index) => (
                            <div
                              key={`${versionUrl}-${index}`}
                              className={`group cursor-pointer relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                                currentVersionIndex === index
                                  ? 'border-primary shadow-lg shadow-primary/20'
                                  : 'border-transparent hover:border-primary/50'
                              }`}
                              onClick={() => {
                                setCurrentVersionIndex(index);
                                historyIndexRef.current = index;
                                reloadCanvas(versionUrl);
                              }}
                              data-testid={`version-${index}`}
                            >
                              <img
                                alt={`Version ${index + 1}`}
                                className="h-full w-full object-cover"
                                src={versionUrl}
                                data-testid={`img-version-${index}`}
                              />
                              
                              {/* Version Number Badge */}
                              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded px-2 py-0.5">
                                <span className="text-xs font-semibold text-white">v{index + 1}</span>
                              </div>
                              
                              {/* Hover Actions - Top Right */}
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <GlassButton
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(versionUrl, `version-${index + 1}`);
                                  }}
                                  disabled={downloadingId === `version-${index + 1}`}
                                  data-testid={`button-download-version-${index}`}
                                  title="Download version"
                                >
                                  {downloadingId === `version-${index + 1}` ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Download className="h-3 w-3" />
                                  )}
                                </GlassButton>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
          </div>
        </div>

        {/* Desktop 3-Column Layout (>= lg) */}
        <div className="hidden lg:flex gap-0">
          {/* Center Panel - Canvas (flex-grow) */}
          <div className="flex-1 min-h-[calc(100vh-5rem)] flex flex-col">
            {generateMutation.isPending ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
                  <div>
                    <h3 className="text-xl font-bold mb-2">Generating...</h3>
                    <p className="text-sm text-muted-foreground">This may take a few moments</p>
                  </div>
                </div>
              </div>
            ) : currentImage ? (
              <>
                {/* Zoom Controls */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground mr-2">
                      Preview
                    </div>
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (currentVersionIndex <= 0) return;
                        const newIndex = currentVersionIndex - 1;
                        setCurrentVersionIndex(newIndex);
                        historyIndexRef.current = newIndex;
                        reloadCanvas(imageVersions[newIndex]);
                      }}
                      disabled={currentVersionIndex <= 0 || imageVersions.length === 0}
                      className="h-7 px-2 text-xs gap-1"
                      title="Undo"
                      data-testid="button-undo"
                    >
                      <Undo className="h-3 w-3" />
                    </GlassButton>
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (currentVersionIndex >= imageVersions.length - 1) return;
                        const newIndex = currentVersionIndex + 1;
                        setCurrentVersionIndex(newIndex);
                        historyIndexRef.current = newIndex;
                        reloadCanvas(imageVersions[newIndex]);
                      }}
                      disabled={currentVersionIndex >= imageVersions.length - 1 || imageVersions.length === 0}
                      className="h-7 px-2 text-xs gap-1"
                      title="Redo"
                      data-testid="button-redo"
                    >
                      <Redo className="h-3 w-3" />
                    </GlassButton>
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (!canvas) return;
                        const dataURL = canvas.toDataURL({
                          format: "png",
                          quality: 1,
                          multiplier: 2,
                        });
                        const link = document.createElement("a");
                        link.href = dataURL;
                        link.download = `edited-${Date.now()}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        toast({
                          title: "Downloaded",
                          description: "Image downloaded successfully",
                        });
                      }}
                      disabled={!canvas}
                      className="h-7 px-2 text-xs gap-1"
                      title="Download"
                      data-testid="button-download"
                    >
                      <Download className="h-3 w-3" />
                    </GlassButton>
                    <FancyGlassButton
                      onClick={() => {
                        const gen = generations?.find(g => g.id === currentGenerationId);
                        if (gen) handleOpenSubmitWizard(gen);
                      }}
                      disabled={!currentGenerationId}
                      title="Upload to Contest or Gallery"
                      data-testid="button-upload"
                    >
                      <Upload className="h-5 w-5" />
                      Upload
                    </FancyGlassButton>
                  </div>
                  <div className="flex items-center gap-2">
                    <GlassButton
                      variant={zoomLevel === 'fit' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setZoomLevel('fit')}
                      className="h-7 px-2 text-xs"
                    >
                      Fit
                    </GlassButton>
                    <GlassButton
                      variant={zoomLevel === '100' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setZoomLevel('100')}
                      className="h-7 px-2 text-xs"
                    >
                      100%
                    </GlassButton>
                    <GlassButton
                      variant={zoomLevel === '150' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setZoomLevel('150')}
                      className="h-7 px-2 text-xs"
                    >
                      150%
                    </GlassButton>
                    <GlassButton
                      variant={zoomLevel === '200' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => setZoomLevel('200')}
                      className="h-7 px-2 text-xs"
                    >
                      200%
                    </GlassButton>
                  </div>
                </div>
                
                {/* Canvas */}
                <div className="flex-1 flex items-center justify-center overflow-auto bg-muted/10">
                  <div className={`p-8 ${zoomLevel === 'fit' ? 'max-w-4xl w-full' : 'w-auto'}`}>
                    <div className={`relative rounded-2xl glassmorphism p-4`}>
                      <canvas
                        ref={canvasRef}
                        className="rounded-xl max-w-full"
                        style={{
                          transform: zoomLevel === 'fit' ? 'none' : 
                                    zoomLevel === '100' ? 'scale(1)' :
                                    zoomLevel === '150' ? 'scale(1.5)' :
                                    'scale(2)',
                          transformOrigin: 'center'
                        }}
                      />
                      
                      {processingPreset && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-xl flex items-center justify-center">
                          <div className="text-center space-y-3">
                            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                            <div>
                              <h4 className="text-lg font-semibold">Processing...</h4>
                              <p className="text-sm text-muted-foreground">
                                Applying {processingPreset === 'clean' ? 'Clean & Denoise' : 
                                          processingPreset === 'upscale4x' ? 'Upscale 4×' :
                                          processingPreset === 'portrait_pro' ? 'Portrait Pro' :
                                          processingPreset === 'enhance' ? 'Smart Enhance' :
                                          processingPreset === 'bg_remove' ? 'Remove Background' :
                                          'Relight Scene'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="mx-auto h-32 w-32 rounded-full bg-muted/50 flex items-center justify-center">
                    <ImageIcon className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Your images will be displayed here</h3>
                    <p className="text-sm text-muted-foreground">Enter a prompt on the left and click Generate</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Left Panel - Generator Controls */}
          <div className="hidden lg:block w-[360px] border-r border-border/40 bg-muted/20 order-first">
            <div className="h-[calc(100vh-5rem)] overflow-y-auto">
              <div className="sticky top-0 bg-muted/20 p-4 border-b border-border/40 z-10">
                <h2 className="text-lg font-semibold">Generator</h2>
              </div>
              <div className="p-4 space-y-6">
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
                        max={8}
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
                <FancyGlassButton
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !hasEnoughCredits}
                  className="w-full"
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
                </FancyGlassButton>
              </div>
            </div>
          </div>

          {/* Right Panel - History & Versions */}
          <div className="hidden lg:block w-[340px] border-l border-border/40 bg-muted/20">
            <div className="h-[calc(100vh-5rem)] overflow-y-auto">
              {/* Warning Banner */}
              <div className="mx-4 mt-4 mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2 font-medium">
                  <span className="text-base">⚠️</span>
                  <span>Images will be deleted after 7 days. Download soon!</span>
                </p>
              </div>
              
              <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                <TabsList className="w-full grid grid-cols-2 mx-4 mb-2" style={{ width: 'calc(100% - 2rem)' }}>
                  <TabsTrigger value="history">History</TabsTrigger>
                  <TabsTrigger value="versions">Versions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="history" className="px-4 pb-4 mt-0">
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground">Your generated images</p>
                  </div>

                  {/* Images Grid */}
                  {loadingHistory ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                    </div>
                  ) : !generations || generations.length === 0 ? (
                    <div className="text-center py-12">
                      <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">No generations yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {generations.map((gen) => (
                        <div
                          key={gen.id}
                          className={`group cursor-pointer relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                            currentGenerationId === gen.id
                              ? 'border-primary shadow-lg shadow-primary/20'
                              : 'border-transparent hover:border-primary/50'
                          }`}
                          onClick={() => handleSelectGeneration(gen)}
                          data-testid={`generation-${gen.id}`}
                        >
                          <img
                            alt={gen.prompt}
                            className="h-full w-full object-cover"
                            src={gen.thumbnailUrl || gen.editedImageUrl || gen.imageUrl}
                            data-testid={`img-generation-${gen.id}`}
                          />
                          
                          {/* Hover Actions */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                            <GlassButton
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Use currentImage if this generation is selected and has been edited
                                const downloadUrl = currentGenerationId === gen.id && currentImage 
                                  ? currentImage 
                                  : gen.editedImageUrl || gen.imageUrl;
                                handleDownload(downloadUrl, gen.id);
                              }}
                              disabled={downloadingId === gen.id}
                            >
                              {downloadingId === gen.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Download className="h-3 w-3" />
                              )}
                            </GlassButton>
                            
                            <GlassButton
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMutation.mutate(gen.id);
                              }}
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </GlassButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="versions" className="px-4 pb-4 mt-0">
                  <div className="mb-4">
                    <p className="text-xs text-muted-foreground">Pro Edit versions ({imageVersions.length})</p>
                  </div>
                  
                  {/* Versions Grid */}
                  {!currentImage ? (
                    <div className="text-center py-12">
                      <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">Select an image to see versions</p>
                    </div>
                  ) : imageVersions.length === 0 ? (
                    <div className="text-center py-12">
                      <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">No versions yet</p>
                      <p className="text-xs text-muted-foreground mt-2">Apply Pro Edit effects to create versions</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {imageVersions.map((versionUrl, index) => (
                        <div
                          key={`${versionUrl}-${index}`}
                          className={`group cursor-pointer relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                            currentVersionIndex === index
                              ? 'border-primary shadow-lg shadow-primary/20'
                              : 'border-transparent hover:border-primary/50'
                          }`}
                          onClick={() => {
                            setCurrentVersionIndex(index);
                            historyIndexRef.current = index;
                            reloadCanvas(versionUrl);
                          }}
                          data-testid={`version-${index}`}
                        >
                          <img
                            alt={`Version ${index + 1}`}
                            className="h-full w-full object-cover"
                            src={versionUrl}
                            data-testid={`img-version-${index}`}
                          />
                          
                          {/* Version Number Badge */}
                          <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm rounded px-2 py-0.5">
                            <span className="text-xs font-semibold text-white">v{index + 1}</span>
                          </div>
                          
                          {/* Hover Actions - Top Right */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <GlassButton
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(versionUrl, `version-${index + 1}`);
                              }}
                              disabled={downloadingId === `version-${index + 1}`}
                              data-testid={`button-download-version-${index}`}
                              title="Download version"
                            >
                              {downloadingId === `version-${index + 1}` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Download className="h-3 w-3" />
                              )}
                            </GlassButton>
                            {imageVersions.length > 1 && (
                              <GlassButton
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-red-400 hover:text-red-300"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!confirm("Изтриване на тази версия?")) return;
                                  
                                  toast({
                                    title: "Скоро",
                                    description: "Delete функцията скоро ще бъде добавена",
                                  });
                                }}
                                title="Delete version"
                                data-testid={`button-delete-version-${index}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </GlassButton>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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
                imageUrl: (selectedGeneration.id === currentGenerationId && currentImage) 
                  ? currentImage 
                  : selectedGeneration.imageUrl,
                cloudinaryPublicId: selectedGeneration.cloudinaryPublicId!,
                prompt: selectedGeneration.prompt,
              }
            : undefined
        }
      />

      {/* AI Lightbox Modal */}
      <AiLightboxModal
        isOpen={lightboxOpen}
        generation={lightboxGeneration}
        onClose={() => {
          setLightboxOpen(false);
          setLightboxGenerationId(null);
        }}
        onDownload={handleDownload}
        onEdit={(generationId) => setLocation(`/image-editor/${generationId}`)}
        onUploadToContest={(generation) => {
          setLightboxOpen(false);
          handleOpenSubmitWizard(generation);
        }}
        onDelete={(generationId) => {
          deleteMutation.mutate(generationId);
          setLightboxOpen(false);
        }}
        downloadingId={downloadingId}
        deletingPending={deleteMutation.isPending}
        userCredits={userCredits}
        currentEditedUrl={lightboxGenerationId === currentGenerationId ? currentImage : null}
      />
    </div>
  );
}

export default function AiGeneratorPage() {
  return (
    <SidebarProvider>
      <Sidebar />
      <AiGeneratorPageContent />
    </SidebarProvider>
  );
}
