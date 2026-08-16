import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";
import { SosFab } from "@/components/sos-fab";
import { ReminderWatcher } from "@/components/reminder-watcher";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="min-w-0 flex-1">
          <Topbar />
          <main className="min-w-0 flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
          <SosFab />
          <ReminderWatcher />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}