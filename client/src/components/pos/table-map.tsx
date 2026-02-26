import { useTables } from "@/hooks/use-api";
import { useCart } from "@/store/use-cart";
import { Users, Receipt, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function TableMap({ onTableSelect }: { onTableSelect: () => void }) {
  const { data: tables, isLoading } = useTables();
  const { tableId: selectedTableId, setTableId, setOrderType } = useCart();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-6">
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl bg-card border border-border" />
        ))}
      </div>
    );
  }

  const handleSelect = (id: number) => {
    setTableId(id);
    setOrderType('dine-in');
    onTableSelect();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-display font-bold mb-6 text-foreground flex items-center">
        Floor Plan
        <span className="ml-3 px-2 py-1 bg-white/5 border border-white/10 rounded-md text-xs font-mono text-muted-foreground">
          {tables?.length || 0} Tables
        </span>
      </h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
        {tables?.map((table) => {
          let statusColor = "border-green-500/30 bg-green-500/10 text-green-400";
          let StatusIcon = CheckCircle2;
          
          if (table.status === 'occupied') {
            statusColor = "border-red-500/30 bg-red-500/10 text-red-400";
            StatusIcon = Users;
          } else if (table.status === 'bill_requested') {
            statusColor = "border-amber-500/30 bg-amber-500/10 text-amber-400";
            StatusIcon = Receipt;
          }

          const isSelected = selectedTableId === table.id;

          return (
            <button
              key={table.id}
              onClick={() => handleSelect(table.id)}
              className={`
                relative p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center justify-center h-32
                hover-elevate focus:outline-none focus:ring-4 focus:ring-primary/20
                ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 z-10' : ''}
                ${statusColor}
              `}
            >
              <span className="absolute top-2 left-3 font-display font-bold text-lg opacity-50">
                T{table.number}
              </span>
              
              <StatusIcon className={`w-8 h-8 mb-2 ${isSelected ? 'animate-bounce' : ''}`} />
              
              <span className="font-medium text-sm capitalize">
                {table.status.replace('_', ' ')}
              </span>
              
              <span className="absolute bottom-2 right-3 text-xs opacity-60 max-w-[80%] truncate">
                {table.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
