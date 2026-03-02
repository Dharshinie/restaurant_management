import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  useAnalyticsSummary,
  useCreateMenuItem,
  useDeleteMenuItem,
  useMenu,
  useUpdateMenuItem,
} from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

type FormState = {
  name: string;
  category: string;
  description: string;
  basePrice: string;
};

const defaultForm: FormState = {
  name: "",
  category: "",
  description: "",
  basePrice: "",
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { data: analytics, isLoading: analyticsLoading } = useAnalyticsSummary();
  const { data: menu, isLoading: menuLoading, isError: menuError, error: menuErrorDetails } = useMenu();
  const createMenuItem = useCreateMenuItem();
  const updateMenuItem = useUpdateMenuItem();
  const deleteMenuItem = useDeleteMenuItem();
  const { toast } = useToast();

  const [form, setForm] = useState<FormState>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    if (window.localStorage.getItem("culina_user_role") !== "admin") {
      setLocation("/pos");
    }
  }, [setLocation]);

  const averageOrderValue = useMemo(() => {
    if (!analytics || analytics.paidOrders === 0) return 0;
    return analytics.totalRevenue / analytics.paidOrders;
  }, [analytics]);

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const submitForm = () => {
    const trimmedName = form.name.trim();
    const trimmedCategory = form.category.trim();
    const cents = Math.round(Number(form.basePrice) * 100);

    if (!trimmedName || !trimmedCategory) {
      toast({ title: "Validation error", description: "Name and category are required.", variant: "destructive" });
      return;
    }

    if (!Number.isFinite(cents) || cents <= 0) {
      toast({
        title: "Validation error",
        description: "Price must be a number greater than 0 (e.g. 12.99).",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: trimmedName,
      category: trimmedCategory,
      description: form.description || null,
      basePrice: cents,
    };

    if (editingId) {
      updateMenuItem.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            setForm(defaultForm);
            setEditingId(null);
          },
        },
      );
      return;
    }

    createMenuItem.mutate(payload, {
      onSuccess: () => {
        setForm(defaultForm);
      },
    });
  };

  const startEdit = (item: {
    id: number;
    name: string;
    category: string;
    description: string | null;
    basePrice: number;
  }) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      description: item.description || "",
      basePrice: (item.basePrice / 100).toFixed(2),
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full w-full relative z-10 p-3 sm:p-6 gap-4 sm:gap-6">
        <header>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Analytics visibility and menu management are restricted to the Admin role.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard title="Paid Revenue" value={formatPrice(analytics?.totalRevenue ?? 0)} loading={analyticsLoading} />
          <MetricCard title="Total Orders" value={String(analytics?.totalOrders ?? 0)} loading={analyticsLoading} />
          <MetricCard title="Open Orders" value={String(analytics?.openOrders ?? 0)} loading={analyticsLoading} />
          <MetricCard
            title="Avg Paid Ticket"
            value={formatPrice(Math.round(averageOrderValue))}
            loading={analyticsLoading}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-0 flex-1">
          <Card className="xl:col-span-2 border-border bg-card/70 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Menu Management</CardTitle>
              <Badge variant="outline">{menu?.length ?? 0} Items</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <Input
                  placeholder="Category"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                />
                <Input
                  placeholder="Price (e.g. 12.99)"
                  value={form.basePrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, basePrice: e.target.value }))}
                />
                <Input
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={submitForm} disabled={createMenuItem.isPending || updateMenuItem.isPending}>
                  {editingId ? "Update Item" : "Add Item"}
                </Button>
                {editingId && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setForm(defaultForm);
                    }}
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>

              <div className="border border-border rounded-xl overflow-hidden">
                <ScrollArea className="h-[380px]">
                  <div className="min-w-[720px]">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {menuLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center h-20 text-muted-foreground">
                            Loading menu...
                          </TableCell>
                        </TableRow>
                      ) : menuError ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center h-20 text-destructive">
                            {menuErrorDetails instanceof Error
                              ? menuErrorDetails.message
                              : "Failed to load menu items."}
                          </TableCell>
                        </TableRow>
                      ) : menu?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center h-20 text-muted-foreground">
                            No menu items found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        menu?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{formatPrice(item.basePrice)}</TableCell>
                            <TableCell className="max-w-[280px] truncate text-muted-foreground">
                              {item.description || "-"}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button size="sm" variant="outline" onClick={() => startEdit(item)}>
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteMenuItem.mutate(item.id)}
                                disabled={deleteMenuItem.isPending}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/70 backdrop-blur-md">
            <CardHeader>
              <CardTitle>Operations Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Table Occupancy</span>
                <span className="font-semibold">
                  {analytics?.occupiedTables ?? 0}/{analytics?.totalTables ?? 0}
                </span>
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-medium mb-2">Top Selling Items</h3>
                <div className="space-y-2">
                  {analyticsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading analytics...</p>
                  ) : analytics?.topItems.length ? (
                    analytics.topItems.map((item) => (
                      <div key={item.menuItemId} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate max-w-[180px]">{item.name}</span>
                        <Badge variant="secondary">{item.quantity}</Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No sales data yet.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function MetricCard({ title, value, loading }: { title: string; value: string; loading: boolean }) {
  return (
    <Card className="border-border bg-card/70 backdrop-blur-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-display font-bold">{loading ? "..." : value}</p>
      </CardContent>
    </Card>
  );
}
