import { useEffect, useState } from "react";
import { X, Download, Pencil, Upload, Trash2, Maximize2, Loader2, Copy, Check } from "lucide-react";
import type { AiGeneration } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AiLightboxModalProps {
  isOpen: boolean;
  generation: AiGeneration | null;
  onClose: () => void;
  onDownload: (url: string, generationId: string) => void;
  onEdit: (generationId: string) => void;
  onUploadToContest: (generation: AiGeneration) => void;
  onDelete: (generationId: string) => void;
  downloadingId: string | null;
  deletingPending: boolean;
  userCredits: number;
  currentEditedUrl?: string | null; // URL from Pro Edit if currently being edited
}

export function AiLightboxModal({ 
  isOpen, 
  generation, 
  onClose,
  onDownload,
  onEdit,
  onUploadToContest,
  onDelete,
  downloadingId,
  deletingPending,
  userCredits,
  currentEditedUrl,
}: AiLightboxModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!isOpen) return;

    const modalId = Date.now();

    // Push unique history state when modal opens
    window.history.pushState({ modal: 'ai-lightbox', modalId }, '');

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        (document.activeElement as HTMLElement)?.blur();
        onClose();
      }
    };

    // Handle browser back button
    const handlePopState = () => {
      if (window.history.state?.modalId !== modalId) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !generation) return null;

  // Use currentEditedUrl from Pro Edit if available, otherwise fall back to stored URLs
  const imageUrl = currentEditedUrl || generation.editedImageUrl || generation.imageUrl;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black"
      onClick={onClose}
      data-testid="ai-lightbox-overlay"
    >
      {/* Full-screen image */}
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <img
          src={imageUrl}
          alt={generation.prompt}
          className="max-w-full max-h-full object-contain"
          data-testid="ai-lightbox-image"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Top Left - Action Buttons */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex gap-2 sm:gap-3 z-30">
        {/* Download */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload(imageUrl, generation.id);
          }}
          disabled={downloadingId === generation.id}
          className="p-2 sm:p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-primary/90 transition-all duration-300 border border-white/20 disabled:opacity-50"
          title="Download"
          data-testid="button-lightbox-download"
        >
          {downloadingId === generation.id ? (
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
          ) : (
            <Download className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </button>
        
        {/* Edit */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(generation.id);
          }}
          className="p-2 sm:p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-primary/90 transition-all duration-300 border border-white/20"
          title="Edit"
          data-testid="button-lightbox-edit"
        >
          <Pencil className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        {/* Upload to Contest */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUploadToContest(generation);
          }}
          className="p-2 sm:p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-primary/90 transition-all duration-300 border border-white/20"
          title="Upload to Contest"
          data-testid="button-lightbox-upload"
        >
          <Upload className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(generation.id);
          }}
          disabled={deletingPending}
          className="p-2 sm:p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-red-500 transition-all duration-300 border border-white/20 disabled:opacity-50"
          title="Delete"
          data-testid="button-lightbox-delete"
        >
          {deletingPending ? (
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
          ) : (
            <Trash2 className="h-5 w-5 sm:h-6 sm:w-6" />
          )}
        </button>
      </div>

      {/* Top Right - Close Icon */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 sm:p-3 rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-red-500 transition-all duration-300 border border-white/20 z-30"
        data-testid="button-close-lightbox"
      >
        <X className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      {/* Bottom Info Bar */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 sm:p-6 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/40 to-purple-600/40 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-xl">auto_awesome</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-1">
                <h2 className="text-sm text-gray-400">Prompt</h2>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await navigator.clipboard.writeText(generation.prompt);
                      setCopied(true);
                      toast({ title: "Copied!", description: "Prompt copied to clipboard." });
                      setTimeout(() => setCopied(false), 1500);
                    } catch (err) {
                      toast({ title: "Copy failed", description: "Couldn't copy the prompt.", variant: "destructive" });
                    }
                  }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-white/20 text-white/90 hover:bg-white/10 transition text-xs"
                  title="Copy prompt"
                  data-testid="button-copy-prompt"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <p className="text-base sm:text-lg font-medium text-white leading-relaxed" data-testid="text-lightbox-prompt">
                {generation.prompt}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">brush</span>
              <span className="capitalize">{generation.model?.replace(/-/g, ' ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">calendar_today</span>
              <span>{new Date(generation.createdAt).toLocaleDateString()}</span>
            </div>
            {generation.isUpscaled && (
              <div className="flex items-center gap-2 text-primary">
                <Maximize2 className="h-4 w-4" />
                <span>Upscaled 4x</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
