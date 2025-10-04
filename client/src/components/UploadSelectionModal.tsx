import { X, Upload, Image as ImageIcon } from "lucide-react";
import { GlassButton } from "./GlassButton";

interface UploadSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExisting: () => void;
  onUploadNew: () => void;
}

export function UploadSelectionModal({
  isOpen,
  onClose,
  onSelectExisting,
  onUploadNew
}: UploadSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      data-testid="upload-selection-overlay"
    >
      <div 
        className="relative max-w-md w-full bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-violet-600/20 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Submit Entry</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-testid="button-close-upload-selection"
          >
            <X className="h-6 w-6 text-slate-400" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-4">
          <button
            onClick={onUploadNew}
            className="w-full p-6 bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:border-violet-500/50 transition-all group"
            data-testid="button-upload-new"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-violet-600/20 border border-violet-500/30 group-hover:bg-violet-600/30 transition-colors">
                <Upload className="h-8 w-8 text-violet-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Upload New Artwork</h3>
                <p className="text-sm text-slate-400">Create a new submission for this contest</p>
              </div>
            </div>
          </button>

          <button
            onClick={onSelectExisting}
            className="w-full p-6 bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 hover:border-violet-500/50 transition-all group"
            data-testid="button-select-existing"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="p-4 rounded-full bg-violet-600/20 border border-violet-500/30 group-hover:bg-violet-600/30 transition-colors">
                <ImageIcon className="h-8 w-8 text-violet-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Select from Gallery</h3>
                <p className="text-sm text-slate-400">Choose from your existing artworks</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
