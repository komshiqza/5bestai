import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Sparkles, ImageUp, User2 } from "lucide-react";

interface ProEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  submissionId?: string;
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
  }
];

export function ProEditModal({ open, onOpenChange, imageUrl, submissionId }: ProEditModalProps) {
  const { toast } = useToast();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Create edit job mutation
  const createEditMutation = useMutation({
    mutationFn: async (preset: string) => {
      const response = await fetch("/api/edits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          imageUrl,
          preset,
          submissionId
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
  if (jobStatus?.status === 'succeeded' && processing) {
    setProcessing(false);
    toast({
      title: "Success!",
      description: "Your image has been enhanced"
    });
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    // Close modal after short delay
    setTimeout(() => {
      onOpenChange(false);
      setJobId(null);
      setSelectedPreset(null);
    }, 1500);
  } else if (jobStatus?.status === 'failed' && processing) {
    setProcessing(false);
    toast({
      title: "Processing failed",
      description: jobStatus.error || "An error occurred",
      variant: "destructive"
    });
  }

  const handlePresetSelect = (presetKey: string) => {
    if (processing) return;
    createEditMutation.mutate(presetKey);
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
          {processing ? (
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
          ) : (
            <div className="grid gap-3">
              {PRESETS.map((preset) => {
                const Icon = preset.icon;
                return (
                  <Card
                    key={preset.key}
                    className="p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 hover:border-purple-400 dark:hover:border-purple-600 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
                    onClick={() => handlePresetSelect(preset.key)}
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
          )}

          {!processing && (
            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
