import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import { WS_EVENTS } from "@shared/schema";
import { db } from "./db";
import * as schema from "@shared/schema";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Set up WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const broadcast = (type: string, payload: any) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type, payload }));
      }
    });
  };

  // Setup basic seed data check to ensure the DB isn't empty
  await seedDatabase();

  app.get(api.tables.list.path, async (req, res) => {
    const tables = await storage.getTables();
    res.json(tables);
  });

  app.patch(api.tables.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.tables.update.input.parse(req.body);
      const table = await storage.updateTable(id, input);
      broadcast(WS_EVENTS.TABLE_STATUS_CHANGED, { tableId: id });
      res.json(table);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.menu.list.path, async (req, res) => {
    const menu = await storage.getMenu();
    res.json(menu);
  });

  app.post(api.menu.create.path, async (req, res) => {
    try {
      const input = api.menu.create.input.parse(req.body);
      const created = await storage.createMenuItem(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
        return;
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.patch(api.menu.update.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.menu.update.input.parse(req.body);
      const updated = await storage.updateMenuItem(id, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        res.status(404).json({ message: "Menu item not found" });
        return;
      }
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.menu.remove.path, async (req, res) => {
    const id = parseInt(req.params.id);
    await storage.deleteMenuItem(id);
    res.status(204).send();
  });

  app.get(api.analytics.summary.path, async (_req, res) => {
    const summary = await storage.getAnalyticsSummary();
    res.json(summary);
  });

  app.get(api.orders.list.path, async (req, res) => {
    const status = req.query.status as string | undefined;
    const orders = await storage.getOrders(status);
    res.json(orders);
  });

  app.post(api.orders.create.path, async (req, res) => {
    try {
      const input = api.orders.create.input.parse(req.body);
      
      const reqOrder = {
        ...input,
        totalAmount: 0 // Simplification for now
      };
      
      const order = await storage.createOrder(reqOrder as any);
      
      broadcast(WS_EVENTS.ORDER_UPDATED, { orderId: order.id });
      if (order.tableId) {
        broadcast(WS_EVENTS.TABLE_STATUS_CHANGED, { tableId: order.tableId });
      }
      
      res.status(201).json(order);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
        return;
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.get(api.orders.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const order = await storage.getOrder(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  });

  app.patch(api.orders.updateStatus.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.orders.updateStatus.input.parse(req.body);
      const order = await storage.updateOrderStatus(id, input.status);
      broadcast(WS_EVENTS.ORDER_UPDATED, { orderId: id });
      if (order.tableId) {
        broadcast(WS_EVENTS.TABLE_STATUS_CHANGED, { tableId: order.tableId });
      }
      res.json(order);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.orderItems.listPending.path, async (req, res) => {
    const items = await storage.getPendingOrderItems();
    res.json(items);
  });

  app.patch(api.orderItems.updateStatus.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.orderItems.updateStatus.input.parse(req.body);
      const item = await storage.updateOrderItemStatus(id, input.status);
      broadcast(WS_EVENTS.ITEM_STATUS_CHANGED, { itemId: id });
      res.json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.inventory.listIngredients.path, async (_req, res) => {
    const allIngredients = await storage.getIngredients();
    res.json(allIngredients);
  });

  app.post(api.inventory.createIngredient.path, async (req, res) => {
    try {
      const input = api.inventory.createIngredient.input.parse(req.body);
      const created = await storage.createIngredient(input);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
        return;
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.patch(api.inventory.updateIngredient.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.inventory.updateIngredient.input.parse(req.body);
      const updated = await storage.updateIngredient(id, input);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.recipes.listByMenuItem.path, async (req, res) => {
    const menuItemId = parseInt(req.params.menuItemId);
    const recipe = await storage.getRecipeForMenuItem(menuItemId);
    res.json(recipe);
  });

  app.put(api.recipes.setForMenuItem.path, async (req, res) => {
    try {
      const menuItemId = parseInt(req.params.menuItemId);
      const input = api.recipes.setForMenuItem.input.parse(req.body);
      const recipe = await storage.setRecipeForMenuItem(menuItemId, input.ingredients);
      res.json(recipe);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
        return;
      }
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.get(api.purchaseOrders.list.path, async (req, res) => {
    const status = req.query.status as string | undefined;
    const rows = await storage.listPurchaseOrders(status);
    res.json(rows);
  });

  app.post(api.purchaseOrders.generateLowStock.path, async (_req, res) => {
    const rows = await storage.generateLowStockPurchaseOrders();
    res.json(rows);
  });

  return httpServer;
}

async function seedDatabase() {
  const tables = await storage.getTables();
  if (tables.length > 0) return; // Already seeded

  await db.insert(schema.tables).values([
    { number: 1, name: "Table 1" },
    { number: 2, name: "Table 2" },
    { number: 3, name: "Table 3" },
    { number: 4, name: "Table 4" },
    { number: 5, name: "Table 5" },
  ]);

  const items = await db.insert(schema.menuItems).values([
    { name: "Margherita Pizza", category: "Pizzas", basePrice: 1200, description: "Classic tomato and mozzarella" },
    { name: "Pepperoni Pizza", category: "Pizzas", basePrice: 1400, description: "Spicy pepperoni" },
    { name: "Caesar Salad", category: "Mains", basePrice: 900, description: "Fresh romaine lettuce" },
    { name: "Craft Cola", category: "Drinks", basePrice: 400, description: "Local artisanal cola" },
    { name: "Draft Beer", category: "Drinks", basePrice: 600, description: "Local IPA" },
  ]).returning();

  const pizzaId = items[0].id;
  await db.insert(schema.menuVariants).values([
    { menuItemId: pizzaId, name: "Small", price: 1000 },
    { menuItemId: pizzaId, name: "Medium", price: 1200 },
    { menuItemId: pizzaId, name: "Large", price: 1500 },
  ]);

  await db.insert(schema.menuModifiers).values([
    { menuItemId: pizzaId, name: "Extra Cheese", priceAdjustment: 200 },
    { menuItemId: pizzaId, name: "No Onions", priceAdjustment: 0 },
  ]);

  const seededIngredients = await db
    .insert(schema.ingredients)
    .values([
      { name: "Pizza Dough", unit: "pcs", currentStock: 20, minimumThreshold: 8 },
      { name: "Mozzarella", unit: "g", currentStock: 5000, minimumThreshold: 1500 },
      { name: "Tomato Sauce", unit: "ml", currentStock: 3000, minimumThreshold: 1000 },
      { name: "Pepperoni", unit: "g", currentStock: 2000, minimumThreshold: 700 },
      { name: "Romaine Lettuce", unit: "g", currentStock: 1500, minimumThreshold: 500 },
    ])
    .returning();

  const dough = seededIngredients.find((i) => i.name === "Pizza Dough");
  const mozzarella = seededIngredients.find((i) => i.name === "Mozzarella");
  const tomatoSauce = seededIngredients.find((i) => i.name === "Tomato Sauce");
  const pepperoni = seededIngredients.find((i) => i.name === "Pepperoni");
  const lettuce = seededIngredients.find((i) => i.name === "Romaine Lettuce");

  if (dough && mozzarella && tomatoSauce && pepperoni && lettuce) {
    await db.insert(schema.recipeIngredients).values([
      { menuItemId: items[0].id, ingredientId: dough.id, quantityRequired: 1 },
      { menuItemId: items[0].id, ingredientId: mozzarella.id, quantityRequired: 120 },
      { menuItemId: items[0].id, ingredientId: tomatoSauce.id, quantityRequired: 90 },
      { menuItemId: items[1].id, ingredientId: dough.id, quantityRequired: 1 },
      { menuItemId: items[1].id, ingredientId: mozzarella.id, quantityRequired: 130 },
      { menuItemId: items[1].id, ingredientId: tomatoSauce.id, quantityRequired: 90 },
      { menuItemId: items[1].id, ingredientId: pepperoni.id, quantityRequired: 80 },
      { menuItemId: items[2].id, ingredientId: lettuce.id, quantityRequired: 150 },
    ]);
  }
}
