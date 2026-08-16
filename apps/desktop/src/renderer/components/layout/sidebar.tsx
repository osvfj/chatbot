import { useLayoutEffect } from "react";
import { useAtom } from "@effect/atom-react";
import { Predicate } from "effect";
import { Link, useLocation } from "@tanstack/react-router";
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
import { conversationUuidAtom, darkModeAtom } from "../../lib/atoms";
import { useAlbums } from "../../lib/use-gallery";
import { applyTheme, storeTheme } from "../../lib/theme";
import { cycleLanguage, useLanguage, useMessages } from "../../lib/use-language";
import { ZenSettingsDialog } from "./zen-settings-dialog";

export function AppSidebar() {
  const m = useMessages();
  const [conversationUuid] = useAtom(conversationUuidAtom);
  const { data } = useAlbums();
  const albumCount = data?.albums.length ?? 0;
  const [dark, setDark] = useAtom(darkModeAtom);
  const [language, setLanguage] = useLanguage();
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    applyTheme(dark);
  }, [dark]);

  const chatActive = pathname.startsWith("/chat");
  const galleryActive = pathname.startsWith("/gallery");

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
              <SidebarMenuItem>
                {Predicate.isNull(conversationUuid) ? (
                  <SidebarMenuButton
                    tooltip={m.navChat()}
                    size="lg"
                    isActive={chatActive}
                    render={<Link to="/chat" />}
                  >
                    <MessageCircleIcon />
                    <span>{m.navChat()}</span>
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton
                    tooltip={m.navChat()}
                    size="lg"
                    isActive={chatActive}
                    render={<Link to="/chat/$uuid" params={{ uuid: conversationUuid }} />}
                  >
                    <MessageCircleIcon />
                    <span>{m.navChat()}</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={m.navGallery()}
                  size="lg"
                  isActive={galleryActive}
                  render={<Link to="/gallery" />}
                >
                  <ImagesIcon />
                  <span>{m.navGallery()}</span>
                  {albumCount > 0 && <SidebarMenuBadge>{albumCount}</SidebarMenuBadge>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="gap-1.5">
          <SidebarMenuItem>
            <ZenSettingsDialog />
          </SidebarMenuItem>
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
