import { cn } from "@/lib/utils";

interface BadgeProps {
  value: string;
  type?: "success" | "warning" | "danger" | "neutral";
  className?: string;
}

const badgeStyles = {
  success: "bg-success/12 text-success border-success/25 shadow-sm shadow-success/5",
  warning: "bg-warning/12 text-warning border-warning/25 shadow-sm shadow-warning/5",
  danger: "bg-destructive/12 text-destructive border-destructive/25 shadow-sm shadow-destructive/5",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function Badge({ value, type = "neutral", className }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border",
      badgeStyles[type],
      className,
    )}>
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
