import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import * as fabric from "fabric";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  RotateCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Type,
  Pencil,
  Square,
  Circle,
  Minus,
  Check,
  X as XIcon,
  Crop,
} from "lucide-react";

export interface CanvasEditorRef {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  download: () => void;
  save: () => Promise<Blob | null>;
  getCanvas: () => fabric.Canvas | null;
}

interface CanvasEditorProps {
  imageUrl: string;
  onImageChange?: (imageUrl: string) => void;
  className?: string;
}

export const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(
  ({ imageUrl, onImageChange, className = "" }, ref) => {
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
    const [isRestoring, setIsRestoring] = useState(false);

    // Initialize Fabric.js canvas
    useEffect(() => {
      if (!canvasRef.current || !imageUrl) return;

      // Clear history when image changes
      setHistoryStack([]);
      setHistoryIndex(-1);

      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 600,
        backgroundColor: "#f0f0f0",
      });

      // Load image onto canvas
      fabric.FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" }).then((img: any) => {
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
          evented: false,
        });

        fabricCanvas.add(img);
        fabricCanvas.sendObjectToBack(img);
        setBaseImage(img);
        fabricCanvas.renderAll();

        // Save initial state to history after canvas setup
        setTimeout(() => {
          saveToHistory(fabricCanvas.toJSON());
        }, 100);
      });

      setCanvas(fabricCanvas);

      // Add event listeners
      fabricCanvas.on("object:added", () => !isRestoring && saveToHistory(fabricCanvas.toJSON()));
      fabricCanvas.on("object:modified", () => !isRestoring && saveToHistory(fabricCanvas.toJSON()));
      fabricCanvas.on("object:removed", () => !isRestoring && saveToHistory(fabricCanvas.toJSON()));

      return () => {
        fabricCanvas.dispose();
      };
    }, [imageUrl]);

    // Save state to history
    const saveToHistory = (state: any) => {
      if (isRestoring) return;

      setHistoryStack((prev) => {
        const newStack = prev.slice(0, historyIndex + 1);
        newStack.push(JSON.stringify(state));
        // Limit history to 50 states
        return newStack.length > 50 ? newStack.slice(-50) : newStack;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    };

    // Undo
    const undo = () => {
      if (!canvas || historyIndex <= 0) return;

      setIsRestoring(true);
      const previousState = historyStack[historyIndex - 1];
      canvas.loadFromJSON(previousState, () => {
        canvas.renderAll();
        setHistoryIndex((prev) => prev - 1);
        setIsRestoring(false);
      });
    };

    // Redo
    const redo = () => {
      if (!canvas || historyIndex >= historyStack.length - 1) return;

      setIsRestoring(true);
      const nextState = historyStack[historyIndex + 1];
      canvas.loadFromJSON(nextState, () => {
        canvas.renderAll();
        setHistoryIndex((prev) => prev + 1);
        setIsRestoring(false);
      });
    };

    // Download canvas as image
    const download = () => {
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
    };

    // Save canvas as blob
    const save = async (): Promise<Blob | null> => {
      if (!canvas) return null;

      return new Promise((resolve) => {
        canvas.toCanvasElement(2).toBlob((blob) => {
          resolve(blob);
        }, "image/png");
      });
    };

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      undo,
      redo,
      canUndo: () => historyIndex > 0,
      canRedo: () => historyIndex < historyStack.length - 1,
      download,
      save,
      getCanvas: () => canvas,
    }));

    // Apply filters to base image
    const applyFilters = () => {
      if (!baseImage || !canvas) return;

      const filters: any[] = [];

      if (brightness !== 0) {
        filters.push(new fabric.filters.Brightness({ brightness }));
      }

      if (contrast !== 0) {
        filters.push(new fabric.filters.Contrast({ contrast }));
      }

      if (saturation !== 0) {
        filters.push(new fabric.filters.Saturation({ saturation }));
      }

      if (blur > 0) {
        filters.push(new fabric.filters.Blur({ blur: blur / 10 }));
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
      
      saveToHistory(canvas.toJSON());
    };

    useEffect(() => {
      applyFilters();
    }, [brightness, contrast, saturation, blur, sharpen, grayscale, sepia, vintage]);

    // Vignette effect
    useEffect(() => {
      if (!canvas) return;

      if (vignette && !vignetteOverlay) {
        const rect = new fabric.Rect({
          left: 0,
          top: 0,
          width: canvas.width,
          height: canvas.height,
          fill: new fabric.Gradient({
            type: "radial",
            coords: {
              x1: canvas.width! / 2,
              y1: canvas.height! / 2,
              r1: 0,
              x2: canvas.width! / 2,
              y2: canvas.height! / 2,
              r2: canvas.width! / 2,
            },
            colorStops: [
              { offset: 0, color: "rgba(0,0,0,0)" },
              { offset: 0.7, color: "rgba(0,0,0,0)" },
              { offset: 1, color: "rgba(0,0,0,0.7)" },
            ],
          }),
          selectable: false,
          evented: false,
        });

        canvas.add(rect);
        setVignetteOverlay(rect);
        canvas.bringObjectToFront(rect);
        canvas.renderAll();
        saveToHistory(canvas.toJSON());
      } else if (!vignette && vignetteOverlay) {
        canvas.remove(vignetteOverlay);
        setVignetteOverlay(null);
        canvas.renderAll();
        saveToHistory(canvas.toJSON());
      }
    }, [vignette, canvas]);

    // Add text to canvas
    const addText = () => {
      if (!canvas || !textInput) return;

      const text = new fabric.FabricText(textInput, {
        left: canvas.width! / 2,
        top: canvas.height! / 2,
        fontSize,
        fill: textColor,
        fontFamily,
        originX: "center",
        originY: "center",
      });

      canvas.add(text);
      canvas.setActiveObject(text);
      canvas.renderAll();
      setTextInput("");
    };

    // Toggle drawing mode
    const toggleDrawingMode = () => {
      if (!canvas) return;

      const newMode = !drawingMode;
      setDrawingMode(newMode);

      if (newMode) {
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
        canvas.freeDrawingBrush.color = brushColor;
        canvas.freeDrawingBrush.width = brushSize;
      } else {
        canvas.isDrawingMode = false;
      }
    };

    useEffect(() => {
      if (canvas && canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = brushColor;
      }
    }, [brushColor, canvas]);

    useEffect(() => {
      if (canvas && canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = brushSize;
      }
    }, [brushSize, canvas]);

    // Add shapes
    const addShape = (type: "rect" | "circle" | "line") => {
      if (!canvas) return;

      let shape: fabric.FabricObject;

      if (type === "rect") {
        shape = new fabric.Rect({
          left: canvas.width! / 2 - shapeSize / 2,
          top: canvas.height! / 2 - shapeSize / 2,
          width: shapeSize,
          height: shapeSize,
          fill: shapeColor,
        });
      } else if (type === "circle") {
        shape = new fabric.Circle({
          left: canvas.width! / 2 - shapeSize / 2,
          top: canvas.height! / 2 - shapeSize / 2,
          radius: shapeSize / 2,
          fill: shapeColor,
        });
      } else {
        shape = new fabric.Line([50, 50, 150, 150], {
          stroke: shapeColor,
          strokeWidth: 5,
        });
      }

      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
    };

    // Rotate image
    const rotateImage = (angle: number) => {
      if (!baseImage || !canvas) return;
      baseImage.rotate((baseImage.angle || 0) + angle);
      canvas.renderAll();
      saveToHistory(canvas.toJSON());
    };

    // Flip image
    const flipImage = (direction: "horizontal" | "vertical") => {
      if (!baseImage || !canvas) return;

      if (direction === "horizontal") {
        baseImage.set("flipX", !baseImage.flipX);
      } else {
        baseImage.set("flipY", !baseImage.flipY);
      }

      canvas.renderAll();
      saveToHistory(canvas.toJSON());
    };

    // Crop mode
    const toggleCropMode = () => {
      if (!canvas) return;

      if (!cropMode) {
        const rect = new fabric.Rect({
          left: 100,
          top: 100,
          width: 200,
          height: 200,
          fill: "rgba(0,0,0,0.3)",
          stroke: "white",
          strokeWidth: 2,
          cornerColor: "white",
          cornerSize: 10,
        });

        canvas.add(rect);
        canvas.setActiveObject(rect);
        setCropRect(rect);
        setCropMode(true);
      } else {
        if (cropRect) {
          canvas.remove(cropRect);
          setCropRect(null);
        }
        setCropMode(false);
      }

      canvas.renderAll();
    };

    // Apply crop
    const applyCrop = () => {
      if (!canvas || !cropRect || !baseImage) return;

      // Get crop rectangle dimensions in canvas space
      const cropCanvasX = cropRect.left!;
      const cropCanvasY = cropRect.top!;
      const cropCanvasWidth = cropRect.width! * cropRect.scaleX!;
      const cropCanvasHeight = cropRect.height! * cropRect.scaleY!;

      // Get base image position and dimensions in canvas space
      const imageCanvasLeft = baseImage.left! - (baseImage.width! * baseImage.scaleX!) / 2;
      const imageCanvasTop = baseImage.top! - (baseImage.height! * baseImage.scaleY!) / 2;

      // Convert crop coordinates from canvas space to image space
      const cropImageX = (cropCanvasX - imageCanvasLeft) / baseImage.scaleX!;
      const cropImageY = (cropCanvasY - imageCanvasTop) / baseImage.scaleY!;
      const cropImageWidth = cropCanvasWidth / baseImage.scaleX!;
      const cropImageHeight = cropCanvasHeight / baseImage.scaleY!;

      // Remove crop rectangle
      canvas.remove(cropRect);
      setCropRect(null);
      setCropMode(false);

      // Apply crop to base image
      baseImage.set({
        cropX: cropImageX,
        cropY: cropImageY,
        width: cropImageWidth,
        height: cropImageHeight,
      });

      canvas.renderAll();
      saveToHistory(canvas.toJSON());
    };

    // Delete selected object
    const deleteSelected = () => {
      if (!canvas) return;

      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length) {
        activeObjects.forEach((obj) => {
          if (obj !== baseImage) {
            canvas.remove(obj);
          }
        });
        canvas.discardActiveObject();
        canvas.renderAll();
      }
    };

    return (
      <div className={`flex gap-4 ${className}`}>
        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-lg p-4">
          <canvas ref={canvasRef} className="border border-border rounded-lg shadow-lg" />
        </div>

        {/* Tools Sidebar */}
        <div className="w-80 space-y-4 overflow-y-auto max-h-[600px]">
          <Tabs defaultValue="filters" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="filters">Filters</TabsTrigger>
              <TabsTrigger value="text">Text</TabsTrigger>
              <TabsTrigger value="draw">Draw</TabsTrigger>
              <TabsTrigger value="shapes">Shapes</TabsTrigger>
            </TabsList>

            {/* Filters Tab */}
            <TabsContent value="filters" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Adjustments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Brightness ({brightness.toFixed(2)})</Label>
                    <Slider
                      value={[brightness]}
                      onValueChange={([v]) => setBrightness(v)}
                      min={-1}
                      max={1}
                      step={0.01}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Contrast ({contrast.toFixed(2)})</Label>
                    <Slider
                      value={[contrast]}
                      onValueChange={([v]) => setContrast(v)}
                      min={-1}
                      max={1}
                      step={0.01}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Saturation ({saturation.toFixed(2)})</Label>
                    <Slider
                      value={[saturation]}
                      onValueChange={([v]) => setSaturation(v)}
                      min={-1}
                      max={1}
                      step={0.01}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Blur ({blur})</Label>
                    <Slider
                      value={[blur]}
                      onValueChange={([v]) => setBlur(v)}
                      min={0}
                      max={50}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant={grayscale ? "default" : "outline"}
                      size="sm"
                      onClick={() => setGrayscale(!grayscale)}
                      className="w-full"
                    >
                      Grayscale
                    </Button>

                    <Button
                      variant={sepia ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSepia(!sepia)}
                      className="w-full"
                    >
                      Sepia
                    </Button>

                    <Button
                      variant={vintage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVintage(!vintage)}
                      className="w-full"
                    >
                      Vintage
                    </Button>

                    <Button
                      variant={vignette ? "default" : "outline"}
                      size="sm"
                      onClick={() => setVignette(!vignette)}
                      className="w-full"
                    >
                      Vignette
                    </Button>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rotateImage(90)}
                      className="w-full"
                    >
                      <RotateCw className="h-4 w-4 mr-2" />
                      Rotate Right
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rotateImage(-90)}
                      className="w-full"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Rotate Left
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => flipImage("horizontal")}
                      className="w-full"
                    >
                      <FlipHorizontal className="h-4 w-4 mr-2" />
                      Flip Horizontal
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => flipImage("vertical")}
                      className="w-full"
                    >
                      <FlipVertical className="h-4 w-4 mr-2" />
                      Flip Vertical
                    </Button>
                  </div>

                  {!cropMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleCropMode}
                      className="w-full"
                    >
                      <Crop className="h-4 w-4 mr-2" />
                      Start Crop
                    </Button>
                  )}

                  {cropMode && (
                    <div className="space-y-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={applyCrop}
                        className="w-full"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Apply Crop
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleCropMode}
                        className="w-full"
                      >
                        <XIcon className="h-4 w-4 mr-2" />
                        Cancel Crop
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Text Tab */}
            <TabsContent value="text" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Add Text</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Text Content</Label>
                    <Input
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Enter text..."
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Font Size ({fontSize})</Label>
                    <Slider
                      value={[fontSize]}
                      onValueChange={([v]) => setFontSize(v)}
                      min={10}
                      max={200}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Font Family</Label>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Courier New">Courier New</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                        <SelectItem value="Verdana">Verdana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Text Color</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-16 h-10 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={addText}
                    disabled={!textInput}
                    className="w-full"
                  >
                    <Type className="h-4 w-4 mr-2" />
                    Add Text
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Draw Tab */}
            <TabsContent value="draw" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Drawing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    variant={drawingMode ? "default" : "outline"}
                    onClick={toggleDrawingMode}
                    className="w-full"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    {drawingMode ? "Stop Drawing" : "Start Drawing"}
                  </Button>

                  <div>
                    <Label className="text-xs">Brush Size ({brushSize})</Label>
                    <Slider
                      value={[brushSize]}
                      onValueChange={([v]) => setBrushSize(v)}
                      min={1}
                      max={50}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Brush Color</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="color"
                        value={brushColor}
                        onChange={(e) => setBrushColor(e.target.value)}
                        className="w-16 h-10 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={brushColor}
                        onChange={(e) => setBrushColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shapes Tab */}
            <TabsContent value="shapes" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Add Shapes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs">Shape Size ({shapeSize})</Label>
                    <Slider
                      value={[shapeSize]}
                      onValueChange={([v]) => setShapeSize(v)}
                      min={10}
                      max={500}
                      step={10}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Shape Color</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="color"
                        value={shapeColor}
                        onChange={(e) => setShapeColor(e.target.value)}
                        className="w-16 h-10 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={shapeColor}
                        onChange={(e) => setShapeColor(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => addShape("rect")}
                    >
                      <Square className="h-4 w-4 mr-2" />
                      Rectangle
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => addShape("circle")}
                    >
                      <Circle className="h-4 w-4 mr-2" />
                      Circle
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => addShape("line")}
                      className="col-span-2"
                    >
                      <Minus className="h-4 w-4 mr-2" />
                      Line
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Delete Button */}
          <Button
            variant="destructive"
            onClick={deleteSelected}
            className="w-full"
          >
            Delete Selected
          </Button>
        </div>
      </div>
    );
  }
);

CanvasEditor.displayName = "CanvasEditor";
