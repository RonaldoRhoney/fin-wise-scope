import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, GraduationCap, HelpCircle, LayoutDashboard, ListChecks, Menu, MessageCircle, Settings, Sparkles, Target, User, Banknote, Shield } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFinwise } from "@/lib/finwise/store";
import { useIsAdmin } from "@/lib/finwise/use-is-admin";

const ACTIVE_COLOR = "#10B981";

const primaryLinks = [
  { to: "/registros", key: "registros", icon: ListChecks },
  { to: "/", key: "dashboard", icon: LayoutDashboard },
  { to: "/relatorios", key: "relatorios", icon: BarChart3 },
  { to: "/metas", key: "metas", icon: Target },
  { to: "/educacao", key: "educacao", icon: GraduationCap },
  { to: "/cotacoes", key: "cotacoes", icon: Banknote },
  { to: "/tips", key: "tips", icon: Sparkles },
] as const;

const secondaryLinks = [
  { to: "/feedback", key: "feedback", icon: MessageCircle },
  { to: "/perfil", key: "perfil", icon: User },
  { to: "/configuracoes", key: "configuracoes", icon: Settings },
  { to: "/ajuda", key: "ajuda", icon: HelpCircle },
] as const;

const adminLink = { to: "/admin", key: "admin", icon: Shield, label: "Admin" } as const;

function UserHeader() {
  const { profile, session } = useFinwise();
  const name = profile?.name?.trim() || session?.user?.email?.split("@")[0] || "—";
  const email = session?.user?.email ?? "";
  const initials = (name || "?")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <Link to="/perfil" className="mb-4 flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3 transition-colors hover:bg-card">
      <Avatar className="h-10 w-10 ring-1 ring-border/60">
        {profile?.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={name} /> : null}
        <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold tracking-tight">{name}</div>
        <div className="truncate text-xs text-muted-foreground">{email}</div>
      </div>
    </Link>
  );
}

function NavLinks({ items, onNavigate, path }: { items: ReadonlyArray<{ to: string; key: string; icon: any }>; onNavigate?: () => void; path: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-1">
      {items.map((l) => {
        const active = path === l.to;
        const Icon = l.icon;
        return (
          <Link
            key={l.to}
            to={l.to}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-sidebar-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            }`}
            style={active ? { boxShadow: `inset 2px 0 0 ${ACTIVE_COLOR}` } : undefined}
          >
            <Icon className="h-4 w-4" style={active ? { color: ACTIVE_COLOR } : undefined} />
            {t(`nav.${l.key}`)}
          </Link>
        );
      })}
    </div>
  );
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useTranslation();
  const { isAdmin } = useIsAdmin();
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 px-1">
        <div className="text-lg font-semibold tracking-tight">{t("app.name")}</div>
        <div className="text-xs text-muted-foreground">{t("app.tagline")}</div>
      </div>
      <UserHeader />
      <nav className="flex flex-1 flex-col">
        <NavLinks items={primaryLinks} onNavigate={onNavigate} path={path} />
        <div className="my-3 h-px bg-border/60" />
        <NavLinks items={secondaryLinks} onNavigate={onNavigate} path={path} />
        {isAdmin && (
          <>
            <div className="my-3 h-px bg-border/60" />
            <Link
              to={adminLink.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                path === adminLink.to
                  ? "bg-sidebar-accent font-medium text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              }`}
              style={path === adminLink.to ? { boxShadow: `inset 2px 0 0 ${ACTIVE_COLOR}` } : undefined}
            >
              <Shield className="h-4 w-4" style={path === adminLink.to ? { color: ACTIVE_COLOR } : { color: "#8B5CF6" }} />
              {adminLink.label}
            </Link>
          </>
        )}
      </nav>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-sidebar-accent/30 lg:block">
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
        <SheetContent side="left" className="w-72 bg-sidebar-accent/30 p-0">
          <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
          <NavContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
