import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "primary" | "secondary" | "accent" | "destructive";
}

const colorMap = {
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
  destructive: "text-destructive",
};

const bgMap = {
  primary: "bg-primary/[0.08]",
  secondary: "bg-secondary/[0.08]",
  accent: "bg-accent/[0.08]",
  destructive: "bg-destructive/[0.08]",
};

export function StatCard({ label, value, icon, color = "primary" }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={cn("flex items-center justify-center w-9 h-9 rounded-lg", bgMap[color], colorMap[color])}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold font-heading tracking-tight text-foreground">{value}</p>
    </div>
  );
}
