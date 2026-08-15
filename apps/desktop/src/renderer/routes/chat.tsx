import { createRoute } from "@tanstack/react-router";
import { ChatView } from "../components/chat/chat-view";
import { Route as appRoute } from "./_app";

export const Route = createRoute({
  getParentRoute: () => appRoute,
  path: "/chat",
  component: ChatView,
});
