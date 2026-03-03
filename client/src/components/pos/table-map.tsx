import { useTables } from "@/hooks/use-api";
import { useCart } from "@/store/use-cart";
import { Users, Receipt, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function TableMap({
  onTableSelect,
  canSelect = true,
}: {
  onTableSelect: () => void;
  canSelect?: boolean;
}) {
  const { data: tables, isLoading } = useTables();
  const { tableId: selectedTableId, setTableId, setOrderType } = useCart();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 p-3 sm:p-6">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-28 sm:h-32 rounded-2xl bg-card border border-border" />
        ))}
      </div>
    );
  }

  const handleSelect = (id: number) => {
    if (!canSelect) return;
    setTableId(id);
    setOrderType('dine-in');
    onTableSelect();
  };

  return (
    <div className="p-3 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-display font-bold mb-4 sm:mb-6 text-foreground flex items-center">
        Floor Plan
        <span className="ml-3 px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs font-mono text-muted-foreground">
          {tables?.length || 0} Tables
        </span>
      </h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {tables?.map((table) => {
          let cardClass = "border-emerald-300/45 bg-slate-950/52 shadow-[0_10px_24px_rgba(3,8,30,0.45)]";
          let accentClass = "text-emerald-200";
          let chipClass = "bg-emerald-400/16 border-emerald-300/40 text-emerald-100";
          let StatusIcon = CheckCircle2;
          
          if (table.status === 'occupied') {
            cardClass = "border-rose-300/45 bg-slate-950/52 shadow-[0_10px_24px_rgba(36,8,18,0.45)]";
            accentClass = "text-rose-200";
            chipClass = "bg-rose-400/18 border-rose-300/40 text-rose-100";
            StatusIcon = Users;
          } else if (table.status === 'bill_requested') {
            cardClass = "border-amber-300/45 bg-slate-950/52 shadow-[0_10px_24px_rgba(40,22,5,0.45)]";
            accentClass = "text-amber-200";
            chipClass = "bg-amber-400/18 border-amber-300/40 text-amber-100";
            StatusIcon = Receipt;
          }

          const isSelected = selectedTableId === table.id;

          return (
            <button
              key={table.id}
              onClick={() => handleSelect(table.id)}
              disabled={!canSelect}
              className={`
                liquid-glass relative p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center h-28 sm:h-32
                hover-elevate focus:outline-none focus:ring-4 focus:ring-primary/20
                disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100
                ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-transparent scale-105 z-10' : ''}
                ${cardClass}
              `}
            >
              <span className="absolute top-2 left-3 font-display font-bold text-lg text-white/85">
                T{table.number}
              </span>
              
              <StatusIcon className={`w-8 h-8 mb-2 ${accentClass} ${isSelected ? 'animate-bounce' : ''}`} />
              
              <span className={`font-medium text-sm capitalize px-2 py-0.5 rounded-md border ${chipClass}`}>
                {table.status.replace('_', ' ')}
              </span>
              
              <span className="absolute bottom-2 right-3 text-xs text-slate-200/90 max-w-[80%] truncate">
                {table.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
