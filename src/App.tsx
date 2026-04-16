import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import ProcessedOrders from "./pages/ProcessedOrders";
import ProfitCalculator from "./pages/ProfitCalculator";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const signIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Login Required</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sign in to access Linnworks Insight Hub.
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />

          <button
            onClick={signIn}
            className="w-full rounded-md bg-black text-white py-2"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

const ProtectedApp = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <DashboardLayout>
                <Index />
              </DashboardLayout>
            }
          />
          <Route
            path="/processed-orders"
            element={
              <DashboardLayout>
                <ProcessedOrders />
              </DashboardLayout>
            }
          />
          <Route
            path="/page-2"
            element={
              <DashboardLayout>
                <ProfitCalculator />
              </DashboardLayout>
            }
          />
          <Route
            path="/page-3"
            element={
              <DashboardLayout>
                <div className="text-center py-8">
                  <h1 className="text-2xl font-bold">Page 3</h1>
                  <p className="text-muted-foreground">Coming soon...</p>
                </div>
              </DashboardLayout>
            }
          />
          <Route
            path="/page-4"
            element={
              <DashboardLayout>
                <div className="text-center py-8">
                  <h1 className="text-2xl font-bold">Page 4</h1>
                  <p className="text-muted-foreground">Coming soon...</p>
                </div>
              </DashboardLayout>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!session) {
    return <LoginScreen />;
  }

  return <ProtectedApp />;
};

export default App;
