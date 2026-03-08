import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { NotificationToast } from "@/components/smart/NotificationToast";
import {
  LayoutDashboard, Users, Map, Sprout, CloudRain, AlertTriangle, Menu, X, Leaf,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agriculteurs", label: "Agriculteurs", icon: Users },
  { to: "/parcelles", label: "Parcelles", icon: Map },
  { to: "/cultures", label: "Cultures", icon: Sprout },
  { to: "/mesures", label: "Mesures", icon: CloudRain },
  { to: "/alertes", label: "Alertes", icon: AlertTriangle },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const sidebar = (
    <aside className="flex flex-col w-60 h-full bg-sidebar border-r border-sidebar-border">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-primary/20">
          <Leaf className="w-5 h-5 text-sidebar-primary" />
        </div>
        <span className="text-base font-bold text-sidebar-accent-foreground font-heading">SmartAgri-Predict</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`sidebar-link ${active ? "active" : ""}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-muted">SmartAgri v1.0</p>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">{sidebar}</div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setSidebarOpen(false)} />
          <div className="relative h-full w-60">{sidebar}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center h-14 px-4 border-b bg-card shrink-0">
          <button className="md:hidden mr-3 text-muted-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-medium text-muted-foreground">
            Gestion agricole intelligente
          </h2>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>

      <NotificationToast />
    </div>
  );
}
