import { useCart } from "@/store/use-cart";
import { useCreateOrder, useTables } from "@/hooks/use-api";
import { Trash2, ShoppingBag, Utensils, Car, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

export function CartSidebar({ id, className = "" }: { id?: string; className?: string }) {
  const { 
    items, tableId, orderType, 
    setOrderType, updateQuantity, removeItem, clearCart, getTotal 
  } = useCart();
  
  const { data: tables } = useTables();
  const createOrder = useCreateOrder();

  const selectedTable = tables?.find(t => t.id === tableId);
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleCheckout = () => {
    if (items.length === 0) return;
    
    createOrder.mutate({
      tableId: orderType === 'dine-in' ? tableId : null,
      orderType,
      items: items.map(item => ({
        menuItemId: item.menuItem.id,
        variantId: item.variant?.id || null,
        modifiers: item.modifiers.map(m => m.id),
        notes: item.notes || null,
        // Backend API currently accepts flattened structure based on route schema
        // Note: Real POS APIs usually handle quantity by sending multiple items or having a quantity field.
        // Given schema omit quantity, we will unroll quantity into multiple items for this mock.
      })).flatMap(i => {
         // Because schema doesn't have 'quantity', we duplicate the item object 'quantity' times
         const origQuantity = items.find(ci => ci.menuItem.id === i.menuItemId)?.quantity || 1;
         return Array(origQuantity).fill(i);
      })
    }, {
      onSuccess: () => clearCart()
    });
  };

  return (
    <div id={id} className={`w-full xl:w-96 bg-card border-t xl:border-t-0 xl:border-l border-border flex flex-col h-[44vh] xl:h-full shadow-2xl z-20 ${className}`}>
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border bg-card/80 backdrop-blur-md">
        <h2 className="text-lg sm:text-xl font-display font-bold flex items-center mb-3 sm:mb-4">
          <ShoppingBag className="w-5 h-5 mr-2 text-primary" />
          Current Order
        </h2>
        
        {/* Order Type Toggle */}
        <div className="flex p-1 bg-background rounded-lg border border-border/50 overflow-x-auto">
          <button 
            onClick={() => setOrderType('dine-in')}
            className={`flex-1 min-w-[96px] flex items-center justify-center py-1.5 text-sm font-medium rounded-md transition-all ${orderType === 'dine-in' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Utensils className="w-4 h-4 mr-2" /> Dine-in
          </button>
          <button 
            onClick={() => setOrderType('takeaway')}
            className={`flex-1 min-w-[96px] flex items-center justify-center py-1.5 text-sm font-medium rounded-md transition-all ${orderType === 'takeaway' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ShoppingBag className="w-4 h-4 mr-2" /> Pickup
          </button>
          <button 
            onClick={() => setOrderType('delivery')}
            className={`flex-1 min-w-[96px] flex items-center justify-center py-1.5 text-sm font-medium rounded-md transition-all ${orderType === 'delivery' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Car className="w-4 h-4 mr-2" /> Delivery
          </button>
        </div>

        {orderType === 'dine-in' && (
          <div className="mt-3 text-sm bg-primary/10 border border-primary/20 text-primary px-3 py-2 rounded-lg flex items-center justify-between">
            <span>Table Selection</span>
            <span className="font-bold font-mono bg-background px-2 py-0.5 rounded">
              {selectedTable ? `T${selectedTable.number}` : 'None'}
            </span>
          </div>
        )}
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1 p-3 sm:p-4">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground pt-20 opacity-50">
            <ShoppingBag className="w-16 h-16 mb-4" />
            <p>Cart is empty</p>
            <p className="text-sm">Select items from the menu</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="group relative bg-background rounded-xl p-3 border border-border/50 shadow-sm hover:border-primary/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 pr-2">
                    <h4 className="font-bold text-sm leading-tight">{item.menuItem.name}</h4>
                    {item.variant && (
                      <p className="text-xs text-muted-foreground mt-0.5">Size: {item.variant.name}</p>
                    )}
                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.modifiers.map(m => m.name).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-amber-500/80 mt-1 flex items-start">
                        <Info className="w-3 h-3 mr-1 mt-0.5" />
                        {item.notes}
                      </p>
                    )}
                  </div>
                  <div className="font-mono font-bold text-primary">
                    {formatPrice(
                      (item.menuItem.basePrice + 
                      (item.variant?.price || 0) + 
                      item.modifiers.reduce((acc, m) => acc + m.priceAdjustment, 0)) * item.quantity
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center bg-card rounded-md border border-border overflow-hidden h-8">
                    <button onClick={() => updateQuantity(item.id, -1)} className="px-3 hover:bg-white/5 hover:text-primary transition-colors">-</button>
                    <span className="w-8 text-center text-sm font-bold bg-background py-1">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="px-3 hover:bg-white/5 hover:text-primary transition-colors">+</button>
                  </div>
                  <button 
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer / Checkout */}
      <div className="p-3 sm:p-4 border-t border-border bg-card">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono">{formatPrice(getTotal())}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Tax (8%)</span>
            <span className="font-mono">{formatPrice(getTotal() * 0.08)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-border/50">
            <span>Total</span>
            <span className="font-mono text-primary">{formatPrice(getTotal() * 1.08)}</span>
          </div>
        </div>

        <Button 
          onClick={handleCheckout}
          disabled={items.length === 0 || createOrder.isPending || (orderType === 'dine-in' && !tableId)}
          className="w-full h-12 sm:h-14 text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 shadow-lg shadow-primary/20 hover-elevate"
        >
          {createOrder.isPending ? "Sending to Kitchen..." : "Send Order"}
        </Button>
        {orderType === 'dine-in' && !tableId && items.length > 0 && (
          <p className="text-destructive text-xs text-center mt-2 font-medium">Please select a table first</p>
        )}
      </div>
    </div>
  );
}
