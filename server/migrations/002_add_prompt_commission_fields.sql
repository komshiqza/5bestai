-- Add commission tracking fields to purchased_prompts table
ALTER TABLE purchased_prompts
ADD COLUMN IF NOT EXISTS seller_amount NUMERIC(18, 9) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_commission NUMERIC(18, 9) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_rate INTEGER NOT NULL DEFAULT 0;

-- Backfill existing records (assume 0% commission for historical sales)
UPDATE purchased_prompts
SET 
  seller_amount = price,
  platform_commission = 0,
  commission_rate = 0
WHERE seller_amount IS NULL OR seller_amount = 0;
