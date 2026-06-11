<template>
  <v-layout>
    <!-- Sidebar -->
    <v-navigation-drawer
      v-model="drawer"
      :rail="rail"
      permanent
      color="primary"
      width="250"
    >
      <!-- Logo -->
      <v-list-item prepend-icon="mdi-bank-outline" nav class="py-4">
        <template #title>
          <span class="font-weight-black text-white" style="font-size: 15px"
            >GLMS</span
          >
        </template>
        <template #subtitle>
          <span
            style="
              font-family: 'Kantumruy Pro', sans-serif;
              font-size: 10px;
              opacity: 0.65;
              color: white;
            "
            >អង្គភាពប្រឆាំងអំពើពុករលួយ</span
          >
        </template>
        <template #append>
          <v-btn
            :icon="rail ? 'mdi-chevron-right' : 'mdi-chevron-left'"
            variant="text"
            color="white"
            @click="rail = !rail"
            size="small"
          />
        </template>
      </v-list-item>

      <v-divider color="rgba(255,255,255,0.12)" />

      <!-- Nav Groups -->
      <v-list density="compact" nav class="mt-1">
        <template v-for="group in navGroups" :key="group.group">
          <v-list-subheader
            v-if="!rail && group.group"
            class="text-white"
            style="opacity: 0.45; font-size: 10px; letter-spacing: 1px"
          >
            {{ group.group }}
          </v-list-subheader>
          <template v-for="item in group.items" :key="item.to">
            <v-list-item
              v-if="canSee(item)"
              :prepend-icon="item.icon"
              :title="item.title"
              :to="item.to"
              active-class="bg-white text-primary font-weight-bold"
              rounded="lg"
              class="mb-1"
            >
              <template
                #append
                v-if="'badge' in item && item.badge && item.badge > 0"
              >
                <v-badge :content="item.badge" color="error" inline />
              </template>
            </v-list-item>
          </template>
        </template>
      </v-list>

      <template #append>
        <v-divider color="rgba(255,255,255,0.12)" />
        <v-list density="compact" nav class="py-2">
          <v-list-item
            prepend-icon="mdi-logout"
            title="Logout"
            @click="handleLogout"
            rounded="lg"
            class="text-white"
          />
        </v-list>
      </template>
    </v-navigation-drawer>

    <!-- Top App Bar -->
    <v-app-bar flat border="b" color="white" elevation="0">
      <v-app-bar-title>
        <span class="text-subtitle-1 font-weight-bold text-primary">{{
          pageTitle
        }}</span>
      </v-app-bar-title>
      <template #append>
        <LocaleSwitcher class="mr-2" />
        <!-- Notification Bell -->
        <v-btn icon @click="router.push('/notifications')" class="mr-1">
          <v-badge
            :content="notifStore.unreadCount"
            color="error"
            :model-value="notifStore.unreadCount > 0"
          >
            <v-icon>mdi-bell-outline</v-icon>
          </v-badge>
        </v-btn>

        <!-- User Menu -->
        <v-menu>
          <template #activator="{ props }">
            <v-btn v-bind="props" variant="text" class="mr-2">
              <v-avatar color="primary" size="34" class="mr-2">
                <span class="text-caption font-weight-bold text-white">{{
                  auth.initials
                }}</span>
              </v-avatar>
              <div class="text-left d-none d-sm-block">
                <div
                  class="text-caption font-weight-bold"
                  style="line-height: 1.2"
                >
                  {{ auth.fullName }}
                </div>
                <div
                  class="text-caption text-medium-emphasis"
                  style="font-size: 10px"
                >
                  {{ primaryRole }}
                </div>
              </div>
            </v-btn>
          </template>
          <v-card min-width="200" rounded="xl" elevation="4">
            <v-list density="compact">
              <v-list-item
                :title="auth.fullName"
                :subtitle="auth.user?.email"
              />
              <v-divider />
              <v-list-item
                title="My Profile"
                prepend-icon="mdi-account-circle"
                to="/profile"
              />
              <v-list-item
                title="Change Password"
                prepend-icon="mdi-lock-reset"
                to="/profile"
              />
              <v-divider />
              <v-list-item
                title="Logout"
                prepend-icon="mdi-logout"
                @click="handleLogout"
              />
            </v-list>
          </v-card>
        </v-menu>
      </template>
    </v-app-bar>

    <!-- Main Content -->
    <v-main style="background: #f0f2f7">
      <v-container fluid class="pa-6">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </v-container>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "@/i18n";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";
