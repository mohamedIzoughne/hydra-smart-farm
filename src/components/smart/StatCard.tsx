import React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "primary" | "secondary" | "accent" | "destructive";
  subtitle?: string;
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

const glowMap = {
  primary: "group-hover:shadow-primary/10",
  secondary: "group-hover:shadow-secondary/10",
  accent: "group-hover:shadow-accent/10",
  destructive: "group-hover:shadow-destructive/10",
};

const borderAccent = {
  primary: "border-l-primary",
  secondary: "border-l-secondary",
  accent: "border-l-accent",
  destructive: "border-l-destructive",
};

export function StatCard({ label, value, icon, color = "primary", subtitle }: StatCardProps) {
  return (
    <div className={cn(
      "group stat-card border-l-[3px] transition-all duration-300",
      borderAccent[color],
      glowMap[color],
    )}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 group-hover:scale-110",
          bgMap[color],
          colorMap[color],
        )}>
          {icon}
        </div>
      </div>
      <p className={cn("text-4xl font-black font-heading tracking-tight", colorMap[color])}>
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
      )}
    </div>
  );
}
