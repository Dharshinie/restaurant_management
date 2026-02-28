import { db } from "./db";
import {
  tables,
  menuItems,
  menuVariants,
  menuModifiers,
  orders,
  orderItems,
  ingredients,
  recipeIngredients,
  purchaseOrders,
  type Table,
  type MenuItem,
  type InsertMenuItem,
  type MenuVariant,
  type MenuModifier,
  type OrderItem,
  type InsertTable,
  type UpdateTableRequest,
  type CreateOrderRequest,
  type UpdateOrderItemRequest,
  type OrderWithItems,
  type OrderItemWithDetails,
  type MenuItemWithDetails,
  type Ingredient,
  type InsertIngredient,
  type UpdateIngredientRequest,
  type UpdateMenuItemRequest,
  type RecipeIngredient,
  type PurchaseOrder,
  type AnalyticsSummary,
} from "@shared/schema";
import { and, desc, eq, inArray, lte, sql } from "drizzle-orm";

export interface IStorage {
  getTables(): Promise<Table[]>;
  updateTable(id: number, update: UpdateTableRequest): Promise<Table>;
  getMenu(): Promise<MenuItemWithDetails[]>;
  createMenuItem(input: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, input: UpdateMenuItemRequest): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;
  getOrders(status?: string): Promise<OrderWithItems[]>;
  getOrder(id: number): Promise<OrderWithItems | undefined>;
  createOrder(order: CreateOrderRequest): Promise<OrderWithItems>;
  updateOrderStatus(id: number, status: string): Promise<OrderWithItems>;
  getPendingOrderItems(): Promise<OrderItemWithDetails[]>;
  updateOrderItemStatus(id: number, status: string): Promise<OrderItemWithDetails>;
  getIngredients(): Promise<Ingredient[]>;
  createIngredient(input: InsertIngredient): Promise<Ingredient>;
  updateIngredient(id: number, input: UpdateIngredientRequest): Promise<Ingredient>;
  getRecipeForMenuItem(menuItemId: number): Promise<RecipeIngredient[]>;
  setRecipeForMenuItem(
    menuItemId: number,
    recipeRows: { ingredientId: number; quantityRequired: number }[],
  ): Promise<RecipeIngredient[]>;
  listPurchaseOrders(status?: string): Promise<PurchaseOrder[]>;
  generateLowStockPurchaseOrders(): Promise<PurchaseOrder[]>;
  getAnalyticsSummary(): Promise<AnalyticsSummary>;
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

