import { Link, useLocation } from "wouter";
import { useAuth, useLogout, isAuthenticated, isAdmin } from "@/lib/auth";
import { useUserBalance } from "@/hooks/useUserBalance";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/GlassButton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Trophy, Upload, LogOut, User, Shield, Image } from "lucide-react";

export function Navbar() {
  const { data: user } = useAuth();
  const { balance } = useUserBalance();
  const logout = useLogout();
  const [, setLocation] = useLocation();

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

          {/* Center Navigation - Desktop */}
          <div className="hidden md:flex items-center space-x-3 absolute left-1/2 transform -translate-x-1/2">
            <Link href="/contests" data-testid="link-contests">
              <Button variant="ghost" className="px-4 py-2">Contests</Button>
            </Link>
            {isAuthenticated(user) && (
              <Link href="/upload" data-testid="link-upload">
                <GlassButton className="px-4 py-2">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </GlassButton>
              </Link>
            )}
          </div>

          {/* Upload Button - Mobile Only */}
          {isAuthenticated(user) && (
            <Link href="/upload" data-testid="link-upload-mobile" className="ml-auto mr-3 md:hidden">
              <GlassButton className="px-4 py-2">
                <Upload className="w-4 h-4" />
              </GlassButton>
            </Link>
          )}

          {/* User Actions - Desktop Only */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated(user) && (
              <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-muted" data-testid="glory-balance">
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
          </div>
        </div>
      </div>
    </nav>
  );
}
