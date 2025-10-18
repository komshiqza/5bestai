import { storage } from "./storage";

// Default subscription tier configurations
const defaultTiers = [
  {
    slug: "free",
    name: "Free",
    description: "Perfect for trying out AI generation",
    priceUsd: 0, // $0
    monthlyCredits: 100,
    canEdit: false,
    canUpscale: false,
    allowedModels: ["leonardo", "nano-banana"],
    promptCommission: 0, // No sales allowed on free tier
    imageCommission: 0,
    features: {
      maxSubmissionsPerContest: 3,
      prioritySupport: false,
      watermark: true,
    },
    isActive: true,
    sortOrder: 0,
  },
  {
    slug: "starter",
    name: "Starter",
    description: "For hobbyists and casual creators",
    priceUsd: 999, // $9.99
    monthlyCredits: 500,
    canEdit: true,
    canUpscale: true,
    allowedModels: ["leonardo", "nano-banana", "ideogram-v3"],
    promptCommission: 30, // 30% commission
    imageCommission: 30,
    features: {
      maxSubmissionsPerContest: 10,
      prioritySupport: false,
      watermark: false,
    },
    isActive: true,
    sortOrder: 1,
  },
  {
    slug: "creator",
    name: "Creator",
    description: "For active creators and professionals",
    priceUsd: 2499, // $24.99
    monthlyCredits: 1500,
    canEdit: true,
    canUpscale: true,
    allowedModels: ["leonardo", "nano-banana", "ideogram-v3", "sd-3.5-large"],
    promptCommission: 25, // 25% commission
    imageCommission: 25,
    features: {
      maxSubmissionsPerContest: 25,
      prioritySupport: true,
      watermark: false,
      advancedAnalytics: true,
    },
    isActive: true,
    sortOrder: 2,
  },
  {
    slug: "pro",
    name: "Pro",
    description: "For professional artists and teams",
    priceUsd: 4999, // $49.99
    monthlyCredits: 4000,
    canEdit: true,
    canUpscale: true,
    allowedModels: ["leonardo", "nano-banana", "ideogram-v3", "sd-3.5-large", "flux-1.1-pro"],
    promptCommission: 20, // 20% commission
    imageCommission: 20,
    features: {
      maxSubmissionsPerContest: 50,
      prioritySupport: true,
      watermark: false,
      advancedAnalytics: true,
      apiAccess: true,
    },
    isActive: true,
    sortOrder: 3,
  },
  {
    slug: "studio",
    name: "Studio",
    description: "For studios and power users",
    priceUsd: 9999, // $99.99
    monthlyCredits: 10000,
    canEdit: true,
    canUpscale: true,
    allowedModels: ["leonardo", "nano-banana", "ideogram-v3", "sd-3.5-large", "flux-1.1-pro"],
    promptCommission: 15, // 15% commission (lowest = most profit for creator)
    imageCommission: 15,
    features: {
      maxSubmissionsPerContest: 100,
      prioritySupport: true,
      watermark: false,
      advancedAnalytics: true,
      apiAccess: true,
      customBranding: true,
      dedicatedSupport: true,
    },
    isActive: true,
    sortOrder: 4,
  },
];

export async function seedSubscriptionTiers() {
  try {
    console.log("Checking subscription tiers...");
    
    const existingTiers = await storage.getSubscriptionTiers();
    
    if (existingTiers.length > 0) {
      console.log(`Found ${existingTiers.length} existing tiers, skipping seed.`);
      return;
    }
    
    console.log("No tiers found, seeding default subscription tiers...");
    
    for (const tier of defaultTiers) {
      await storage.createSubscriptionTier(tier);
      console.log(`✓ Created tier: ${tier.name} ($${tier.priceUsd / 100})`);
    }
    
    console.log("✓ Subscription tiers seeded successfully!");
  } catch (error) {
    console.error("Error seeding subscription tiers:", error);
    throw error;
  }
}
