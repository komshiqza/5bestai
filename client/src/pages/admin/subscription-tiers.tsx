import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Edit3, Crown, Sparkles } from "lucide-react";
import { useAuth, isAdmin } from "@/lib/auth";
import { useLocation } from "wouter";

const MODEL_NAMES: Record<string, string> = {
  "leonardo": "Leonardo Lucid (Fast)",
  "nano-banana": "Nano Banana (Style Reference)",
  "flux-1.1-pro": "Flux 1.1 Pro (High Quality)",
  "sd-3.5-large": "Stable Diffusion 3.5",
  "ideogram-v3": "Ideogram v3 (Premium)",
};

const ALL_MODELS = ["leonardo", "nano-banana", "ideogram-v3", "sd-3.5-large", "flux-1.1-pro"];

// Tier color schemes
const TIER_COLORS: Record<string, { gradient: string; badge: string }> = {
  free: {
    gradient: "from-gray-500/20 to-gray-600/20",
    badge: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  },
  starter: {
    gradient: "from-blue-500/20 to-cyan-500/20",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  creator: {
    gradient: "from-purple-500/20 to-pink-500/20",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  },
  pro: {
    gradient: "from-amber-500/20 to-yellow-500/20",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  studio: {
    gradient: "from-pink-500/20 via-purple-500/20 to-cyan-500/20",
    badge: "bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 text-white border-pink-500/30",
  },
};

// Tier type from backend
type SubscriptionTier = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceUsd: number;
  monthlyCredits: number;
  canEdit: boolean;
  canUpscale: boolean;
  allowedModels: string[];
  promptCommission: number;
  imageCommission: number;
  features: Record<string, any> | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

// Edit form schema
const editTierFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  priceUsd: z.coerce.number().int().min(0, "Price must be 0 or greater"),
  monthlyCredits: z.coerce.number().int().min(0, "Credits must be 0 or greater"),
  canEdit: z.boolean(),
  canUpscale: z.boolean(),
  allowedModels: z.array(z.string()).min(0),
  promptCommission: z.coerce.number().int().min(0).max(100, "Must be between 0-100"),
  imageCommission: z.coerce.number().int().min(0).max(100, "Must be between 0-100"),
  isActive: z.boolean(),
});

type EditTierFormValues = z.infer<typeof editTierFormSchema>;

