import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ListOrdered,
  Settings,
  ChefHat
} from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isConnected } = useWebSocket();

  const navItems = [
    { name: "POS Terminal", path: "/pos", icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: "Kitchen Display", path: "/kds", icon: <ChefHat className="w-5 h-5" /> },
    { name: "Order History", path: "/orders", icon: <ListOrdered className="w-5 h-5" /> },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-card border-r border-border flex flex-col justify-between transition-all duration-300">
        <div>
          <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-border">
            <UtensilsCrossed className="w-8 h-8 text-primary" />
            <span className="ml-3 font-display font-bold text-xl hidden lg:block text-gradient">
              Culina Suite
            </span>
          </div>
          
          <nav className="p-3 space-y-2 mt-4">
            {navItems.map((item) => {
              const isActive = location.startsWith(item.path);
              return (
                <Link key={item.path} href={item.path} className="block">
                  <div className={`
                    flex items-center p-3 rounded-xl transition-all duration-200 group cursor-pointer
                    ${isActive 
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]' 
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                    }
                  `}>
                    <div className={`${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-200`}>
                      {item.icon}
                    </div>
                    <span className="ml-3 font-medium hidden lg:block">
                      {item.name}
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-center lg:justify-start lg:px-2 mb-4">
            <div className={`w-3 h-3 rounded-full shadow-lg ${isConnected ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'} animate-pulse`} />
            <span className="ml-2 text-xs font-medium text-muted-foreground hidden lg:block">
              {isConnected ? 'System Online' : 'Offline Mode'}
            </span>
          </div>
          <button className="w-full flex items-center justify-center lg:justify-start p-3 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors cursor-pointer">
            <Settings className="w-5 h-5" />
            <span className="ml-3 font-medium hidden lg:block">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
        
        {children}
      </main>
    </div>
  );
}
