import { useEffect } from "react";
import { useAtom, useAtomValue } from "@effect/atom-react";
import type { LucideIcon } from "lucide-react";
import { CoffeeIcon, ImagesIcon, MessageCircleIcon, MoonIcon, SunIcon } from "lucide-react";
import { cn } from "@cafebot/ui/lib/utils";
import { Button } from "@cafebot/ui/components/button";
import { activeSectionAtom, darkModeAtom, detectionsAtom, type SectionId } from "../../lib/atoms";

interface NavItem {
  readonly id: SectionId;
  readonly label: string;
  readonly icon: LucideIcon;
}

const navItems: ReadonlyArray<NavItem> = [
  { id: "chat", label: "Chat", icon: MessageCircleIcon },
  { id: "gallery", label: "Galería", icon: ImagesIcon },
];

export function Sidebar() {
  const [section, setSection] = useAtom(activeSectionAtom);
  const detections = useAtomValue(detectionsAtom);
  const [dark, setDark] = useAtom(darkModeAtom);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <aside className="flex w-16 shrink-0 flex-col border-r border-border bg-sidebar px-3 py-4 md:w-60 md:items-stretch">
      <div className="mb-6 flex items-center gap-2.5 px-1">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <CoffeeIcon className="size-5" />
        </div>
        <div className="hidden min-w-0 md:block">
          <p className="truncate text-sm font-semibold tracking-tight">Cafebot</p>
          <p className="truncate text-xs text-muted-foreground">Salud del cafeto</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active = section === item.id;
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="default"
              onClick={() => setSection(item.id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "justify-start gap-2.5 px-3",
                active &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span className="hidden flex-1 text-left md:inline">{item.label}</span>
              {item.id === "gallery" && detections.length > 0 && (
                <span
                  className={cn(
                    "hidden rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums md:inline",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {detections.length}
                </span>
              )}
            </Button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-2 md:items-stretch">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDark(!dark)}
          aria-label={dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          className="self-center md:self-stretch"
        >
          {dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
        </Button>
        <p className="hidden text-center text-xs text-muted-foreground md:block">
          v0.1.0 · prototipo
        </p>
      </div>
    </aside>
  );
}
