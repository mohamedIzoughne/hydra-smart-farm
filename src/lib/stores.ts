import { create } from "zustand";

interface Notification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface NotificationStore {
  notifications: Notification[];
  notify: (type: Notification["type"], message: string, timeout?: number) => void;
  dismiss: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  notify: (type, message, timeout = 4000) => {
    const id = crypto.randomUUID();
    set((s) => ({ notifications: [...s.notifications, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
    }, timeout);
  },
  dismiss: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}));
