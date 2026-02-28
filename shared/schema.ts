import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull().default('vacant'), // 'vacant', 'occupied', 'bill_requested'
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // e.g., 'Drinks', 'Pizzas', 'Mains'
  basePrice: integer("base_price").notNull(), // in cents
});

export const menuVariants = pgTable("menu_variants", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull(),
  name: text("name").notNull(), // e.g., 'Small', 'Medium', 'Large'
  price: integer("price").notNull(), // absolute price in cents
});

export const menuModifiers = pgTable("menu_modifiers", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull(),
  name: text("name").notNull(), // e.g., 'Add Cheese'
  priceAdjustment: integer("price_adjustment").notNull(), // in cents
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id"), // Null for takeaway/delivery
  orderType: text("order_type").notNull().default('dine-in'), // 'dine-in', 'takeaway', 'delivery'
  status: text("status").notNull().default('open'), // 'open', 'paid', 'cancelled'
  totalAmount: integer("total_amount").notNull().default(0), // in cents
  inventoryDeducted: boolean("inventory_deducted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  menuItemId: integer("menu_item_id").notNull(),
  variantId: integer("variant_id"), // Optional
  modifiers: integer("modifiers").array(), // Array of modifier IDs
  status: text("status").notNull().default('pending'), // 'pending', 'preparing', 'ready', 'served'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ingredients = pgTable("ingredients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("unit"), // e.g., 'g', 'ml', 'pcs'
  currentStock: integer("current_stock").notNull().default(0),
  minimumThreshold: integer("minimum_threshold").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").notNull(),
  ingredientId: integer("ingredient_id").notNull(),
  quantityRequired: integer("quantity_required").notNull(), // base unit quantity
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  ingredientId: integer("ingredient_id").notNull(),
  quantityRequested: integer("quantity_requested").notNull(),
  status: text("status").notNull().default("open"), // 'open', 'ordered', 'received'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTableSchema = createInsertSchema(tables).omit({ id: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });
export const insertMenuVariantSchema = createInsertSchema(menuVariants).omit({ id: true });
export const insertMenuModifierSchema = createInsertSchema(menuModifiers).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, inventoryDeducted: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true, createdAt: true });
export const insertIngredientSchema = createInsertSchema(ingredients).omit({ id: true, createdAt: true });
export const insertRecipeIngredientSchema = createInsertSchema(recipeIngredients).omit({ id: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true, createdAt: true });

export type Table = typeof tables.$inferSelect;
export type InsertTable = z.infer<typeof insertTableSchema>;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuVariant = typeof menuVariants.$inferSelect;
export type InsertMenuVariant = z.infer<typeof insertMenuVariantSchema>;
export type MenuModifier = typeof menuModifiers.$inferSelect;
export type InsertMenuModifier = z.infer<typeof insertMenuModifierSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Ingredient = typeof ingredients.$inferSelect;
export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;
export type InsertRecipeIngredient = z.infer<typeof insertRecipeIngredientSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;

// Explicit API Contract Types
export type UpdateTableRequest = Partial<InsertTable>;
export type UpdateOrderRequest = Partial<InsertOrder>;
export type UpdateOrderItemRequest = Partial<InsertOrderItem>;
export type UpdateIngredientRequest = Partial<InsertIngredient>;
export type UpdateMenuItemRequest = Partial<InsertMenuItem>;

export type CreateOrderRequest = InsertOrder & {
  items: (InsertOrderItem & { modifiers?: number[] })[];
};

export type SetRecipeRequest = {
  menuItemId: number;
  ingredients: { ingredientId: number; quantityRequired: number }[];
};

export type MenuItemWithDetails = MenuItem & {
  variants: MenuVariant[];
  modifiers: MenuModifier[];
};

export type OrderItemWithDetails = OrderItem & {
  menuItem: MenuItem;
  variant?: MenuVariant | null;
  modifierDetails?: MenuModifier[];
  order?: Order;
};

export type OrderWithItems = Order & {
  items: OrderItemWithDetails[];
  table?: Table | null;
};

export type IngredientWithUsage = Ingredient & {
  recipeCount: number;
};

export type PurchaseOrderWithIngredient = PurchaseOrder & {
  ingredient: Ingredient;
};

export type AnalyticsSummary = {
  totalRevenue: number;
  totalOrders: number;
  openOrders: number;
  paidOrders: number;
  occupiedTables: number;
  totalTables: number;
  topItems: { menuItemId: number; name: string; quantity: number }[];
};

// Real-time (WebSocket) types
export const WS_EVENTS = {
  ORDER_UPDATED: 'order_updated',
  ITEM_STATUS_CHANGED: 'item_status_changed',
  TABLE_STATUS_CHANGED: 'table_status_changed',
} as const;

export interface WsMessage<T = unknown> {
  type: keyof typeof WS_EVENTS;
  payload: T;
}
