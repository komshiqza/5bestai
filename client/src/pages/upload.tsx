import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  UploadCloud,
  Image as ImageIcon,
  Film,
  Tag,
  X,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Info,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "Art",
  "Portrait",
  "Landscape",
  "Sci-Fi",
  "Fantasy",
  "Abstract",
  "Realistic",
  "Funny",
  "Surreal",
  "Other",
];

export default function Upload() {
  const [, setLocation] = useLocation();
  const { data: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<{url: string, type: string, thumbnailUrl?: string} | null>(null);
  const [uploadMode, setUploadMode] = useState<'new' | 'gallery'>('new');
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedContest, setSelectedContest] = useState<string>("");
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Wizard
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVideo = useMemo(
    () => (file ? file.type.startsWith("video/") : false),
    [file]
  );
  const previewURL = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  // Fetch active contests
  const { data: contests = [] } = useQuery({
    queryKey: ["/api/contests"],
  });

  const activeContests = contests.filter((c: any) => c.status === "active");

  // Fetch user's submissions for gallery
  const { data: userSubmissions = [] } = useQuery({
    queryKey: ["/api/submissions", { userId: user?.id }],
    enabled: !!user?.id,
  });

  // Redirect if not authenticated
  if (!user) {
    setLocation("/login");
    return null;
  }

  const resetErrors = () => setErrors([]);

  const validateStep = (s: 1 | 2 | 3) => {
    const newErrors: string[] = [];
    if (s === 1) {
      if (uploadMode === 'new' && !file) newErrors.push("Please select a file to upload.");
      if (uploadMode === 'gallery' && !selectedGalleryImage) newErrors.push("Please select an image from your gallery.");
    }
    if (s === 2) {
      if (!title.trim()) newErrors.push("Title is required.");
      if (!description.trim()) newErrors.push("Description is required.");
    }
    if (s === 3) {
      if (!selectedContest) newErrors.push("Please select a contest.");
      if (!agreedToRules) newErrors.push("You must agree to contest rules.");
      if (!agreedToTerms) newErrors.push("You must agree to the terms and conditions.");
    }
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const goNext = () => {
    resetErrors();
    if (validateStep(step)) {
      if (step < 3) setStep((p) => (p + 1) as 1 | 2 | 3);
    }
  };

  const goPrev = () => {
    resetErrors();
    if (step > 1) setStep((p) => (p - 1) as 1 | 2 | 3);
  };

  const onDropFiles = useCallback((dropped: FileList | null) => {
    if (!dropped || dropped.length === 0) return;
    const f = dropped[0];
    if (
      f.type.startsWith("image/") ||
      f.type.startsWith("video/") ||
      /\.(jpg|jpeg|png|webp|gif|mp4|mov|webm)$/i.test(f.name)
    ) {
      setFile(f);
    } else {
      setErrors(["Unsupported file type. Use image or video formats."]);
    }
  }, []);

  const handleTagAdd = (value: string) => {
    const t = value.trim();
    if (!t) return;
    if (tags.includes(t)) return;
    if (tags.length >= 10) return;
    setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
  };

  const handleSubmit = async () => {
    resetErrors();
    const allGood = validateStep(1) && validateStep(2) && validateStep(3);
    if (!allGood) return;

    if (uploadMode === 'new' && !file) return;
    if (uploadMode === 'gallery' && !selectedGalleryImage) return;

    setSubmitting(true);
    try {
      if (uploadMode === 'new' && file) {
        // Upload new file
        const formData = new FormData();
        formData.append("file", file);
        formData.append("contestId", selectedContest);
        formData.append("title", title);
        formData.append("description", description);
        formData.append("type", file.type.startsWith("video/") ? "video" : "image");

        const response = await fetch("/api/submissions", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to submit");
        }
      } else if (uploadMode === 'gallery' && selectedGalleryImage) {
        // Use existing image from gallery
        const response = await fetch("/api/submissions", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contestId: selectedContest,
            title,
            description,
            type: selectedGalleryImage.type,
            mediaUrl: selectedGalleryImage.url,
            thumbnailUrl: selectedGalleryImage.thumbnailUrl,
            status: "pending",
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to submit");
        }
      }

      toast({
        title: "Success!",
        description: "Your submission has been uploaded and is pending approval",
      });

      // Reset form
      setFile(null);
      setSelectedGalleryImage(null);
      setUploadMode('new');
      setTitle("");
      setDescription("");
      setCategory(CATEGORIES[0]);
      setTags([]);
      setSelectedContest("");
      setAgreedToRules(false);
      setAgreedToTerms(false);
      setStep(1);

      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });

      // Redirect to contests page
      setLocation("/contests");
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="relative w-full mx-auto max-w-5xl">
        {/* Card Shell */}
        <div className="rounded-2xl border border-violet-200/40 dark:border-violet-800/40 shadow-xl overflow-hidden bg-white/70 dark:bg-slate-900/60 backdrop-blur">
          {/* Header */}
          <div className="relative p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-violet-50 to-slate-50 dark:from-indigo-950/20 dark:via-violet-950/20 dark:to-slate-950" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  Submit Your Work
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                  Upload your creative work and compete for GLORY rewards
                </p>
              </div>
              <div className="flex items-center gap-2">
                <WizardSteps step={step} />
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 pt-0 sm:p-8 sm:pt-0">
            {errors.length > 0 && (
              <div className="mb-6 rounded-xl border border-red-300/50 dark:border-red-600/50 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-200">
                <ul className="list-disc ps-5 space-y-1">
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {step === 1 && (
              <div>
                {/* Mode Toggle */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={() => {
                      setUploadMode('new');
                      setSelectedGalleryImage(null);
                    }}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
                      uploadMode === 'new'
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    data-testid="button-upload-new"
                  >
                    <UploadCloud className="h-4 w-4 inline mr-2" />
                    Upload New
                  </button>
                  <button
                    onClick={() => {
                      setUploadMode('gallery');
                      setFile(null);
                    }}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors ${
                      uploadMode === 'gallery'
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    data-testid="button-from-gallery"
                  >
                    <ImageIcon className="h-4 w-4 inline mr-2" />
                    From Gallery
                  </button>
                </div>

                {uploadMode === 'new' ? (
                  <StepUpload
                    file={file}
                    isVideo={isVideo}
                    previewURL={previewURL}
                    onPickFile={() => fileInputRef.current?.click()}
                    onDropFiles={onDropFiles}
                    fileInputRef={fileInputRef}
                    setFile={setFile}
                  />
                ) : (
                  <GallerySelector
                    userSubmissions={userSubmissions}
                    selectedImage={selectedGalleryImage}
                    onSelectImage={setSelectedGalleryImage}
                  />
                )}
              </div>
            )}

            {step === 2 && (
              <StepDetails
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                category={category}
                setCategory={setCategory}
                tags={tags}
                tagInput={tagInput}
                setTagInput={setTagInput}
                onAddTag={handleTagAdd}
                onRemoveTag={removeTag}
              />
            )}

            {step === 3 && (
              <StepContest
                contests={activeContests}
                selectedContest={selectedContest}
                setSelectedContest={setSelectedContest}
                agreedToRules={agreedToRules}
                setAgreedToRules={setAgreedToRules}
                agreedToTerms={agreedToTerms}
                setAgreedToTerms={setAgreedToTerms}
              />
            )}
          </div>

          {/* Footer / Nav */}
          <div className="flex items-center justify-between gap-3 p-6 sm:p-8 border-t border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60">
            <button
              onClick={goPrev}
              disabled={step === 1}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 border border-slate-300/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-back"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            {step < 3 ? (
              <button
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/20"
                data-testid="button-next"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-60"
                data-testid="button-submit"
              >
                {submitting ? "Submitting..." : "Submit"}
                <CheckCircle2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function WizardSteps({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { id: 1, label: "Upload" },
    { id: 2, label: "Details" },
    { id: 3, label: "Contest" },
  ];
  return (
    <div className="flex items-center gap-2">
      {steps.map((s) => {
        const active = step === (s.id as 1 | 2 | 3);
        return (
          <div
            key={s.id}
            className={[
              "px-3 py-1.5 rounded-full text-xs font-medium border",
              active
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 border-slate-300/60 dark:border-slate-700/60",
            ].join(" ")}
          >
            {s.label}
          </div>
        );
      })}
    </div>
  );
}

function StepUpload({
  file,
  isVideo,
  previewURL,
  onPickFile,
  onDropFiles,
  fileInputRef,
  setFile,
}: {
  file: File | null;
  isVideo: boolean;
  previewURL: string | null;
  onPickFile: () => void;
  onDropFiles: (files: FileList | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  setFile: (f: File | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          onDropFiles(e.dataTransfer.files);
        }}
        className={[
          "relative w-full border-2 border-dashed rounded-2xl overflow-hidden cursor-pointer",
          dragOver
            ? "border-violet-500 bg-violet-50/60 dark:bg-violet-950/20"
            : "border-slate-300/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/60",
        ].join(" ")}
        onClick={onPickFile}
        data-testid="upload-drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,video/*"
          onChange={(e) => onDropFiles(e.target.files)}
          data-testid="input-file"
        />

        {!file ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <UploadCloud className="h-10 w-10 text-violet-600 mb-3" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
              Drag & drop your image or video
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              JPG, PNG, WEBP, GIF, MP4 (max 100MB)
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 bg-violet-600 text-white hover:bg-violet-700">
              <ImageIcon className="h-4 w-4" />
              <span>Browse files</span>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800">
              {isVideo ? (
                <video
                  src={previewURL ?? undefined}
                  className="h-full w-full object-contain"
                  controls
                />
              ) : (
                <img
                  src={previewURL ?? ""}
                  alt="preview"
                  className="h-full w-full object-contain"
                />
              )}
            </div>

            <div className="absolute top-3 right-3 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPickFile();
                }}
                className="rounded-xl px-3 py-1.5 text-xs bg-white/90 dark:bg-slate-900/90 border border-slate-300/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                data-testid="button-change-file"
              >
                Change
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="rounded-xl p-1.5 bg-white/90 dark:bg-slate-900/90 border border-slate-300/60 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-800"
                data-testid="button-remove-file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
        <Info className="h-4 w-4" />
        <span>
          Tip: Use high-resolution assets. For videos, keep under 60 seconds for best performance.
        </span>
      </div>
    </div>
  );
}

function StepDetails({
  title,
  setTitle,
  description,
  setDescription,
  category,
  setCategory,
  tags,
  tagInput,
  setTagInput,
  onAddTag,
  onRemoveTag,
}: {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  tags: string[];
  tagInput: string;
  setTagInput: (v: string) => void;
  onAddTag: (v: string) => void;
  onRemoveTag: (t: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3">
        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
          Title *
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name your masterpiece"
          className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
          data-testid="input-title"
        />

        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mt-4 mb-1">
          Description *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          placeholder="Tell the story, technique, settings..."
          className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
          data-testid="input-description"
        />
      </div>

      <div className="lg:col-span-2">
        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
          Category *
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
          data-testid="select-category"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mt-4 mb-1">
          Tags (up to 10)
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Tag className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onAddTag(tagInput);
                }
              }}
              placeholder="Press Enter to add"
              className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 ps-9 pe-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
              data-testid="input-tag"
            />
          </div>
          <button
            onClick={() => onAddTag(tagInput)}
            className="rounded-xl px-3 py-2 bg-violet-600 text-white hover:bg-violet-700"
            data-testid="button-add-tag"
          >
            Add
          </button>
        </div>

        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full border border-violet-300/60 dark:border-violet-700/60 bg-violet-50/70 dark:bg-violet-950/20 px-3 py-1 text-xs text-violet-800 dark:text-violet-200"
              >
                {t}
                <button
                  onClick={() => onRemoveTag(t)}
                  className="p-0.5 hover:text-violet-600 dark:hover:text-violet-300"
                  data-testid={`button-remove-tag-${t}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StepContest({
  contests,
  selectedContest,
  setSelectedContest,
  agreedToRules,
  setAgreedToRules,
  agreedToTerms,
  setAgreedToTerms,
}: {
  contests: any[];
  selectedContest: string;
  setSelectedContest: (v: string) => void;
  agreedToRules: boolean;
  setAgreedToRules: (b: boolean) => void;
  agreedToTerms: boolean;
  setAgreedToTerms: (b: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-xl border border-violet-300/60 dark:border-violet-700/60 bg-violet-50/70 dark:bg-violet-950/20 p-4">
        <Trophy className="h-6 w-6 text-violet-600 dark:text-violet-400" />
        <div>
          <h3 className="text-sm font-medium text-violet-900 dark:text-violet-100">
            Contest Submission
          </h3>
          <p className="text-xs text-violet-700 dark:text-violet-300 mt-0.5">
            Submit your work to compete for GLORY rewards
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
          Select Contest *
        </label>
        <select
          value={selectedContest}
          onChange={(e) => setSelectedContest(e.target.value)}
          className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
          data-testid="select-contest"
        >
          <option value="">Choose a contest</option>
          {contests.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} - {c.prizeGlory.toLocaleString()} GLORY
            </option>
          ))}
        </select>
      </div>

      {/* User Agreements */}
      <div className="space-y-4 pt-4 border-t border-slate-300/60 dark:border-slate-700/60">
        <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
          Agreements
        </h3>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={agreedToRules}
            onChange={(e) => setAgreedToRules(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 mt-0.5"
            data-testid="checkbox-rules"
          />
          <div className="text-sm">
            <span className="text-slate-800 dark:text-slate-200">
              I agree to the contest rules and confirm I own the rights to this content *
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Top 5 submissions receive GLORY rewards: 40%, 25%, 15%, 10%, 10%
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 mt-0.5"
            data-testid="checkbox-terms"
          />
          <div className="text-sm">
            <span className="text-slate-800 dark:text-slate-200">
              I agree to the{" "}
              <a href="/terms" className="text-violet-600 hover:text-violet-700 underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-violet-600 hover:text-violet-700 underline">
                Privacy Policy
              </a>
              {" "}*
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Required for all submissions
            </p>
          </div>
        </label>
      </div>

      <div className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2 rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-900/70 p-4">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>
          Submissions require admin approval before appearing in the contest. Make sure your asset meets the contest theme and community guidelines.
        </p>
      </div>
    </div>
  );
}

function GallerySelector({
  userSubmissions,
  selectedImage,
  onSelectImage,
}: {
  userSubmissions: any[];
  selectedImage: { url: string; type: string; thumbnailUrl?: string } | null;
  onSelectImage: (image: { url: string; type: string; thumbnailUrl?: string } | null) => void;
}) {
  if (userSubmissions.length === 0) {
    return (
      <div className="text-center py-12 rounded-xl border-2 border-dashed border-slate-300/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/60">
        <ImageIcon className="h-12 w-12 text-slate-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          No images in your gallery
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          Upload your first image to start building your gallery
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        <ImageIcon className="h-4 w-4" />
        <span>Select an image from your gallery ({userSubmissions.length} images)</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto p-2">
        {userSubmissions.map((submission: any) => (
          <div
            key={submission.id}
            onClick={() => {
              if (selectedImage?.url === submission.mediaUrl) {
                onSelectImage(null);
              } else {
                onSelectImage({
                  url: submission.mediaUrl,
                  type: submission.type,
                  thumbnailUrl: submission.thumbnailUrl,
                });
              }
            }}
            className={`relative aspect-square cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
              selectedImage?.url === submission.mediaUrl
                ? 'border-violet-500 ring-4 ring-violet-500/30'
                : 'border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600'
            }`}
            data-testid={`gallery-image-${submission.id}`}
          >
            <img
              src={submission.type === 'video' ? submission.thumbnailUrl || submission.mediaUrl : submission.mediaUrl}
              alt={submission.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23334155" width="400" height="400"/%3E%3Ctext fill="%239ca3af" font-family="system-ui" font-size="48" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3E' + (submission.type === 'video' ? '🎬' : '🖼️') + '%3C/tspan%3E%3C/text%3E%3C/svg%3E';
                target.onerror = null;
              }}
            />
            {submission.type === 'video' && (
              <div className="absolute top-2 right-2 bg-black/70 rounded-lg px-2 py-1">
                <Film className="h-3 w-3 text-white" />
              </div>
            )}
            {selectedImage?.url === submission.mediaUrl && (
              <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-violet-500 drop-shadow-lg" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-xs text-white font-medium truncate">{submission.title}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
