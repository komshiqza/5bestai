import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Sparkles } from "lucide-react";

// Settings form schema
const settingsFormSchema = z.object({
  privateMode: z.boolean(),
  platformWalletAddress: z.string().optional().refine(
    (val) => !val || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(val),
    { message: "Invalid Solana wallet address" }
  ),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const MODEL_NAMES: Record<string, string> = {
  "leonardo": "Leonardo Lucid (Fast)",
  "nano-banana": "Nano Banana (Style Reference)",
  "flux-1.1-pro": "Flux 1.1 Pro (High Quality)",
  "sd-3.5-large": "Stable Diffusion 3.5",
  "ideogram-v3": "Ideogram v3 (Premium)",
  "upscale": "AI Upscaling (4x)",
};

export default function AdminSettings() {
  const { toast } = useToast();
  const [pricingValues, setPricingValues] = useState<Record<string, number>>({});

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<{
    privateMode: boolean;
    platformWalletAddress?: string | null;
  }>({
    queryKey: ["/api/admin/settings"],
  });

  // Fetch pricing settings
  const { data: pricing, isLoading: loadingPricing } = useQuery<Record<string, number>>({
    queryKey: ["/api/admin/settings/pricing"],
  });

  useEffect(() => {
    if (pricing) {
      setPricingValues(pricing);
    }
  }, [pricing]);

  // Form setup
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    values: {
      privateMode: settings?.privateMode || false,
      platformWalletAddress: settings?.platformWalletAddress || "",
    },
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      const res = await apiRequest("PATCH", "/api/admin/settings", values);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({
        title: "Settings Updated",
        description: "Site settings have been successfully updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Update pricing mutation
  const updatePricingMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(pricingValues).map(([key, value]) =>
        apiRequest("PUT", `/api/admin/settings/pricing/${key}`, { value })
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/pricing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pricing"] });
      toast({
        title: "Pricing Updated",
        description: "AI model pricing has been successfully updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update pricing",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: SettingsFormValues) => {
    updateMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-settings" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2" data-testid="text-settings-title">Site Settings</h1>
          <p className="text-muted-foreground">Configure global platform settings</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Private Mode */}
            <Card>
              <CardHeader>
                <CardTitle>Access Control</CardTitle>
                <CardDescription>Manage who can access the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="privateMode"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Private Mode</FormLabel>
                        <FormDescription>
                          When enabled, only logged-in users can access the site
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-private-mode"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Platform Wallet */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Configuration</CardTitle>
                <CardDescription>Configure Solana wallet for receiving entry fees</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="platformWalletAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Platform Wallet Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter Solana wallet address (e.g., 7xK...abc)"
                          {...field}
                          data-testid="input-platform-wallet"
                        />
                      </FormControl>
                      <FormDescription>
                        This wallet will receive all entry fees paid with SOL, USDC, or custom tokens.
                        Make sure you have access to this wallet.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                data-testid="button-save-settings"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

        {/* AI Model Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Model Pricing
            </CardTitle>
            <CardDescription>Configure credit costs for AI image generation and upscaling</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingPricing ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  {Object.entries(MODEL_NAMES).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex-1">
                        <label htmlFor={`pricing-${key}`} className="text-sm font-medium">
                          {label}
                        </label>
                        <p className="text-xs text-muted-foreground">Cost per generation</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`pricing-${key}`}
                          type="number"
                          min="0"
                          step="1"
                          value={pricingValues[key] || 0}
                          onChange={(e) =>
                            setPricingValues({ ...pricingValues, [key]: parseInt(e.target.value) || 0 })
                          }
                          className="w-24"
                          data-testid={`input-pricing-${key}`}
                        />
                        <span className="text-sm text-muted-foreground">credits</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => updatePricingMutation.mutate()}
                    disabled={updatePricingMutation.isPending}
                    data-testid="button-save-pricing"
                  >
                    {updatePricingMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Pricing
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
