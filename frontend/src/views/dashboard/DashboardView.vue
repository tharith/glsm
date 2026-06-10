<template>
  <div>
    <!-- Welcome Banner -->
    <v-card rounded="xl" class="mb-6 pa-6" color="primary" elevation="2">
      <div class="d-flex align-center justify-space-between flex-wrap ga-4">
        <div>
          <p class="text-caption text-white" style="opacity: 0.75">
            Welcome back,
          </p>
          <h2 class="text-h5 font-weight-bold text-white">
            {{ auth.fullName }}
          </h2>
          <p
            class="text-body-2 text-white mt-1"
            style="
              opacity: 0.7;
              font-family: &quot;Kantumruy Pro&quot;, sans-serif;
            "
          >
            {{ auth.fullNameKh }} · {{ auth.user?.position?.nameEn }}
          </p>
          <div class="d-flex ga-2 mt-3 flex-wrap">
            <v-chip size="small" color="white" variant="outlined">
              <v-icon start size="12">mdi-domain</v-icon
              >{{ auth.user?.orgUnit?.nameEn }}
            </v-chip>
            <v-chip size="small" color="secondary">{{ primaryRole }}</v-chip>
          </div>
        </div>
        <div class="text-right">
          <v-icon size="64" color="rgba(255,255,255,0.15)"
            >mdi-bank-outline</v-icon
          >
          <p class="text-caption text-white mt-1" style="opacity: 0.6">
            {{ today }}
          </p>
        </div>
      </div>
    </v-card>

    <!-- Stats -->
    <v-row class="mb-4">
      <v-col v-for="stat in stats" :key="stat.label" cols="6" md="3">
        <v-card rounded="xl" elevation="1" class="pa-4">
          <div class="d-flex align-center justify-space-between mb-3">
            <v-avatar :color="stat.color + '20'" size="44" rounded="lg">
              <v-icon :color="stat.color" :icon="stat.icon" size="22" />
            </v-avatar>
          </div>
          <div class="text-h4 font-weight-black" :style="{ color: stat.color }">
            {{ stat.value
            }}<span v-if="stat.suffix" class="text-body-1">{{
              stat.suffix
            }}</span>
          </div>
          <div class="text-caption font-weight-bold text-medium-emphasis mt-1">
            {{ stat.label }}
          </div>
          <div
            class="text-caption"
            style="
              font-family: &quot;Kantumruy Pro&quot;, sans-serif;
              font-size: 10px;
              opacity: 0.6;
            "
          >
            {{ stat.labelKh }}
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <!-- Balance Overview -->
      <v-col cols="12" md="6">
        <v-card rounded="xl" elevation="1" class="pa-5">
          <div class="text-subtitle-1 font-weight-bold mb-1">
            Leave Balance Overview
          </div>
          <div
            class="text-caption text-medium-emphasis mb-4"
            style="font-family: &quot;Kantumruy Pro&quot;, sans-serif"
          >
            ទិដ្ឋភាពរួមនៃ​សមតុល្យច្បាប់
          </div>
          <div v-if="loading" class="text-center py-4">
            <v-progress-circular indeterminate />
          </div>
          <div v-else>
            <div
              v-for="bal in balances.filter(
                (b: { allocated: number }) => b.allocated > 0,
              )"
              :key="bal.id"
              class="mb-4"
            >
              <div class="d-flex justify-space-between align-center mb-1">
                <span class="text-caption font-weight-bold">{{
                  bal.leaveType.nameEn
                }}</span>
                <span
                  class="text-caption font-weight-bold"
                  :style="{ color: bal.available < 3 ? '#C0392B' : '#0F7A5A' }"
                >
                  {{ bal.available }}/{{ bal.allocated }} days
                </span>
              </div>
              <v-progress-linear
                :model-value="
                  bal.allocated > 0 ? (bal.used / bal.allocated) * 100 : 0
                "
                rounded
                height="6"
                :color="bal.available < 3 ? 'error' : 'success'"
                bg-color="grey-lighten-3"
              />
              <div class="text-caption text-medium-emphasis mt-1">
                {{ bal.used }} used ·
                {{ bal.pending > 0 ? bal.pending + " pending · " : ""
                }}{{ bal.available }} remaining
              </div>
            </div>
          </div>
        </v-card>
      </v-col>

      <!-- Recent Requests -->
      <v-col cols="12" md="6">
        <v-card rounded="xl" elevation="1" class="pa-5">
          <div class="d-flex justify-space-between align-center mb-4">
            <div>
              <div class="text-subtitle-1 font-weight-bold mb-1">
                Recent Requests
              </div>
              <div
                class="text-caption text-medium-emphasis"
                style="font-family: &quot;Kantumruy Pro&quot;, sans-serif"
              >
                ពាក្យសុំថ្មីៗ
              </div>
            </div>
            <v-btn size="small" variant="tonal" to="/requests/my"
              >View All</v-btn
            >
          </div>
          <div
            v-if="recentRequests.length === 0"
            class="text-center py-6 text-medium-emphasis"
          >
            <v-icon size="40" class="mb-2">mdi-clipboard-list-outline</v-icon>
            <p class="text-caption">No requests yet</p>
          </div>
          <div v-for="req in recentRequests" :key="req.id" class="mb-3">
            <v-card variant="tonal" rounded="lg" :to="`/requests/${req.id}`">
              <v-card-text
                class="pa-3 d-flex align-center justify-space-between"
              >
                <div class="d-flex align-center ga-3">
                  <v-avatar
                    :color="leaveTypeColor(req.leaveType.code)"
                    size="36"
                    rounded="lg"
                  >
                    <v-icon size="18" color="white">{{
                      leaveTypeIcon(req.leaveType.code)
                    }}</v-icon>
                  </v-avatar>
                  <div>
                    <div class="text-caption font-weight-bold">
                      {{ req.leaveType.nameEn }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatDate(req.startDate) }} · {{ req.totalDays }} days
                    </div>
                  </div>
                </div>
                <StatusChip :status="req.status" />
              </v-card-text>
            </v-card>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useLeaveStore } from "@/stores/leave.store";
