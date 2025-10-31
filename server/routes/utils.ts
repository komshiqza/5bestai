import { storage } from "../storage";

// Helper function to refund entry fee when submission is rejected
export async function refundEntryFee(submissionId: string): Promise<boolean> {
  try {
    const submission = await storage.getSubmission(submissionId);
    if (!submission) {
      return false;
    }

    // Read entry fee from submission (captured at creation time)
    const entryFeeAmount = submission.entryFeeAmount;
    const currency = submission.entryFeeCurrency || "GLORY";

    // Only refund if there's an entry fee
    if (!entryFeeAmount || Number(entryFeeAmount) <= 0) {
      return false;
    }

    // Get contest name for ledger reason
    const contestName =
      submission.contestName ||
      (submission.contestId
        ? (await storage.getContest(submission.contestId))?.title
        : null) ||
      "contest";

    // Create refund transaction
    await storage.createGloryTransaction({
      userId: submission.userId,
      delta: entryFeeAmount, // Keep original precision as string
      reason: `Entry fee refund for rejected submission in contest: ${contestName}`,
      currency,
    });

    console.log(
      `Refunded ${entryFeeAmount} ${currency} to user ${submission.userId} for rejected submission ${submissionId}`,
    );
    return true;
  } catch (error) {
    console.error(
      `Failed to refund entry fee for submission ${submissionId}:`,
      error,
    );
    return false;
  }
}




