import { useEffect, useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { Clock, ChefHat, CheckCircle2, AlertTriangle } from "lucide-react";
import { useUpdateOrderItemStatus } from "@/hooks/use-api";
import type { OrderItemWithDetails } from "@shared/schema";

export function KdsCard({ item }: { item: OrderItemWithDetails }) {
  const [elapsed, setElapsed] = useState("");
  const [isDelayed, setIsDelayed] = useState(false);
  const updateStatus = useUpdateOrderItemStatus();

  // Timer logic
  useEffect(() => {
    const calculateTime = () => {
      const created = new Date(item.createdAt || Date.now());
      setElapsed(formatDistanceToNowStrict(created));
      
      const diffMins = (Date.now() - created.getTime()) / 1000 / 60;
      setIsDelayed(diffMins > 15 && item.status !== 'ready' && item.status !== 'served');
    };

    calculateTime();
    const interval = setInterval(calculateTime, 60000); // update every minute
    return () => clearInterval(interval);
  }, [item.createdAt, item.status]);

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({ id: item.id, status: newStatus });
  };

  const getStatusColor = () => {
    if (item.status === 'pending') return 'bg-slate-800 border-slate-700';
    if (item.status === 'preparing') return 'bg-blue-900/40 border-blue-500/30';
    if (item.status === 'ready') return 'bg-green-900/40 border-green-500/30';
    return 'bg-card border-border';
  };

  return (
    <div className={`p-4 rounded-xl border-2 transition-all duration-300 shadow-md ${getStatusColor()} ${isDelayed ? 'animate-pulse border-red-500/50 shadow-red-500/20' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Order #{item.orderId}
          </span>
          <h3 className="font-display font-bold text-lg leading-tight mt-1">
            {item.menuItem.name}
          </h3>
        </div>
        <div className={`flex items-center px-2 py-1 rounded-md text-xs font-mono font-bold ${isDelayed ? 'bg-red-500/20 text-red-400' : 'bg-background text-muted-foreground'}`}>
          <Clock className="w-3 h-3 mr-1" />
          {elapsed}
        </div>
      </div>

      <div className="space-y-1 mb-4">
        {item.variant && (
          <div className="text-sm font-medium text-foreground bg-white/5 inline-block px-2 py-0.5 rounded">
            Size: {item.variant.name}
          </div>
        )}
        {item.modifierDetails && item.modifierDetails.length > 0 && (
          <div className="text-sm text-amber-200/90 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
            <span className="font-bold mr-1">+</span>
            {item.modifierDetails.map(m => m.name).join(', ')}
          </div>
        )}
        {item.notes && (
          <div className="text-sm text-red-300 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 flex items-start mt-2">
            <AlertTriangle className="w-4 h-4 mr-1 shrink-0 mt-0.5" />
            <span className="italic">"{item.notes}"</span>
          </div>
        )}
      </div>

      <div className="flex space-x-2 mt-auto pt-3 border-t border-white/10">
        {item.status === 'pending' && (
          <button 
            onClick={() => handleStatusChange('preparing')}
            disabled={updateStatus.isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center shadow-lg shadow-blue-900/50"
          >
            <ChefHat className="w-4 h-4 mr-2" /> Start
          </button>
        )}
        {item.status === 'preparing' && (
          <button 
            onClick={() => handleStatusChange('ready')}
            disabled={updateStatus.isPending}
            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center shadow-lg shadow-green-900/50"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Ready
          </button>
        )}
        {item.status === 'ready' && (
          <button 
            onClick={() => handleStatusChange('served')}
            disabled={updateStatus.isPending}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-medium transition-colors"
          >
            Clear (Served)
          </button>
        )}
      </div>
    </div>
  );
}
