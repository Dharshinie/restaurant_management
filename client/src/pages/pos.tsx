import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { TableMap } from "@/components/pos/table-map";
import { MenuGrid } from "@/components/pos/menu-grid";
import { CartSidebar } from "@/components/pos/cart-sidebar";

export default function POS() {
  const [activeTab, setActiveTab] = useState<'tables' | 'menu'>('tables');

  return (
    <AppLayout>
      <div className="flex h-full w-full relative z-10">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
          
          {/* Top Mobile/Tablet Tab Switcher */}
          <div className="flex p-4 border-b border-border bg-card/50 backdrop-blur-md shrink-0">
            <div className="bg-background rounded-xl p-1 flex border border-border/50">
              <button
                onClick={() => setActiveTab('tables')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'tables' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Floor Plan
              </button>
              <button
                onClick={() => setActiveTab('menu')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'menu' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Menu
              </button>
            </div>
          </div>

          {/* View Area */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'tables' ? (
              <div className="h-full overflow-y-auto">
                <TableMap onTableSelect={() => setActiveTab('menu')} />
              </div>
            ) : (
              <MenuGrid />
            )}
          </div>
        </div>

        {/* Right Sidebar - Cart */}
        <CartSidebar />
      </div>
    </AppLayout>
  );
}
