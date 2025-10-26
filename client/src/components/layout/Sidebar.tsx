import { Link, useLocation } from "wouter";
import { useAuth, useLogout, isAuthenticated, isAdmin } from "@/lib/auth";
import { useSidebar } from "@/contexts/SidebarContext";
import { Button } from "@/components/ui/button";
import { GlassButton } from "@/components/GlassButton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  LogOut, 
  User, 
  Shield, 
  Image, 
  Sparkles, 
  CreditCard,
  Home,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Menu
} from "lucide-react";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();
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

  return (
    <aside
      className={`
        hidden md:flex
        fixed left-0 top-0 h-screen
        glass-effect border-r border-border
        transition-all duration-300 ease-in-out
        z-40
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}
      data-testid="sidebar"
    >
      <div className="flex flex-col h-full">
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          {!isCollapsed && (
            <Link href="/" className="flex items-center space-x-3" data-testid="link-logo">
              <img 
                src="/logo.png" 
                alt="5BEST.ai Logo" 
                className="w-8 h-8 object-contain"
              />
              <span className="text-xl font-bold tracking-tight gradient-text">5BEST.ai</span>
            </Link>
          )}
          {isCollapsed && (
            <Link href="/" className="flex items-center justify-center w-full" data-testid="link-logo-collapsed">
              <img 
                src="/logo.png" 
                alt="5BEST.ai Logo" 
                className="w-8 h-8 object-contain"
              />
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className={`p-2 ${isCollapsed ? 'absolute -right-3 top-4 rounded-full bg-background border border-border' : ''}`}
            data-testid="button-toggle-sidebar"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <Link href="/" data-testid="link-home">
            <Button 
              variant="ghost" 
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
            >
              <Home className="h-4 w-4" />
              {!isCollapsed && <span className="ml-2">Home</span>}
            </Button>
          </Link>

          <Link href="/contests" data-testid="link-contests">
            <Button 
              variant="ghost" 
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
            >
              <Trophy className="h-4 w-4" />
              {!isCollapsed && <span className="ml-2">Contests</span>}
            </Button>
          </Link>

          <Link href="/pricing" data-testid="link-pricing">
            <Button 
              variant="ghost" 
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
            >
              <CreditCard className="h-4 w-4" />
              {!isCollapsed && <span className="ml-2">Pricing</span>}
            </Button>
          </Link>

          {isAuthenticated(user) && (
            <>
              <Link href="/ai-generator" data-testid="link-ai-generator">
                <Button 
                  variant="ghost" 
                  className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
                >
                  <Sparkles className="h-4 w-4" />
                  {!isCollapsed && <span className="ml-2">AI Studio</span>}
                </Button>
              </Link>

              {location !== '/ai-generator' && (
                <Link href="/upload" data-testid="link-upload">
                  <GlassButton className={`w-full ${isCollapsed ? 'px-2 justify-center' : 'px-4 py-2'}`}>
                    <Upload className="h-4 w-4" />
                    {!isCollapsed && <span className="ml-2">Upload</span>}
                  </GlassButton>
                </Link>
              )}
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="border-t border-border/40 p-3 space-y-3">
          {isAuthenticated(user) ? (
            <>
              {/* Wallet Button */}
              <div className={`wallet-adapter-button-trigger ${isCollapsed ? 'flex justify-center' : ''}`} data-testid="wallet-button">
                <WalletMultiButton />
              </div>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className={`w-full p-2 h-auto ${isCollapsed ? 'justify-center' : 'justify-start'}`}
                    data-testid="user-menu"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="gradient-glory text-white font-bold text-xs">
                        {getInitials(user.username)}
                      </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <div className="ml-2 text-left overflow-hidden">
                        <p className="text-sm font-medium truncate">{user.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    )}
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
                  <Link href="/subscription" data-testid="link-subscription">
                    <DropdownMenuItem>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Subscription
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/my-submissions" data-testid="link-my-submissions">
                    <DropdownMenuItem>
                      <Image className="w-4 h-4 mr-2" />
                      My Gallery
                    </DropdownMenuItem>
                  </Link>
                  {isAdmin(user) && (
                    <>
                      <Link href="/admin" data-testid="link-admin">
                        <DropdownMenuItem>
                          <Shield className="w-4 h-4 mr-2" />
                          Admin Dashboard
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/admin/subscription-tiers" data-testid="link-admin-tiers">
                        <DropdownMenuItem>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Subscription Tiers
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className={`space-y-2 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
              <Link href="/login" data-testid="link-login" className="block">
                <Button variant="ghost" className={`w-full ${isCollapsed ? 'px-2' : ''}`}>
                  {isCollapsed ? <User className="h-4 w-4" /> : 'Login'}
                </Button>
              </Link>
              <Link href="/register" data-testid="link-register" className="block">
                <GlassButton className={`w-full ${isCollapsed ? 'px-2 justify-center' : ''}`}>
                  {isCollapsed ? <Sparkles className="h-4 w-4" /> : 'Sign Up'}
                </GlassButton>
              </Link>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
