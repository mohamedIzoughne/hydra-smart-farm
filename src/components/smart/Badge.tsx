import { cn } from "@/lib/utils";

interface BadgeProps {
  value: string;
  type?: "success" | "warning" | "danger" | "neutral";
  className?: string;
}

const badgeStyles = {
  success: "bg-success/15 text-success border-success/20",
  warning: "bg-warning/15 text-warning border-warning/20",
  danger: "bg-destructive/15 text-destructive border-destructive/20",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function Badge({ value, type = "neutral", className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", badgeStyles[type], className)}>
      {value}
    </span>
  );
}

export function stressBadgeType(niveau: string): BadgeProps["type"] {
  switch (niveau) {
    case "Critique": return "danger";
    case "Élevé": return "warning";
    case "Moyen": return "warning";
    case "Faible": return "success";
    default: return "neutral";
  }
}
