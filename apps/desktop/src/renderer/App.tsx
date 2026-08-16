import { createHashHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@cafebot/ui/components/tooltip";
import { Route as rootRoute } from "./routes/__root";
import { Route as appRoute } from "./routes/_app";
import { Route as indexRoute } from "./routes/index";
import { Route as chatRoute } from "./routes/chat";
import { Route as chatUuidRoute } from "./routes/chat.$uuid";
import { Route as galleryRoute } from "./routes/gallery";
import { Route as galleryUuidRoute } from "./routes/gallery.$uuid";

const routeTree = rootRoute.addChildren([
  appRoute.addChildren([indexRoute, chatRoute, chatUuidRoute, galleryRoute, galleryUuidRoute]),
]);

const router = createRouter({
  routeTree,
  history: createHashHistory(),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