export default function AdminSubscriptionTiers() {
  const { data: user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);

  // Redirect if not admin
  if (!user || !isAdmin(user)) {
    setLocation("/");
    return null;
  }

  // Fetch tiers
  const { data: tiers = [], isLoading } = useQuery<SubscriptionTier[]>({
    queryKey: ["/api/admin/tiers"],
  });

  // Edit form
  const form = useForm<EditTierFormValues>({
    resolver: zodResolver(editTierFormSchema),
    defaultValues: {
      name: "",
      description: "",
      priceUsd: 0,
      monthlyCredits: 0,
      canEdit: false,
      canUpscale: false,
      allowedModels: [],
      promptCommission: 0,
      imageCommission: 0,
      isActive: true,
    },
  });

  // Update tier mutation
  const updateTierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EditTierFormValues }) => {
      const res = await apiRequest("PUT", `/api/admin/tiers/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tiers"] });
      setEditDialogOpen(false);
      setSelectedTier(null);
      form.reset();
      toast({
        title: "Tier Updated",
        description: "Subscription tier has been successfully updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tier",
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    form.reset({
      name: tier.name,
      description: tier.description || "",
      priceUsd: tier.priceUsd,
      monthlyCredits: tier.monthlyCredits,
      canEdit: tier.canEdit,
      canUpscale: tier.canUpscale,
      allowedModels: tier.allowedModels || [],
      promptCommission: tier.promptCommission,
      imageCommission: tier.imageCommission,
      isActive: tier.isActive,
    });
    setEditDialogOpen(true);
  };

  const onSubmit = (values: EditTierFormValues) => {
    if (!selectedTier) return;
    updateTierMutation.mutate({ id: selectedTier.id, data: values });
  };

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(2)}/mo`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-tiers" />
      </div>
    );
  }

  const sortedTiers = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Crown className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-3xl font-bold mb-1" data-testid="text-tiers-title">
              Subscription Tiers
            </h1>
            <p className="text-muted-foreground">Manage pricing and features for all subscription plans</p>
          </div>
        </div>

        {/* Tiers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedTiers.map((tier) => {
            const colors = TIER_COLORS[tier.slug] || TIER_COLORS.free;
            return (
              <Card
                key={tier.id}
                className={`relative overflow-hidden border border-white/10 bg-gradient-to-br ${colors.gradient} backdrop-blur-xl`}
                data-testid={`card-tier-${tier.slug}`}
              >
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                <CardHeader className="relative">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-2xl flex items-center gap-2">
                        {tier.name}
                        {tier.slug === "studio" && <Sparkles className="h-5 w-5 text-yellow-400" />}
                      </CardTitle>
                      <div className="text-3xl font-bold" data-testid={`text-price-${tier.slug}`}>
                        {formatPrice(tier.priceUsd)}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={colors.badge}
                      data-testid={`badge-status-${tier.slug}`}
                    >
                      {tier.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {tier.description && (
                    <CardDescription className="text-gray-300">
                      {tier.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="relative space-y-4">
                  {/* Monthly Credits */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Monthly Credits:</span>
                    <span className="font-semibold" data-testid={`text-credits-${tier.slug}`}>
                      {tier.monthlyCredits.toLocaleString()}
                    </span>
                  </div>

                  {/* Feature Flags */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={tier.canEdit} disabled />
                      <span className="text-sm text-gray-300">Can Edit Images</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={tier.canUpscale} disabled />
                      <span className="text-sm text-gray-300">Can Upscale Images</span>
                    </div>
                  </div>

                  {/* Commissions */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Prompt Commission:</span>
                      <div className="font-semibold">{tier.promptCommission}%</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Image Commission:</span>
                      <div className="font-semibold">{tier.imageCommission}%</div>
                    </div>
                  </div>

                  {/* Allowed Models */}
                  {tier.allowedModels && tier.allowedModels.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm text-gray-400">Allowed Models:</span>
                      <div className="flex flex-wrap gap-1">
                        {tier.allowedModels.map((model) => (
                          <Badge
                            key={model}
                            variant="secondary"
                            className="text-xs bg-white/5 border-white/10"
                            data-testid={`badge-model-${tier.slug}-${model}`}
                          >
                            {MODEL_NAMES[model] || model}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  {tier.features && Object.keys(tier.features).length > 0 && (
                    <div className="space-y-2">
                      <span className="text-sm text-gray-400">Features:</span>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(tier.features).map((key) => (
                          <Badge
                            key={key}
                            variant="outline"
                            className="text-xs bg-white/5 border-white/20"
                            data-testid={`badge-feature-${tier.slug}-${key}`}
                          >
                            {key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Edit Button */}
                  <Button
                    onClick={() => handleEditClick(tier)}
                    className="w-full mt-4"
                    variant="outline"
                    data-testid={`button-edit-${tier.slug}`}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Tier
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Edit Tier Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Subscription Tier</DialogTitle>
            <DialogDescription>
              Update pricing, features, and settings for {selectedTier?.name}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-tier-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} data-testid="textarea-tier-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Price USD */}
              <FormField
                control={form.control}
                name="priceUsd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (USD)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-tier-price"
                        />
                        <FormDescription>
                          Price in cents. Current value: {formatPrice(field.value)}
                        </FormDescription>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Monthly Credits */}
              <FormField
                control={form.control}
                name="monthlyCredits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly Credits</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-tier-credits"
                      />
                    </FormControl>
                    <FormDescription>Number of credits granted each month</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Can Edit */}
              <FormField
                control={form.control}
                name="canEdit"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Can Edit Images</FormLabel>
                      <FormDescription>Allow users to edit images with the built-in editor</FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-tier-can-edit"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Can Upscale */}
              <FormField
                control={form.control}
                name="canUpscale"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Can Upscale Images</FormLabel>
                      <FormDescription>Allow users to upscale images using AI</FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-tier-can-upscale"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Allowed Models */}
              <FormField
                control={form.control}
                name="allowedModels"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Allowed AI Models</FormLabel>
                      <FormDescription>Select which AI models users can access</FormDescription>
                    </div>
                    <div className="space-y-2">
                      {ALL_MODELS.map((model) => (
                        <FormField
                          key={model}
                          control={form.control}
                          name="allowedModels"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={model}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(model)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, model])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== model)
                                          );
                                    }}
                                    data-testid={`checkbox-tier-model-${model}`}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {MODEL_NAMES[model] || model}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Commissions */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="promptCommission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prompt Commission %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-tier-prompt-commission"
                        />
                      </FormControl>
                      <FormDescription>0-100%</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="imageCommission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image Commission %</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-tier-image-commission"
                        />
                      </FormControl>
                      <FormDescription>0-100%</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Is Active */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Inactive tiers cannot be purchased by users
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-tier-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateTierMutation.isPending}
                  data-testid="button-save-tier"
                >
                  {updateTierMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
