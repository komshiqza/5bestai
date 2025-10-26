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
  Menu,
  Info,
  Map,
  MessageCircle,
  HelpCircle,
  FileText
} from "lucide-react";

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

        {/* Footer Links Menu */}
        <div className="border-t border-border/40 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
                data-testid="footer-menu"
              >
                <Info className="h-4 w-4" />
                {!isCollapsed && <span className="ml-2">More Links</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {/* Platform Section */}
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Platform</p>
              </div>
              <Link href="/contests" data-testid="footer-link-contests">
                <DropdownMenuItem>
                  <Trophy className="w-4 h-4 mr-2" />
                  Contests
                </DropdownMenuItem>
              </Link>
              <Link href="/roadmap" data-testid="footer-link-roadmap">
                <DropdownMenuItem>
                  <Map className="w-4 h-4 mr-2" />
                  Roadmap
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem>
                <FileText className="w-4 h-4 mr-2" />
                How It Works
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="w-4 h-4 mr-2" />
                Rules
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Community Section */}
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Community</p>
              </div>
              <DropdownMenuItem>
                <MessageCircle className="w-4 h-4 mr-2" />
                Discord
              </DropdownMenuItem>
              <DropdownMenuItem>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Twitter
              </DropdownMenuItem>
              <DropdownMenuItem>
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Instagram
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="w-4 h-4 mr-2" />
                Blog
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Support Section */}
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Support</p>
              </div>
              <DropdownMenuItem>
                <HelpCircle className="w-4 h-4 mr-2" />
                Help Center
              </DropdownMenuItem>
              <DropdownMenuItem>
                <MessageCircle className="w-4 h-4 mr-2" />
                Contact Us
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="w-4 h-4 mr-2" />
                Privacy Policy
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="w-4 h-4 mr-2" />
                Terms of Service
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* User Section */}
        <div className="border-t border-border/40 p-3 space-y-3">
          {isAuthenticated(user) ? (
            <>
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
