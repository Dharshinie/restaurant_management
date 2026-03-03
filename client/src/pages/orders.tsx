import { AppLayout } from "@/components/layout/app-layout";
import { useOrders, useUpdateOrderStatus } from "@/hooks/use-api";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Orders() {
  const { data: orders, isLoading } = useOrders();
  const updateStatus = useUpdateOrderStatus();

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">Open</Badge>;
      case 'paid': return <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">Paid</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'dine-in': return <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">Dine-in</Badge>;
      case 'takeaway': return <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30">Takeaway</Badge>;
      case 'delivery': return <Badge variant="outline" className="bg-teal-500/10 text-teal-400 border-teal-500/30">Delivery</Badge>;
      default: return <Badge variant="secondary">{type}</Badge>;
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full w-full relative z-10 p-3 sm:p-6">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Order History</h1>
          <p className="text-muted-foreground mt-1">Review past and active orders.</p>
        </header>

        <div className="liquid-glass flex-1 border border-white/20 rounded-2xl overflow-hidden shadow-xl">
          <ScrollArea className="h-full">
            <div className="min-w-[760px]">
              <Table>
              <TableHeader className="bg-slate-950/45 sticky top-0 backdrop-blur-md z-10">
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-[100px]">Order ID</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">Loading orders...</TableCell>
                  </TableRow>
                ) : orders?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-32 text-muted-foreground">No orders found.</TableCell>
                  </TableRow>
                ) : (
                  orders?.map((order) => (
                    <TableRow key={order.id} className="border-border hover:bg-white/5 transition-colors">
                      <TableCell className="font-mono font-bold">#{order.id}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {order.createdAt ? format(new Date(order.createdAt), "MMM d, h:mm a") : 'Unknown'}
                      </TableCell>
                      <TableCell>{getTypeBadge(order.orderType)}</TableCell>
                      <TableCell>
                        {order.table ? `T${order.table.number}` : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="text-muted-foreground">{order.items?.length || 0} items</span>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-primary">
                        {formatPrice(order.totalAmount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        {order.status === 'open' && (
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="border-green-500/50 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                              onClick={() => updateStatus.mutate({ id: order.id, status: 'paid' })}
                              disabled={updateStatus.isPending}
                            >
                              Settle Bill
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              onClick={() => updateStatus.mutate({ id: order.id, status: 'cancelled' })}
                              disabled={updateStatus.isPending}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </div>
    </AppLayout>
  );
}
