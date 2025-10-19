import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Sparkles, ImageUp, User2, Download, RotateCcw, Scissors, Sun, Wand2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface ProEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  submissionId?: string;
  generationId?: string;
}

interface Preset {
  key: string;
  name: string;
  description: string;
  credits: number;
  icon: typeof Sparkles;
}

const PRESETS: Preset[] = [
  {
    key: 'clean',
    name: 'Clean & Denoise',
    description: 'Remove noise and artifacts from images',
    credits: 2,
    icon: Sparkles
  },
  {
    key: 'upscale4x',
    name: 'Upscale 4×',
    description: 'Upscale image to 4× resolution',
    credits: 4,
    icon: ImageUp
  },
  {
    key: 'portrait_pro',
    name: 'Portrait Pro',
    description: 'Professional portrait enhancement',
    credits: 4,
    icon: User2
  },
  {
    key: 'enhance',
    name: 'Smart Enhance',
    description: 'General AI enhancement for any image',
    credits: 3,
    icon: Wand2
  },
  {
    key: 'bg_remove',
    name: 'Remove Background',
    description: 'Remove image background with AI',
    credits: 2,
    icon: Scissors
  },
  {
    key: 'relight',
    name: 'Relight Scene',
    description: 'Change lighting and background',
    credits: 4,
    icon: Sun
  }
];

export function ProEditModal({ open, onOpenChange, imageUrl, submissionId, generationId }: ProEditModalProps) {
  const { toast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(imageUrl); // For chain editing
  const [originalUrl, setOriginalUrl] = useState<string>(imageUrl);
  const [sourceMode, setSourceMode] = useState<'current' | 'original'>('current'); // Toggle between current/original

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setCurrentImageUrl(imageUrl);
      setOriginalUrl(imageUrl);
      setSourceMode('current');
      setJobId(null);
      setProcessing(false);
    }
  }, [open, imageUrl]);

  // Create edit job mutation
  const createEditMutation = useMutation({
    mutationFn: async (preset: string) => {
      // Use source mode to determine which URL to send
      const sourceUrl = sourceMode === 'original' ? originalUrl : currentImageUrl;
      
      const response = await fetch("/api/edits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageUrl: sourceUrl,
          preset,
          submissionId,
          generationId
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start processing");
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      setJobId(data.jobId);
      setProcessing(true);
      toast({
        title: "Processing started",
        description: `Your image is being enhanced. Credits used: ${data.creditsDeducted}`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start processing",
        variant: "destructive"
      });
      setProcessing(false);
    }
  });

  // Poll job status
  const { data: jobStatus } = useQuery<any>({
    queryKey: ['/api/edit-jobs', jobId],
    enabled: !!jobId && processing,
    refetchInterval: (query) => {
      const data = query.state.data;
      // Stop polling if job is done
      if (data?.status === 'succeeded' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds
    }
  });

  // Handle job completion
  useEffect(() => {
    if (jobStatus?.status === 'succeeded' && processing) {
      setProcessing(false);
      
      // Update current image URL with the output
      if (jobStatus.outputUrl) {
        setCurrentImageUrl(jobStatus.outputUrl);
        setSourceMode('current'); // Default to using current result
      }
      
      // CRITICAL: Always update original URL from backend response
      // This ensures "Use Original" toggle works correctly for chain/parallel editing
      if (jobStatus.originalUrl) {
        setOriginalUrl(jobStatus.originalUrl);
      }
      
      toast({
        title: "Success!",
        description: "Your image has been enhanced. You can continue editing or download."
      });
      
      // Invalidate galleries to show updated images
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/generations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/submissions'] });
      
      setJobId(null); // Clear job ID to stop polling
    } else if (jobStatus?.status === 'failed' && processing) {
      setProcessing(false);
      toast({
        title: "Processing failed",
        description: jobStatus.error || "An error occurred",
        variant: "destructive"
      });
      setJobId(null);
    }
  }, [jobStatus, processing]);

  const handlePresetSelect = (presetKey: string) => {
    if (processing) return;
    createEditMutation.mutate(presetKey);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enhanced-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Downloaded",
        description: "Image saved to your device"
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the image",
        variant: "destructive"
      });
    }
  };

  const handleClose = () => {
    if (!processing) {
      onOpenChange(false);
      setJobId(null);
      setSelectedPreset(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-gray-200/50 dark:border-gray-700/50" data-testid="dialog-pro-edit">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Pro Edit
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            {processing 
              ? "Processing your image..." 
              : "Choose an AI enhancement preset"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Image Preview Section */}
          {currentImageUrl && currentImageUrl !== imageUrl && !processing && (
            <div className="space-y-3">
              <div className="rounded-lg overflow-hidden border-2 border-purple-200 dark:border-purple-800">
                <img 
                  src={currentImageUrl} 
                  alt="Enhanced result" 
                  className="w-full h-auto"
                  data-testid="img-preview"
                />
              </div>
              
              {/* Source Toggle */}
              <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Process from:
                </Label>
                <RadioGroup 
                  value={sourceMode} 
                  onValueChange={(value: 'current' | 'original') => setSourceMode(value)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="current" id="source-current" data-testid="radio-source-current" />
                    <Label htmlFor="source-current" className="cursor-pointer text-gray-700 dark:text-gray-300">
                      📸 Use Current Result
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="original" id="source-original" data-testid="radio-source-original" />
                    <Label htmlFor="source-original" className="cursor-pointer text-gray-700 dark:text-gray-300">
                      🎨 Use Original
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {sourceMode === 'current' 
                    ? "Next preset will enhance the current result (chain editing)" 
                    : "Next preset will process the original image (parallel editing)"}
                </p>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {processing && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-16 h-16 animate-spin text-purple-600" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Enhancing your image...
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This may take 30-60 seconds
                </p>
                {jobStatus?.status === 'running' && (
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    Status: {jobStatus.status}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Preset Selection - Always Visible */}
          <div>
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 block">
              {currentImageUrl !== imageUrl ? "Apply another enhancement:" : "Choose enhancement:"}
            </Label>
            <div className="grid gap-3">
              {PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <Card
                    key={preset.key}
                    className={`p-4 transition-all border-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm ${
                      processing 
                        ? "opacity-50 cursor-not-allowed" 
                        : "cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-purple-400 dark:hover:border-purple-600"
                    }`}
                    onClick={() => !processing && handlePresetSelect(preset.key)}
                    data-testid={`card-preset-${preset.key}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                            {preset.name}
                          </h3>
                          <span className="text-sm font-medium px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                            {preset.credits} credits
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {preset.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 gap-3">
            <div className="flex gap-2">
              {currentImageUrl !== imageUrl && (
                <Button
                  onClick={handleDownload}
                  disabled={processing}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  data-testid="button-download"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={processing}
              data-testid="button-close"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
