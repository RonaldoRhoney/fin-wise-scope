import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ListChecks, User } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/registros", label: "Meus Registros", icon: ListChecks },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar p-4">
      <div className="mb-8 px-2">
        <div className="text-xl font-semibold tracking-tight">FinWise</div>
        <div className="text-xs text-muted-foreground">Controle financeiro</div>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((l) => {
          const active = path === l.to;
          const Icon = l.icon;
          return (
            <Link
              key={l.to}
              to={l.to}
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
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          path === "/perfil"
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
        }`}
      >
        <User className="h-4 w-4" />
        Meu Perfil
      </Link>
    </aside>
  );
}
