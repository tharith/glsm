import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      component: () => import("@/views/auth/LoginView.vue"),
      meta: { public: true },
    },
    {
      path: "/",
      component: () => import("@/components/layout/AppShell.vue"),
      children: [
        { path: "", redirect: "/dashboard" },
        {
          path: "dashboard",
          component: () => import("@/views/dashboard/DashboardView.vue"),
        },

        // ── Leave Requests ──────────────────────────────────
        {
          path: "requests/new",
          component: () => import("@/views/requests/NewRequestView.vue"),
        },
        {
          path: "requests/my",
          component: () => import("@/views/requests/MyRequestsView.vue"),
        },
        {
          path: "requests/:id",
          component: () => import("@/views/requests/RequestDetailView.vue"),
        },

        // ── Approvals ───────────────────────────────────────
        {
          path: "approvals",
          component: () => import("@/views/approvals/ApprovalQueueView.vue"),
          meta: {
            roles: [
              "OFFICE_CHIEF",
              "DEPARTMENT_CHIEF",
              "HR_OFFICER",
              "DIRECTOR_GENERAL",
              "INSTITUTION_HEAD",
            ],
          },
        },

        // ── Leave Balances ──────────────────────────────────
        {
          path: "balances",
          component: () => import("@/views/balances/BalancesView.vue"),
        },

        // ── Organization ────────────────────────────────────
        {
          path: "organization",
          component: () => import("@/views/organization/OrgView.vue"),
        },

        // ── Positions ───────────────────────────────────────
        {
          path: "positions",
          component: () => import("@/views/positions/PositionsView.vue"),
          meta: { roles: ["SYSTEM_ADMIN", "HR_OFFICER"] },
        },

        // ── Leave Types ─────────────────────────────────────
        {
          path: "leave-types",
          component: () => import("@/views/leave-types/LeaveTypesView.vue"),
          meta: { roles: ["SYSTEM_ADMIN", "HR_OFFICER"] },
        },

        // ── Workflow ────────────────────────────────────────
        {
          path: "workflow",
          component: () => import("@/views/workflow/WorkflowView.vue"),
          meta: { roles: ["SYSTEM_ADMIN"] },
        },

        // ── Users ───────────────────────────────────────────
        {
          path: "users",
          component: () => import("@/views/users/UsersView.vue"),
          meta: { roles: ["SYSTEM_ADMIN", "HR_OFFICER"] },
        },

        // ── Roles ───────────────────────────────────────────
        {
          path: "roles",
          component: () => import("@/views/roles/RolesView.vue"),
          meta: { roles: ["SYSTEM_ADMIN"] },
        },

        // ── Reports ─────────────────────────────────────────
        {
          path: "reports",
          component: () => import("@/views/reports/ReportsView.vue"),
          meta: {
            roles: [
              "SYSTEM_ADMIN",
              "HR_OFFICER",
              "DIRECTOR_GENERAL",
              "INSTITUTION_HEAD",
            ],
          },
        },

        // ── Public Holidays ─────────────────────────────────
        {
          path: "public-holidays",
          component: () =>
            import("@/views/public-holidays/PublicHolidaysView.vue"),
          meta: { roles: ["SYSTEM_ADMIN", "HR_OFFICER"] },
        },

        // ── Delegations ─────────────────────────────────────
        {
          path: "delegations",
          component: () => import("@/views/delegations/DelegationsView.vue"),
          meta: {
            roles: [
              "SYSTEM_ADMIN",
              "INSTITUTION_HEAD",
              "DIRECTOR_GENERAL",
              "DEPARTMENT_CHIEF",
              "OFFICE_CHIEF",
            ],
          },
        },

        // ── Audit Logs ──────────────────────────────────────
        {
          path: "audit-logs",
          component: () => import("@/views/audit-logs/AuditLogsView.vue"),
          meta: { roles: ["SYSTEM_ADMIN"] },
        },
        // ── My Profile ─────────────────────────────────────
        {
          path: "profile",
          component: () => import("@/views/profile/MyProfileView.vue"),
        },

        // ── Notifications ───────────────────────────────────
        {
          path: "notifications",
          component: () =>
            import("@/views/notifications/NotificationsView.vue"),
        },
      ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/dashboard" },
  ],
});

router.beforeEach(async (to, _from) => {
  const auth = useAuthStore();

  // Public routes — no auth needed
  if (to.meta.public) return true;

  // Not logged in → redirect to login
  if (!auth.isLoggedIn) return "/login";

  // Load profile if not yet loaded
  if (!auth.user) {
    try {
      await auth.fetchProfile();
    } catch {
      auth.logout();
      return "/login";
    }
  }

  // Role-based access control
  const required = to.meta.roles as string[] | undefined;
  if (required?.length && !required.some((r) => auth.hasRole(r))) {
    return "/dashboard";
  }

  // Allow navigation
  return true;
});

export default router;
