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
    <aside className="flex flex-col w-56 h-full bg-sidebar" role="navigation" aria-label="Menu principal">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-sidebar-primary/20">
          <Leaf className="w-4 h-4 text-sidebar-primary" />
        </div>
        <span className="text-sm font-bold text-sidebar-accent-foreground font-heading tracking-tight">
          SmartAgri
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
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
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-sidebar-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-sidebar-accent-foreground truncate">
              {user?.nom || "Agriculteur"}
            </p>
            <p className="text-[10px] text-sidebar-muted truncate">{user?.mail || ""}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); window.location.href = "/"; }}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-[12px] font-medium text-sidebar-muted hover:text-sidebar-foreground transition-colors duration-150 rounded"
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
            className="absolute inset-0 bg-foreground/25 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative h-full w-56 shadow-lg">{sidebar}</div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center h-12 px-4 border-b border-border/60 bg-card shrink-0">
          <button
            className="md:hidden mr-3 p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors duration-150 rounded-md"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1" />
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="animate-enter">
            {children}
          </div>
        </main>
      </div>

      <NotificationToast />
    </div>
  );
}
