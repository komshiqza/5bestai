import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, Image as ImageIcon, Video, CloudUpload, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth, isAuthenticated, isApproved } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { MAX_FILE_SIZE } from "@/lib/constants";

const uploadSchema = z.object({
  contestId: z.string().min(1, "Please select a contest"),
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  type: z.enum(["image", "video"]),
  termsAccepted: z.boolean().refine(val => val === true, "You must accept the terms and conditions"),
});

type UploadForm = z.infer<typeof uploadSchema>;

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [, setLocation] = useLocation();
  const { data: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UploadForm>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      type: "image",
      termsAccepted: false,
    }
  });

  const selectedType = watch("type");

  // Fetch active contests
  const { data: contests = [] } = useQuery({
    queryKey: ["/api/contests", { status: "active" }],
    queryFn: async () => {
      const response = await fetch("/api/contests?status=active");
      if (!response.ok) throw new Error("Failed to fetch contests");
      return response.json();
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: UploadForm) => {
      if (!file) throw new Error("No file selected");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("contestId", data.contestId);
      formData.append("title", data.title);
      formData.append("description", data.description || "");
      formData.append("type", data.type);

      const response = await fetch("/api/submissions", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      return response.json();
    },
    onSuccess: () => {
      setUploadSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      toast({
        title: "Submission uploaded!",
        description: "Your entry is now pending admin approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Redirect if not authenticated or approved
  if (!isAuthenticated(user)) {
    setLocation("/login");
    return null;
  }

  if (!isApproved(user)) {
    return (
      <div className="min-h-screen py-16 flex items-center justify-center" data-testid="upload-not-approved">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Account Approval Required</h2>
              <p className="text-muted-foreground">
                Your account must be approved by an admin before you can submit entries.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (uploadSuccess) {
    return (
      <div className="min-h-screen py-16 flex items-center justify-center" data-testid="upload-success">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Submission Uploaded!</h2>
              <p className="text-muted-foreground mb-6">
                Your entry has been submitted and is now pending admin approval.
              </p>
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    setUploadSuccess(false);
                    setFile(null);
                    setValue("title", "");
                    setValue("description", "");
                    setValue("contestId", "");
                    setValue("termsAccepted", false);
                  }}
                  data-testid="submit-another"
                >
                  Submit Another Entry
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setLocation("/profile")}
                  data-testid="view-profile"
                >
                  View My Submissions
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const maxSize = selectedFile.type.startsWith("image/") ? MAX_FILE_SIZE.IMAGE : MAX_FILE_SIZE.VIDEO;
    
    if (selectedFile.size > maxSize) {
      toast({
        title: "File too large",
        description: `File size must be less than ${maxSize / (1024 * 1024)}MB`,
        variant: "destructive",
      });
      return;
    }

    const validImageTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const validVideoTypes = ["video/mp4", "video/webm"];
    
    if (selectedType === "image" && !validImageTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid image file (JPEG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }
    
    if (selectedType === "video" && !validVideoTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a valid video file (MP4, WebM)",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
  };

  const onSubmit = async (data: UploadForm) => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    await uploadMutation.mutateAsync(data);
  };

  return (
    <div className="min-h-screen py-16" data-testid="upload-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold flex items-center justify-center" data-testid="upload-title">
              <Upload className="w-8 h-8 text-primary mr-3" />
              Submit Your Work
            </CardTitle>
            <p className="text-muted-foreground">
              Upload your creative masterpiece and compete for GLORY
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" data-testid="upload-form">
              {/* Contest Selection */}
              <div>
                <Label htmlFor="contestId">Contest *</Label>
                <Select onValueChange={(value) => setValue("contestId", value)} data-testid="select-contest">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a contest" />
                  </SelectTrigger>
                  <SelectContent>
                    {contests.map((contest: any) => (
                      <SelectItem key={contest.id} value={contest.id}>
                        {contest.title} ({contest.prizeGlory.toLocaleString()} GLORY)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.contestId && (
                  <p className="text-sm text-destructive mt-1" data-testid="error-contest">
                    {errors.contestId.message}
                  </p>
                )}
              </div>

              {/* Type Selection */}
              <div>
                <Label>Submission Type *</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <Button
                    type="button"
                    variant={selectedType === "image" ? "default" : "outline"}
                    className={`h-20 ${selectedType === "image" ? "gradient-glory" : ""}`}
                    onClick={() => {
                      setValue("type", "image");
                      setFile(null);
                    }}
                    data-testid="select-image"
                  >
                    <div className="flex flex-col items-center">
                      <ImageIcon className="w-6 h-6 mb-2" />
                      <span>Image</span>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={selectedType === "video" ? "default" : "outline"}
                    className={`h-20 ${selectedType === "video" ? "gradient-glory" : ""}`}
                    onClick={() => {
                      setValue("type", "video");
                      setFile(null);
                    }}
                    data-testid="select-video"
                  >
                    <div className="flex flex-col items-center">
                      <Video className="w-6 h-6 mb-2" />
                      <span>Video</span>
                    </div>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedType === "image" ? "Images: JPEG, PNG, WebP (max 10MB)" : "Videos: MP4, WebM (max 100MB)"}
                </p>
              </div>

              {/* File Upload */}
              <div>
                <Label>Upload File *</Label>
                <div
                  className={`mt-2 border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                    dragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-input")?.click()}
                  data-testid="file-upload-area"
                >
                  {file ? (
                    <div>
                      <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                      <p className="text-lg font-semibold">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        data-testid="remove-file"
                      >
                        Remove File
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <CloudUpload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-lg font-semibold mb-1">Drop your file here or click to browse</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedType === "image" 
                          ? "Maximum file size: 10MB for images" 
                          : "Maximum file size: 100MB for videos"
                        }
                      </p>
                    </div>
                  )}
                </div>
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept={selectedType === "image" ? "image/*" : "video/*"}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                  data-testid="file-input"
                />
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Give your work a catchy title"
                  {...register("title")}
                  className={errors.title ? "border-destructive" : ""}
                  data-testid="input-title"
                />
                {errors.title && (
                  <p className="text-sm text-destructive mt-1" data-testid="error-title">
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Tell us about your creation, inspiration, or techniques used..."
                  rows={4}
                  {...register("description")}
                  className={errors.description ? "border-destructive" : ""}
                  data-testid="input-description"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {watch("description")?.length || 0}/500 characters
                </p>
                {errors.description && (
                  <p className="text-sm text-destructive mt-1" data-testid="error-description">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {/* Terms */}
              <div className="flex items-start space-x-3 bg-muted/50 rounded-lg p-4">
                <Checkbox
                  id="terms"
                  checked={watch("termsAccepted")}
                  onCheckedChange={(checked) => setValue("termsAccepted", checked as boolean)}
                  data-testid="checkbox-terms"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="terms"
                    className="text-sm font-normal cursor-pointer"
                  >
                    I confirm that this is my original work and I agree to the contest rules and terms of service. 
                    My submission may be moderated before appearing publicly.
                  </Label>
                </div>
              </div>
              {errors.termsAccepted && (
                <p className="text-sm text-destructive" data-testid="error-terms">
                  {errors.termsAccepted.message}
                </p>
              )}

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="flex-1 gradient-glory hover:opacity-90 transition-opacity py-3"
                  disabled={isSubmitting || uploadMutation.isPending || !file}
                  data-testid="button-submit"
                >
                  {uploadMutation.isPending ? (
                    "Uploading..."
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Submit Entry
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