import LocaleSwitcher from "@/components/shared/LocaleSwitcher.vue";
import { useNotificationStore } from "@/stores/notification.store";

const auth = useAuthStore();
const { t, locale } = useI18n();
const notifStore = useNotificationStore();
const router = useRouter();
const route = useRoute();
const drawer = ref(true);
const rail = ref(false);

const navGroups = computed(() => [
  {
    group: "",
    items: [
      {
        to: "/dashboard",
        icon: "mdi-view-dashboard-outline",
        title: "Dashboard",
        roles: [],
      },
    ],
  },
  {
    group: "LEAVE",
    items: [
      {
        to: "/requests/new",
        icon: "mdi-plus-circle-outline",
        title: "New Request",
        roles: [],
      },
      {
        to: "/requests/my",
        icon: "mdi-clipboard-list-outline",
        title: "My Requests",
        roles: [],
      },
      {
        to: "/approvals",
        icon: "mdi-check-circle-outline",
        title: "Approvals",
        roles: [
          "OFFICE_CHIEF",
          "DEPARTMENT_CHIEF",
          "HR_OFFICER",
          "DIRECTOR_GENERAL",
          "INSTITUTION_HEAD",
        ],
        get badge() {
          return notifStore.unreadCount;
        },
      },
      {
        to: "/balances",
        icon: "mdi-calendar-check-outline",
        title: "Leave Balances",
        roles: [],
      },
    ],
  },
  {
    group: "ORGANIZATION",
    items: [
      {
        to: "/organization",
        icon: "mdi-sitemap-outline",
        title: "Org Structure",
        roles: [],
      },
      {
        to: "/positions",
        icon: "mdi-briefcase-outline",
        title: "Positions",
        roles: ["SYSTEM_ADMIN", "HR_OFFICER"],
      },
      {
        to: "/roles",
        icon: "mdi-shield-key",
        title: "Roles & Permissions",
        roles: ["SYSTEM_ADMIN"],
      },
      {
        to: "/users",
        icon: "mdi-account-group-outline",
        title: "Users",
        roles: ["SYSTEM_ADMIN", "HR_OFFICER"],
      },
    ],
  },
  {
    group: "CONFIGURATION",
    items: [
      {
        to: "/leave-types",
        icon: "mdi-tag-multiple-outline",
        title: "Leave Types",
        roles: ["SYSTEM_ADMIN", "HR_OFFICER"],
      },
      {
        to: "/public-holidays",
        icon: "mdi-calendar-star",
        title: "Public Holidays",
        roles: ["SYSTEM_ADMIN", "HR_OFFICER"],
      },
      {
        to: "/delegations",
        icon: "mdi-account-switch",
        title: "Delegations",
        roles: [
          "SYSTEM_ADMIN",
          "INSTITUTION_HEAD",
          "DIRECTOR_GENERAL",
          "DEPARTMENT_CHIEF",
          "OFFICE_CHIEF",
        ],
      },
      {
        to: "/workflow",
        icon: "mdi-arrow-decision-outline",
        title: "Workflow",
        roles: ["SYSTEM_ADMIN"],
      },
    ],
  },
  {
    group: "ANALYTICS",
    items: [
      {
        to: "/reports",
        icon: "mdi-chart-bar",
        title: "Reports",
        roles: [
          "SYSTEM_ADMIN",
          "HR_OFFICER",
          "DIRECTOR_GENERAL",
          "INSTITUTION_HEAD",
        ],
      },
      {
        to: "/audit-logs",
        icon: "mdi-shield-search",
        title: "Audit Logs",
        roles: ["SYSTEM_ADMIN"],
      },
      {
        to: "/notifications",
        icon: "mdi-bell-outline",
        title: "Notifications",
        roles: [],
      },
    ],
  },
]);

const canSee = (item: any) =>
  !item.roles?.length || item.roles.some((r: string) => auth.hasRole(r));

const pageTitle = computed(() => {
  const allItems = navGroups.value.flatMap((g) => g.items);
  const match = allItems.find(
    (n) => route.path.startsWith(n.to) && n.to !== "/",
  );
  return match?.title || "GLMS";
});

const primaryRole = computed(() => auth.userRoles[0]?.replace(/_/g, " ") || "");

async function handleLogout() {
  await auth.logout();
  router.push("/login");
}

onMounted(() => notifStore.fetchCount());
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
