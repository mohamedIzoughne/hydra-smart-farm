import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "primary" | "secondary" | "accent" | "destructive";
}

const colorMap = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  accent: "bg-accent/10 text-accent",
  destructive: "bg-destructive/10 text-destructive",
};

export function StatCard({ label, value, icon, color = "primary" }: StatCardProps) {
  return (
    <div className="stat-card flex items-center gap-4">
      <div className={cn("flex items-center justify-center w-12 h-12 rounded-lg", colorMap[color])}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold font-heading">{value}</p>
      </div>
    </div>
  );
}
