/**
 * Format currency amounts for display
 * - GLORY: Display as integer (no decimals)
 * - USDC: Display with 2 decimal places
 * - SOL: Display with up to 9 decimals, but trim trailing zeros
 */

export function formatCurrency(amount: string | number, currency: string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) {
    return `0 ${currency}`;
  }

  switch (currency.toUpperCase()) {
    case 'GLORY':
      return `${Math.floor(numAmount)} ${currency}`;
    
    case 'USDC':
      return `${numAmount.toFixed(2)} ${currency}`;
    
    case 'SOL':
      // Show up to 9 decimals but trim trailing zeros
      const formatted = numAmount.toFixed(9).replace(/\.?0+$/, '');
      return `${formatted} ${currency}`;
    
    default:
      return `${numAmount} ${currency}`;
  }
}

/**
 * Format price for buy button display
 * Same as formatCurrency but more compact
 */
export function formatPrice(amount: string | number, currency: string): string {
  return formatCurrency(amount, currency);
}
