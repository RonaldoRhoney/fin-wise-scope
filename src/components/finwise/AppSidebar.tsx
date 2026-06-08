import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Building2, LayoutDashboard, ListChecks, Menu, MessageCircle, Settings, Sparkles, Target, User } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const linkDefs = [
  { to: "/registros", key: "registros", icon: ListChecks },
  { to: "/", key: "dashboard", icon: LayoutDashboard },
  { to: "/relatorios", key: "relatorios", icon: BarChart3 },
  { to: "/metas", key: "metas", icon: Target },
  { to: "/bancos", key: "bancos", icon: Building2 },
  { to: "/tips", key: "tips", icon: Sparkles },
  { to: "/feedback", key: "feedback", icon: MessageCircle },
  { to: "/perfil", key: "perfil", icon: User },
  { to: "/configuracoes", key: "configuracoes", icon: Settings },
] as const;

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-8 px-2">
        <div className="text-xl font-semibold tracking-tight">{t("app.name")}</div>
        <div className="text-xs text-muted-foreground">{t("app.tagline")}</div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {linkDefs.map((l) => {
          const active = path === l.to;
          const Icon = l.icon;
          return (
            <Link
              key={l.to}
              to={l.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t(`nav.${l.key}`)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border/60 bg-sidebar lg:block">
      <NavContent />
    </aside>
  );
}

export function MobileTopBar() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-sidebar/80 px-4 backdrop-blur lg:hidden">
      <div className="text-base font-semibold tracking-tight">{t("app.name")}</div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="ghost" aria-label={t("nav.menu")}>
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
          <NavContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
