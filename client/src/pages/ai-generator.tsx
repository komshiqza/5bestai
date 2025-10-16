import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, Download, Trash2, Wand2, Settings, Image as ImageIcon, Loader2, Zap } from "lucide-react";
import type { AiGeneration } from "@shared/schema";

interface ModelConfig {
  id: string;
  name: string;
  description: string;
  supportsAspectRatio: boolean;
  supportsOutputFormat: boolean;
  supportsGoFast: boolean;
  supportsNegativePrompt: boolean;
  costPerImage: number;
}

const stylePresets = {
  realistic: {
    name: "Realistic",
    description: "Photo-realistic images",
    promptSuffix: ", photorealistic, highly detailed, professional photography, 8k uhd, dslr, soft lighting, high quality",
  },
  artistic: {
    name: "Artistic",
    description: "Painted and artistic style",
    promptSuffix: ", digital art, artistic, painterly style, vibrant colors, creative composition, masterpiece",
  },
  anime: {
    name: "Anime",
    description: "Anime and manga style",
    promptSuffix: ", anime style, manga art, cel shaded, vibrant colors, expressive, japanese animation style",
  },
  fantasy: {
    name: "Fantasy",
    description: "Fantasy and magical themes",
    promptSuffix: ", fantasy art, magical, ethereal, epic, enchanted, mystical atmosphere, dramatic lighting",
  },
  abstract: {
    name: "Abstract",
    description: "Abstract and experimental",
    promptSuffix: ", abstract art, geometric shapes, vibrant colors, modern art, creative patterns, artistic composition",
  },
  portrait: {
    name: "Portrait",
    description: "Focus on faces and portraits",
    promptSuffix: ", portrait photography, face focus, detailed facial features, professional headshot, studio lighting",
  },
};

const aspectRatios = [
  { value: "1:1", label: "Square (1:1)" },
  { value: "16:9", label: "Landscape (16:9)" },
  { value: "9:16", label: "Portrait (9:16)" },
  { value: "4:3", label: "Classic (4:3)" },
  { value: "3:2", label: "Photo (3:2)" },
  { value: "21:9", label: "Cinematic (21:9)" },
];

