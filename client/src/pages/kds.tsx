import { AppLayout } from "@/components/layout/app-layout";
import { usePendingOrderItems } from "@/hooks/use-api";
import { KdsCard } from "@/components/kds/kds-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Flame, ChefHat, CheckCircle } from "lucide-react";

export default function KDS() {
  const { data: items, isLoading } = usePendingOrderItems();

  const pending = items?.filter(i => i.status === 'pending') || [];
  const preparing = items?.filter(i => i.status === 'preparing') || [];
  const ready = items?.filter(i => i.status === 'ready') || [];

  return (
    <AppLayout>
      <div className="flex flex-col h-full w-full relative z-10 p-3 sm:p-6">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Kitchen Display System</h1>
          <p className="text-muted-foreground mt-1">Live order synchronization.</p>
        </header>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 overflow-hidden">
          
          {/* Column: Pending */}
          <div className="liquid-glass flex flex-col border border-white/20 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="p-4 border-b border-white/20 bg-slate-950/55 flex items-center justify-between">
              <h2 className="font-bold flex items-center text-slate-100">
                <Flame className="w-5 h-5 mr-2 text-slate-300" /> New Orders
              </h2>
              <span className="bg-slate-800/80 text-slate-100 px-2 py-0.5 rounded text-sm font-mono">{pending.length}</span>
            </div>
            <ScrollArea className="flex-1 p-4">
              {isLoading ? <p className="text-muted-foreground p-4 text-center">Loading...</p> : (
                <div className="space-y-4">
                  {pending.map(item => <KdsCard key={item.id} item={item} />)}
                  {pending.length === 0 && <p className="text-muted-foreground text-center pt-10 opacity-50 italic">No pending items</p>}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Column: Preparing */}
          <div className="liquid-glass flex flex-col border border-white/20 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="p-4 border-b border-white/20 bg-blue-950/35 flex items-center justify-between">
              <h2 className="font-bold flex items-center text-blue-200">
                <ChefHat className="w-5 h-5 mr-2 text-blue-300" /> Preparing
              </h2>
              <span className="bg-blue-900/60 text-blue-100 px-2 py-0.5 rounded text-sm font-mono">{preparing.length}</span>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {preparing.map(item => <KdsCard key={item.id} item={item} />)}
                {preparing.length === 0 && !isLoading && <p className="text-muted-foreground text-center pt-10 opacity-50 italic">Nothing being prepared</p>}
              </div>
            </ScrollArea>
          </div>

          {/* Column: Ready */}
          <div className="liquid-glass flex flex-col border border-white/20 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="p-4 border-b border-white/20 bg-green-950/30 flex items-center justify-between">
              <h2 className="font-bold flex items-center text-green-200">
                <CheckCircle className="w-5 h-5 mr-2 text-green-300" /> Ready to Serve
              </h2>
              <span className="bg-green-900/60 text-green-100 px-2 py-0.5 rounded text-sm font-mono">{ready.length}</span>
            </div>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {ready.map(item => <KdsCard key={item.id} item={item} />)}
                {ready.length === 0 && !isLoading && <p className="text-muted-foreground text-center pt-10 opacity-50 italic">No items ready</p>}
              </div>
            </ScrollArea>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
