import { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen flex flex-col">
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <h1 className="text-xl font-semibold">
          Linnworks Insight Hub
        </h1>

        <button
          onClick={handleLogout}
          className="rounded-md border px-3 py-1 text-sm hover:bg-muted"
        >
          Logout
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {children}
      </main>

    </div>
  );
};
