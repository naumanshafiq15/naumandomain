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
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMagicLink = async () => {
    if (!email) {
      alert("Please enter your email");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "https://app.kosykoala.co.uk",
      },
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setMessage("Magic link sent. Please check your email.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Login Required</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your email and we’ll send you a magic link to sign in.
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border px-3 py-2"
          />

          <button
            onClick={sendMagicLink}
            disabled={loading}
            className="w-full rounded-md bg-black text-white py-2 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send magic link"}
          </button>

          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
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
