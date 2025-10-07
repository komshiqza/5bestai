import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";

export function useUserBalance() {
  const { data: user } = useAuth();
  const queryClient = useQueryClient();

  // Listen for focus events to refresh data when user switches back to tab
  useEffect(() => {
    const handleFocus = () => {
      if (user) {
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, queryClient]);

  return {
    balance: user?.gloryBalance || 0,
    user
  };
}