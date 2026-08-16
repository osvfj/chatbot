import { useEffect, useState } from "react";
import { createRoute, Outlet } from "@tanstack/react-router";
import { useAtom } from "@effect/atom-react";
import { SidebarInset, SidebarProvider } from "@cafebot/ui/components/sidebar";
import { AppSidebar } from "../components/layout/sidebar";
import { ChatStreamer } from "../components/layout/chat-streamer";
import { LoginScreen } from "../lib/auth";
import { api, clearToken, getToken } from "../lib/backend";
import { sessionAtom } from "../lib/atoms";
import { Route as rootRoute } from "./__root";

function AppLayout() {
  const [session, setSession] = useAtom(sessionAtom);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (token === null) {
      setChecked(true);
      return;
    }
    api
      .me()
      .then((me) => setSession({ token, usuario: me.usuario, finca: me.finca }))
      .catch(() => clearToken())
      .finally(() => setChecked(true));
  }, [setSession]);

  if (!checked) {
    return null;
  }

  if (session === null) {
    return <LoginScreen />;
  }

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <ChatStreamer />
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
