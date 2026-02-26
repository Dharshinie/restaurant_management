import { db } from "./db";
import { 
  tables, menuItems, menuVariants, menuModifiers, orders, orderItems,
  type Table, type MenuItem, type MenuVariant, type MenuModifier, 
  type Order, type OrderItem,
  type InsertTable, type UpdateTableRequest,
  type InsertOrder, type UpdateOrderRequest, type CreateOrderRequest,
  type UpdateOrderItemRequest, type OrderWithItems, type OrderItemWithDetails, type MenuItemWithDetails
} from "@shared/schema";
import { eq, inArray, desc } from "drizzle-orm";

export interface IStorage {
  getTables(): Promise<Table[]>;
  updateTable(id: number, update: UpdateTableRequest): Promise<Table>;
  getMenu(): Promise<MenuItemWithDetails[]>;
  getOrders(status?: string): Promise<OrderWithItems[]>;
  getOrder(id: number): Promise<OrderWithItems | undefined>;
  createOrder(order: CreateOrderRequest): Promise<OrderWithItems>;
  updateOrderStatus(id: number, status: string): Promise<OrderWithItems>;
  getPendingOrderItems(): Promise<OrderItemWithDetails[]>;
  updateOrderItemStatus(id: number, status: string): Promise<OrderItemWithDetails>;
}

export class DatabaseStorage implements IStorage {
  async getTables(): Promise<Table[]> {
    return await db.select().from(tables).orderBy(tables.number);
  }

  async updateTable(id: number, update: UpdateTableRequest): Promise<Table> {
    const [updated] = await db.update(tables).set(update).where(eq(tables.id, id)).returning();
    return updated;
  }

  async getMenu(): Promise<MenuItemWithDetails[]> {
    const items = await db.select().from(menuItems);
    const variants = await db.select().from(menuVariants);
    const modifiers = await db.select().from(menuModifiers);

    return items.map(item => ({
      ...item,
      variants: variants.filter(v => v.menuItemId === item.id),
      modifiers: modifiers.filter(m => m.menuItemId === item.id)
    }));
  }

  async getOrders(status?: string): Promise<OrderWithItems[]> {
    let query = db.select().from(orders).orderBy(desc(orders.createdAt));
    if (status) {
      query = db.select().from(orders).where(eq(orders.status, status)).orderBy(desc(orders.createdAt)) as any;
    }
    const allOrders = await query;
    return Promise.all(allOrders.map(o => this.getOrder(o.id) as Promise<OrderWithItems>));
  }

  async getOrder(id: number): Promise<OrderWithItems | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    
    let table = null;
    if (order.tableId) {
      const [t] = await db.select().from(tables).where(eq(tables.id, order.tableId));
      table = t || null;
    }

    const itemsWithDetails: OrderItemWithDetails[] = await Promise.all(items.map(async item => {
      const [menuItem] = await db.select().from(menuItems).where(eq(menuItems.id, item.menuItemId));
      let variant = null;
      if (item.variantId) {
        const [v] = await db.select().from(menuVariants).where(eq(menuVariants.id, item.variantId));
        variant = v || null;
      }
      
      let modifierDetails: MenuModifier[] = [];
      if (item.modifiers && item.modifiers.length > 0) {
        modifierDetails = await db.select().from(menuModifiers).where(inArray(menuModifiers.id, item.modifiers));
      }

      return {
        ...item,
        menuItem,
        variant,
        modifierDetails
      };
    }));

    return {
      ...order,
      items: itemsWithDetails,
      table
    };
  }

  async createOrder(req: CreateOrderRequest): Promise<OrderWithItems> {
    const [order] = await db.insert(orders).values({
      tableId: req.tableId,
      orderType: req.orderType,
      status: req.status,
      totalAmount: req.totalAmount
    }).returning();

    for (const item of req.items) {
      await db.insert(orderItems).values({
        orderId: order.id,
        menuItemId: item.menuItemId,
        variantId: item.variantId,
        modifiers: item.modifiers || [],
        notes: item.notes,
        status: item.status || 'pending'
      });
    }

    if (req.tableId) {
      await db.update(tables).set({ status: 'occupied' }).where(eq(tables.id, req.tableId));
    }

    return this.getOrder(order.id) as Promise<OrderWithItems>;
  }

  async updateOrderStatus(id: number, status: string): Promise<OrderWithItems> {
    await db.update(orders).set({ status }).where(eq(orders.id, id));
    const order = await this.getOrder(id);
    
    if (order && order.tableId && (status === 'paid' || status === 'cancelled')) {
      await db.update(tables).set({ status: 'vacant' }).where(eq(tables.id, order.tableId));
    }
    
    return order!;
  }

  async getPendingOrderItems(): Promise<OrderItemWithDetails[]> {
    const items = await db.select().from(orderItems).where(inArray(orderItems.status, ['pending', 'preparing', 'ready']));
    
    const itemsWithDetails: OrderItemWithDetails[] = await Promise.all(items.map(async item => {
      const [menuItem] = await db.select().from(menuItems).where(eq(menuItems.id, item.menuItemId));
      let variant = null;
      if (item.variantId) {
        const [v] = await db.select().from(menuVariants).where(eq(menuVariants.id, item.variantId));
        variant = v || null;
      }
      
      let modifierDetails: MenuModifier[] = [];
      if (item.modifiers && item.modifiers.length > 0) {
        modifierDetails = await db.select().from(menuModifiers).where(inArray(menuModifiers.id, item.modifiers));
      }

      const [order] = await db.select().from(orders).where(eq(orders.id, item.orderId));

      return {
        ...item,
        menuItem,
        variant,
        modifierDetails,
        order
      };
    }));

    return itemsWithDetails;
  }

  async updateOrderItemStatus(id: number, status: string): Promise<OrderItemWithDetails> {
    await db.update(orderItems).set({ status }).where(eq(orderItems.id, id));
    
    const [item] = await db.select().from(orderItems).where(eq(orderItems.id, id));
    
    const [menuItem] = await db.select().from(menuItems).where(eq(menuItems.id, item.menuItemId));
    let variant = null;
    if (item.variantId) {
      const [v] = await db.select().from(menuVariants).where(eq(menuVariants.id, item.variantId));
      variant = v || null;
    }
    
    let modifierDetails: MenuModifier[] = [];
    if (item.modifiers && item.modifiers.length > 0) {
      modifierDetails = await db.select().from(menuModifiers).where(inArray(menuModifiers.id, item.modifiers));
    }
    
    const [order] = await db.select().from(orders).where(eq(orders.id, item.orderId));

    return {
      ...item,
      menuItem,
      variant,
      modifierDetails,
      order
    };
  }
}

export const storage = new DatabaseStorage();
