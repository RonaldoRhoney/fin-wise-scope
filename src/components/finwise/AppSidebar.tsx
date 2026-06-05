import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, LayoutDashboard, ListChecks, Menu, Settings, User } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/registros", label: "Meus Registros", icon: ListChecks },
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-8 px-2">
        <div className="text-xl font-semibold tracking-tight">Controle Financeiro</div>
        <div className="text-xs text-muted-foreground">Controle suas finanças com inteligência</div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((l) => {
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
              {l.label}
            </Link>
          );
        })}
      </nav>
      <Link
        to="/perfil"
        onClick={onNavigate}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          path === "/perfil"
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
        }`}
      >
        <User className="h-4 w-4" />
        Meu Perfil
      </Link>
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
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-sidebar/80 px-4 backdrop-blur lg:hidden">
      <div className="text-base font-semibold tracking-tight">Controle Financeiro</div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button size="icon" variant="ghost" aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <NavContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
