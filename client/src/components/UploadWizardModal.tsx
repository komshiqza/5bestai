import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  Image as ImageIcon,
  Tag,
  X,
  ChevronRight,
  ChevronLeft,
  Trophy,
  Info,
  CheckCircle2,
  Search,
  Wallet,
} from "lucide-react";
import { debugLog } from "../utils/debug";

// Global flag to control debug logging - set to false to reduce console spam
const DEBUG_ENABLED = false;
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { SolanaPayment } from "@/components/payment/SolanaPayment";
import { formatPrizeAmount } from "@/lib/utils";

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

type SubmissionType = "general" | "sell" | "contest";

interface UploadWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedContestId?: string;
  aiSubmissionMode?: {
    imageUrl: string;
    cloudinaryPublicId: string;
    prompt: string;
    generationId: string;
    aiModel?: string;
  };
}

export function UploadWizardModal({ isOpen, onClose, preselectedContestId, aiSubmissionMode }: UploadWizardModalProps) {
  const { data: user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<{url: string, type: string, thumbnailUrl?: string, cloudinaryPublicId?: string} | null>(null);
  const [uploadMode, setUploadMode] = useState<'new' | 'gallery'>('new');
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aiTool, setAiTool] = useState("");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  
  // Submission options
  const [submissionTypes, setSubmissionTypes] = useState<SubmissionType[]>(["general"]);
  const [selectedContest, setSelectedContest] = useState<string>("");
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [sellPrompt, setSellPrompt] = useState(false);
  const [promptPrice, setPromptPrice] = useState("");
  const [promptCurrency, setPromptCurrency] = useState<'GLORY' | 'SOL' | 'USDC'>('GLORY');

  // Wizard
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  
  // Payment state for wallet payments
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'wallet'>('balance');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastDebugLog = useRef<string>(''); // For throttling debug logs
  const appliedAiModeRef = useRef<string | null>(null); // Track applied AI cloudinaryPublicId

  const isVideo = useMemo(
    () => (file ? file.type.startsWith("video/") : false),
    [file]
  );
  const previewURL = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );

  // Fetch active contests
  const { data: contests = [] } = useQuery<any[]>({
    queryKey: ["/api/contests"],
  });

  const activeContests = contests.filter((c: any) => c.status === "active");

  // Fetch platform wallet address from settings
  const { data: platformSettings } = useQuery<{ platformWalletAddress?: string | null }>({
    queryKey: ["/api/settings/platform-wallet"],
  });

  // Fetch user's submissions for gallery
  const { data: allSubmissions = [] } = useQuery<any[]>({
    queryKey: ["/api/submissions"],
    enabled: !!user?.id,
  });

  // Filter to only show current user's approved submissions
  const userSubmissions = allSubmissions.filter((sub: any) => sub.userId === user?.id && sub.status === "approved");

  // Refresh submissions when modal opens to ensure fresh data
  useEffect(() => {
    if (isOpen) {
      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
    }
  }, [isOpen, queryClient]);

  // Pre-select contest if provided and auto-add 'contest' to submissionTypes
  useEffect(() => {
    if (preselectedContestId && activeContests.some((c: any) => c.id === preselectedContestId)) {
      setSelectedContest(preselectedContestId);
      setSubmissionTypes(prev => {
        if (!prev.includes('contest')) {
          return [...prev, 'contest'];
        }
        return prev;
      });
    }
  }, [preselectedContestId, activeContests]);

  // Get optimal payment method based on contest config and user balance
  const getOptimalPaymentMethod = useCallback(() => {
    // Create unique key for this call to avoid spam
    const debugKey = `${selectedContest}-${user?.id}-${user?.solBalance}`;
    const shouldLog = false; // Disabled to reduce console spam
    
    if (shouldLog) {
      console.log('🔍 getOptimalPaymentMethod called with:', { selectedContest, user: !!user });
      lastDebugLog.current = debugKey;
    }
    
    if (!submissionTypes.includes('contest') || !selectedContest || !user) {
      if (shouldLog) console.log('⚠️ Early return: no contest submission type or user');
      return 'balance';
    }

    const contest = activeContests.find((c: any) => c.id === selectedContest);
    if (shouldLog) console.log('📋 Found contest:', contest?.title, contest?.config);
    const contestConfig = contest?.config || {};
    
    if (!contestConfig.entryFee) {
      if (shouldLog) console.log('⚠️ No entry fee configured');
      return 'balance';
    }

    // Smart fallback: if no payment methods configured, determine based on currency
    const isStandardCrypto = contestConfig.entryFeeCurrency && ['SOL', 'USDC'].includes(contestConfig.entryFeeCurrency);
    const defaultMethods = isStandardCrypto ? ['balance', 'wallet'] : ['balance'];
    const paymentMethods = contestConfig.entryFeePaymentMethods || defaultMethods;
    
    if (shouldLog) {
      console.log('🎯 Using payment methods:', { 
        configured: contestConfig.entryFeePaymentMethods, 
        fallback: defaultMethods,
        final: paymentMethods 
      });
    }

    const allowsBalance = paymentMethods.includes('balance');
    const allowsWallet = paymentMethods.includes('wallet');
    const entryFeeAmount = contestConfig.entryFeeAmount || 0;
    const entryFeeCurrency = contestConfig.entryFeeCurrency || 'GLORY';
    
    if (shouldLog) {
      console.log('🎯 Contest payment config:', {
        entryFeePaymentMethods: contestConfig.entryFeePaymentMethods,
        allowsBalance,
        allowsWallet,
        entryFeeAmount,
        entryFeeCurrency
      });
    }
    
    // Get user's balance for the entry fee currency
    const getUserBalance = () => {
      switch (entryFeeCurrency) {
        case 'SOL': return user.solBalance || 0;
        case 'USDC': return user.usdcBalance || 0;
        case 'GLORY':
        default: return user.gloryBalance || 0;
      }
    };
    
    const userBalance = getUserBalance();
    const hasInsufficientBalance = userBalance < entryFeeAmount;
    
    if (shouldLog) {
      console.log('💰 Balance analysis:', {
        entryFeeCurrency,
        entryFeeAmount,
        userBalance,
        hasInsufficientBalance,
        userBalances: { sol: user.solBalance, usdc: user.usdcBalance, glory: user.gloryBalance }
      });
    }
    
    // Smart payment method selection:
    if (allowsWallet && !allowsBalance) {
      if (shouldLog) console.log('🔒 Contest only allows wallet payment');
      return 'wallet';
    } else if (allowsBalance && !allowsWallet) {
      if (shouldLog) console.log('🔒 Contest only allows balance payment');
      return 'balance';
    } else if (allowsBalance && allowsWallet) {
      // Both methods available - choose based on balance
      if (hasInsufficientBalance) {
        if (shouldLog) console.log('💳 Auto-selecting wallet payment due to insufficient balance');
        return 'wallet';
      } else {
        if (shouldLog) console.log('🏦 Using balance payment - sufficient funds available');
        return 'balance';
      }
    }
    
    if (shouldLog) console.log('⚠️ Fallback to balance payment');
    return 'balance';
  }, [submissionTypes, selectedContest, activeContests, user]);

  // Initialize payment method when contest submission is selected
  useEffect(() => {
    if (submissionTypes.includes('contest') && selectedContest) {
      const optimalMethod = getOptimalPaymentMethod();
      setPaymentMethod(optimalMethod);
    }
  }, [submissionTypes, selectedContest, getOptimalPaymentMethod]);

  // Sync AI submission mode when modal opens (only once per unique AI image)
  useEffect(() => {
    if (isOpen && aiSubmissionMode) {
      // Only apply if we haven't already applied this specific AI image
      if (appliedAiModeRef.current !== aiSubmissionMode.cloudinaryPublicId) {
        setSelectedGalleryImage({
          url: aiSubmissionMode.imageUrl,
          type: 'image',
          cloudinaryPublicId: aiSubmissionMode.cloudinaryPublicId
        });
        setUploadMode('gallery');
        setStep(2);
        setTitle(""); // Let user fill in title
        setDescription(""); // Let user fill in description
        setPrompt(aiSubmissionMode.prompt || ""); // Auto-populate prompt from AI generation
        setAiTool(aiSubmissionMode.aiModel || ""); // Auto-populate AI model/tool
        setGenerationId(aiSubmissionMode.generationId); // Store generationId
        setIsAiGenerated(true); // Mark as AI-generated (prompt is read-only)
        appliedAiModeRef.current = aiSubmissionMode.cloudinaryPublicId;
      }
    }
  }, [isOpen, aiSubmissionMode]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setSelectedGalleryImage(null);
      setUploadMode('new');
      setTitle("");
      setDescription("");
      setCategory(CATEGORIES[0]);
      setTags([]);
      setTagInput("");
      setPrompt("");
      setAiTool("");
      setGenerationId(null);
      setIsAiGenerated(false);
      setSubmissionTypes(["general"]);
      setSelectedContest(preselectedContestId || "");
      setAgreedToRules(false);
      setAgreedToTerms(false);
      setStep(1);
      setErrors([]);
      setPaymentMethod('balance');
      setShowPayment(false);
      setPaymentTxHash(null);
      setSellPrompt(false);
      setPromptPrice("");
      setPromptCurrency('GLORY');
      appliedAiModeRef.current = null; // Reset AI mode tracking
    }
  }, [isOpen, preselectedContestId]);

  // Handle browser back button and Escape key
  useEffect(() => {
    if (!isOpen) return;

    const modalId = Date.now();

    // Push unique history state when modal opens
    window.history.pushState({ modal: 'upload', modalId }, '');

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Handle browser back button
    const handlePopState = () => {
      // Only close if the current state matches our modal
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
      if (submissionTypes.length === 0) {
        newErrors.push("Please select at least one submission option.");
      }
      if (submissionTypes.includes("contest")) {
        if (!selectedContest) newErrors.push("Please select a contest.");
        if (!agreedToRules) newErrors.push("You must agree to contest rules.");
      }
      if (submissionTypes.includes("sell")) {
        if (!sellPrompt || !promptPrice) {
          newErrors.push("Please set a price for selling the prompt.");
        }
      }
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

  // Submit submission with optional payment txHash
  const submitSubmission = async (txHash?: string) => {
    setSubmitting(true);
    try {
      if (uploadMode === 'new' && file) {
        const formData = new FormData();
        formData.append("file", file);
        // Add contestId if submitting to contest
        if (submissionTypes.includes('contest') && selectedContest) {
          formData.append("contestId", selectedContest);
        }
        formData.append("title", title);
        formData.append("description", description);
        formData.append("type", file.type.startsWith("video/") ? "video" : "image");
        
        // Add prompt and AI tool if available
        if (prompt) {
          formData.append("prompt", prompt);
        }
        if (aiTool) {
          formData.append("aiTool", aiTool);
        }
        
        if (txHash) {
          formData.append("paymentTxHash", txHash);
        }

        if (submissionTypes.includes('sell') && sellPrompt && promptPrice) {
          formData.append("sellPrompt", "true");
          formData.append("promptPrice", promptPrice);
          formData.append("promptCurrency", promptCurrency);
        }

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
        const submissionData: any = {
          title,
          description,
          type: selectedGalleryImage.type,
          mediaUrl: selectedGalleryImage.url,
          thumbnailUrl: selectedGalleryImage.thumbnailUrl,
          cloudinaryPublicId: selectedGalleryImage.cloudinaryPublicId,
          cloudinaryResourceType: selectedGalleryImage.type === 'video' ? 'video' : 'image',
          status: "pending",
        };
        
        // Add contestId if submitting to contest
        if (submissionTypes.includes('contest') && selectedContest) {
          submissionData.contestId = selectedContest;
        }
        
        // Add prompt, AI tool, and generationId if available
        if (prompt) {
          submissionData.prompt = prompt;
        }
        if (aiTool) {
          submissionData.aiTool = aiTool;
        }
        if (generationId) {
          submissionData.generationId = generationId;
        }
        
        if (txHash) {
          submissionData.paymentTxHash = txHash;
        }

        if (submissionTypes.includes('sell') && sellPrompt && promptPrice) {
          submissionData.sellPrompt = true;
          submissionData.promptPrice = promptPrice;
          submissionData.promptCurrency = promptCurrency;
        }

        const response = await fetch("/api/submissions", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submissionData),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("💥 Submission failed:", error);
          
          // Show user-friendly error message
          toast({
            title: "Submission Failed",
            description: error.error || "Failed to submit. Please try again.",
            variant: "destructive",
          });
          
          throw new Error(error.error || "Failed to submit");
        }
      }

      toast({
        title: "Success!",
        description: "Your submission has been uploaded and is pending approval",
      });

      queryClient.invalidateQueries({ queryKey: ["/api/submissions"] });
      setShowPayment(false);
      onClose();
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

  const handleSubmit = async () => {
    // Disabled debug logging to reduce console spam
    // if (process.env.NODE_ENV === 'development') {
    //   console.log('🚀 handleSubmit called');
    // }
    resetErrors();
    const allGood = validateStep(1) && validateStep(2) && validateStep(3);
    if (!allGood) return;

    if (uploadMode === 'new' && !file) return;
    if (uploadMode === 'gallery' && !selectedGalleryImage) return;

    if (DEBUG_ENABLED) {
      console.log('🔍 Current payment method before check:', paymentMethod);
    }
    
    // Re-check optimal payment method right before submission
    const optimalMethod = getOptimalPaymentMethod();
    if (DEBUG_ENABLED) {
      console.log('💡 Optimal method determined:', optimalMethod);
    }
    
    if (optimalMethod !== paymentMethod) {
      if (DEBUG_ENABLED) {
        console.log('🔄 Last-minute payment method correction:', paymentMethod, '→', optimalMethod);
      }
      setPaymentMethod(optimalMethod);
      
      // If switching to wallet payment, show payment modal and return
      if (optimalMethod === 'wallet') {
        if (DEBUG_ENABLED) {
          console.log('💳 Switching to wallet - showing payment modal');
        }
        setShowPayment(true);
        return;
      }
    } else {
      if (DEBUG_ENABLED) {
        console.log('✅ Payment method already optimal:', paymentMethod);
      }
    }

    // Check if wallet payment is required for contest submission
    if (submissionTypes.includes('contest') && selectedContest) {
      const contest = activeContests.find((c: any) => c.id === selectedContest);
      const contestConfig = contest?.config || {};
      
      if (contestConfig.entryFee && contestConfig.entryFeeAmount && paymentMethod === 'wallet') {
        // If payment not completed yet, show payment dialog
        if (!paymentTxHash) {
          if (DEBUG_ENABLED) {
            console.log('💳 Showing payment modal for wallet payment');
          }
          setShowPayment(true);
          return;
        }
        if (DEBUG_ENABLED) {
          console.log('✅ Payment completed, proceeding with txHash:', paymentTxHash);
        }
      }
    }

    // Submit with optional txHash from wallet payment
    await submitSubmission(paymentTxHash || undefined);
  };

  // Handle successful payment
  const handlePaymentSuccess = async (txHash: string) => {
    setPaymentTxHash(txHash);
    await submitSubmission(txHash);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full mx-auto max-w-5xl max-h-[90vh] overflow-y-auto pb-24 md:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
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
                  Upload your creative work and compete for rewards
                </p>
              </div>
              <div className="flex items-center gap-3">
                <WizardSteps step={step} />
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  data-testid="button-close-wizard"
                >
                  <X className="h-6 w-6 text-slate-400" />
                </button>
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
                prompt={prompt}
                setPrompt={setPrompt}
                aiTool={aiTool}
                setAiTool={setAiTool}
                isAiGenerated={isAiGenerated}
              />
            )}

            {step === 3 && (
              <StepMonetizeContest
                submissionTypes={submissionTypes}
                setSubmissionTypes={setSubmissionTypes}
                contests={activeContests}
                selectedContest={selectedContest}
                setSelectedContest={setSelectedContest}
                agreedToRules={agreedToRules}
                setAgreedToRules={setAgreedToRules}
                agreedToTerms={agreedToTerms}
                setAgreedToTerms={setAgreedToTerms}
                user={user}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
                sellPrompt={sellPrompt}
                setSellPrompt={setSellPrompt}
                promptPrice={promptPrice}
                setPromptPrice={setPromptPrice}
                promptCurrency={promptCurrency}
                setPromptCurrency={setPromptCurrency}
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
      
      {/* Payment Overlay */}
      {showPayment && selectedContest && selectedContest !== "my-gallery" && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-10">
          <div className="w-full max-w-md">
            <SolanaPayment
              amount={(activeContests.find((c: any) => c.id === selectedContest)?.config as any)?.entryFeeAmount || 0}
              currency={(activeContests.find((c: any) => c.id === selectedContest)?.config as any)?.entryFeeCurrency || 'SOL'}
              recipient={platformSettings?.platformWalletAddress || ''}
              label={activeContests.find((c: any) => c.id === selectedContest)?.title || 'Contest Entry'}
              message={`Entry fee for ${activeContests.find((c: any) => c.id === selectedContest)?.title}`}
              customTokenMint={(activeContests.find((c: any) => c.id === selectedContest)?.config as any)?.customTokenMint}
              customTokenDecimals={(activeContests.find((c: any) => c.id === selectedContest)?.config as any)?.customTokenDecimals}
              userId={user?.id || ''}
              contestId={selectedContest}
              onSuccess={handlePaymentSuccess}
              onCancel={() => setShowPayment(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponents

function WizardSteps({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { id: 1, label: "Upload" },
    { id: 2, label: "Details" },
    { id: 3, label: "Monetize/Contest" },
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
  prompt,
  setPrompt,
  aiTool,
  setAiTool,
  isAiGenerated,
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
  prompt: string;
  setPrompt: (v: string) => void;
  aiTool: string;
  setAiTool: (v: string) => void;
  isAiGenerated: boolean;
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
        
        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mt-4 mb-1">
          Prompt {aiTool && "(Auto-populated from AI generation - Read only)"}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder="Enter the AI prompt or describe the image concept..."
          disabled={isAiGenerated}
          className={`w-full rounded-xl border px-3 py-2 outline-none ${
            isAiGenerated 
              ? 'border-slate-300/40 dark:border-slate-700/40 bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 cursor-not-allowed' 
              : 'border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 focus:ring-2 focus:ring-violet-500'
          }`}
          data-testid="input-prompt"
        />
        
        {aiTool && (
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">AI Tool:</span> {aiTool}
          </div>
        )}
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

function StepMonetizeContest({
  submissionTypes,
  setSubmissionTypes,
  contests,
  selectedContest,
  setSelectedContest,
  agreedToRules,
  setAgreedToRules,
  agreedToTerms,
  setAgreedToTerms,
  user,
  paymentMethod,
  setPaymentMethod,
  sellPrompt,
  setSellPrompt,
  promptPrice,
  setPromptPrice,
  promptCurrency,
  setPromptCurrency,
}: {
  submissionTypes: SubmissionType[];
  setSubmissionTypes: (types: SubmissionType[]) => void;
  contests: any[];
  selectedContest: string;
  setSelectedContest: (v: string) => void;
  agreedToRules: boolean;
  setAgreedToRules: (b: boolean) => void;
  agreedToTerms: boolean;
  setAgreedToTerms: (b: boolean) => void;
  user: any;
  paymentMethod: 'balance' | 'wallet';
  setPaymentMethod: (method: 'balance' | 'wallet') => void;
  sellPrompt: boolean;
  setSellPrompt: (b: boolean) => void;
  promptPrice: string;
  setPromptPrice: (v: string) => void;
  promptCurrency: 'GLORY' | 'SOL' | 'USDC';
  setPromptCurrency: (c: 'GLORY' | 'SOL' | 'USDC') => void;
}) {
  const selectedContestData = contests.find((c) => c.id === selectedContest);
  const contestConfig = selectedContestData?.config || {};
  const hasEntryFee = contestConfig.entryFee === true && contestConfig.entryFeeAmount > 0;
  const entryFeeCurrency = contestConfig.entryFeeCurrency || 'GLORY';
  const entryFeeAmount = contestConfig.entryFeeAmount || 0;
  
  // Get user's balance for the entry fee currency
  const getUserBalance = () => {
    if (!user) return 0;
    switch (entryFeeCurrency) {
      case 'SOL':
        return user.solBalance || 0;
      case 'USDC':
        return user.usdcBalance || 0;
      case 'GLORY':
      default:
        return user.gloryBalance || 0;
    }
  };
  
  const userBalance = getUserBalance();
  const hasInsufficientBalance = hasEntryFee && userBalance < entryFeeAmount;
  
  const toggleSubmissionType = (type: SubmissionType) => {
    if (submissionTypes.includes(type)) {
      // Remove type, but keep at least one
      const newTypes = submissionTypes.filter(t => t !== type);
      if (newTypes.length > 0) {
        setSubmissionTypes(newTypes);
        // If removing 'sell', also uncheck sellPrompt
        if (type === 'sell') {
          setSellPrompt(false);
        }
      }
    } else {
      // Add type
      setSubmissionTypes([...submissionTypes, type]);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Submission Options */}
      <div>
        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-3">
          Submission Options (select one or more) *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => toggleSubmissionType('general')}
            className={`p-4 rounded-xl border-2 transition-all ${
              submissionTypes.includes('general')
                ? 'border-violet-600 bg-violet-50/70 dark:bg-violet-950/20'
                : 'border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 hover:border-violet-400'
            }`}
            data-testid="button-option-general"
            type="button"
          >
            <div className="text-center">
              <ImageIcon className={`h-6 w-6 mx-auto mb-2 ${
                submissionTypes.includes('general') ? 'text-violet-600' : 'text-slate-600 dark:text-slate-400'
              }`} />
              <div className={`font-medium text-sm ${
                submissionTypes.includes('general') ? 'text-violet-900 dark:text-violet-100' : 'text-slate-800 dark:text-slate-200'
              }`}>
                Gallery Only
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Just save to gallery
              </div>
            </div>
          </button>
          
          <button
            onClick={() => toggleSubmissionType('sell')}
            className={`p-4 rounded-xl border-2 transition-all ${
              submissionTypes.includes('sell')
                ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/20'
                : 'border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 hover:border-blue-400'
            }`}
            data-testid="button-option-sell"
            type="button"
          >
            <div className="text-center">
              <Trophy className={`h-6 w-6 mx-auto mb-2 ${
                submissionTypes.includes('sell') ? 'text-blue-600' : 'text-slate-600 dark:text-slate-400'
              }`} />
              <div className={`font-medium text-sm ${
                submissionTypes.includes('sell') ? 'text-blue-900 dark:text-blue-100' : 'text-slate-800 dark:text-slate-200'
              }`}>
                Sell Prompt
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Monetize your prompt
              </div>
            </div>
          </button>
          
          <button
            onClick={() => toggleSubmissionType('contest')}
            className={`p-4 rounded-xl border-2 transition-all ${
              submissionTypes.includes('contest')
                ? 'border-violet-600 bg-violet-50/70 dark:bg-violet-950/20'
                : 'border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 hover:border-violet-400'
            }`}
            data-testid="button-option-contest"
            type="button"
          >
            <div className="text-center">
              <Trophy className={`h-6 w-6 mx-auto mb-2 ${
                submissionTypes.includes('contest') ? 'text-violet-600' : 'text-slate-600 dark:text-slate-400'
              }`} />
              <div className={`font-medium text-sm ${
                submissionTypes.includes('contest') ? 'text-violet-900 dark:text-violet-100' : 'text-slate-800 dark:text-slate-200'
              }`}>
                Contest
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Compete for rewards
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Contest Selection - Only if 'contest' is selected */}
      {submissionTypes.includes('contest') && (
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
                {c.title} - {formatPrizeAmount(c.prizeGlory)} {c.config?.currency || 'GLORY'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Prompt Selling Section - Only if 'sell' is selected */}
      {submissionTypes.includes('sell') && (
        <div className="space-y-3 p-4 rounded-xl border border-blue-300/60 dark:border-blue-700/60 bg-blue-50/50 dark:bg-blue-950/20">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={sellPrompt}
              onChange={(e) => setSellPrompt(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-0.5"
              data-testid="checkbox-sell-prompt"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Sell Prompt
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Allow others to purchase the AI prompt for this image
              </div>
            </div>
          </label>

          {sellPrompt && (
            <div className="pl-7 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                  Price *
                </label>
                <input
                  type="number"
                  value={promptPrice}
                  onChange={(e) => setPromptPrice(e.target.value)}
                  step="0.000000001"
                  min="0"
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="input-prompt-price"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                  Currency *
                </label>
                <select
                  value={promptCurrency}
                  onChange={(e) => setPromptCurrency(e.target.value as 'GLORY' | 'SOL' | 'USDC')}
                  className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="select-prompt-currency"
                >
                  <option value="GLORY">GLORY</option>
                  <option value="SOL">SOL</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Entry Fee Display - Only if contest is selected */}
      {submissionTypes.includes('contest') && hasEntryFee && selectedContest && (
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
              Entry Fee
            </div>
            <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">
              {formatPrizeAmount(entryFeeAmount)} {entryFeeCurrency}
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Selection - Only if contest is selected */}
      {submissionTypes.includes('contest') && hasEntryFee && selectedContest && (
        contestConfig.entryFeePaymentMethods?.includes('wallet') ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
              Payment Method *
            </label>
            <div className="space-y-2">
              {contestConfig.entryFeePaymentMethods.includes('balance') && !hasInsufficientBalance && (
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="balance"
                    checked={paymentMethod === 'balance'}
                    onChange={() => setPaymentMethod('balance')}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                    data-testid="radio-payment-balance"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Pay from Balance
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Your {entryFeeCurrency} balance: {formatPrizeAmount(userBalance)}
                    </div>
                  </div>
                </label>
              )}
              
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="wallet"
                  checked={paymentMethod === 'wallet'}
                  onChange={() => setPaymentMethod('wallet')}
                  className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                  data-testid="radio-payment-wallet"
                />
                <div className="flex-1 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Pay with Solana Wallet
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Pay directly with SOL/USDC/tokens
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </div>
        ) : null
      )}

      <div className="space-y-4 pt-4 border-t border-slate-300/60 dark:border-slate-700/60">
        <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200">
          Agreements
        </h3>

        {submissionTypes.includes('contest') && (
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
                Top submissions receive rewards based on contest prize distribution
              </p>
            </div>
          </label>
        )}

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
          </div>
        </label>
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
  selectedImage: {url: string, type: string, thumbnailUrl?: string} | null;
  onSelectImage: (img: {url: string, type: string, thumbnailUrl?: string} | null) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  if (userSubmissions.length === 0) {
    return (
      <div className="text-center py-12 bg-white/60 dark:bg-slate-900/60 rounded-xl border border-slate-300/60 dark:border-slate-700/60">
        <ImageIcon className="h-12 w-12 mx-auto text-slate-400 mb-3" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          No approved submissions in your gallery yet.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Upload new artwork to build your gallery.
        </p>
      </div>
    );
  }

  // Filter submissions by search term (title and tags)
  const filteredSubmissions = userSubmissions.filter((sub: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const matchesTitle = sub.title?.toLowerCase().includes(searchLower);
    const matchesTags = sub.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower));
    return matchesTitle || matchesTags;
  });

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by title or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors"
          data-testid="input-gallery-search"
        />
      </div>

      {/* Gallery Grid */}
      {filteredSubmissions.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          No submissions match your search.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filteredSubmissions.map((sub: any) => (
            <div
              key={sub.id}
              onClick={() => onSelectImage({
                url: sub.mediaUrl,
                type: sub.type,
                thumbnailUrl: sub.thumbnailUrl
              })}
              className={[
                "relative aspect-square rounded-xl overflow-hidden cursor-pointer transition-all",
                selectedImage?.url === sub.mediaUrl
                  ? "ring-4 ring-violet-500 scale-105"
                  : "hover:scale-105 border-2 border-slate-300/60 dark:border-slate-700/60"
              ].join(" ")}
              data-testid={`gallery-image-${sub.id}`}
            >
              <img
                src={sub.thumbnailUrl || sub.mediaUrl}
                alt={sub.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {selectedImage?.url === sub.mediaUrl && (
                <div className="absolute inset-0 bg-violet-600/20 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
