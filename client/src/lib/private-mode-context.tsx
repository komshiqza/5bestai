import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

interface PrivateModeContextType {
  privateMode: boolean;
  isLoading: boolean;
}

const PrivateModeContext = createContext<PrivateModeContextType | undefined>(undefined);

export function PrivateModeProvider({ children }: { children: ReactNode }) {
  const { data: privateModeStatus, isLoading } = useQuery<{ privateMode: boolean }>({
    queryKey: ["/api/settings/private-mode"],
    queryFn: async () => {
      const response = await fetch("/api/settings/private-mode");
      if (!response.ok) throw new Error("Failed to fetch private mode status");
      return response.json();
    },
  });

  return (
    <PrivateModeContext.Provider value={{ privateMode: privateModeStatus?.privateMode || false, isLoading }}>
      {children}
    </PrivateModeContext.Provider>
  );
}

export function usePrivateMode() {
  const context = useContext(PrivateModeContext);
  if (context === undefined) {
    throw new Error("usePrivateMode must be used within a PrivateModeProvider");
  }
  return context;
}
