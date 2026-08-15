import { createRoute, Navigate } from "@tanstack/react-router";
import { Route as appRoute } from "./_app";

export const Route = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: () => <Navigate to="/chat" />,
});
