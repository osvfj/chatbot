import { createRoute } from "@tanstack/react-router";
import { AlbumView } from "../components/gallery/album-view";
import { Route as appRoute } from "./_app";

export const Route = createRoute({
  getParentRoute: () => appRoute,
  path: "/gallery/$uuid",
  component: () => <AlbumView conversationUuid={Route.useParams().uuid} />,
});
