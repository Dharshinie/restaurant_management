import { useState } from "react";
import { useMenu } from "@/hooks/use-api";
import { useCart } from "@/store/use-cart";
import { Plus, Check } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MenuItemWithDetails, MenuVariant, MenuModifier } from "@shared/schema";

export function MenuGrid() {
  const { data: menu, isLoading } = useMenu();
  const { addItem } = useCart();
  
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [selectedItem, setSelectedItem] = useState<MenuItemWithDetails | null>(null);
  
  // Dialog State
  const [selectedVariant, setSelectedVariant] = useState<MenuVariant | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<MenuModifier[]>([]);
  const [itemNotes, setItemNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading menu...</div>;

  const categories = ["All", ...Array.from(new Set(menu?.map(item => item.category) || []))];
  const filteredMenu = activeCategory === "All" 
    ? menu 
    : menu?.filter(item => item.category === activeCategory);

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const openConfigurator = (item: MenuItemWithDetails) => {
    setSelectedItem(item);
    setSelectedVariant(item.variants.length > 0 ? item.variants[0] : null);
    setSelectedModifiers([]);
    setItemNotes("");
    setQuantity(1);
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;
    
    addItem({
      menuItem: selectedItem,
      variant: selectedVariant,
      modifiers: selectedModifiers,
      notes: itemNotes,
      quantity,
    });
    
    setSelectedItem(null);
  };

  const toggleModifier = (mod: MenuModifier) => {
    setSelectedModifiers(prev => 
      prev.some(m => m.id === mod.id)
        ? prev.filter(m => m.id !== mod.id)
        : [...prev, mod]
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Category Tabs */}
      <div className="p-3 sm:p-4 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`
                px-5 py-2 rounded-full font-medium whitespace-nowrap transition-all duration-200
                ${activeCategory === cat 
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25' 
                  : 'bg-card text-muted-foreground hover:bg-white/5 hover:text-foreground border border-border'
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <ScrollArea className="flex-1 p-3 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredMenu?.map((item) => (
            <button
              key={item.id}
              onClick={() => openConfigurator(item)}
              className="group relative flex flex-col text-left bg-card border border-border/50 rounded-2xl p-4 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 hover:border-primary/50 focus:outline-none"
            >
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:scale-110">
                <Plus className="w-5 h-5" />
              </div>
              
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-2">
                {item.category}
              </span>
              <h3 className="font-display font-bold text-base sm:text-lg text-foreground mb-1 leading-tight">
                {item.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                {item.description}
              </p>
              
              <div className="mt-auto font-mono font-bold text-primary text-lg">
                {formatPrice(item.basePrice)}
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>

      {/* Configurator Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[500px] bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">{selectedItem?.name}</DialogTitle>
            <p className="text-muted-foreground text-sm">{selectedItem?.description}</p>
          </DialogHeader>

          {selectedItem && (
            <div className="py-4 space-y-6">
              {/* Variants */}
              {selectedItem.variants.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Size / Variant</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.variants.map(variant => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariant(variant)}
                        className={`
                          px-4 py-3 rounded-xl border flex items-center justify-between transition-all
                          ${selectedVariant?.id === variant.id 
                            ? 'bg-primary/10 border-primary text-primary' 
                            : 'bg-background border-border hover:bg-white/5'}
                        `}
                      >
                        <span className="font-medium">{variant.name}</span>
                        <span className="font-mono text-sm opacity-80">+{formatPrice(variant.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Modifiers */}
              {selectedItem.modifiers.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Add-ons</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedItem.modifiers.map(mod => {
                      const isSelected = selectedModifiers.some(m => m.id === mod.id);
                      return (
                        <button
                          key={mod.id}
                          onClick={() => toggleModifier(mod)}
                          className={`
                            px-4 py-2.5 rounded-xl border flex items-center justify-between transition-all
                            ${isSelected 
                              ? 'bg-accent border-accent-foreground/20 text-accent-foreground' 
                              : 'bg-background border-border hover:bg-white/5'}
                          `}
                        >
                          <div className="flex items-center">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2 ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm font-medium">{mod.name}</span>
                          </div>
                          <span className="font-mono text-xs opacity-70">
                            {mod.priceAdjustment > 0 ? '+' : ''}{formatPrice(mod.priceAdjustment)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes & Quantity */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Special Instructions</h4>
                  <Input 
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    placeholder="No onions, extra spicy..."
                    className="bg-background border-border"
                  />
                </div>
                <div className="w-full sm:w-32">
                  <h4 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Quantity</h4>
                  <div className="flex items-center h-10 border border-border rounded-md bg-background">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 hover:text-primary">-</button>
                    <span className="flex-1 text-center font-bold">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="px-3 hover:text-primary">+</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedItem(null)}>Cancel</Button>
            <Button 
              onClick={handleAddToCart}
              className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white shadow-lg shadow-primary/25"
            >
              Add to Order - {formatPrice(
                (selectedItem?.basePrice || 0) + 
                (selectedVariant?.price || 0) + 
                selectedModifiers.reduce((acc, m) => acc + m.priceAdjustment, 0) * quantity
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
