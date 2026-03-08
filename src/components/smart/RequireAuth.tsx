import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/lib/stores";

const PUBLIC_ROUTES = ["/login", "/signup"];

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  if (PUBLIC_ROUTES.includes(location.pathname)) {
    return <>{children}</>;
  }

  if (!accessToken || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}

export function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  if (accessToken && user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
