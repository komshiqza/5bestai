import { useState, useRef } from "react";
import { X, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { GlassButton } from "./GlassButton";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface UploadCardProps {
  isOpen: boolean;
  contestId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadCard({ isOpen, contestId, onClose, onSuccess }: UploadCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !title.trim()) {
      toast({
        title: "Error",
        description: "Please select a file and provide a title",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('contestId', contestId);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('type', selectedFile.type.startsWith('video/') ? 'video' : 'image');

      const response = await fetch('/api/submissions', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit');
      }

      toast({
        title: "Success!",
        description: "Your submission has been uploaded and is pending approval"
      });

      onSuccess();
      handleClose();
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview("");
    setTitle("");
    setDescription("");
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={handleClose}
      data-testid="upload-card-overlay"
    >
      <div 
        className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl shadow-violet-600/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Upload Submission</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-testid="button-close-upload"
          >
            <X className="h-6 w-6 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* File Upload Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="relative border-2 border-dashed border-white/20 hover:border-violet-500/50 rounded-xl p-8 text-center cursor-pointer transition-colors bg-white/5"
            data-testid="upload-drop-zone"
          >
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setPreview("");
                  }}
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg transition-colors"
                  data-testid="button-remove-file"
                >
                  <X className="h-5 w-5 text-white" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-violet-600/20 border border-violet-500/30">
                  <ImageIcon className="h-12 w-12 text-violet-400" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white mb-1">
                    Drop your image here or click to browse
                  </p>
                  <p className="text-sm text-slate-400">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-file"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Title *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter submission title"
              className="bg-white/5 border-white/10 text-white"
              data-testid="input-title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description (optional)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about your submission..."
              rows={4}
              className="bg-white/5 border-white/10 text-white"
              data-testid="input-description"
            />
          </div>

          {/* Submit Button */}
          <GlassButton
            onClick={handleSubmit}
            disabled={!selectedFile || !title.trim() || isUploading}
            variant="primary"
            className="w-full py-4 flex items-center justify-center gap-2"
            data-testid="button-submit-upload"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Submit Entry
              </>
            )}
          </GlassButton>
        </div>
      </div>
    </div>
  );
}
