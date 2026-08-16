import { createRoute, Outlet } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@cafebot/ui/components/sidebar";
import { AppSidebar } from "../components/layout/sidebar";
import { StreamingManager } from "../components/layout/streaming-manager";
import { Route as rootRoute } from "./__root";

function AppLayout() {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <StreamingManager />
      <SidebarInset className="min-h-0 overflow-hidden">
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AppLayout,
});
