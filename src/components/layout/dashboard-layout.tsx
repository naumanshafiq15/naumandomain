import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { isAdmin } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <Link to="/" className="text-xl font-semibold">
          Linnworks Insight Hub
        </Link>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
            >
              Admin
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
};
