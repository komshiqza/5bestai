/**
 * Backfill commission fields for existing purchased_prompts records
 * Run with: tsx --env-file=.env server/backfill-commission.ts
 */
import { db } from "./db";
import { purchasedPrompts } from "@shared/schema";
import { sql } from "drizzle-orm";

async function backfillCommissionFields() {
  console.log("Starting commission fields backfill...");

  try {
    // Update all records where seller_amount is null or 0
    // Assume historical sales had 0% commission (seller got full price)
    const result = await db.update(purchasedPrompts)
      .set({
        sellerAmount: sql`COALESCE(${purchasedPrompts.sellerAmount}, ${purchasedPrompts.price})`,
        platformCommission: sql`COALESCE(${purchasedPrompts.platformCommission}, 0)`,
        commissionRate: sql`COALESCE(${purchasedPrompts.commissionRate}, 0)`
      })
      .where(sql`${purchasedPrompts.sellerAmount} IS NULL OR ${purchasedPrompts.sellerAmount} = 0`);

    console.log("✅ Backfill complete!");
    console.log(`Updated records with 0% commission (seller received full price)`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Backfill failed:", error);
    process.exit(1);
  }
}

backfillCommissionFields();
