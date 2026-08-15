import { createRoute } from "@tanstack/react-router";
import { GalleryView } from "../components/gallery/gallery-view";
import { Route as appRoute } from "./_app";

export const Route = createRoute({
  getParentRoute: () => appRoute,
  path: "/gallery",
  component: GalleryView,
});
