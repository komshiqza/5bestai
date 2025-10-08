/**
 * Pure function for calculating contest reward distribution
 * Top 5 submissions get: 40%, 25%, 15%, 10%, 10%
 */

export interface SubmissionWithVotes {
  id: string;
  userId: string;
  votesCount: number;
}

export interface RewardDistribution {
  userId: string;
  submissionId: string;
  amount: number;
  rank: number;
}

export function calculateRewardDistribution(
  submissions: SubmissionWithVotes[],
  totalPrizePool: number
): RewardDistribution[] {
  // Prize distribution percentages for top 5
  const prizePercentages = [0.4, 0.25, 0.15, 0.1, 0.1];
  
  // Sort submissions by votes (descending)
  const sortedSubmissions = [...submissions]
    .sort((a, b) => b.votesCount - a.votesCount)
    .slice(0, 5); // Take top 5 only

  const distributions: RewardDistribution[] = [];

  for (let i = 0; i < sortedSubmissions.length; i++) {
    const submission = sortedSubmissions[i];
    const percentage = prizePercentages[i];
    const amount = Math.floor(totalPrizePool * percentage);

    distributions.push({
      userId: submission.userId,
      submissionId: submission.id,
      amount,
      rank: i + 1,
    });
  }

  return distributions;
}

