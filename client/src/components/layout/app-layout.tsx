import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ListOrdered,
  Settings,
  ChefHat,
  ShieldCheck,
  Menu
} from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import { api } from "@shared/routes";
import { useCart } from "@/store/use-cart";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isConnected } = useWebSocket();
  const [role, setRole] = useState<"staff" | "admin" | "user">("staff");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const queryClient = useQueryClient();
  const clearCart = useCart((state) => state.clearCart);

  useEffect(() => {
    const savedRole = window.localStorage.getItem("culina_user_role");
    if (savedRole === "admin" || savedRole === "staff" || savedRole === "user") {
      setRole(savedRole);
      return;
    }
    window.localStorage.setItem("culina_user_role", "staff");
  }, []);

  const navItems = [
    { name: "POS Terminal", path: "/pos", icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: "Kitchen Display", path: "/kds", icon: <ChefHat className="w-5 h-5" /> },
    { name: "Order History", path: "/orders", icon: <ListOrdered className="w-5 h-5" /> },
    ...(role === "admin"
      ? [{ name: "Admin Dashboard", path: "/admin", icon: <ShieldCheck className="w-5 h-5" /> }]
      : []),
  ];

  const setUserRole = (nextRole: "staff" | "admin" | "user") => {
    setRole(nextRole);
    window.localStorage.setItem("culina_user_role", nextRole);
    window.dispatchEvent(new CustomEvent("culina_role_changed", { detail: nextRole }));
  };

  const refreshData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [api.tables.list.path] }),
      queryClient.invalidateQueries({ queryKey: [api.menu.list.path] }),
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] }),
      queryClient.invalidateQueries({ queryKey: [api.orderItems.listPending.path] }),
      queryClient.invalidateQueries({ queryKey: [api.analytics.summary.path] }),
    ]);
  };

  const SidebarContent = ({ closeOnNavigate = false }: { closeOnNavigate?: boolean }) => (
    <>
      <div>
        <div className="h-14 md:h-16 px-4 flex items-center justify-between md:justify-center lg:justify-start lg:px-6 border-b border-border">
          <UtensilsCrossed className="w-8 h-8 text-primary" />
          <span className={`ml-3 font-display font-bold text-xl text-gradient ${closeOnNavigate ? "block" : "hidden lg:block"}`}>
            Culina Suite
          </span>
          <div className={`w-2.5 h-2.5 rounded-full shadow-lg md:hidden ${isConnected ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'} animate-pulse`} />
        </div>
        
        <nav className={`p-2 md:p-3 md:space-y-2 md:mt-4 gap-2 ${closeOnNavigate ? "flex flex-col overflow-y-auto" : "flex md:block overflow-x-auto"}`}>
          {navItems.map((item) => {
            const isActive = location.startsWith(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className="block shrink-0"
                onClick={() => closeOnNavigate && setMobileNavOpen(false)}
              >
                <div className={`
                  flex items-center p-2.5 md:p-3 rounded-xl transition-all duration-200 group cursor-pointer min-w-[52px] md:min-w-0
                  ${isActive 
                    ? 'bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                  }
                `}>
                  <div className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-200`}>
                    {item.icon}
                  </div>
                  <span className={`ml-3 font-medium ${closeOnNavigate ? "block" : "hidden lg:block"}`}>
                    {item.name}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 md:p-4 border-t border-border">
        <div className="mb-3 md:mb-4">
          <p className={`text-[11px] uppercase tracking-wider text-muted-foreground mb-2 px-2 ${closeOnNavigate ? "block" : "hidden lg:block"}`}>
            Access Role
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                role === "staff"
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground border-border hover:bg-white/5"
              }`}
              onClick={() => setUserRole("staff")}
            >
              Staff
            </button>
            <button
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                role === "admin"
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground border-border hover:bg-white/5"
              }`}
              onClick={() => setUserRole("admin")}
            >
              Admin
            </button>
            <button
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                role === "user"
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "text-muted-foreground border-border hover:bg-white/5"
              }`}
              onClick={() => setUserRole("user")}
            >
              User
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center lg:justify-start lg:px-2 mb-4">
          <div className={`w-3 h-3 rounded-full shadow-lg ${isConnected ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'} animate-pulse`} />
          <span className={`ml-2 text-xs font-medium text-muted-foreground ${closeOnNavigate ? "block" : "hidden lg:block"}`}>
            {isConnected ? 'System Online' : 'Offline Mode'}
          </span>
        </div>
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetTrigger asChild>
            <button className="w-full flex items-center justify-center lg:justify-start p-3 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors cursor-pointer">
              <Settings className="w-5 h-5" />
              <span className={`ml-3 font-medium ${closeOnNavigate ? "block" : "hidden lg:block"}`}>Settings</span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="liquid-glass z-[80] w-[92vw] sm:w-[440px] sm:max-w-[440px] border-l border-white/30 bg-slate-950/95 text-foreground shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
          >
            <SheetHeader>
              <SheetTitle className="font-display">Settings</SheetTitle>
              <SheetDescription>Manage role and sync runtime data.</SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6 rounded-2xl border border-white/20 bg-slate-900/70 p-4">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Access Role</p>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={role === "staff" ? "default" : "outline"}
                    onClick={() => setUserRole("staff")}
                  >
                    Staff
                  </Button>
                  <Button
                    type="button"
                    variant={role === "admin" ? "default" : "outline"}
                    onClick={() => setUserRole("admin")}
                  >
                    Admin
                  </Button>
                  <Button
                    type="button"
                    variant={role === "user" ? "default" : "outline"}
                    onClick={() => setUserRole("user")}
                  >
                    User
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">System Status</p>
                <div className="rounded-xl border border-border bg-background/60 p-3 text-sm flex items-center justify-between">
                  <span>{isConnected ? "Realtime channel connected" : "Realtime channel disconnected"}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <Button type="button" onClick={refreshData}>Refresh Data</Button>
                <Button type="button" variant="outline" onClick={() => clearCart()}>
                  Clear Current Cart
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );

  return (
    <div className="liquid-atmosphere flex h-screen w-full flex-col md:flex-row bg-background overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="liquid-glass hidden md:flex w-20 lg:w-64 border-r border-white/20 flex-col justify-between transition-all duration-300 shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
        <div className="liquid-glass md:hidden h-14 px-3 border-b border-white/20 flex items-center justify-between shrink-0">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="liquid-glass w-[84vw] max-w-[320px] p-0 border-white/20 bg-transparent">
              <div className="h-full flex flex-col justify-between">
                <SidebarContent closeOnNavigate />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center">
            <UtensilsCrossed className="w-5 h-5 text-primary" />
            <span className="ml-2 font-display font-semibold text-sm">Culina Suite</span>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full shadow-lg ${isConnected ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'} animate-pulse`} />
        </div>

        {/* Subtle background glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-400/20 rounded-full blur-[120px] pointer-events-none" />
        
        {children}
      </main>
    </div>
  );
}
