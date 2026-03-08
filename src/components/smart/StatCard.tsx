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
  primary: "bg-primary/8",
  secondary: "bg-secondary/8",
  accent: "bg-accent/8",
  destructive: "bg-destructive/8",
};

export function StatCard({ label, value, icon, color = "primary" }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={cn("flex items-center justify-center w-8 h-8 rounded-md", bgMap[color], colorMap[color])}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold font-heading tracking-tight">{value}</p>
    </div>
  );
}
