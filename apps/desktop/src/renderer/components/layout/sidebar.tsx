import { useLayoutEffect } from "react";
import { useAtom, useAtomValue } from "@effect/atom-react";
import { Equal } from "effect";
import type { LucideIcon } from "lucide-react";
import {
  CoffeeIcon,
  ImagesIcon,
  LanguagesIcon,
  MessageCircleIcon,
  MoonIcon,
  SunIcon,
} from "lucide-react";
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
import { cycleLanguage, useLanguage, useMessages } from "../../lib/use-language";

interface NavItem {
  readonly id: SectionId;
  readonly label: () => string;
  readonly icon: LucideIcon;
}

export function AppSidebar() {
  const m = useMessages();
  const [section, setSection] = useAtom(activeSectionAtom);
  const detections = useAtomValue(detectionsAtom);
  const [dark, setDark] = useAtom(darkModeAtom);
  const [language, setLanguage] = useLanguage();

  useLayoutEffect(() => {
    applyTheme(dark);
  }, [dark]);

  const navItems: ReadonlyArray<NavItem> = [
    { id: "chat", label: () => m.navChat(), icon: MessageCircleIcon },
    { id: "gallery", label: () => m.navGallery(), icon: ImagesIcon },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-1 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex size-8 shrink-0 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground shadow-sm">
            <CoffeeIcon className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-bold tracking-tight">{m.appName()}</p>
            <p className="truncate text-xs text-muted-foreground">{m.appSubtitle()}</p>
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
                    tooltip={item.label()}
                    size="lg"
                    isActive={Equal.equals(item.id)(section)}
                    onClick={() => setSection(item.id)}
                  >
                    <item.icon />
                    <span>{item.label()}</span>
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
        <SidebarMenu className="gap-1.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={language.toUpperCase()}
              size="lg"
              onClick={() => setLanguage(cycleLanguage(language))}
            >
              <LanguagesIcon />
              <span className="uppercase">{language}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={dark ? m.themeLight() : m.themeDark()}
              size="lg"
              onClick={() => {
                const next = !dark;
                setDark(next);
                storeTheme(next);
              }}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
              <span>{dark ? m.themeLight() : m.themeDark()}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
