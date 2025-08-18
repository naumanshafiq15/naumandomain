import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import Index from "./pages/Index";
import ProcessedOrders from "./pages/ProcessedOrders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <DashboardLayout>
              <Index />
            </DashboardLayout>
          } />
          <Route path="/processed-orders" element={
            <DashboardLayout>
              <ProcessedOrders />
            </DashboardLayout>
          } />
          <Route path="/page-2" element={
            <DashboardLayout>
              <div className="text-center py-8">
                <h1 className="text-2xl font-bold">Page 2</h1>
                <p className="text-muted-foreground">Coming soon...</p>
              </div>
            </DashboardLayout>
          } />
          <Route path="/page-3" element={
            <DashboardLayout>
              <div className="text-center py-8">
                <h1 className="text-2xl font-bold">Page 3</h1>
                <p className="text-muted-foreground">Coming soon...</p>
              </div>
            </DashboardLayout>
          } />
          <Route path="/page-4" element={
            <DashboardLayout>
              <div className="text-center py-8">
                <h1 className="text-2xl font-bold">Page 4</h1>
                <p className="text-muted-foreground">Coming soon...</p>
              </div>
            </DashboardLayout>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
