import { defineStore } from "pinia";
import { ref, computed } from "vue";
import api from "@/plugins/axios";
import type { User } from "@/types";
import { API } from "@/config/api";

export const useAuthStore = defineStore("auth", () => {
  // State
  const user = ref<User | null>(null);
  // Safe SSR/Browser check for localStorage
  const accessToken = ref<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null,
  );
  const refreshToken = ref<string | null>(
    typeof window !== "undefined"
      ? localStorage.getItem("refresh_token")
      : null,
  );

  // Getters (Computed Properties)
  const isLoggedIn = computed(() => !!accessToken.value);

  const userRoles = computed(
    (): string[] => user.value?.userRoles?.map((ur) => ur.role.name) || [],
  );

  const permissions = computed(
    (): string[] =>
      user.value?.userRoles?.flatMap(
        (ur) =>
          ur.role.rolePermissions?.map((rp) => rp.permission?.action) || [],
      ) || [],
  );

  const fullName = computed(() =>
    user.value ? `${user.value.firstName} ${user.value.lastName}` : "",
  );

  const fullNameKh = computed(() =>
    user.value
      ? `${user.value.firstNameKh || ""} ${user.value.lastNameKh || ""}`.trim()
      : "",
  );

  const initials = computed(() => {
    if (!user.value || !user.value.firstName || !user.value.lastName)
      return "?";
    return `${user.value.firstName[0]}${user.value.lastName[0]}`.toUpperCase();
  });

  // Methods (Functions)
  const hasRole = (role: string) => userRoles.value.includes(role);
  const hasPermission = (perm: string) => permissions.value.includes(perm);

  // Actions
  async function login(
    identifier: string,
    password: string,
    loginChoice?: string,
  ) {
    try {
      const res = await api.post(API.AUTH.LOGIN, {
        identifier,
        password,
        loginChoice,
      });
      const data = res.data?.data || res.data || res;

      accessToken.value = data.accessToken;
      refreshToken.value = data.refreshToken;

      localStorage.setItem("access_token", data.accessToken);
      localStorage.setItem("refresh_token", data.refreshToken);

      // Attempt profile fetch; if it fails, rollback auth state
      await fetchProfile();
    } catch (error) {
      clearAuthData();
      throw error; // Re-throw to handle error UI-side
    }
  }

  async function fetchProfile() {
    try {
      //const res = await api.get("/auth/me");
      const res = await api.get(API.AUTH.ME);
      user.value = res.data?.data || res.data || res;
    } catch (error) {
      clearAuthData();
      throw error;
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout request failed", error);
    } finally {
      // Always clear local state even if backend logout fails
      clearAuthData();
    }
  }

  // Helper utility to keep DRY principle
  function clearAuthData() {
    user.value = null;
    accessToken.value = null;
    refreshToken.value = null;
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }

  return {
    user,
    accessToken,
    refreshToken,
    isLoggedIn,
    userRoles,
    hasRole,
    hasPermission,
    fullName,
    fullNameKh,
    initials,
    login,
    logout,
    fetchProfile,
  };
});
