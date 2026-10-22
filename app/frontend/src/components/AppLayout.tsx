import { useEffect, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  BellRing,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  Settings as SettingsIcon,
  Stethoscope,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apiGet } from "@/lib/api";
import { endSession } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/types";
import type { Role, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import HMVLogo from "@/components/HMVLogo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const ALL_ROLES: Role[] = ["admin", "recepcao", "enfermagem", "medico"];

interface MenuItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  testid: string;
  external?: boolean;
}

const MENU: MenuItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL_ROLES, testid: "menu-dashboard" },
  { to: "/pacientes", label: "Pacientes", icon: Users, roles: ["admin", "recepcao"], testid: "menu-pacientes" },
  { to: "/tv", label: "TV de Chamadas", icon: MonitorPlay, roles: ALL_ROLES, testid: "menu-tv", external: true },
  { to: "/chamada", label: "Nova Chamada", icon: BellRing, roles: ["admin", "recepcao", "enfermagem"], testid: "menu-chamada" },
  { to: "/consultorios", label: "Consultórios", icon: Building2, roles: ALL_ROLES, testid: "menu-consultorios" },
  { to: "/profissionais", label: "Profissionais", icon: Stethoscope, roles: ["admin"], testid: "menu-profissionais" },
  { to: "/atendimentos", label: "Atendimentos", icon: ClipboardList, roles: ALL_ROLES, testid: "menu-atendimentos" },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, roles: ["admin", "recepcao"], testid: "menu-relatorios" },
  { to: "/configuracoes", label: "Configurações", icon: SettingsIcon, roles: ["admin"], testid: "menu-configuracoes" },
];

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/pacientes": "Pacientes",
  "/chamada": "Nova Chamada",
  "/consultorios": "Consultórios",
  "/profissionais": "Profissionais",
  "/atendimentos": "Atendimentos",
  "/relatorios": "Relatórios",
  "/configuracoes": "Configurações",
};

function NavItems({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  const items = MENU.filter((item) => item.roles.includes(user.role));
  return (
    <nav className="flex flex-1 flex-col gap-1 px-3" data-testid="sidebar-nav" aria-label="Menu principal">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noreferrer" : undefined}
          onClick={onNavigate}
          data-testid={item.testid}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors duration-150 hover:bg-white/10 hover:text-white",
              isActive && !item.external && "bg-primary text-white shadow-sm",
            )
          }
        >
          <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserFooter({ user }: { user: User }) {
  return (
    <div className="border-t border-slate-800 p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
          {user.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white" data-testid="sidebar-user-name">
            {user.name}
          </p>
          <p className="text-xs text-slate-400">{ROLE_LABELS[user.role]}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        data-testid="logout-button"
        className="w-full justify-start gap-3 text-slate-300 hover:bg-rose-500/10 hover:text-rose-300"
        onClick={() => void endSession()}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" /> Sair
      </Button>
    </div>
  );
}

export default function AppLayout() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet<User>("/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" aria-label="Carregando" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const title = TITLES[location.pathname] ?? "HMV — Hospital Municipal Valparaíso";

  return (
    <div className="min-h-screen bg-background" data-testid="app-shell">
      {/* Sidebar fixa (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800 bg-[#0F172A] text-slate-100 lg:flex">
        <div className="flex h-16 items-center border-b border-slate-800 px-5">
          <HMVLogo inverted />
        </div>
        <div className="flex flex-1 flex-col gap-4 py-4">
          <NavItems user={user} />
        </div>
        <UserFooter user={user} />
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Topo */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-white px-4 shadow-xs lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                data-testid="mobile-menu-button"
                aria-label="Abrir menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-[#0F172A] text-slate-100">
                <SheetTitle className="sr-only">Menu principal</SheetTitle>
                <div className="mt-4">
                  <HMVLogo inverted />
                </div>
                <div className="mt-6 flex h-[70vh] flex-col">
                  <NavItems user={user} onNavigate={() => setMobileOpen(false)} />
                </div>
                <div className="absolute inset-x-0 bottom-0">
                  <UserFooter user={user} />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="truncate font-heading text-lg font-bold text-slate-900" data-testid="page-title">
              {title}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:gap-4">
            <span
              className="hidden font-mono text-sm font-medium text-slate-500 md:inline"
              data-testid="header-clock"
            >
              {clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })}
            </span>
            <a
              href="/tv"
              target="_blank"
              rel="noreferrer"
              data-testid="header-open-tv"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
            >
              <MonitorPlay className="h-4 w-4" aria-hidden="true" /> Abrir TV
            </a>
            <div className="hidden items-center gap-2 rounded-full bg-secondary px-3 py-1.5 sm:flex">
              <span className="h-2 w-2 animate-hmv-blink rounded-full bg-emerald-500" aria-hidden="true" />
              <span className="text-sm font-semibold text-secondary-foreground" data-testid="header-role-badge">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => void endSession()}
              data-testid="logout-button-mobile"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
