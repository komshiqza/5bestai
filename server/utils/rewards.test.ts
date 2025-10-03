import { describe, it, expect } from "vitest";
import { calculateRewards, distributeRewards, getRankSuffix } from "./rewards";

describe("Rewards Distribution", () => {
  it("should calculate correct percentages for 1000 GLORY", () => {
    const rewards = calculateRewards(1000);
    
    expect(rewards).toHaveLength(5);
    expect(rewards[0].amount).toBe(400); // 40%
    expect(rewards[1].amount).toBe(250); // 25%
    expect(rewards[2].amount).toBe(150); // 15%
    expect(rewards[3].amount).toBe(100); // 10%
    expect(rewards[4].amount).toBe(100); // 10%
  });

  it("should handle rounding correctly", () => {
    const rewards = distributeRewards(1001);
    const total = rewards.reduce((sum, reward) => sum + reward.amount, 0);
    
    expect(total).toBe(1001);
    expect(rewards[0].amount).toBe(401); // First place gets remainder
  });

  it("should generate correct rank suffixes", () => {
    expect(getRankSuffix(1)).toBe("st");
    expect(getRankSuffix(2)).toBe("nd");
    expect(getRankSuffix(3)).toBe("rd");
    expect(getRankSuffix(4)).toBe("th");
    expect(getRankSuffix(11)).toBe("th");
    expect(getRankSuffix(21)).toBe("st");
  });

  it("should maintain percentage accuracy", () => {
    const totalPrize = 2500;
    const rewards = calculateRewards(totalPrize);
    
    expect(rewards[0].percentage).toBe(0.4);
    expect(rewards[1].percentage).toBe(0.25);
    expect(rewards[2].percentage).toBe(0.15);
    expect(rewards[3].percentage).toBe(0.1);
    expect(rewards[4].percentage).toBe(0.1);
  });
});
