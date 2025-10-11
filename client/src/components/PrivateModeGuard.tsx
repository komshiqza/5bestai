import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { usePrivateMode } from "@/lib/private-mode-context";

interface PrivateModeGuardProps {
  children: React.ReactNode;
}

export function PrivateModeGuard({ children }: PrivateModeGuardProps) {
  const { data: user, isLoading: authLoading } = useAuth();
  const { privateMode, isLoading: privateModeLoading } = usePrivateMode();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Wait for both queries to load
    if (authLoading || privateModeLoading) return;

    // If private mode is enabled and user is not authenticated, redirect to login
    if (privateMode && !user) {
      setLocation("/login");
    }
  }, [privateMode, user, authLoading, privateModeLoading, setLocation]);

  // Show loading state while checking
  if (authLoading || privateModeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If private mode is enabled and no user, don't render (redirect will happen)
  if (privateMode && !user) {
    return null;
  }

  // Otherwise, render children
  return <>{children}</>;
}
