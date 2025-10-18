import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Crown, 
  Sparkles, 
  Zap, 
  Star, 
  Gift,
  Check, 
  X,
  CreditCard,
  Coins,
  Loader2
} from "lucide-react";

// Model names mapping
const MODEL_NAMES: Record<string, string> = {
  "leonardo": "Leonardo Lucid",
  "nano-banana": "Nano Banana",
  "ideogram-v3": "Ideogram v3",
  "sd-3.5-large": "Stable Diffusion 3.5",
  "flux-1.1-pro": "Flux 1.1 Pro"
};

// Tier icons
const TIER_ICONS: Record<string, any> = {
  free: Gift,
  starter: Zap,
  creator: Star,
  pro: Sparkles,
  studio: Crown,
};

// Tier color schemes
const TIER_COLORS: Record<string, { gradient: string; badge: string; button: string }> = {
  free: {
    gradient: "from-gray-500/20 to-gray-600/20",
    badge: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    button: "bg-gray-600 hover:bg-gray-500",
  },
  starter: {
    gradient: "from-blue-500/20 to-cyan-500/20",
    badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    button: "bg-blue-600 hover:bg-blue-500",
  },
  creator: {
    gradient: "from-purple-500/20 to-pink-500/20",
    badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    button: "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500",
  },
  pro: {
    gradient: "from-amber-500/20 to-yellow-500/20",
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    button: "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500",
  },
  studio: {
    gradient: "from-pink-500/20 via-purple-500/20 to-cyan-500/20",
    badge: "bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 text-white border-pink-500/30",
    button: "bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 hover:from-pink-500 hover:via-purple-500 hover:to-cyan-500",
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
};

type UserSubscription = {
  id: string;
  tierId: string;
  status: string;
  tier: {
    slug: string;
    name: string;
  };
};

export default function PricingPage() {
  const { data: user } = useAuth();
  const [, setLocation] = useLocation();
  const [paymentMethod, setPaymentMethod] = useState<"card" | "crypto">("card");

  // Fetch tiers
  const { data: tiers = [], isLoading } = useQuery<SubscriptionTier[]>({
    queryKey: ["/api/tiers"],
  });

  // Fetch user's current subscription
  const { data: subscription } = useQuery<UserSubscription | null>({
    queryKey: ["/api/subscription"],
    enabled: !!user,
  });

  const formatPrice = (cents: number) => {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const handleGetStarted = (tier: SubscriptionTier) => {
    if (!user) {
      setLocation("/register");
      return;
    }

    // TODO: Navigate to subscription flow
    // For now, just navigate to profile or payment page
    setLocation("/profile");
  };

  const isCurrentTier = (tier: SubscriptionTier) => {
    return subscription?.tier.slug === tier.slug;
  };

  const getButtonText = (tier: SubscriptionTier) => {
    if (isCurrentTier(tier)) {
      return "Current Plan";
    }
    if (tier.slug === "free") {
      return subscription ? "Downgrade" : "Get Started";
    }
    return "Get Started";
  };

  const getMostPopularTier = () => {
    const creatorTier = tiers.find(t => t.slug === "creator");
    const proTier = tiers.find(t => t.slug === "pro");
    return creatorTier || proTier;
  };

  const mostPopularTier = getMostPopularTier();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" data-testid="loader-pricing" />
      </div>
    );
  }

  const sortedTiers = [...tiers].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold mb-4 gradient-text" data-testid="text-pricing-title">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-pricing-subtitle">
            Unlock powerful AI tools, exclusive features, and earn from your creativity.
            Start free and upgrade as you grow.
          </p>
        </div>

        {/* Payment Method Toggle */}
        <div className="flex justify-center">
          <Tabs
            value={paymentMethod}
            onValueChange={(v) => setPaymentMethod(v as "card" | "crypto")}
            className="w-auto"
          >
            <TabsList className="grid w-full grid-cols-2 bg-black/40 backdrop-blur-xl border border-white/10" data-testid="tabs-payment-method">
              <TabsTrigger value="card" className="gap-2" data-testid="tab-payment-card">
                <CreditCard className="w-4 h-4" />
                Credit Card (Stripe)
              </TabsTrigger>
              <TabsTrigger value="crypto" className="gap-2" data-testid="tab-payment-crypto">
                <Coins className="w-4 h-4" />
                Crypto (USDC)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedTiers.map((tier) => {
            const colors = TIER_COLORS[tier.slug] || TIER_COLORS.free;
            const Icon = TIER_ICONS[tier.slug] || Gift;
            const isMostPopular = tier.id === mostPopularTier?.id;
            const isUserCurrentTier = isCurrentTier(tier);

            return (
              <Card
                key={tier.id}
                className={`relative overflow-hidden border border-white/10 bg-gradient-to-br ${colors.gradient} backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                  isMostPopular ? "ring-2 ring-purple-500" : ""
                }`}
                data-testid={`card-pricing-${tier.slug}`}
              >
                {/* Most Popular Badge */}
                {isMostPopular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg" data-testid="badge-most-popular">
                    MOST POPULAR
                  </div>
                )}

                {/* Current Plan Badge */}
                {isUserCurrentTier && (
                  <div className="absolute top-0 left-0 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-br-lg" data-testid={`badge-current-plan-${tier.slug}`}>
                    CURRENT PLAN
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                
                <CardHeader className="relative space-y-4">
                  <div className="flex items-center gap-3">
                    <Icon className="h-8 w-8 text-white" />
                    <CardTitle className="text-2xl" data-testid={`text-tier-name-${tier.slug}`}>
                      {tier.name}
                    </CardTitle>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold" data-testid={`text-price-${tier.slug}`}>
                        {formatPrice(tier.priceUsd)}
                      </span>
                      {tier.priceUsd > 0 && (
                        <span className="text-muted-foreground">/month</span>
                      )}
                    </div>
                    <Badge variant="outline" className={colors.badge} data-testid={`badge-credits-${tier.slug}`}>
                      {tier.monthlyCredits.toLocaleString()} Credits/mo
                    </Badge>
                  </div>

                  {tier.description && (
                    <CardDescription className="text-gray-300">
                      {tier.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="relative space-y-4">
                  {/* Key Features */}
                  <ul className="space-y-3 text-sm">
                    {/* AI Models */}
                    {tier.allowedModels && tier.allowedModels.length > 0 && (
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span>
                          <strong>AI Models:</strong> {tier.allowedModels.length} model{tier.allowedModels.length !== 1 ? 's' : ''} ({tier.allowedModels.map(m => MODEL_NAMES[m] || m).join(", ")})
                        </span>
                      </li>
                    )}

                    {/* Edit Permission */}
                    <li className="flex items-start gap-2">
                      {tier.canEdit ? (
                        <>
                          <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          <span>Edit & Transform Images</span>
                        </>
                      ) : (
                        <>
                          <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">Image Editing</span>
                        </>
                      )}
                    </li>

                    {/* Upscale Permission */}
                    <li className="flex items-start gap-2">
                      {tier.canUpscale ? (
                        <>
                          <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          <span>AI Upscaling (4K+)</span>
                        </>
                      ) : (
                        <>
                          <X className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">AI Upscaling</span>
                        </>
                      )}
                    </li>

                    {/* Commission Rates */}
                    {tier.promptCommission > 0 && (
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span>Earn {tier.promptCommission}% from Prompt Sales</span>
                      </li>
                    )}

                    {tier.imageCommission > 0 && (
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span>Earn {tier.imageCommission}% from Image Sales</span>
                      </li>
                    )}

                    {/* Additional Features */}
                    {tier.features && tier.features.prioritySupport && (
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span>Priority Support</span>
                      </li>
                    )}

                    {tier.features && tier.features.apiAccess && (
                      <li className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span>API Access</span>
                      </li>
                    )}
                  </ul>

                  {/* CTA Button */}
                  <Button
                    onClick={() => handleGetStarted(tier)}
                    disabled={isUserCurrentTier}
                    className={`w-full mt-6 ${colors.button} text-white font-semibold transition-all`}
                    data-testid={`button-get-started-${tier.slug}`}
                  >
                    {getButtonText(tier)}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2" data-testid="text-comparison-title">
              Compare Features
            </h2>
            <p className="text-muted-foreground">
              See what's included in each plan
            </p>
          </div>

          <Card className="overflow-hidden border border-white/10 bg-black/40 backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-feature-comparison">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 font-semibold">Feature</th>
                    {sortedTiers.map((tier) => (
                      <th key={tier.id} className="p-4 font-semibold text-center" data-testid={`th-tier-${tier.slug}`}>
                        {tier.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Monthly Credits */}
                  <tr className="border-b border-white/10 hover:bg-white/5">
                    <td className="p-4 font-medium">Monthly Credits</td>
                    {sortedTiers.map((tier) => (
                      <td key={tier.id} className="p-4 text-center" data-testid={`td-credits-${tier.slug}`}>
                        {tier.monthlyCredits.toLocaleString()}
                      </td>
                    ))}
                  </tr>

                  {/* AI Models */}
                  <tr className="border-b border-white/10 hover:bg-white/5">
                    <td className="p-4 font-medium">AI Models Access</td>
                    {sortedTiers.map((tier) => (
                      <td key={tier.id} className="p-4 text-center" data-testid={`td-models-${tier.slug}`}>
                        {tier.allowedModels.length} model{tier.allowedModels.length !== 1 ? 's' : ''}
                      </td>
                    ))}
                  </tr>

                  {/* Edit Images */}
                  <tr className="border-b border-white/10 hover:bg-white/5">
                    <td className="p-4 font-medium">Edit Images</td>
                    {sortedTiers.map((tier) => (
                      <td key={tier.id} className="p-4 text-center" data-testid={`td-edit-${tier.slug}`}>
                        {tier.canEdit ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-500 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Upscale */}
                  <tr className="border-b border-white/10 hover:bg-white/5">
                    <td className="p-4 font-medium">AI Upscaling</td>
                    {sortedTiers.map((tier) => (
                      <td key={tier.id} className="p-4 text-center" data-testid={`td-upscale-${tier.slug}`}>
                        {tier.canUpscale ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-500 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Prompt Commission */}
                  <tr className="border-b border-white/10 hover:bg-white/5">
                    <td className="p-4 font-medium">Prompt Sales Commission</td>
                    {sortedTiers.map((tier) => (
                      <td key={tier.id} className="p-4 text-center" data-testid={`td-prompt-commission-${tier.slug}`}>
                        {tier.promptCommission}%
                      </td>
                    ))}
                  </tr>

                  {/* Image Commission */}
                  <tr className="border-b border-white/10 hover:bg-white/5">
                    <td className="p-4 font-medium">Image Sales Commission</td>
                    {sortedTiers.map((tier) => (
                      <td key={tier.id} className="p-4 text-center" data-testid={`td-image-commission-${tier.slug}`}>
                        {tier.imageCommission}%
                      </td>
                    ))}
                  </tr>

                  {/* Priority Support */}
                  <tr className="border-b border-white/10 hover:bg-white/5">
                    <td className="p-4 font-medium">Priority Support</td>
                    {sortedTiers.map((tier) => (
                      <td key={tier.id} className="p-4 text-center" data-testid={`td-support-${tier.slug}`}>
                        {tier.features?.prioritySupport ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-500 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* API Access */}
                  <tr className="hover:bg-white/5">
                    <td className="p-4 font-medium">API Access</td>
                    {sortedTiers.map((tier) => (
                      <td key={tier.id} className="p-4 text-center" data-testid={`td-api-${tier.slug}`}>
                        {tier.features?.apiAccess ? (
                          <Check className="h-5 w-5 text-green-500 mx-auto" />
                        ) : (
                          <X className="h-5 w-5 text-red-500 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2" data-testid="text-faq-title">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground">
              Got questions? We've got answers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border border-white/10 bg-black/40 backdrop-blur-xl" data-testid="card-faq-1">
              <CardHeader>
                <CardTitle className="text-lg">What are credits?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Credits are used to generate AI images, upscale, and edit. Different AI models consume different amounts of credits. You get monthly credits with your subscription that reset each billing cycle.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-black/40 backdrop-blur-xl" data-testid="card-faq-2">
              <CardHeader>
                <CardTitle className="text-lg">Can I change plans anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes! You can upgrade or downgrade your plan at any time. Upgrades take effect immediately, while downgrades take effect at the end of your current billing period.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-black/40 backdrop-blur-xl" data-testid="card-faq-3">
              <CardHeader>
                <CardTitle className="text-lg">How do commissions work?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  When you sell prompts or images on our marketplace, you earn a percentage based on your tier. Higher tiers get better commission rates, allowing you to earn more from your creative work.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-black/40 backdrop-blur-xl" data-testid="card-faq-4">
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We accept credit cards via Stripe and cryptocurrency payments (USDC) on the Solana blockchain. Choose the payment method that works best for you.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center py-8">
          <Card className="border border-white/10 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-cyan-500/20 backdrop-blur-xl">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <CardContent className="relative py-12 px-6">
              <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                Join thousands of creators using 5BEST.ai to bring their ideas to life with cutting-edge AI technology.
              </p>
              <Button
                onClick={() => setLocation(user ? "/profile" : "/register")}
                className="bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600 hover:from-purple-500 hover:via-pink-500 hover:to-cyan-500 text-white font-semibold px-8 py-6 text-lg"
                data-testid="button-final-cta"
              >
                {user ? "Manage Subscription" : "Sign Up Free"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
