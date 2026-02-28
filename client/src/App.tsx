import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Import Pages
import POS from "./pages/pos";
import KDS from "./pages/kds";
import Orders from "./pages/orders";
import AdminDashboard from "./pages/admin";

function hasAdminAccess() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("culina_user_role") === "admin";
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/pos" />} />
      <Route path="/pos" component={POS} />
      <Route path="/kds" component={KDS} />
      <Route path="/orders" component={Orders} />
      <Route
        path="/admin"
        component={() => (hasAdminAccess() ? <AdminDashboard /> : <Redirect to="/pos" />)}
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
