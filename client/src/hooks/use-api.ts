import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { 
  Table, 
  MenuItemWithDetails, 
  OrderWithItems, 
  OrderItemWithDetails,
  CreateOrderRequest
} from "@shared/schema";

// --- TABLES ---
export function useTables() {
  return useQuery({
    queryKey: [api.tables.list.path],
    queryFn: async () => {
      const res = await fetch(api.tables.list.path);
      if (!res.ok) throw new Error("Failed to fetch tables");
      return (await res.json()) as Table[];
    },
  });
}

export function useUpdateTable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const url = buildUrl(api.tables.update.path, { id });
      const res = await fetch(url, {
        method: api.tables.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update table");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.tables.list.path] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

// --- MENU ---
export function useMenu() {
  return useQuery({
    queryKey: [api.menu.list.path],
    queryFn: async () => {
      const res = await fetch(api.menu.list.path);
      if (!res.ok) throw new Error("Failed to fetch menu");
      return (await res.json()) as MenuItemWithDetails[];
    },
  });
}

// --- ORDERS ---
export function useOrders(status?: string) {
  return useQuery({
    queryKey: [api.orders.list.path, status],
    queryFn: async () => {
      const url = status ? `${api.orders.list.path}?status=${status}` : api.orders.list.path;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return (await res.json()) as OrderWithItems[];
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.orders.create.path, {
        method: api.orders.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.tables.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.orderItems.listPending.path] });
      toast({ title: "Success", description: "Order placed successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const url = buildUrl(api.orders.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.orders.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update order status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
    }
  });
}

// --- KDS (Order Items) ---
export function usePendingOrderItems() {
  return useQuery({
    queryKey: [api.orderItems.listPending.path],
    queryFn: async () => {
      const res = await fetch(api.orderItems.listPending.path);
      if (!res.ok) throw new Error("Failed to fetch pending items");
      return (await res.json()) as OrderItemWithDetails[];
    },
  });
}

export function useUpdateOrderItemStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const url = buildUrl(api.orderItems.updateStatus.path, { id });
      const res = await fetch(url, {
        method: api.orderItems.updateStatus.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update item status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orderItems.listPending.path] });
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });
}
