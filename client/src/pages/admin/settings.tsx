import { useState } from "react";
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
import { Loader2, Save } from "lucide-react";

// Settings form schema
const settingsFormSchema = z.object({
  privateMode: z.boolean(),
  platformWalletAddress: z.string().optional().refine(
    (val) => !val || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(val),
    { message: "Invalid Solana wallet address" }
  ),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function AdminSettings() {
  const { toast } = useToast();

  // Fetch current settings
  const { data: settings, isLoading } = useQuery<{
    privateMode: boolean;
    platformWalletAddress?: string | null;
  }>({
    queryKey: ["/api/admin/settings"],
  });

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
      </div>
    </div>
  );
}
