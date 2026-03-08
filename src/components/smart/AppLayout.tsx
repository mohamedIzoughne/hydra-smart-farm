import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { NotificationToast } from "@/components/smart/NotificationToast";
import { useAuthStore } from "@/lib/stores";
import {
  LayoutDashboard, Map, Sprout, CloudRain, AlertTriangle, Menu, Leaf, User, LogOut, X,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/parcelles", label: "Mes parcelles", icon: Map },
  { to: "/cultures", label: "Cultures", icon: Sprout },
  { to: "/mesures", label: "Mes mesures", icon: CloudRain },
  { to: "/alertes", label: "Mes alertes", icon: AlertTriangle },
  { to: "/profil", label: "Mon profil", icon: User },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Don't render layout on auth/landing pages
  if (["/", "/login", "/signup"].includes(location.pathname)) {
    return <>{children}<NotificationToast /></>;
  }

  const sidebar = (
    <aside className="flex flex-col w-60 h-full bg-sidebar relative overflow-hidden" role="navigation" aria-label="Menu principal">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-sidebar-primary/[0.03] via-transparent to-transparent pointer-events-none" />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-5 py-6 border-b border-sidebar-border/50">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-sidebar-primary/20 shadow-sm shadow-sidebar-primary/10">
          <Leaf className="w-4.5 h-4.5 text-sidebar-primary" />
        </div>
        <div>
          <span className="text-sm font-bold text-sidebar-accent-foreground font-heading tracking-tight block">
            SmartAgri
          </span>
          <span className="text-[10px] text-sidebar-muted tracking-wide">Agriculture intelligente</span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="relative flex-1 px-3 py-4 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-sidebar-muted">Navigation</p>
        {navItems.map((item) => {
          const active = location.pathname === item.to ||
            (item.to !== "/dashboard" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar-link ${active ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="relative px-3 py-4 border-t border-sidebar-border/50">
        <div className="flex items-center gap-2.5 px-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-sidebar-primary/15 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-sidebar-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-sidebar-accent-foreground truncate">
              {user?.nom || "Agriculteur"}
            </p>
            <p className="text-[10px] text-sidebar-muted truncate">{user?.mail || ""}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); window.location.href = "/"; }}
          className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] font-medium text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200 rounded-lg"
        >
          <LogOut className="w-3.5 h-3.5" />
          Déconnexion
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">{sidebar}</div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative h-full w-60 shadow-2xl shadow-foreground/20">{sidebar}</div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center h-14 px-5 border-b border-border/50 bg-card/80 backdrop-blur-sm shrink-0">
          <button
            className="md:hidden mr-3 p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-muted"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
        </header>

        <main className="flex-1 overflow-y-auto p-5 md:p-8">
          <div className="animate-enter max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <NotificationToast />
    </div>
  );
}
