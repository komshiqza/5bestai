import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import * as fabric from "fabric";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Type,
  Save,
  Loader2,
  ArrowLeft,
  Crop,
  Pencil,
  Square,
  Circle,
  Minus,
  Check,
  X as XIcon,
  Undo,
  Redo,
  Download
} from "lucide-react";

export default function ImageEditor() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [baseImage, setBaseImage] = useState<fabric.FabricImage | null>(null);
  
  // Filter states
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [blur, setBlur] = useState(0);
  const [sharpen, setSharpen] = useState(0);
  const [grayscale, setGrayscale] = useState(false);
  const [sepia, setSepia] = useState(false);
  const [vintage, setVintage] = useState(false);
  const [vignette, setVignette] = useState(false);
  const [vignetteOverlay, setVignetteOverlay] = useState<fabric.Rect | null>(null);
  
  // Text states
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [fontSize, setFontSize] = useState(40);
  const [fontFamily, setFontFamily] = useState("Arial");
  
  // Drawing states
  const [drawingMode, setDrawingMode] = useState(false);
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(5);
  
  // Shapes states
  const [shapeColor, setShapeColor] = useState("#ff0000");
  const [shapeSize, setShapeSize] = useState(100);
  
  // Crop states
  const [cropMode, setCropMode] = useState(false);
  const [cropRect, setCropRect] = useState<fabric.Rect | null>(null);
  
  // History states for undo/redo
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
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
      setBaseImage(img);
    });

    setCanvas(fabricCanvas);

    return () => {
      fabricCanvas.dispose();
    };
  }, [generation?.imageUrl]);

  // Apply filters
  const applyFilters = () => {
    if (!canvas || !baseImage) return;

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
    if (blur > 0) {
      filters.push(new fabric.filters.Blur({ blur: blur / 20 }));
    }
    if (sharpen > 0) {
      filters.push(new fabric.filters.Convolute({
        matrix: [
          0, -1 * (sharpen / 100), 0,
          -1 * (sharpen / 100), 1 + 4 * (sharpen / 100), -1 * (sharpen / 100),
          0, -1 * (sharpen / 100), 0
        ]
      }));
    }
    if (grayscale) {
      filters.push(new fabric.filters.Grayscale());
    }
    if (sepia) {
      filters.push(new fabric.filters.Sepia());
    }
    if (vintage) {
      filters.push(new fabric.filters.Vintage());
    }

    baseImage.filters = filters;
    baseImage.applyFilters();
    canvas.renderAll();
  };

  // Apply vignette overlay
  useEffect(() => {
    if (!canvas || !baseImage) return;

    // Remove existing vignette overlay if any
    if (vignetteOverlay) {
      canvas.remove(vignetteOverlay);
      setVignetteOverlay(null);
    }

    if (vignette) {
      // Create a radial gradient for vignette effect
      const rect = new fabric.Rect({
        left: 0,
        top: 0,
        width: canvas.width!,
        height: canvas.height!,
        fill: new fabric.Gradient({
          type: 'radial',
          coords: {
            x1: canvas.width! / 2,
            y1: canvas.height! / 2,
            x2: canvas.width! / 2,
            y2: canvas.height! / 2,
            r1: 0,
            r2: Math.max(canvas.width!, canvas.height!) * 0.7,
          },
          colorStops: [
            { offset: 0, color: 'rgba(0,0,0,0)' },
            { offset: 0.5, color: 'rgba(0,0,0,0)' },
            { offset: 1, color: 'rgba(0,0,0,0.7)' },
          ],
        }),
        selectable: false,
        evented: false,
      });
      
      canvas.add(rect);
      canvas.renderAll();
      setVignetteOverlay(rect);
    }
  }, [vignette, canvas, baseImage]);

  useEffect(() => {
    applyFilters();
  }, [brightness, contrast, saturation, blur, sharpen, grayscale, sepia, vintage]);

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

  // Enhanced text
  const addText = () => {
    if (!canvas || !textInput.trim()) return;

    const text = new fabric.IText(textInput, {
      left: canvas.width! / 2,
      top: canvas.height! / 2,
      fontSize: fontSize,
      fill: textColor,
      fontFamily: fontFamily,
      stroke: textColor === "#ffffff" ? "#000000" : "#ffffff",
      strokeWidth: 1,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    setTextInput("");
  };

  // Drawing mode
  const toggleDrawing = () => {
    if (!canvas) return;
    const newMode = !drawingMode;
    setDrawingMode(newMode);
    canvas.isDrawingMode = newMode;
    
    if (newMode && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushSize;
    }
  };

  useEffect(() => {
    if (canvas && drawingMode && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushSize;
    }
  }, [brushColor, brushSize, canvas, drawingMode]);

  // Add shapes
  const addShape = (type: "rect" | "circle" | "line") => {
    if (!canvas) return;

    let shape: fabric.FabricObject;
    const centerX = canvas.width! / 2;
    const centerY = canvas.height! / 2;

    switch (type) {
      case "rect":
        shape = new fabric.Rect({
          left: centerX - shapeSize / 2,
          top: centerY - shapeSize / 2,
          fill: shapeColor,
          width: shapeSize,
          height: shapeSize,
        });
        break;
      case "circle":
        shape = new fabric.Circle({
          left: centerX - shapeSize / 2,
          top: centerY - shapeSize / 2,
          fill: shapeColor,
          radius: shapeSize / 2,
        });
        break;
      case "line":
        shape = new fabric.Line([centerX - shapeSize, centerY, centerX + shapeSize, centerY], {
          stroke: shapeColor,
          strokeWidth: 5,
        });
        break;
    }

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
  };

  // Crop functionality
  const startCrop = () => {
    if (!canvas) return;
    setCropMode(true);
    
    // Disable selection for all objects
    canvas.forEachObject((obj) => {
      obj.selectable = false;
      obj.evented = false;
    });

    // Create crop rectangle
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 400,
      height: 300,
      fill: "transparent",
      stroke: "#00ff00",
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });

    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    setCropRect(rect);
  };

  const applyCrop = () => {
    if (!canvas || !cropRect || !baseImage) return;

    // Save all creative objects (text, shapes, drawings) before clearing
    const creativeObjects = canvas.getObjects().filter(obj => obj !== baseImage && obj !== cropRect);

    const left = cropRect.left!;
    const top = cropRect.top!;
    const width = cropRect.width! * (cropRect.scaleX || 1);
    const height = cropRect.height! * (cropRect.scaleY || 1);

    // Create temp canvas to crop just the base image
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCanvas.width = width;
    tempCanvas.height = height;

    // Draw only the base image portion to temp canvas
    const baseImageElement = baseImage.toCanvasElement();
    const baseImageLeft = baseImage.left! - (baseImage.width! * baseImage.scaleX!) / 2;
    const baseImageTop = baseImage.top! - (baseImage.height! * baseImage.scaleY!) / 2;
    
    tempCtx.drawImage(
      baseImageElement,
      (left - baseImageLeft) / baseImage.scaleX!,
      (top - baseImageTop) / baseImage.scaleY!,
      width / baseImage.scaleX!,
      height / baseImage.scaleY!,
      0,
      0,
      width,
      height
    );

    const croppedDataURL = tempCanvas.toDataURL('image/png');

    // Remove only the base image and crop rect
    canvas.remove(baseImage, cropRect);
    setCropRect(null);

    // Load cropped image as new base
    fabric.FabricImage.fromURL(croppedDataURL, { crossOrigin: "anonymous" }).then((img: any) => {
      const scale = Math.min(
        canvas.width! / img.width!,
        canvas.height! / img.height!
      );
      img.scale(scale);
      img.set({
        left: canvas.width! / 2,
        top: canvas.height! / 2,
        originX: "center",
        originY: "center",
        selectable: false,
      });
      
      // Apply current filters to the new image immediately
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
      if (blur > 0) {
        filters.push(new fabric.filters.Blur({ blur: blur / 20 }));
      }
      if (sharpen > 0) {
        filters.push(new fabric.filters.Convolute({
          matrix: [
            0, -1 * (sharpen / 100), 0,
            -1 * (sharpen / 100), 1 + 4 * (sharpen / 100), -1 * (sharpen / 100),
            0, -1 * (sharpen / 100), 0
          ]
        }));
      }
      if (grayscale) {
        filters.push(new fabric.filters.Grayscale());
      }
      if (sepia) {
        filters.push(new fabric.filters.Sepia());
      }
      if (vintage) {
        filters.push(new fabric.filters.Vintage());
      }
      
      img.filters = filters;
      img.applyFilters();
      
      canvas.add(img);
      canvas.sendObjectToBack(img);
      
      // Restore creative objects
      creativeObjects.forEach(obj => {
        canvas.add(obj);
      });
      
      canvas.renderAll();
      setBaseImage(img);
    });

    setCropMode(false);
    
    // Re-enable selection
    canvas.forEachObject((obj) => {
      if (obj !== cropRect) {
        obj.selectable = true;
        obj.evented = true;
      }
    });
  };

  const cancelCrop = () => {
    if (!canvas || !cropRect) return;
    canvas.remove(cropRect);
    setCropRect(null);
    setCropMode(false);
    
    // Re-enable selection
    canvas.forEachObject((obj) => {
      if (obj !== baseImage) {
        obj.selectable = true;
        obj.evented = true;
      }
    });
    canvas.renderAll();
  };

  // History management functions
  const saveToHistory = () => {
    if (!canvas) return;
    
    const json = JSON.stringify(canvas.toJSON());
    setHistoryStack(prev => {
      const newStack = prev.slice(0, historyIndex + 1);
      newStack.push(json);
      // Limit history to 50 states
      return newStack.slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  const undo = () => {
    if (!canvas || historyIndex <= 0) return;
    
    const newIndex = historyIndex - 1;
    const state = historyStack[newIndex];
    
    canvas.loadFromJSON(state).then(() => {
      canvas.renderAll();
      setHistoryIndex(newIndex);
      // Update baseImage reference after loading
      const objects = canvas.getObjects();
      const bgImage = objects.find(obj => obj.selectable === false);
      if (bgImage) setBaseImage(bgImage as fabric.FabricImage);
    });
  };

  const redo = () => {
    if (!canvas || historyIndex >= historyStack.length - 1) return;
    
    const newIndex = historyIndex + 1;
    const state = historyStack[newIndex];
    
    canvas.loadFromJSON(state).then(() => {
      canvas.renderAll();
      setHistoryIndex(newIndex);
      // Update baseImage reference after loading
      const objects = canvas.getObjects();
      const bgImage = objects.find(obj => obj.selectable === false);
      if (bgImage) setBaseImage(bgImage as fabric.FabricImage);
    });
  };

  // Download current canvas
  const handleDownload = () => {
    if (!canvas) return;

    try {
      const dataURL = canvas.toDataURL({ format: "png", quality: 1, multiplier: 2 });
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `edited-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
      
      toast({
        title: "Downloaded",
        description: "Image downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download the image.",
        variant: "destructive",
      });
    }
  };

  // Save to history on canvas changes
  useEffect(() => {
    if (!canvas) return;

    const handleCanvasChange = () => {
      saveToHistory();
    };

    canvas.on('object:added', handleCanvasChange);
    canvas.on('object:modified', handleCanvasChange);
    canvas.on('object:removed', handleCanvasChange);

    return () => {
      canvas.off('object:added', handleCanvasChange);
      canvas.off('object:modified', handleCanvasChange);
      canvas.off('object:removed', handleCanvasChange);
    };
  }, [canvas, historyIndex]);

  // Save edited image
  const handleSave = async () => {
    if (!canvas) return;

    setIsSaving(true);
    try {
      // Exit crop mode if active
      if (cropMode) {
        cancelCrop();
      }

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
          <Button 
            variant="outline" 
            onClick={undo} 
            disabled={historyIndex <= 0}
            data-testid="button-undo"
            title="Undo"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            onClick={redo} 
            disabled={historyIndex >= historyStack.length - 1}
            data-testid="button-redo"
            title="Redo"
          >
            <Redo className="w-4 h-4" />
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownload}
            data-testid="button-download"
            title="Download"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
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
              {cropMode && (
                <div className="mt-4 flex gap-2 justify-center">
                  <Button onClick={applyCrop} variant="default" data-testid="button-apply-crop">
                    <Check className="w-4 h-4 mr-2" />
                    Apply Crop
                  </Button>
                  <Button onClick={cancelCrop} variant="outline" data-testid="button-cancel-crop">
                    <XIcon className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
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
                  <TabsTrigger value="creative" data-testid="tab-creative">Creative</TabsTrigger>
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

                  <div>
                    <Label>Blur</Label>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[blur]}
                      onValueChange={(val) => setBlur(val[0])}
                      data-testid="slider-blur"
                    />
                    <span className="text-sm text-muted-foreground">{blur}</span>
                  </div>

                  <div>
                    <Label>Sharpen</Label>
                    <Slider
                      min={0}
                      max={100}
                      step={1}
                      value={[sharpen]}
                      onValueChange={(val) => setSharpen(val[0])}
                      data-testid="slider-sharpen"
                    />
                    <span className="text-sm text-muted-foreground">{sharpen}</span>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label>Color Effects</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant={grayscale ? "default" : "outline"} 
                        onClick={() => setGrayscale(!grayscale)}
                        size="sm"
                        data-testid="button-grayscale"
                      >
                        Grayscale
                      </Button>
                      <Button 
                        variant={sepia ? "default" : "outline"} 
                        onClick={() => setSepia(!sepia)}
                        size="sm"
                        data-testid="button-sepia"
                      >
                        Sepia
                      </Button>
                      <Button 
                        variant={vintage ? "default" : "outline"} 
                        onClick={() => setVintage(!vintage)}
                        size="sm"
                        data-testid="button-vintage"
                      >
                        Vintage
                      </Button>
                      <Button 
                        variant={vignette ? "default" : "outline"} 
                        onClick={() => setVignette(!vignette)}
                        size="sm"
                        data-testid="button-vignette"
                      >
                        Vignette
                      </Button>
                    </div>
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
                  
                  <div className="pt-4">
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={startCrop}
                      disabled={cropMode}
                      data-testid="button-crop"
                    >
                      <Crop className="w-4 h-4 mr-2" />
                      Crop Image
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="creative" className="space-y-4">
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Text</Label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Enter text..."
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        data-testid="input-text"
                      />
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Font</Label>
                          <Select value={fontFamily} onValueChange={setFontFamily}>
                            <SelectTrigger className="h-8 text-xs" data-testid="select-font">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Arial">Arial</SelectItem>
                              <SelectItem value="Times New Roman">Times</SelectItem>
                              <SelectItem value="Courier New">Courier</SelectItem>
                              <SelectItem value="Georgia">Georgia</SelectItem>
                              <SelectItem value="Verdana">Verdana</SelectItem>
                              <SelectItem value="Comic Sans MS">Comic Sans</SelectItem>
                              <SelectItem value="Impact">Impact</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Color</Label>
                          <Input
                            type="color"
                            value={textColor}
                            onChange={(e) => setTextColor(e.target.value)}
                            className="h-8"
                            data-testid="input-text-color"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs">Size: {fontSize}px</Label>
                        <Slider
                          min={10}
                          max={120}
                          step={2}
                          value={[fontSize]}
                          onValueChange={(val) => setFontSize(val[0])}
                          data-testid="slider-font-size"
                        />
                      </div>

                      <Button onClick={addText} className="w-full" disabled={!textInput.trim()} data-testid="button-add-text">
                        <Type className="w-4 h-4 mr-2" />
                        Add Text
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2 border-t">
                    <Label className="text-base font-semibold">Drawing</Label>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Color</Label>
                          <Input
                            type="color"
                            value={brushColor}
                            onChange={(e) => setBrushColor(e.target.value)}
                            className="h-8"
                            data-testid="input-brush-color"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Size: {brushSize}px</Label>
                          <Slider
                            min={1}
                            max={50}
                            step={1}
                            value={[brushSize]}
                            onValueChange={(val) => setBrushSize(val[0])}
                            data-testid="slider-brush-size"
                          />
                        </div>
                      </div>
                      <Button 
                        variant={drawingMode ? "default" : "outline"} 
                        className="w-full" 
                        onClick={toggleDrawing}
                        data-testid="button-drawing-mode"
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        {drawingMode ? "Stop Drawing" : "Start Drawing"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2 border-t">
                    <Label className="text-base font-semibold">Shapes</Label>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Color</Label>
                          <Input
                            type="color"
                            value={shapeColor}
                            onChange={(e) => setShapeColor(e.target.value)}
                            className="h-8"
                            data-testid="input-shape-color"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Size: {shapeSize}px</Label>
                          <Slider
                            min={20}
                            max={300}
                            step={10}
                            value={[shapeSize]}
                            onValueChange={(val) => setShapeSize(val[0])}
                            data-testid="slider-shape-size"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Button variant="outline" onClick={() => addShape("rect")} data-testid="button-add-rect">
                          <Square className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" onClick={() => addShape("circle")} data-testid="button-add-circle">
                          <Circle className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" onClick={() => addShape("line")} data-testid="button-add-line">
                          <Minus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
