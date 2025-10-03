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

// Unit test for the reward distribution function
export function testRewardDistribution() {
  const submissions: SubmissionWithVotes[] = [
    { id: "sub1", userId: "user1", votesCount: 100 },
    { id: "sub2", userId: "user2", votesCount: 80 },
    { id: "sub3", userId: "user3", votesCount: 60 },
    { id: "sub4", userId: "user4", votesCount: 40 },
    { id: "sub5", userId: "user5", votesCount: 20 },
    { id: "sub6", userId: "user6", votesCount: 10 }, // Should not receive prize
  ];

  const distributions = calculateRewardDistribution(submissions, 1000);
  
  console.log("Reward Distribution Test:");
  console.log("Expected: 400, 250, 150, 100, 100");
  console.log("Actual:", distributions.map(d => d.amount).join(", "));
  
  const totalDistributed = distributions.reduce((sum, d) => sum + d.amount, 0);
  console.log(`Total distributed: ${totalDistributed} out of 1000`);
  
  return distributions.length === 5 &&
         distributions[0].amount === 400 &&
         distributions[1].amount === 250 &&
         distributions[2].amount === 150 &&
         distributions[3].amount === 100 &&
         distributions[4].amount === 100;
}
