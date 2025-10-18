import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import * as fabric from "fabric";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Type,
  Save,
  Loader2,
  ArrowLeft
} from "lucide-react";

export default function ImageEditor() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [textInput, setTextInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch generation data
  const { data: generation, isLoading } = useQuery<any>({
    queryKey: [`/api/ai/generations/${id}`],
    enabled: !!id,
  });

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || !generation?.imageUrl) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: "#f0f0f0",
    });

    // Load image onto canvas
    fabric.FabricImage.fromURL(generation.imageUrl, { crossOrigin: "anonymous" }).then((img: any) => {
      const scale = Math.min(
        fabricCanvas.width! / img.width!,
        fabricCanvas.height! / img.height!
      );
      img.scale(scale);
      img.set({
        left: fabricCanvas.width! / 2,
        top: fabricCanvas.height! / 2,
        originX: "center",
        originY: "center",
        selectable: false,
      });
      fabricCanvas.add(img);
      fabricCanvas.sendObjectToBack(img);
      fabricCanvas.renderAll();
    });

    setCanvas(fabricCanvas);

    return () => {
      fabricCanvas.dispose();
    };
  }, [generation?.imageUrl]);

  // Apply filters
  const applyFilters = () => {
    if (!canvas) return;
    const bgImage = canvas.getObjects()[0] as any;
    if (!bgImage) return;

    const filters: any[] = [];

    if (brightness !== 0) {
      filters.push(new fabric.filters.Brightness({ brightness: brightness / 100 }));
    }
    if (contrast !== 0) {
      filters.push(new fabric.filters.Contrast({ contrast: contrast / 100 }));
    }
    if (saturation !== 0) {
      filters.push(new fabric.filters.Saturation({ saturation: saturation / 100 }));
    }

    bgImage.filters = filters;
    bgImage.applyFilters();
    canvas.renderAll();
  };

  useEffect(() => {
    applyFilters();
  }, [brightness, contrast, saturation]);

  // Rotate
  const rotate = (degrees: number) => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      activeObject.rotate((activeObject.angle || 0) + degrees);
      canvas.renderAll();
    }
  };

  // Flip
  const flip = (direction: "horizontal" | "vertical") => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      if (direction === "horizontal") {
        activeObject.set("flipX", !activeObject.flipX);
      } else {
        activeObject.set("flipY", !activeObject.flipY);
      }
      canvas.renderAll();
    }
  };

  // Add text
  const addText = () => {
    if (!canvas || !textInput.trim()) return;

    const text = new fabric.IText(textInput, {
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      fontSize: 40,
      fill: "#ffffff",
      stroke: "#000000",
      strokeWidth: 1,
      fontFamily: "Arial",
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    setTextInput("");
  };

  // Save edited image
  const handleSave = async () => {
    if (!canvas) return;

    setIsSaving(true);
    try {
      // Export canvas as data URL
      const dataURL = canvas.toDataURL({ format: "png", quality: 1, multiplier: 1 });

      // Convert data URL to Blob
      const res = await fetch(dataURL);
      const blob = await res.blob();

      // Upload via backend API
      const formData = new FormData();
      formData.append("image", blob, "edited-image.png");
      formData.append("generationId", id!);

      const response = await fetch("/api/ai/save-edited", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save edited image");
      }

      toast({
        title: "Saved!",
        description: "Your edited image has been saved successfully.",
      });

      queryClient.invalidateQueries({ queryKey: [`/api/ai/generations/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai/generations"] });
      setLocation("/ai-generator");
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save edited image",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!generation) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-muted-foreground mb-4">Generation not found</p>
        <Button onClick={() => setLocation("/ai-generator")} data-testid="button-back-to-studio">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to AI Studio
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Image Editor</h1>
          <p className="text-muted-foreground">Edit and enhance your AI-generated image</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLocation("/ai-generator")} data-testid="button-cancel">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg">
                <canvas ref={canvasRef} data-testid="canvas-editor" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Editor Tools</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="filters" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="filters" data-testid="tab-filters">Filters</TabsTrigger>
                  <TabsTrigger value="adjust" data-testid="tab-adjust">Adjust</TabsTrigger>
                  <TabsTrigger value="text" data-testid="tab-text">Text</TabsTrigger>
                </TabsList>

                <TabsContent value="filters" className="space-y-4">
                  <div>
                    <Label>Brightness</Label>
                    <Slider
                      min={-100}
                      max={100}
                      step={1}
                      value={[brightness]}
                      onValueChange={(val) => setBrightness(val[0])}
                      data-testid="slider-brightness"
                    />
                    <span className="text-sm text-muted-foreground">{brightness}</span>
                  </div>

                  <div>
                    <Label>Contrast</Label>
                    <Slider
                      min={-100}
                      max={100}
                      step={1}
                      value={[contrast]}
                      onValueChange={(val) => setContrast(val[0])}
                      data-testid="slider-contrast"
                    />
                    <span className="text-sm text-muted-foreground">{contrast}</span>
                  </div>

                  <div>
                    <Label>Saturation</Label>
                    <Slider
                      min={-100}
                      max={100}
                      step={1}
                      value={[saturation]}
                      onValueChange={(val) => setSaturation(val[0])}
                      data-testid="slider-saturation"
                    />
                    <span className="text-sm text-muted-foreground">{saturation}</span>
                  </div>
                </TabsContent>

                <TabsContent value="adjust" className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => rotate(90)} data-testid="button-rotate-cw">
                      <RotateCw className="w-4 h-4 mr-2" />
                      Rotate
                    </Button>
                    <Button variant="outline" onClick={() => rotate(-90)} data-testid="button-rotate-ccw">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Rotate
                    </Button>
                    <Button variant="outline" onClick={() => flip("horizontal")} data-testid="button-flip-h">
                      <FlipHorizontal className="w-4 h-4 mr-2" />
                      Flip H
                    </Button>
                    <Button variant="outline" onClick={() => flip("vertical")} data-testid="button-flip-v">
                      <FlipVertical className="w-4 h-4 mr-2" />
                      Flip V
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <div>
                    <Label htmlFor="text-input">Add Text</Label>
                    <Input
                      id="text-input"
                      placeholder="Enter text..."
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      data-testid="input-text"
                    />
                  </div>
                  <Button onClick={addText} className="w-full" disabled={!textInput.trim()} data-testid="button-add-text">
                    <Type className="w-4 h-4 mr-2" />
                    Add Text
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