export default function AiGeneratorPage() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("flux-schnell");
  const [selectedStyle, setSelectedStyle] = useState<keyof typeof stylePresets>("realistic");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [outputFormat, setOutputFormat] = useState("webp");
  const [outputQuality, setOutputQuality] = useState(90);
  const [goFast, setGoFast] = useState(true);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  useEffect(() => {
    document.title = "AI Studio - 5best";
  }, []);

  const { data: modelConfigs, isLoading: loadingModels } = useQuery<ModelConfig[]>({
    queryKey: ["/api/ai/models"],
  });

  const { data: generations, isLoading: loadingHistory } = useQuery<AiGeneration[]>({
    queryKey: ["/api/ai/generations"],
  });

  // Get current model config
  const currentModelConfig = modelConfigs?.find(m => m.id === selectedModel);

  const generateMutation = useMutation({
    mutationFn: async (params: {
      prompt: string;
      model: string;
      negativePrompt?: string;
      aspectRatio: string;
      outputFormat: string;
      outputQuality: number;
      goFast: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/ai/generate", params);
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentImage(data.imageUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/ai/generations"] });
      toast({
        title: "Image Generated!",
        description: "Your AI image has been created successfully.",
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

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a description for your image.",
        variant: "destructive",
      });
      return;
    }

    // Add style suffix to prompt
    const enhancedPrompt = prompt.trim() + stylePresets[selectedStyle].promptSuffix;

    const params: any = {
      prompt: enhancedPrompt,
      model: selectedModel,
      aspectRatio,
      outputFormat,
      outputQuality,
      goFast,
    };

    // Add negative prompt if model supports it and it's provided
    if (currentModelConfig?.supportsNegativePrompt && negativePrompt.trim()) {
      params.negativePrompt = negativePrompt.trim();
    }

    generateMutation.mutate(params);
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
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl gradient-glory flex items-center justify-center">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AI Studio</h1>
            <p className="text-muted-foreground">Create stunning images with AI</p>
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
                        {modelConfigs?.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            <div className="flex items-start justify-between gap-3 w-full">
                              <div className="flex-1">
                                <div className="font-medium">{model.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  ${model.costPerImage.toFixed(3)} per image
                                </div>
                              </div>
                              <div className="flex gap-1 text-xs text-muted-foreground shrink-0">
                                {model.supportsAspectRatio && (
                                  <span title="Supports aspect ratio">📐</span>
                                )}
                                {model.supportsOutputFormat && (
                                  <span title="Supports output format">🎨</span>
                                )}
                                {model.supportsGoFast && (
                                  <span title="Supports fast mode">⚡</span>
                                )}
                                {model.supportsNegativePrompt && (
                                  <span title="Supports negative prompt">🚫</span>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {currentModelConfig && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports: {[
                        currentModelConfig.supportsAspectRatio && "Aspect Ratio",
                        currentModelConfig.supportsOutputFormat && "Output Format",
                        currentModelConfig.supportsGoFast && "Fast Mode",
                        currentModelConfig.supportsNegativePrompt && "Negative Prompt"
                      ].filter(Boolean).join(", ") || "Basic generation"}
                    </p>
                  )}
                </div>

                <Tabs value={selectedStyle} onValueChange={(v) => setSelectedStyle(v as keyof typeof stylePresets)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="realistic" data-testid="tab-realistic">Realistic</TabsTrigger>
                    <TabsTrigger value="artistic" data-testid="tab-artistic">Artistic</TabsTrigger>
                    <TabsTrigger value="anime" data-testid="tab-anime">Anime</TabsTrigger>
                  </TabsList>
                  <TabsList className="grid w-full grid-cols-3 mt-2">
                    <TabsTrigger value="fantasy" data-testid="tab-fantasy">Fantasy</TabsTrigger>
                    <TabsTrigger value="abstract" data-testid="tab-abstract">Abstract</TabsTrigger>
                    <TabsTrigger value="portrait" data-testid="tab-portrait">Portrait</TabsTrigger>
                  </TabsList>
                  
                  {Object.entries(stylePresets).map(([key, preset]) => (
                    <TabsContent key={key} value={key} className="mt-4">
                      <p className="text-sm text-muted-foreground">{preset.description}</p>
                    </TabsContent>
                  ))}
                </Tabs>

                {currentModelConfig && (
                  <details className="group">
                    <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium">
                      <Settings className="h-4 w-4" />
                      Advanced Settings
                    </summary>
                    <div className="mt-4 space-y-4 pl-6 border-l-2 border-border">
                      {currentModelConfig.supportsAspectRatio && (
                        <div>
                          <Label>Aspect Ratio</Label>
                          <Select value={aspectRatio} onValueChange={setAspectRatio}>
                            <SelectTrigger data-testid="select-aspect-ratio">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {aspectRatios.map((ratio) => (
                                <SelectItem key={ratio.value} value={ratio.value}>
                                  {ratio.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {currentModelConfig.supportsOutputFormat && (
                        <>
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
                        </>
                      )}

                      {currentModelConfig.supportsGoFast && (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="go-fast"
                            checked={goFast}
                            onCheckedChange={(checked) => setGoFast(checked as boolean)}
                            data-testid="checkbox-go-fast"
                          />
                          <Label htmlFor="go-fast" className="flex items-center gap-2 cursor-pointer">
                            <Zap className="h-4 w-4 text-yellow-500" />
                            Fast Mode (Optimized fp8)
                          </Label>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="w-full gradient-glory"
                  size="lg"
                  data-testid="button-generate"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Generate Image
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Current Result */}
            {currentImage && (
              <Card data-testid="card-current-result">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Generated Image
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(currentImage, `ai-generated-${Date.now()}.${outputFormat}`)}
                      data-testid="button-download-current"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
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
                          src={gen.imageUrl}
                          alt={gen.prompt}
                          className="w-full aspect-square object-cover cursor-pointer"
                          onClick={() => setCurrentImage(gen.imageUrl)}
                          data-testid={`img-generation-${gen.id}`}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownload(gen.imageUrl, `${gen.id}.webp`)}
                            data-testid={`button-download-${gen.id}`}
                          >
                            <Download className="h-4 w-4" />
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
    </div>
  );
}
