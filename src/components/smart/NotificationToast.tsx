import { useNotificationStore } from "@/lib/stores";
import { X, CheckCircle, AlertTriangle, Info } from "lucide-react";

const iconMap = {
  success: <CheckCircle className="w-4 h-4 text-success" />,
  error: <AlertTriangle className="w-4 h-4 text-destructive" />,
  info: <Info className="w-4 h-4 text-accent" />,
};

const bgMap = {
  success: "border-success/30 bg-success/5",
  error: "border-destructive/30 bg-destructive/5",
  info: "border-accent/30 bg-accent/5",
};

export function NotificationToast() {
  const { notifications, dismiss } = useNotificationStore();

  if (!notifications.length) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {notifications.map((n) => (
        <div key={n.id} className={`flex items-start gap-2 px-4 py-3 rounded-lg border shadow-lg bg-card animate-slide-in ${bgMap[n.type]}`}>
          {iconMap[n.type]}
          <p className="text-sm flex-1">{n.message}</p>
          <button onClick={() => dismiss(n.id)} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
