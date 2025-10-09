import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/GlassButton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { registerSchema } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Eye, EyeOff, UserPlus, Trophy, Check } from "lucide-react";
import type { z } from "zod";

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { refetch } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setLocation("/");
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 rounded-lg gradient-glory flex items-center justify-center">
              <Trophy className="text-white text-xl" />
            </div>
            <span className="text-3xl font-bold tracking-tight">5best</span>
          </div>
          <h1 className="text-2xl font-bold">Join the community</h1>
          <p className="text-muted-foreground">Create your account and start competing</p>
        </div>

        <Card className="glass-effect border-border">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold">Create Account</CardTitle>
            <CardDescription>
              Join thousands of creators competing for GLORY
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-username"
                          {...field}
                          placeholder="creator123"
                          className="bg-muted border-border focus:border-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="input-email"
                          {...field}
                          type="email"
                          placeholder="your@email.com"
                          className="bg-muted border-border focus:border-primary"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            data-testid="input-password"
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a strong password"
                            className="bg-muted border-border focus:border-primary pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {registerMutation.error && (
                  <Alert variant="destructive">
                    <AlertDescription data-testid="error-message">
                      {registerMutation.error instanceof Error ? registerMutation.error.message : "Registration failed"}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Account will be pending approval</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Start with 0 GLORY balance</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-muted-foreground">Upload submissions after approval</span>
                  </div>
                </div>

                <GlassButton
                  data-testid="button-submit"
                  type="submit"
                  className="w-full font-semibold"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    "Creating account..."
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Account
                    </>
                  )}
                </GlassButton>
              </form>
            </Form>

            <div className="mt-6 text-center text-sm">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link href="/login">
                <Button variant="link" className="p-0 h-auto text-primary font-semibold" data-testid="link-login">
                  Sign in
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
