import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface PrivateModeGuardProps {
  children: React.ReactNode;
}

export function PrivateModeGuard({ children }: PrivateModeGuardProps) {
  const { data: user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Check private mode status (public endpoint, no auth required)
  const { data: privateModeStatus, isLoading: privateModeLoading } = useQuery<{ privateMode: boolean }>({
    queryKey: ["/api/settings/private-mode"],
    queryFn: async () => {
      const response = await fetch("/api/settings/private-mode");
      if (!response.ok) throw new Error("Failed to fetch private mode status");
      return response.json();
    },
  });

  useEffect(() => {
    // Wait for both queries to load
    if (authLoading || privateModeLoading) return;

    // If private mode is enabled and user is not authenticated, redirect to login
    if (privateModeStatus?.privateMode && !user) {
      setLocation("/login");
    }
  }, [privateModeStatus, user, authLoading, privateModeLoading, setLocation]);

  // Show loading state while checking
  if (authLoading || privateModeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If private mode is enabled and no user, don't render (redirect will happen)
  if (privateModeStatus?.privateMode && !user) {
    return null;
  }

  // Otherwise, render children
  return <>{children}</>;
}
