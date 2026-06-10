import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/plugins/axios";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  titleKh: string;
  titleEn: string;
  isRead: boolean;
  leaveRequestId?: string;
  createdAt: string;
}

export const useNotificationStore = defineStore("notification", () => {
  // State
  const notifications = ref<Notification[]>([]);
  const serverUnreadCount = ref(0);

  // Getters (Computed Properties)
  // ប្រើប្រាស់ computed ដើម្បីធានាថា បើមាន notification ក្នុង array វានឹងរាប់តាមជាក់ស្តែង តែបើអត់ទេ គឺយកតាម server count
  const unreadCount = computed(() => {
    if (notifications.value.length > 0) {
      return notifications.value.filter((n) => !n.isRead).length;
    }
    return serverUnreadCount.value;
  });

  // Helper សម្រាប់ទាញយក Data ឱ្យត្រូវទម្រង់
  const getData = (res: any) => res.data?.data || res.data || res;

  // Actions
  async function fetch() {
    try {
      const res = await api.get("/notifications");
      notifications.value = (getData(res) as Notification[]) || [];
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      notifications.value = [];
    }
  }

  async function fetchCount() {
    try {
      const res = await api.get("/notifications/count");
      const data = getData(res);
      serverUnreadCount.value = data?.count ?? data ?? 0;
    } catch (error) {
      console.error("Failed to fetch notification count:", error);
      serverUnreadCount.value = 0;
    }
  }

  async function markRead(id: string) {
    // ស្វែងរក Notification ក្នុង State សិន
    const n = notifications.value.find((n) => n.id === id);

    // បើសិនជាវាអានរួចហើយ មិនបាច់ធ្វើអ្វីទៀតទេ (ការពារ Over-decrement លើ Server Count)
    if (n && n.isRead) return;

    // Optimistic Update: កែប្រែនៅលើ Client ភ្លាមៗដើម្បី UX លឿន
    if (n) {
      n.isRead = true;
    }
    if (serverUnreadCount.value > 0) {
      serverUnreadCount.value--;
    }

    try {
      await api.patch(`/notifications/${id}/read`);
    } catch (error) {
      // បើ API បរាជ័យ ត្រូវ Rollback ទិន្នន័យមកវិញដើម្បីការពារ App បោកប្រាស់អ្នកប្រើប្រាស់
      if (n) n.isRead = false;
      serverUnreadCount.value++;
      console.error("Failed to mark notification as read:", error);
    }
  }

  async function markAllRead() {
    // រក្សាទុកទិន្នន័យចាស់សម្រាប់ករណី Rollback
    const previousNotifications = JSON.parse(
      JSON.stringify(notifications.value),
    );
    const previousCount = serverUnreadCount.value;

    // Optimistic Update
    notifications.value.forEach((n) => (n.isRead = true));
    serverUnreadCount.value = 0;

    try {
      await api.patch("/notifications/read-all");
    } catch (error) {
      // Rollback បើ API Error
      notifications.value = previousNotifications;
      serverUnreadCount.value = previousCount;
      console.error("Failed to mark all notifications as read:", error);
    }
  }

  return {
    notifications,
    unreadCount,
    fetch,
    fetchCount,
    markRead,
    markAllRead,
  };
});
