import { z } from 'zod';
import { 
  insertTableSchema, insertMenuItemSchema, insertMenuVariantSchema, 
  insertMenuModifierSchema, insertOrderSchema, insertOrderItemSchema, insertIngredientSchema,
  tables, menuItems, menuVariants, menuModifiers, orders, orderItems, ingredients, recipeIngredients, purchaseOrders
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  tables: {
    list: {
      method: 'GET' as const,
      path: '/api/tables' as const,
      responses: { 200: z.array(z.custom<typeof tables.$inferSelect>()) },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/tables/:id' as const,
      input: insertTableSchema.partial(),
      responses: {
        200: z.custom<typeof tables.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  menu: {
    list: {
      method: 'GET' as const,
      path: '/api/menu' as const,
      responses: { 200: z.array(z.custom<any>()) }, // Return MenuItemWithDetails
    },
    create: {
      method: 'POST' as const,
      path: '/api/menu' as const,
      input: insertMenuItemSchema,
      responses: { 201: z.custom<typeof menuItems.$inferSelect>(), 400: errorSchemas.validation },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/menu/:id' as const,
      input: insertMenuItemSchema.partial(),
      responses: { 200: z.custom<typeof menuItems.$inferSelect>(), 404: errorSchemas.notFound },
    },
    remove: {
      method: 'DELETE' as const,
      path: '/api/menu/:id' as const,
      responses: { 204: z.void(), 404: errorSchemas.notFound },
    },
  },
  analytics: {
    summary: {
      method: 'GET' as const,
      path: '/api/analytics/summary' as const,
      responses: { 200: z.custom<any>() },
    },
  },
  orders: {
    list: {
      method: 'GET' as const,
      path: '/api/orders' as const,
      input: z.object({ status: z.string().optional() }).optional(),
      responses: { 200: z.array(z.custom<any>()) }, // Return OrderWithItems[]
    },
    get: {
      method: 'GET' as const,
      path: '/api/orders/:id' as const,
      responses: { 200: z.custom<any>(), 404: errorSchemas.notFound }, // Return OrderWithItems
    },
    create: {
      method: 'POST' as const,
      path: '/api/orders' as const,
      input: z.object({
        tableId: z.number().nullable().optional(),
        orderType: z.string().default('dine-in'),
        items: z.array(z.object({
          menuItemId: z.number(),
          variantId: z.number().nullable().optional(),
          modifiers: z.array(z.number()).optional(),
          notes: z.string().nullable().optional()
        }))
      }),
      responses: {
        201: z.custom<any>(), // Return OrderWithItems
        400: errorSchemas.validation,
      },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/orders/:id/status' as const,
      input: z.object({ status: z.string() }),
      responses: { 200: z.custom<any>(), 404: errorSchemas.notFound }, // Return OrderWithItems
    },
  },
  orderItems: {
    listPending: {
      method: 'GET' as const,
      path: '/api/order-items/pending' as const,
      responses: { 200: z.array(z.custom<any>()) }, // Return OrderItemWithDetails[]
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/order-items/:id/status' as const,
      input: z.object({ status: z.string() }), // 'pending', 'preparing', 'ready', 'served'
      responses: { 200: z.custom<any>(), 404: errorSchemas.notFound }, // Return OrderItemWithDetails
    }
  },
  inventory: {
    listIngredients: {
      method: 'GET' as const,
      path: '/api/inventory/ingredients' as const,
      responses: { 200: z.array(z.custom<typeof ingredients.$inferSelect>()) },
    },
    createIngredient: {
      method: 'POST' as const,
      path: '/api/inventory/ingredients' as const,
      input: insertIngredientSchema,
      responses: { 201: z.custom<typeof ingredients.$inferSelect>(), 400: errorSchemas.validation },
    },
    updateIngredient: {
      method: 'PATCH' as const,
      path: '/api/inventory/ingredients/:id' as const,
      input: insertIngredientSchema.partial(),
      responses: { 200: z.custom<typeof ingredients.$inferSelect>(), 404: errorSchemas.notFound },
    },
  },
  recipes: {
    listByMenuItem: {
      method: 'GET' as const,
      path: '/api/recipes/menu-item/:menuItemId' as const,
      responses: { 200: z.array(z.custom<typeof recipeIngredients.$inferSelect>()) },
    },
    setForMenuItem: {
      method: 'PUT' as const,
      path: '/api/recipes/menu-item/:menuItemId' as const,
      input: z.object({
        ingredients: z.array(z.object({
          ingredientId: z.number(),
          quantityRequired: z.number().int().positive(),
        })).default([]),
      }),
      responses: { 200: z.array(z.custom<typeof recipeIngredients.$inferSelect>()), 400: errorSchemas.validation },
    },
  },
  purchaseOrders: {
    list: {
      method: 'GET' as const,
      path: '/api/purchase-orders' as const,
      input: z.object({ status: z.string().optional() }).optional(),
      responses: { 200: z.array(z.custom<typeof purchaseOrders.$inferSelect>()) },
    },
    generateLowStock: {
      method: 'POST' as const,
      path: '/api/purchase-orders/generate-low-stock' as const,
      responses: { 200: z.array(z.custom<typeof purchaseOrders.$inferSelect>()) },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
