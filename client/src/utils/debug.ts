/**
 * Debug logging utility that reduces console spam
 * Only logs important information and throttles repetitive logs
 */

// Control debug level - set to false to reduce console output
const DEBUG_ENABLED = false; // Set to true to enable verbose debugging

export const debugLog = {
  info: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always show errors, but can be controlled
    if (DEBUG_ENABLED) {
      console.error(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (DEBUG_ENABLED) {
      console.warn(...args);
    }
  },
  
  // For critical events that should always be shown
  critical: (...args: any[]) => {
    console.log(...args);
  },
  
  // Throttled logging to prevent spam
  throttle: (() => {
    const lastLogTimes = new Map<string, number>();
    const THROTTLE_MS = 10000; // 10 seconds
    
    return (key: string, ...args: any[]) => {
      if (!DEBUG_ENABLED) return;
      
      const now = Date.now();
      const lastTime = lastLogTimes.get(key) || 0;
      
      if (now - lastTime >= THROTTLE_MS) {
        console.log(...args);
        lastLogTimes.set(key, now);
      }
    };
  })()
};

export default debugLog;