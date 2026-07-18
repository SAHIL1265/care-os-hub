import { Outlet, createFileRoute } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Topbar } from "@/components/topbar";
import { SosFab } from "@/components/sos-fab";

export const Route = createFileRoute("/_app")({
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
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}