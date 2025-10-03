/**
 * Calculate and distribute GLORY rewards for contest winners
 * Distribution: 1st=40%, 2nd=25%, 3rd=15%, 4th=10%, 5th=10%
 */

interface RewardDistribution {
  rank: number;
  percentage: number;
  amount: number;
}

export function calculateRewards(totalPrize: number): RewardDistribution[] {
  const percentages = [0.4, 0.25, 0.15, 0.1, 0.1]; // Top 5 distribution
  
  return percentages.map((percentage, index) => ({
    rank: index + 1,
    percentage,
    amount: Math.floor(totalPrize * percentage),
  }));
}

export function distributeRewards(totalPrize: number): RewardDistribution[] {
  const rewards = calculateRewards(totalPrize);
  
  // Ensure all prizes are distributed (handle rounding)
  const totalDistributed = rewards.reduce((sum, reward) => sum + reward.amount, 0);
  const remainder = totalPrize - totalDistributed;
  
  if (remainder > 0) {
    // Add remainder to first place
    rewards[0].amount += remainder;
  }
  
  return rewards;
}

export function getRankSuffix(rank: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const remainder = rank % 100;
  
  return suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0];
}
