import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { 
  Table, 
  MenuItemWithDetails, 
  OrderWithItems, 
  OrderItemWithDetails,
  AnalyticsSummary,
  InsertMenuItem
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
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const res = await fetch(api.menu.list.path);
      if (!res.ok) throw new Error("Failed to fetch menu");
      return (await res.json()) as MenuItemWithDetails[];
    },
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertMenuItem) => {
      const res = await fetch(api.menu.create.path, {
        method: api.menu.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create menu item");
      return (await res.json()) as MenuItemWithDetails;
    },
    onSuccess: (createdItem) => {
      queryClient.setQueryData<MenuItemWithDetails[]>([api.menu.list.path], (prev) => {
        const current = prev ?? [];
        return [...current, { ...createdItem, variants: createdItem.variants ?? [], modifiers: createdItem.modifiers ?? [] }];
      });
      queryClient.invalidateQueries({ queryKey: [api.menu.list.path], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: [api.analytics.summary.path] });
      toast({ title: "Success", description: "Menu item created" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<InsertMenuItem>;
    }) => {
      const url = buildUrl(api.menu.update.path, { id });
      const res = await fetch(url, {
        method: api.menu.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update menu item");
      return (await res.json()) as MenuItemWithDetails;
    },
    onSuccess: (updatedItem) => {
      queryClient.setQueryData<MenuItemWithDetails[]>([api.menu.list.path], (prev) => {
        if (!prev) return prev;
        return prev.map((item) =>
          item.id === updatedItem.id
            ? {
                ...item,
                ...updatedItem,
                variants: item.variants,
                modifiers: item.modifiers,
              }
            : item,
        );
      });
      queryClient.invalidateQueries({ queryKey: [api.menu.list.path], refetchType: "all" });
      toast({ title: "Success", description: "Menu item updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.menu.remove.path, { id });
      const res = await fetch(url, {
        method: api.menu.remove.method,
      });
      if (!res.ok) throw new Error("Failed to delete menu item");
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<MenuItemWithDetails[]>([api.menu.list.path], (prev) =>
        prev ? prev.filter((item) => item.id !== id) : prev,
      );
      queryClient.invalidateQueries({ queryKey: [api.menu.list.path], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: [api.analytics.summary.path] });
      toast({ title: "Success", description: "Menu item deleted" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: [api.analytics.summary.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.summary.path);
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return (await res.json()) as AnalyticsSummary;
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