import StatusChip from "@/components/shared/StatusChip.vue";
import api from "@/plugins/axios";
import { format } from "date-fns";

const auth = useAuthStore();
const leaveStore = useLeaveStore();
const loading = ref(false);
const dashboard = ref<any>({});
const balances = computed(() => dashboard.value?.myBalances || []);
const recentRequests = computed(() =>
  (leaveStore.myRequests || []).slice(0, 4),
);

const primaryRole = computed(() => auth.userRoles[0]?.replace(/_/g, " ") || "");
const today = computed(() => format(new Date(), "EEEE, MMMM d, yyyy"));

const stats = computed(() => [
  {
    label: "Pending Requests",
    labelKh: "ពាក្យកំពុងរង់ចាំ",
    value: dashboard.value?.myPending || 0,
    icon: "mdi-clock-outline",
    color: "#D97706",
  },
  {
    label: "Approved This Year",
    labelKh: "អនុម័តឆ្នាំនេះ",
    value: dashboard.value?.myApproved || 0,
    icon: "mdi-check-circle-outline",
    color: "#0F7A5A",
  },
  {
    label: "Annual Leave Left",
    labelKh: "ច្បាប់ប្រចាំឆ្នាំ",
    value:
      balances.value.find((b: any) => b.leaveType.code === "ANNUAL")
        ?.available || 0,
    suffix: "d",
    icon: "mdi-umbrella-beach-outline",
    color: "#0369A1",
  },
  {
    label: "Sick Leave Left",
    labelKh: "ច្បាប់ឈឺ",
    value:
      balances.value.find((b: any) => b.leaveType.code === "SICK")?.available ||
      0,
    suffix: "d",
    icon: "mdi-hospital-box-outline",
    color: "#C0392B",
  },
]);

const leaveColors: Record<string, string> = {
  ANNUAL: "#0369A1",
  SICK: "#C0392B",
  MATERNITY: "#db2777",
  PATERNITY: "#7c3aed",
  SPECIAL: "#C9A227",
  STUDY: "#0F7A5A",
  MISSION: "#0891b2",
  UNPAID: "#64748b",
};
const leaveIcons: Record<string, string> = {
  ANNUAL: "mdi-umbrella-beach",
  SICK: "mdi-hospital-box",
  MATERNITY: "mdi-baby-carriage",
  PATERNITY: "mdi-human-male-child",
  SPECIAL: "mdi-star",
  STUDY: "mdi-book-open",
  MISSION: "mdi-airplane",
  UNPAID: "mdi-briefcase-outline",
};
const leaveTypeColor = (code: string) => leaveColors[code] || "#64748b";
const leaveTypeIcon = (code: string) => leaveIcons[code] || "mdi-calendar";
const formatDate = (d: string) => format(new Date(d), "MMM d, yyyy");

onMounted(async () => {
  loading.value = true;
  try {
    const [dash] = await Promise.all([
      api.get("/reports/dashboard"),
      leaveStore.fetchMyRequests({ limit: 4 }),
    ]);
    dashboard.value = (dash as any).data || dash;
  } finally {
    loading.value = false;
  }
});
</script>
