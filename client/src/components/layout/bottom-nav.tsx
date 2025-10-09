import { Link, useLocation } from "wouter";
import { useAuth, useLogout, isAuthenticated, isAdmin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Home, Trophy, LogOut, User, Shield, Image } from "lucide-react";

export function BottomNav() {
  const { data: user } = useAuth();
  const logout = useLogout();
  const [location, setLocation] = useLocation();

  const handleLogout = () => {
    logout.mutate();
    setLocation("/");
  };

  const getInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <nav className={`${isAuthenticated(user) ? 'md:hidden' : ''} fixed bottom-0 left-0 right-0 z-50 bg-background-dark border-t border-white/10`} data-testid="bottom-nav">
      <div className="flex items-center justify-around h-16 px-2">
        {/* Home */}
        <Link href="/" data-testid="bottom-link-home">
          <Button 
            variant="ghost" 
            className={`flex flex-col items-center justify-center h-14 px-4 ${isActive('/') ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">Home</span>
          </Button>
        </Link>

        {/* Contests */}
        <Link href="/contests" data-testid="bottom-link-contests">
          <Button 
            variant="ghost" 
            className={`flex flex-col items-center justify-center h-14 px-4 ${isActive('/contests') ? 'text-primary' : 'text-muted-foreground'}`}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-xs mt-1">Contests</span>
          </Button>
        </Link>

        {/* User Menu or Auth Buttons */}
        {isAuthenticated(user) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex flex-col items-center justify-center h-14 px-4" 
                data-testid="bottom-user-menu"
              >
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="gradient-glory text-white font-bold text-xs">
                    {getInitials(user.username)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs mt-1 text-muted-foreground">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mb-2">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant={user.status === "approved" ? "default" : user.status === "pending" ? "secondary" : "destructive"}
                    className="text-xs"
                    data-testid={`bottom-status-${user.status}`}
                  >
                    {user.status}
                  </Badge>
                  {isAdmin(user) && (
                    <Badge variant="outline" className="text-xs" data-testid="bottom-admin-badge">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <Link href="/profile" data-testid="bottom-link-profile">
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
              </Link>
              <Link href="/my-submissions" data-testid="bottom-link-my-submissions">
                <DropdownMenuItem>
                  <Image className="w-4 h-4 mr-2" />
                  My Gallery
                </DropdownMenuItem>
              </Link>
              {isAdmin(user) && (
                <Link href="/admin" data-testid="bottom-link-admin">
                  <DropdownMenuItem>
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Dashboard
                  </DropdownMenuItem>
                </Link>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} data-testid="bottom-button-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <>
            {/* Sign In */}
            <Link href="/login" data-testid="bottom-link-login">
              <Button 
                variant="ghost" 
                className={`flex flex-col items-center justify-center h-14 px-3 ${isActive('/login') ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <User className="w-5 h-5" />
                <span className="text-xs mt-1">Sign In</span>
              </Button>
            </Link>

            {/* Sign Up */}
            <Link href="/register" data-testid="bottom-link-register">
              <Button 
                variant="ghost" 
                className={`flex flex-col items-center justify-center h-14 px-3 ${isActive('/register') ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <User className="w-5 h-5" />
                <span className="text-xs mt-1">Sign Up</span>
              </Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
