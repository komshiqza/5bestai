import { Link, useLocation } from "wouter";
import { useAuth, useLogout, isAuthenticated, isAdmin } from "@/lib/auth";
import { useUserBalance } from "@/hooks/useUserBalance";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/GlassButton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Trophy, Upload, Users, Menu, LogOut, User, Shield, Sun, Moon, Image } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { data: user } = useAuth();
  const { balance } = useUserBalance();
  const { theme, toggleTheme } = useTheme();
  const logout = useLogout();
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout.mutate();
    setLocation("/");
  };

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <nav className="sticky top-0 z-50 glass-effect border-b border-border" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3" data-testid="link-logo">
            <img 
              src="/logo.png" 
              alt="5BEST.ai Logo" 
              className="w-10 h-10 object-contain"
            />
            <span className="text-2xl font-bold tracking-tight gradient-text">5BEST.ai</span>
          </Link>

          {/* Main Navigation - Desktop */}
          <div className="hidden md:flex items-center space-x-1">
            <Link href="/contests" data-testid="link-contests">
              <Button variant="ghost" className="px-4 py-2">Contests</Button>
            </Link>
            {isAuthenticated(user) && (
              <Link href="/upload" data-testid="link-upload">
                <GlassButton className="px-4 py-2">Upload</GlassButton>
              </Link>
            )}
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="w-10 h-10"
              data-testid="button-theme-toggle"
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </Button>

            {isAuthenticated(user) && (
              <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-muted" data-testid="glory-balance">
                <Trophy className="text-primary w-4 h-4" />
                <span className="text-sm font-semibold">{balance.toLocaleString()} GLORY</span>
              </div>
            )}

            {isAuthenticated(user) ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-10 h-10 rounded-full p-0" data-testid="user-menu">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="gradient-glory text-white font-bold">
                        {getInitials(user.username)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={user.status === "approved" ? "default" : user.status === "pending" ? "secondary" : "destructive"}
                        className="text-xs"
                        data-testid={`status-${user.status}`}
                      >
                        {user.status}
                      </Badge>
                      {isAdmin(user) && (
                        <Badge variant="outline" className="text-xs" data-testid="admin-badge">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <Link href="/profile" data-testid="link-profile">
                    <DropdownMenuItem>
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/my-submissions" data-testid="link-my-submissions">
                    <DropdownMenuItem>
                      <Image className="w-4 h-4 mr-2" />
                      My Gallery
                    </DropdownMenuItem>
                  </Link>
                  {isAdmin(user) && (
                    <Link href="/admin" data-testid="link-admin">
                      <DropdownMenuItem>
                        <Shield className="w-4 h-4 mr-2" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login" data-testid="link-login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/register" data-testid="link-register">
                  <GlassButton>Sign Up</GlassButton>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="md:hidden w-10 h-10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-2" data-testid="mobile-menu">
            <div className="space-y-1">
              <Link href="/contests" data-testid="mobile-link-contests">
                <Button variant="ghost" className="w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
                  Contests
                </Button>
              </Link>
              {isAuthenticated(user) && (
                <Link href="/upload" data-testid="mobile-link-upload">
                  <GlassButton className="w-full justify-start" onClick={() => setMobileMenuOpen(false)}>
                    Upload
                  </GlassButton>
                </Link>
              )}
            </div>
            {isAuthenticated(user) && (
              <div className="mt-4 px-4 py-2 bg-muted rounded-lg mx-2" data-testid="mobile-glory-balance">
                <div className="flex items-center space-x-2">
                  <Trophy className="text-primary w-4 h-4" />
                  <span className="text-sm font-semibold">{balance.toLocaleString()} GLORY</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
