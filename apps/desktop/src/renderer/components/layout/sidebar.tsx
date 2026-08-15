import { useLayoutEffect } from "react";
import { useAtom, useAtomValue } from "@effect/atom-react";
import { Equal } from "effect";
import type { LucideIcon } from "lucide-react";
import { CoffeeIcon, ImagesIcon, MessageCircleIcon, MoonIcon, SunIcon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@cafebot/ui/components/sidebar";
import { activeSectionAtom, darkModeAtom, detectionsAtom, type SectionId } from "../../lib/atoms";
import { applyTheme, storeTheme } from "../../lib/theme";

interface NavItem {
  readonly id: SectionId;
  readonly label: string;
  readonly icon: LucideIcon;
}

const navItems: ReadonlyArray<NavItem> = [
  { id: "chat", label: "Chat", icon: MessageCircleIcon },
  { id: "gallery", label: "Galería", icon: ImagesIcon },
];

export function AppSidebar() {
  const [section, setSection] = useAtom(activeSectionAtom);
  const detections = useAtomValue(detectionsAtom);
  const [dark, setDark] = useAtom(darkModeAtom);

  useLayoutEffect(() => {
    applyTheme(dark);
  }, [dark]);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex size-8 shrink-0 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground shadow-sm">
            <CoffeeIcon className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-bold tracking-tight">Cafebot</p>
            <p className="truncate text-xs text-muted-foreground">salud del cafeto</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    tooltip={item.label}
                    size="lg"
                    isActive={Equal.equals(item.id)(section)}
                    onClick={() => setSection(item.id)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    {Equal.equals("gallery")(item.id) && detections.length > 0 && (
                      <SidebarMenuBadge>{detections.length}</SidebarMenuBadge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={dark ? "Modo claro" : "Modo oscuro"}
              size="lg"
              onClick={() => {
                const next = !dark;
                setDark(next);
                storeTheme(next);
              }}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
              <span>{dark ? "Modo claro" : "Modo oscuro"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
