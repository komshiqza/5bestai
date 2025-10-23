import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrizeAmount(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return '0';
  
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num)) return '0';
  
  // Convert to string, avoiding scientific notation
  let str = num.toString();
  
  // Handle scientific notation by converting back to fixed-point
  if (str.includes('e')) {
    // Use toFixed with high precision, then remove trailing zeros
    str = num.toFixed(20);
  }
  
  // Remove trailing zeros after decimal point
  if (str.includes('.')) {
    str = str.replace(/\.?0+$/, '');
  }
  
  return str || '0';
}
