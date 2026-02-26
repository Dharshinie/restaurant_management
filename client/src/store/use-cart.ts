import { create } from 'zustand';
import type { MenuItemWithDetails, MenuVariant, MenuModifier } from '@shared/schema';

export interface CartItem {
  id: string; // Unique local ID
  menuItem: MenuItemWithDetails;
  variant: MenuVariant | null;
  modifiers: MenuModifier[];
  notes: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  tableId: number | null;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  setTableId: (id: number | null) => void;
  setOrderType: (type: 'dine-in' | 'takeaway' | 'delivery') => void;
  clearCart: () => void;
  
  getTotal: () => number;
}

export const useCart = create<CartState>((set, get) => ({
  items: [],
  tableId: null,
  orderType: 'dine-in',

  addItem: (newItem) => set((state) => ({ 
    items: [...state.items, { ...newItem, id: Math.random().toString(36).substring(7) }] 
  })),
  
  removeItem: (id) => set((state) => ({ 
    items: state.items.filter(item => item.id !== id) 
  })),
  
  updateQuantity: (id, delta) => set((state) => ({
    items: state.items.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQuantity };
      }
      return item;
    })
  })),
  
  setTableId: (tableId) => set({ tableId }),
  setOrderType: (orderType) => set({ orderType }),
  
  clearCart: () => set({ items: [], tableId: null }),
  
  getTotal: () => {
    const { items } = get();
    return items.reduce((total, item) => {
      let itemTotal = item.menuItem.basePrice;
      if (item.variant) itemTotal += item.variant.price;
      item.modifiers.forEach(mod => itemTotal += mod.priceAdjustment);
      return total + (itemTotal * item.quantity);
    }, 0);
  }
}));
