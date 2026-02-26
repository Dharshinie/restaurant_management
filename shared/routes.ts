import { z } from 'zod';
import { 
  insertTableSchema, insertMenuItemSchema, insertMenuVariantSchema, 
  insertMenuModifierSchema, insertOrderSchema, insertOrderItemSchema,
  tables, menuItems, menuVariants, menuModifiers, orders, orderItems 
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