    return items.map((item) => ({
      ...item,
      variants: variants.filter((v) => v.menuItemId === item.id),
      modifiers: modifiers.filter((m) => m.menuItemId === item.id),
    }));
  }

  async createMenuItem(input: InsertMenuItem): Promise<MenuItem> {
    const [created] = await db.insert(menuItems).values(input).returning();
    return created;
  }

  async updateMenuItem(id: number, input: UpdateMenuItemRequest): Promise<MenuItem> {
    const [updated] = await db.update(menuItems).set(input).where(eq(menuItems.id, id)).returning();
    if (!updated) {
      throw new Error("Menu item not found");
    }
    return updated;
  }

  async deleteMenuItem(id: number): Promise<void> {
    await db.delete(menuModifiers).where(eq(menuModifiers.menuItemId, id));
    await db.delete(menuVariants).where(eq(menuVariants.menuItemId, id));
    await db.delete(recipeIngredients).where(eq(recipeIngredients.menuItemId, id));
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  async getOrders(status?: string): Promise<OrderWithItems[]> {
    const allOrders = status
      ? await db.select().from(orders).where(eq(orders.status, status)).orderBy(desc(orders.createdAt))
      : await db.select().from(orders).orderBy(desc(orders.createdAt));

    return Promise.all(allOrders.map((o) => this.getOrder(o.id) as Promise<OrderWithItems>));
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

    const itemsWithDetails: OrderItemWithDetails[] = await Promise.all(
      items.map(async (item) => this.hydrateOrderItem(item)),
    );

    return {
      ...order,
      items: itemsWithDetails,
      table,
    };
  }

  async createOrder(req: CreateOrderRequest): Promise<OrderWithItems> {
    const [order] = await db
      .insert(orders)
      .values({
        tableId: req.tableId,
        orderType: req.orderType,
        status: req.status,
        totalAmount: req.totalAmount,
      })
      .returning();

    for (const item of req.items) {
      await db.insert(orderItems).values({
        orderId: order.id,
        menuItemId: item.menuItemId,
        variantId: item.variantId,
        modifiers: item.modifiers || [],
        notes: item.notes,
        status: item.status || "pending",
      });
    }

    if (req.tableId) {
      await db.update(tables).set({ status: "occupied" }).where(eq(tables.id, req.tableId));
    }

    return this.getOrder(order.id) as Promise<OrderWithItems>;
  }

  async updateOrderStatus(id: number, status: string): Promise<OrderWithItems> {
    const [existingOrder] = await db.select().from(orders).where(eq(orders.id, id));
    if (!existingOrder) {
      throw new Error("Order not found");
    }

    await db.update(orders).set({ status }).where(eq(orders.id, id));

    if (status === "paid" && !existingOrder.inventoryDeducted) {
      await this.deductInventoryForOrder(id);
      await this.generateLowStockPurchaseOrders();
    }

    if (existingOrder.tableId && (status === "paid" || status === "cancelled")) {
      await db.update(tables).set({ status: "vacant" }).where(eq(tables.id, existingOrder.tableId));
    }

    return (await this.getOrder(id)) as OrderWithItems;
  }

  async getPendingOrderItems(): Promise<OrderItemWithDetails[]> {
    const items = await db
      .select()
      .from(orderItems)
      .where(inArray(orderItems.status, ["pending", "preparing", "ready"]));

    return Promise.all(items.map(async (item) => this.hydrateOrderItem(item)));
  }

  async updateOrderItemStatus(id: number, status: string): Promise<OrderItemWithDetails> {
    await db.update(orderItems).set({ status }).where(eq(orderItems.id, id));
    const [item] = await db.select().from(orderItems).where(eq(orderItems.id, id));
    return this.hydrateOrderItem(item);
  }

  async getIngredients(): Promise<Ingredient[]> {
    return db.select().from(ingredients).orderBy(ingredients.name);
  }

  async createIngredient(input: InsertIngredient): Promise<Ingredient> {
    const [created] = await db.insert(ingredients).values(input).returning();
    return created;
  }

  async updateIngredient(id: number, input: UpdateIngredientRequest): Promise<Ingredient> {
    const [updated] = await db.update(ingredients).set(input).where(eq(ingredients.id, id)).returning();
    return updated;
  }

  async getRecipeForMenuItem(menuItemId: number): Promise<RecipeIngredient[]> {
    return db.select().from(recipeIngredients).where(eq(recipeIngredients.menuItemId, menuItemId));
  }

  async setRecipeForMenuItem(
    menuItemId: number,
    recipeRows: { ingredientId: number; quantityRequired: number }[],
  ): Promise<RecipeIngredient[]> {
    await db.delete(recipeIngredients).where(eq(recipeIngredients.menuItemId, menuItemId));

    if (recipeRows.length > 0) {
      await db.insert(recipeIngredients).values(
        recipeRows.map((row) => ({
          menuItemId,
          ingredientId: row.ingredientId,
          quantityRequired: row.quantityRequired,
        })),
      );
    }

    return this.getRecipeForMenuItem(menuItemId);
  }

  async listPurchaseOrders(status?: string): Promise<PurchaseOrder[]> {
    return status
      ? db.select().from(purchaseOrders).where(eq(purchaseOrders.status, status)).orderBy(desc(purchaseOrders.createdAt))
      : db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
  }

  async generateLowStockPurchaseOrders(): Promise<PurchaseOrder[]> {
    const lowStockIngredients = await db
      .select()
      .from(ingredients)
      .where(lte(ingredients.currentStock, ingredients.minimumThreshold));

    if (lowStockIngredients.length === 0) {
      return this.listPurchaseOrders("open");
    }

    const lowStockIds = lowStockIngredients.map((i) => i.id);
    const existingOpenOrders = await db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.status, "open"), inArray(purchaseOrders.ingredientId, lowStockIds)));

    const existingIngredientIds = new Set(existingOpenOrders.map((po) => po.ingredientId));
    const toCreate = lowStockIngredients
      .filter((ingredient) => !existingIngredientIds.has(ingredient.id))
      .map((ingredient) => {
        const targetStock = ingredient.minimumThreshold * 2;
        const quantityRequested = Math.max(targetStock - ingredient.currentStock, 1);
        return {
          ingredientId: ingredient.id,
          quantityRequested,
          status: "open" as const,
        };
      });

    if (toCreate.length > 0) {
      await db.insert(purchaseOrders).values(toCreate);
    }

    return this.listPurchaseOrders("open");
  }

  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const [orderCounts] = await db
      .select({
        totalOrders: sql<number>`count(*)`,
        openOrders: sql<number>`count(*) filter (where ${orders.status} = 'open')`,
        paidOrders: sql<number>`count(*) filter (where ${orders.status} = 'paid')`,
      })
      .from(orders);

    const [revenueTotals] = await db
      .select({
        totalRevenue: sql<number>`coalesce(sum(${orders.totalAmount}) filter (where ${orders.status} = 'paid'), 0)`,
      })
      .from(orders);

    const [tableCounts] = await db
      .select({
        occupiedTables: sql<number>`count(*) filter (where ${tables.status} = 'occupied')`,
        totalTables: sql<number>`count(*)`,
      })
      .from(tables);

    const topItems = await db
      .select({
        menuItemId: orderItems.menuItemId,
        name: menuItems.name,
        quantity: sql<number>`count(*)`,
      })
      .from(orderItems)
      .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .groupBy(orderItems.menuItemId, menuItems.name)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    return {
      totalRevenue: revenueTotals?.totalRevenue ?? 0,
      totalOrders: orderCounts?.totalOrders ?? 0,
      openOrders: orderCounts?.openOrders ?? 0,
      paidOrders: orderCounts?.paidOrders ?? 0,
      occupiedTables: tableCounts?.occupiedTables ?? 0,
      totalTables: tableCounts?.totalTables ?? 0,
      topItems,
    };
  }

  private async hydrateOrderItem(item: OrderItem): Promise<OrderItemWithDetails> {
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
      order,
    };
  }

  private async deductInventoryForOrder(orderId: number): Promise<void> {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    if (items.length === 0) {
      await db.update(orders).set({ inventoryDeducted: true }).where(eq(orders.id, orderId));
      return;
    }

    const requiredByIngredient = new Map<number, number>();

    for (const item of items) {
      const recipe = await db
        .select()
        .from(recipeIngredients)
        .where(eq(recipeIngredients.menuItemId, item.menuItemId));

      for (const row of recipe) {
        requiredByIngredient.set(
          row.ingredientId,
          (requiredByIngredient.get(row.ingredientId) || 0) + row.quantityRequired,
        );
      }
    }

    for (const [ingredientId, quantityToDeduct] of Array.from(requiredByIngredient.entries())) {
      await db
        .update(ingredients)
        .set({ currentStock: sql`${ingredients.currentStock} - ${quantityToDeduct}` })
        .where(eq(ingredients.id, ingredientId));
    }

    await db.update(orders).set({ inventoryDeducted: true }).where(eq(orders.id, orderId));
  }
}

export const storage = new DatabaseStorage();
