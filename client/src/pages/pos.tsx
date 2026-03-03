import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { TableMap } from "@/components/pos/table-map";
import { MenuGrid } from "@/components/pos/menu-grid";
import { CartSidebar } from "@/components/pos/cart-sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

export default function POS() {
  const [activeTab, setActiveTab] = useState<'tables' | 'menu'>('tables');
  const [mobileSection, setMobileSection] = useState<'tables' | 'menu' | 'current-order'>('tables');
  const [role, setRole] = useState<"staff" | "admin" | "user">("staff");
  const isMobile = useIsMobile();
  const tablesRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const currentOrderRef = useRef<HTMLDivElement | null>(null);
  const canSelectPosSections = role === "staff" || role === "admin" || role === "user";

  const scrollToSection = (section: 'tables' | 'menu' | 'current-order') => {
    const targetRef =
      section === "tables"
        ? tablesRef
        : section === "menu"
          ? menuRef
          : currentOrderRef;

    targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goToMobileSection = (section: 'tables' | 'menu' | 'current-order') => {
    setMobileSection(section);
    setTimeout(() => scrollToSection(section), 120);
  };

  const handleTableSelect = () => {
    setActiveTab("menu");
    if (isMobile) {
      goToMobileSection("menu");
    }
  };

  const handleItemAdded = () => {
    if (isMobile) {
      goToMobileSection("current-order");
      return;
    }
    setTimeout(() => scrollToSection("current-order"), 120);
  };

  useEffect(() => {
    if (!isMobile) return;
    setTimeout(() => scrollToSection(mobileSection), 80);
  }, [isMobile, mobileSection]);

  useEffect(() => {
    const loadRole = () => {
      const savedRole = window.localStorage.getItem("culina_user_role");
      if (savedRole === "admin" || savedRole === "staff" || savedRole === "user") {
        setRole(savedRole);
      } else {
        setRole("staff");
      }
    };

    const onRoleChanged = () => loadRole();
    loadRole();
    window.addEventListener("storage", onRoleChanged);
    window.addEventListener("culina_role_changed", onRoleChanged as EventListener);

    return () => {
      window.removeEventListener("storage", onRoleChanged);
      window.removeEventListener("culina_role_changed", onRoleChanged as EventListener);
    };
  }, []);

  return (
    <AppLayout>
      <div className="flex h-full w-full relative z-10 flex-col xl:flex-row overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
          
          {/* Top Mobile/Tablet Tab Switcher */}
          <div className="liquid-glass flex p-3 sm:p-4 border-b border-white/20 shrink-0">
            <div className="bg-slate-950/45 rounded-xl p-1 flex border border-white/20 w-full sm:w-auto">
              <button
                onClick={() => {
                  setActiveTab('tables');
                  if (isMobile) {
                    goToMobileSection("tables");
                  }
                }}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-all ${(isMobile ? mobileSection === 'tables' : activeTab === 'tables') ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Floor Plan
              </button>
              <button
                onClick={() => {
                  setActiveTab('menu');
                  if (isMobile) {
                    goToMobileSection("menu");
                  }
                }}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-sm sm:text-base font-medium transition-all ${(isMobile ? mobileSection === 'menu' : activeTab === 'menu') ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Menu
              </button>
              {isMobile && (
                <button
                  onClick={() => goToMobileSection("current-order")}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mobileSection === 'current-order' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Current
                </button>
              )}
            </div>
          </div>
          {/* View Area */}
          <div className="flex-1 overflow-hidden">
            {isMobile ? (
              <div className="h-full overflow-y-auto">
                {mobileSection === "tables" && (
                  <div ref={tablesRef} className="h-full">
                    <TableMap onTableSelect={handleTableSelect} canSelect={canSelectPosSections} />
                  </div>
                )}
                {mobileSection === "menu" && (
                  <div ref={menuRef} className="h-full">
                    <MenuGrid onItemAdded={handleItemAdded} canSelectItems={canSelectPosSections} />
                  </div>
                )}
                {mobileSection === "current-order" && (
                  <div ref={currentOrderRef} className="h-full">
                    <CartSidebar id="current-order-mobile" className="h-full border-t-0" />
                  </div>
                )}
              </div>
            ) : activeTab === 'tables' ? (
              <div ref={tablesRef} className="h-full overflow-y-auto">
                <TableMap onTableSelect={handleTableSelect} canSelect={canSelectPosSections} />
              </div>
            ) : (
              <div ref={menuRef} className="h-full">
                <MenuGrid onItemAdded={handleItemAdded} canSelectItems={canSelectPosSections} />
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Cart (Desktop/Tablet) */}
        {!isMobile && (
          <div ref={currentOrderRef} className="w-full xl:w-auto shrink-0">
            <CartSidebar id="current-order" className="h-[42vh] md:h-[44vh] xl:h-full" />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
