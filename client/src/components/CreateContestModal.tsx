import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Upload, Plus, Minus, Calendar, Trophy, Users, Settings, Eye, FileText, Image as ImageIcon } from 'lucide-react';

interface CreateContestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (contestData: any) => void;
}

export function CreateContestModal({ isOpen, onClose, onSubmit }: CreateContestModalProps) {
  const [formData, setFormData] = useState({
    // Basic fields
    title: '',
    description: '',
    contestType: 'Image',
    category: '',
    coverImage: null as File | null,
    entryFee: false,
    entryFeeAmount: undefined as number | undefined,

    // Time settings
    startDateOption: 'later' as 'now' | 'later',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    
    // NEW: Submission deadline (optional)
    submissionDeadline: '',
    submissionDeadlineTime: '',
    enableSubmissionDeadline: false,
    
    votingStartOption: 'later' as 'now' | 'later',
    votingStartDate: '',
    votingEndDate: '',
    votingEndTime: '',

    // Prizes
    prizePool: '',
    currency: 'GLORY',
    prizeDistribution: [
      { place: 1, value: 0 },
      { place: 2, value: 0 },
      { place: 3, value: 0 }
    ],
    additionalRewards: [],

    // Participation rules
    eligibility: 'all_users',
    maxSubmissions: 3,
    allowedMediaTypes: ['Images'],
    fileSizeLimit: 50,
    nsfwAllowed: false,
    agreeToRules: true,

    // Voting
    votingMethods: ['public'],
    juryMembers: [] as string[],

    // Voting frequency
    votesPerUserPerPeriod: 1,
    periodDurationHours: 24,
    totalVotesPerUser: 0,

    // Admin settings
    status: 'draft',
    featured: false
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');
  const [showImageSelector, setShowImageSelector] = useState(false);

  const { data: submissions = [] } = useQuery({
    queryKey: ['/api/submissions', { forGallery: true }],
    queryFn: async () => {
      const response = await fetch('/api/submissions', { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: showImageSelector
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        contestType: 'Image',
        category: '',
        coverImage: null,
        entryFee: false,
        entryFeeAmount: undefined,
        startDateOption: 'later',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        submissionDeadline: '',
        submissionDeadlineTime: '',
        enableSubmissionDeadline: false,
        votingStartOption: 'later',
        votingStartDate: '',
        votingEndDate: '',
        votingEndTime: '',
        prizePool: '',
        currency: 'GLORY',
        prizeDistribution: [
          { place: 1, value: 0 },
          { place: 2, value: 0 },
          { place: 3, value: 0 }
        ],
        additionalRewards: [],
        eligibility: 'all_users',
        maxSubmissions: 3,
        allowedMediaTypes: ['Images'],
        fileSizeLimit: 50,
        nsfwAllowed: false,
        agreeToRules: true,
        votingMethods: ['public'],
        juryMembers: [] as string[],
        votesPerUserPerPeriod: 1,
        periodDurationHours: 24,
        totalVotesPerUser: 0,
        status: 'draft',
        featured: false
      });
      setCoverImagePreview('');
      setErrors([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleInputChange('coverImage', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleArrayToggle = (field: 'allowedMediaTypes' | 'votingMethods', value: string) => {
    setFormData(prev => {
      const currentValue = prev[field];
      return {
        ...prev,
        [field]: currentValue.includes(value)
          ? currentValue.filter(item => item !== value)
          : [...currentValue, value]
      };
    });
  };

  const addPrizePlace = () => {
    setFormData(prev => {
      const currentDistribution = prev.prizeDistribution || [];
      return {
        ...prev,
        prizeDistribution: [
          ...currentDistribution,
          { place: currentDistribution.length + 1, value: 0 }
        ]
      };
    });
  };

  const removePrizePlace = (index: number) => {
    const currentDistribution = formData.prizeDistribution || [];
    if (currentDistribution.length > 1) {
      setFormData(prev => ({
        ...prev,
        prizeDistribution: (prev.prizeDistribution || []).filter((_, i) => i !== index)
      }));
    }
  };

  const updatePrizeValue = (index: number, value: number) => {
    setFormData(prev => ({
      ...prev,
      prizeDistribution: (prev.prizeDistribution || []).map((prize, i) =>
        i === index ? { ...prize, value } : prize
      )
    }));
  };

  // Unified validation function for all form fields
  const validateFormData = (dataToValidate: typeof formData): string[] => {
    const validationErrors: string[] = [];
    
    // Validate basic fields
    if (!dataToValidate.title.trim()) {
      validationErrors.push('Contest title is required');
    }
    if (!dataToValidate.description.trim()) {
      validationErrors.push('Description is required');
    }
    
    // Validate start date (if not "now")
    if (dataToValidate.startDateOption !== 'now' && !dataToValidate.startDate) {
      validationErrors.push('Start date is required');
    }
    
    // Validate end date (always required)
    if (!dataToValidate.votingEndDate) {
      validationErrors.push('Contest end date is required');
    }
    
    // Validate submission deadline (only if enabled)
    if (dataToValidate.enableSubmissionDeadline && !dataToValidate.submissionDeadline) {
      validationErrors.push('Submission deadline is required when enabled');
    }
    
    // Validate voting start date (if not "now")
    if (dataToValidate.votingStartOption !== 'now' && !dataToValidate.votingStartDate) {
      validationErrors.push('Voting start date is required');
    }
    
    // Chronological validation - only if all required dates are present
    if (validationErrors.length === 0) {
      // Build date objects for comparison
      const startAt = dataToValidate.startDateOption === 'now' 
        ? new Date() 
        : new Date(`${dataToValidate.startDate}T${dataToValidate.startTime || '00:00'}`);
      
      const votingEndAt = new Date(
        `${dataToValidate.votingEndDate}T${dataToValidate.votingEndTime || '23:59'}`
      );
      
      const votingStartAt = dataToValidate.votingStartOption === 'now'
        ? new Date()
        : new Date(`${dataToValidate.votingStartDate}T00:00`);
      
      // Check: Contest start must be before voting end
      if (startAt >= votingEndAt) {
        validationErrors.push('Contest start time must be before voting end time');
      }
      
      // Check: Voting start must be after or equal to contest start
      if (votingStartAt < startAt) {
        validationErrors.push('Voting cannot start before the contest starts');
      }
      
      // Check: Voting start must be before voting end
      if (votingStartAt >= votingEndAt) {
        validationErrors.push('Voting start time must be before voting end time');
      }
      
      // Check submission deadline if enabled
      if (dataToValidate.enableSubmissionDeadline && dataToValidate.submissionDeadline) {
        const submissionEndAt = new Date(
          `${dataToValidate.submissionDeadline}T${dataToValidate.submissionDeadlineTime || '23:59'}`
        );
        
        // Submission deadline must be after contest start
        if (submissionEndAt <= startAt) {
          validationErrors.push('Submission deadline must be after contest start time');
        }
        
        // Submission deadline must be before or equal to voting end
        if (submissionEndAt > votingEndAt) {
          validationErrors.push('Submission deadline cannot be after voting end time');
        }
      }
    }
    
    return validationErrors;
  };

  const handleSubmitWithData = async (dataToSubmit: typeof formData) => {
    
    // Generate unique slug from title
    const baseSlug = dataToSubmit.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const timestamp = Date.now().toString(36);
    const slug = `${baseSlug}-${timestamp}`;
    
    // Calculate total prize from distribution (with safety check)
    const totalPrize = (dataToSubmit.prizeDistribution || []).reduce((sum, prize) => sum + prize.value, 0);
    
    // Set contest start time
    let startAt: string;
    if (dataToSubmit.startDateOption === 'now') {
      startAt = new Date().toISOString();
    } else {
      startAt = new Date(
        `${dataToSubmit.startDate}T${dataToSubmit.startTime || '00:00'}`
      ).toISOString();
    }
    
    // Set contest end time (this is also voting end time)
    const endAt = new Date(
      `${dataToSubmit.votingEndDate}T${dataToSubmit.votingEndTime || '23:59'}`
    ).toISOString();
    
    // Process submission deadline logic
    let submissionEndAt: string;
    if (dataToSubmit.enableSubmissionDeadline && dataToSubmit.submissionDeadline) {
      // Use custom submission deadline
      submissionEndAt = new Date(
        `${dataToSubmit.submissionDeadline}T${dataToSubmit.submissionDeadlineTime || '23:59'}`
      ).toISOString();
    } else {
      // Use contest end date as submission deadline
      submissionEndAt = endAt;
    }
    
    // Set voting start time
    let votingStartAt: string;
    if (dataToSubmit.votingStartOption === 'now') {
      votingStartAt = new Date().toISOString();
    } else {
      votingStartAt = new Date(
        `${dataToSubmit.votingStartDate}T00:00`
      ).toISOString();
    }
    
    // Create comprehensive contest config object with ALL settings
    const contestConfig: any = {
      // Voting rules
      votesPerUserPerPeriod: dataToSubmit.votesPerUserPerPeriod,
      periodDurationHours: dataToSubmit.periodDurationHours,
      totalVotesPerUser: dataToSubmit.totalVotesPerUser,
      votingMethods: dataToSubmit.votingMethods,
      juryMembers: dataToSubmit.juryMembers || [],
      
      // Time settings
      submissionEndAt,
      votingStartAt,
      votingEndAt: endAt,
      
      // Prize distribution (with safety checks)
      prizeDistribution: dataToSubmit.prizeDistribution || [],
      additionalRewards: dataToSubmit.additionalRewards || [],
      currency: dataToSubmit.currency,
      
      // Participation rules
      eligibility: dataToSubmit.eligibility,
      maxSubmissions: dataToSubmit.maxSubmissions,
      allowedMediaTypes: dataToSubmit.allowedMediaTypes,
      fileSizeLimit: dataToSubmit.fileSizeLimit,
      nsfwAllowed: dataToSubmit.nsfwAllowed,
      
      // Entry fee
      entryFee: dataToSubmit.entryFee,
      entryFeeAmount: dataToSubmit.entryFeeAmount,
      
      // Contest metadata
      contestType: dataToSubmit.contestType,
      category: dataToSubmit.category,
      featured: dataToSubmit.featured
    };
    
    // Create clean form data object for submission
    const finalFormData = {
      title: dataToSubmit.title,
      slug,
      description: dataToSubmit.description,
      rules: dataToSubmit.description || 'Standard contest rules apply.',
      status: dataToSubmit.status,
      prizeGlory: totalPrize,
      startAt,
      endAt,
      config: contestConfig,
      coverImageUrl: '' // Will be set after image upload if needed
    };
    
    // If coverImage is a File, upload it first
    if (dataToSubmit.coverImage && dataToSubmit.coverImage instanceof File) {
      const uploadFormData = new FormData();
      uploadFormData.append('file', dataToSubmit.coverImage);
      
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          credentials: 'include',
          body: uploadFormData
        });
        
        if (!response.ok) {
          setErrors(['Failed to upload cover image. Please try again.']);
          return;
        }
        
        const result = await response.json();
        finalFormData.coverImageUrl = result.url;
      } catch (error) {
        console.error('Failed to upload cover image:', error);
        setErrors(['Failed to upload cover image. Please check your connection and try again.']);
        return;
      }
    }
    
    
    onSubmit(finalFormData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[95vh] my-4 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-600/10 text-violet-700 dark:text-violet-300 border border-violet-300/40 dark:border-violet-700/40">
              <Trophy className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create New Contest</h1>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-6 rounded-xl border border-red-300/50 dark:border-red-600/50 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-200">
              <ul className="list-disc ps-5 space-y-1">
                {errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-8">
            {/* Basic Information */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5 text-violet-600" />
                Basic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Contest Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="e.g. Weekly Cyberpunk Challenge"
                    className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={4}
                    placeholder="Contest rules, requirements, theme details..."
                    className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Contest Type
                  </label>
                  <select
                    value={formData.contestType}
                    onChange={(e) => handleInputChange('contestType', e.target.value)}
                    className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="Image">Image Contest</option>
                    <option value="Video">Video Contest</option>
                    <option value="GIF">GIF Contest</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Category / Theme
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    placeholder="e.g. Most Beautiful, Cyberpunk City"
                    className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Cover Image
                  </label>
                  
                  {coverImagePreview ? (
                    <div className="relative group">
                      <img 
                        src={coverImagePreview} 
                        alt="Cover preview" 
                        className="w-full h-48 object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCoverImagePreview('');
                          handleInputChange('coverImage', null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid="button-remove-cover-image"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverImageUpload}
                          className="hidden"
                          id="cover-image-upload"
                          data-testid="input-cover-image-upload"
                        />
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:border-violet-500 transition-colors cursor-pointer">
                          <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm text-slate-600 dark:text-slate-400">Click to upload cover image</p>
                          <p className="text-xs text-slate-500 mt-1">Or choose from options below</p>
                        </div>
                      </label>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setShowImageSelector(true)}
                          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          data-testid="button-choose-from-gallery"
                        >
                          Choose from Gallery
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const response = await fetch('/api/submissions', { credentials: 'include' });
                            if (response.ok) {
                              const allSubmissions = await response.json();
                              const topVoted = allSubmissions
                                .filter((sub: any) => sub.status === 'approved' && sub.type === 'image')
                                .sort((a: any, b: any) => b.votesCount - a.votesCount)[0];
                              
                              if (topVoted) {
                                setCoverImagePreview(topVoted.mediaUrl);
                                handleInputChange('coverImage', topVoted.mediaUrl);
                              }
                            }
                          }}
                          className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          data-testid="button-use-top-voted-image"
                        >
                          Use Top Voted Image
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.entryFee}
                      onChange={(e) => handleInputChange('entryFee', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-slate-800 dark:text-slate-200">Entry Fee Required</span>
                  </label>
                </div>

                {formData.entryFee && (
                  <div>
                    <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                      Entry Fee Amount *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.entryFeeAmount ?? ""}
                      onChange={(e) => handleInputChange('entryFeeAmount', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="e.g. 5.00"
                      className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Time Settings */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-violet-600" />
                Time Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Contest Start Date *
                  </label>
                  <div className="mb-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="startDateOption"
                        value="now"
                        checked={formData.startDateOption === 'now'}
                        onChange={(e) => handleInputChange('startDateOption', e.target.value)}
                        className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-slate-800 dark:text-slate-200">Start Now</span>
                    </label>
                  </div>
                  <div className="mb-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="startDateOption"
                        value="later"
                        checked={formData.startDateOption === 'later'}
                        onChange={(e) => handleInputChange('startDateOption', e.target.value)}
                        className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-slate-800 dark:text-slate-200">Start Later</span>
                    </label>
                  </div>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    disabled={formData.startDateOption === 'now'}
                    className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Contest Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    disabled={formData.startDateOption === 'now'}
                    className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Contest End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.votingEndDate}
                    onChange={(e) => handleInputChange('votingEndDate', e.target.value)}
                    className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">This is when both submissions and voting end</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Contest End Time
                  </label>
                  <input
                    type="time"
                    value={formData.votingEndTime}
                    onChange={(e) => handleInputChange('votingEndTime', e.target.value)}
                    className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* NEW: Submission Deadline Section */}
                <div className="md:col-span-2 border-t border-slate-200 dark:border-slate-800 pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.enableSubmissionDeadline}
                        onChange={(e) => handleInputChange('enableSubmissionDeadline', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        Set Custom Submission Deadline
                      </span>
                    </label>
                  </div>
                  
                  <p className="text-xs text-slate-500 mb-3">
                    {formData.enableSubmissionDeadline 
                      ? "Submissions will close at the custom deadline below" 
                      : "Submissions will be accepted until the contest ends"
                    }
                  </p>

                  {formData.enableSubmissionDeadline && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                          Submission Deadline Date *
                        </label>
                        <input
                          type="date"
                          value={formData.submissionDeadline}
                          onChange={(e) => handleInputChange('submissionDeadline', e.target.value)}
                          className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                          Submission Deadline Time
                        </label>
                        <input
                          type="time"
                          value={formData.submissionDeadlineTime}
                          onChange={(e) => handleInputChange('submissionDeadlineTime', e.target.value)}
                          className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Voting Start Date *
                  </label>
                  <div className="mb-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="votingStartOption"
                        value="now"
                        checked={formData.votingStartOption === 'now'}
                        onChange={(e) => handleInputChange('votingStartOption', e.target.value)}
                        className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-slate-800 dark:text-slate-200">Start Voting Now</span>
                    </label>
                  </div>
                  <div className="mb-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="votingStartOption"
                        value="later"
                        checked={formData.votingStartOption === 'later'}
                        onChange={(e) => handleInputChange('votingStartOption', e.target.value)}
                        className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-slate-800 dark:text-slate-200">Start Voting Later</span>
                    </label>
                  </div>
                  <input
                    type="date"
                    value={formData.votingStartDate}
                    onChange={(e) => handleInputChange('votingStartDate', e.target.value)}
                    disabled={formData.votingStartOption === 'now'}
                    className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Voting ends when the contest ends</p>
                </div>
              </div>
            </section>

            {/* Prizes */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-violet-600" />
                Prizes
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                      Prize Pool *
                    </label>
                    <input
                      type="number"
                      value={formData.prizePool}
                      onChange={(e) => handleInputChange('prizePool', e.target.value)}
                      placeholder="10000"
                      className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="GLORY">$GLORY</option>
                      <option value="USD">USD</option>
                      <option value="ETH">ETH</option>
                    </select>
                  </div>
                </div>


                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Prize Distribution
                    </label>
                    <button
                      type="button"
                      onClick={addPrizePlace}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-violet-600/10 text-violet-700 hover:bg-violet-600/20"
                    >
                      <Plus className="h-3 w-3" />
                      Add Place
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(formData.prizeDistribution || []).map((prize, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200 w-16">
                          {prize.place}. place
                        </span>
                        <input
                          type="number"
                          value={prize.value}
                          onChange={(e) => updatePrizeValue(index, parseInt(e.target.value) || 0)}
                          className="flex-1 rounded-lg border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-violet-500"
                          min="0"
                        />
                        <span className="text-sm text-slate-500">
                          {formData.currency}
                        </span>
                        {(formData.prizeDistribution || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePrizePlace(index)}
                            className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    Total: {(formData.prizeDistribution || []).reduce((sum, prize) => sum + prize.value, 0)}
                    {` ${formData.currency}`}
                  </div>
                </div>
              </div>
            </section>

            {/* Participation Rules */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-600" />
                Participation Rules
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Eligibility
                  </label>
                  <select
                    value={formData.eligibility}
                    onChange={(e) => handleInputChange('eligibility', e.target.value)}
                    className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="all_users">All Users</option>
                    <option value="token_holders">Token Holders Only</option>
                    <option value="verified_users">Verified Users Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Max Submissions per User
                  </label>
                  <input
                    type="number"
                    value={formData.maxSubmissions}
                    onChange={(e) => handleInputChange('maxSubmissions', parseInt(e.target.value) || 1)}
                    min="1"
                    className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    File Size Limit (MB)
                  </label>
                  <input
                    type="number"
                    value={formData.fileSizeLimit}
                    onChange={(e) => handleInputChange('fileSizeLimit', parseInt(e.target.value) || 50)}
                    min="1"
                    className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                    Allowed Media Types
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Images', 'Videos', 'GIFs'].map((type) => (
                      <label key={type} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.allowedMediaTypes.includes(type)}
                          onChange={() => handleArrayToggle('allowedMediaTypes', type)}
                          className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm text-slate-800 dark:text-slate-200">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.nsfwAllowed}
                      onChange={(e) => handleInputChange('nsfwAllowed', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-slate-800 dark:text-slate-200">NSFW Content Allowed</span>
                  </label>
                </div>
              </div>
            </section>

            {/* Voting */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Eye className="h-5 w-5 text-violet-600" />
                Voting Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Voting Methods
                  </label>
                  <div className="space-y-2">
                    {[
                      { value: 'public', label: 'Public Voting' },
                      { value: 'logged_users', label: 'Logged Users Only' },
                      { value: 'jury', label: 'Jury Voting' }
                    ].map((method) => (
                      <label key={method.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.votingMethods.includes(method.value)}
                          onChange={() => handleArrayToggle('votingMethods', method.value)}
                          className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm text-slate-800 dark:text-slate-200">{method.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Select one or more voting methods. Multiple methods can run simultaneously.
                  </p>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                  <h4 className="text-md font-medium text-slate-800 dark:text-slate-200 mb-3">Voting Frequency</h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                        Votes per user per period
                      </label>
                      <input
                        type="number"
                        value={formData.votesPerUserPerPeriod}
                        onChange={(e) => handleInputChange('votesPerUserPerPeriod', parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">How many votes per time period</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                        Period duration (hours)
                      </label>
                      <input
                        type="number"
                        value={formData.periodDurationHours}
                        onChange={(e) => handleInputChange('periodDurationHours', parseInt(e.target.value) || 24)}
                        min="1"
                        max="168"
                        className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">Time period in hours (max 168)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                        Total votes per user
                      </label>
                      <input
                        type="number"
                        value={formData.totalVotesPerUser}
                        onChange={(e) => handleInputChange('totalVotesPerUser', parseInt(e.target.value) || 0)}
                        min="0"
                        className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        {formData.totalVotesPerUser === 0 ? 'Unlimited votes during contest' : `Max ${formData.totalVotesPerUser} votes total`}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Example:</strong> With current settings, each user can vote{' '}
                      <span className="font-semibold">{formData.votesPerUserPerPeriod} time(s)</span> every{' '}
                      <span className="font-semibold">{formData.periodDurationHours} hour(s)</span>
                      {formData.totalVotesPerUser > 0 && (
                        <>, with a maximum of <span className="font-semibold">{formData.totalVotesPerUser} total votes</span> during the entire contest</>
                      )}
                      {formData.totalVotesPerUser === 0 && (
                        <>, with <span className="font-semibold">unlimited total votes</span> during the contest</>
                      )}
                      .
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Admin Settings */}
            <section>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Settings className="h-5 w-5 text-violet-600" />
                Admin Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                    Contest Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full rounded-xl border border-slate-300/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500"
                    data-testid="select-contest-status"
                  >
                    <option value="draft">Draft - Awaiting Activation</option>
                    <option value="active">Publish - Active Immediately</option>
                    <option value="archived">Archive - Hide Contest</option>
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.status === 'draft' && 'Contest will be saved as draft and require admin approval'}
                    {formData.status === 'active' && 'Contest will be published and active immediately'}
                    {formData.status === 'archived' && 'Contest will be archived and hidden from users'}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => handleInputChange('featured', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm text-slate-800 dark:text-slate-200">Featured Contest</span>
                  </label>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl border border-slate-300/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={async () => {
              const draftData = { ...formData, status: 'draft' };
              
              // Use unified validation function
              const validationErrors = validateFormData(draftData);
              
              setErrors(validationErrors);
              
              if (validationErrors.length === 0) {
                await handleSubmitWithData(draftData);
              }
            }}
            className="px-6 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors font-semibold"
            data-testid="button-create-contest"
          >
            Create Contest
          </button>
        </div>
      </div>

      {/* Image Gallery Selector Modal */}
      {showImageSelector && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-6xl w-full max-h-[80vh] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <ImageIcon className="h-6 w-6 text-violet-600" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Select Cover Image</h2>
              </div>
              <button
                onClick={() => setShowImageSelector(false)}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                data-testid="button-close-gallery-modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {submissions
                  .filter((sub: any) => sub.status === 'approved' && sub.type === 'image')
                  .map((submission: any) => (
                    <button
                      key={submission.id}
                      type="button"
                      onClick={() => {
                        setCoverImagePreview(submission.mediaUrl);
                        handleInputChange('coverImage', submission.mediaUrl);
                        setShowImageSelector(false);
                      }}
                      className="group relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-violet-500 transition-all"
                      data-testid={`button-gallery-image-${submission.id}`}
                    >
                      <img
                        src={submission.mediaUrl}
                        alt={submission.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-sm font-medium truncate">{submission.title}</p>
                          <p className="text-white/80 text-xs">{submission.votesCount} votes</p>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>

              {submissions.filter((sub: any) => sub.status === 'approved' && sub.type === 'image').length === 0 && (
                <div className="text-center py-12">
                  <ImageIcon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-600 dark:text-slate-400">No approved images available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}