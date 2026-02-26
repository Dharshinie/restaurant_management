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
}
