import { FormEvent, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { supabase } from "@/integrations/supabase/client";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { isAdminUser } from "@/lib/auth";
import Index from "./pages/Index";
import ProcessedOrders from "./pages/ProcessedOrders";
import ProfitCalculator from "./pages/ProfitCalculator";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Login Required</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Sign in with the email and password provided by the admin.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            autoComplete="email"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-md border px-3 py-2"
            autoComplete="current-password"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-black text-white py-2 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
};

const AdminRoute = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <DashboardLayout>
      <Admin />
    </DashboardLayout>
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
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
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

  return (
    <AuthProvider
      value={{
        session,
        user: session.user,
        isAdmin: isAdminUser(session.user),
      }}
    >
      <ProtectedApp />
    </AuthProvider>
  );
};

export default App;
