import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, Download, Trash2, Wand2, Settings, Image as ImageIcon, Loader2 } from "lucide-react";
import type { AiGeneration } from "@shared/schema";

const stylePresets = {
  realistic: {
    name: "Realistic",
    description: "Photo-realistic images",
    negativePrompt: "cartoon, illustration, anime, painting, drawing, art, sketch",
  },
  artistic: {
    name: "Artistic",
    description: "Painted and artistic style",
    negativePrompt: "photo, photograph, realistic, hyperrealistic",
  },
  anime: {
    name: "Anime",
    description: "Anime and manga style",
    negativePrompt: "realistic, photo, 3d render",
  },
  fantasy: {
    name: "Fantasy",
    description: "Fantasy and magical themes",
    negativePrompt: "modern, contemporary, realistic photo",
  },
  abstract: {
    name: "Abstract",
    description: "Abstract and experimental",
    negativePrompt: "realistic, photo, detailed",
  },
  portrait: {
    name: "Portrait",
    description: "Focus on faces and portraits",
    negativePrompt: "landscape, scenery, background focus",
  },
};

export default function AiGeneratorPage() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<keyof typeof stylePresets>("realistic");
  const [customNegativePrompt, setCustomNegativePrompt] = useState("");
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [steps, setSteps] = useState(30);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  useEffect(() => {
    document.title = "AI Studio - 5best";
  }, []);

  const { data: generations, isLoading: loadingHistory } = useQuery<AiGeneration[]>({
    queryKey: ["/api/ai/generations"],
  });

  const generateMutation = useMutation({
    mutationFn: async (params: {
      prompt: string;
      negativePrompt?: string;
      width: number;
      height: number;
      numInferenceSteps: number;
      guidanceScale: number;
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

    const negativePrompt = customNegativePrompt || stylePresets[selectedStyle].negativePrompt;

    generateMutation.mutate({
      prompt: prompt.trim(),
      negativePrompt,
      width,
      height,
      numInferenceSteps: steps,
      guidanceScale,
    });
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

                <details className="group">
                  <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium">
                    <Settings className="h-4 w-4" />
                    Advanced Settings
                  </summary>
                  <div className="mt-4 space-y-4 pl-6 border-l-2 border-border">
                    <div>
                      <Label htmlFor="negative-prompt">Custom Negative Prompt (Optional)</Label>
                      <Input
                        id="negative-prompt"
                        placeholder="Things to avoid in the image..."
                        value={customNegativePrompt}
                        onChange={(e) => setCustomNegativePrompt(e.target.value)}
                        data-testid="input-negative-prompt"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Width: {width}px</Label>
                        <Slider
                          value={[width]}
                          onValueChange={([v]) => setWidth(v)}
                          min={256}
                          max={2048}
                          step={64}
                          data-testid="slider-width"
                        />
                      </div>
                      <div>
                        <Label>Height: {height}px</Label>
                        <Slider
                          value={[height]}
                          onValueChange={([v]) => setHeight(v)}
                          min={256}
                          max={2048}
                          step={64}
                          data-testid="slider-height"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Quality (Steps): {steps}</Label>
                      <Slider
                        value={[steps]}
                        onValueChange={([v]) => setSteps(v)}
                        min={10}
                        max={50}
                        step={1}
                        data-testid="slider-steps"
                      />
                    </div>

                    <div>
                      <Label>Creativity (Guidance): {guidanceScale.toFixed(1)}</Label>
                      <Slider
                        value={[guidanceScale]}
                        onValueChange={([v]) => setGuidanceScale(v)}
                        min={1}
                        max={20}
                        step={0.5}
                        data-testid="slider-guidance"
                      />
                    </div>
                  </div>
                </details>

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
                      onClick={() => handleDownload(currentImage, `ai-generated-${Date.now()}.png`)}
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
                            onClick={() => handleDownload(gen.imageUrl, `${gen.id}.png`)}
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
