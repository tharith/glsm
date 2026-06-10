<template>
  <div>
    <div class="mb-6">
      <h2 class="text-h6 font-weight-bold">Audit Logs & Security</h2>
      <p class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">
        កំណត់ហេតុ និងការតាមដានសុវត្ថិភាព
      </p>
    </div>

    <v-tabs v-model="tab" class="mb-4">
      <v-tab value="logs">📋 Audit Logs</v-tab>
      <v-tab value="security">
        🔒 Security Alerts
        <v-badge v-if="alerts.failedLogins?.length > 0"
          :content="alerts.failedLogins.length" color="error" inline class="ml-1"/>
      </v-tab>
      <v-tab value="user">👤 User Activity</v-tab>
    </v-tabs>

    <v-window v-model="tab">

      <!-- ── AUDIT LOGS TAB ───────────────────────────────── -->
      <v-window-item value="logs">
        <!-- Summary Cards -->
        <v-row class="mb-4">
          <v-col v-for="s in summary.slice(0,4)" :key="s.action+s.module" cols="6" sm="3">
            <v-card rounded="xl" elevation="1" class="pa-4 text-center">
              <v-chip :color="actionColor(s.action)" size="x-small" class="mb-2">{{ s.action }}</v-chip>
              <div class="text-h5 font-weight-black text-primary">{{ s._count.id }}</div>
              <div class="text-caption text-medium-emphasis">{{ s.module }}</div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Filters -->
        <v-card rounded="xl" elevation="1" class="pa-4 mb-4">
          <v-row dense align="center">
            <v-col cols="12" sm="2">
              <v-select v-model="filter.module" label="Module" :items="['', ...moduleList]"
                density="compact" hide-details clearable @update:model-value="loadLogs"/>
            </v-col>
            <v-col cols="12" sm="2">
              <v-select v-model="filter.action" label="Action"
                :items="['','LOGIN','LOGIN_FAILED','CREATE','UPDATE','DELETE','APPROVE','CANCEL','SUBMIT','CHANGE_PASSWORD']"
                density="compact" hide-details clearable @update:model-value="loadLogs"/>
            </v-col>
            <v-col cols="12" sm="2">
              <v-text-field v-model="filter.ipAddress" label="IP Address"
                density="compact" hide-details clearable @update:model-value="debounceLogs"/>
            </v-col>
            <v-col cols="12" sm="2">
              <v-text-field v-model="filter.startDate" label="From" type="date"
                density="compact" hide-details @update:model-value="loadLogs"/>
            </v-col>
            <v-col cols="12" sm="2">
              <v-text-field v-model="filter.endDate" label="To" type="date"
                density="compact" hide-details @update:model-value="loadLogs"/>
            </v-col>
            <v-col cols="12" sm="2" class="text-right">
              <v-btn size="small" variant="text" color="primary" @click="loadLogs" prepend-icon="mdi-refresh">
                Refresh
              </v-btn>
            </v-col>
          </v-row>
        </v-card>

        <v-card rounded="xl" elevation="1">
          <v-card-text class="pa-4">
            <div class="text-caption text-medium-emphasis mb-3">{{ total }} records found</div>
            <v-data-table :headers="headers" :items="logs" :loading="loading" density="compact" hover>
              <template #item.user="{ item }">
                <div v-if="item.user" class="d-flex align-center ga-2 cursor-pointer"
                  @click="loadUserActivity(item.user.id)">
                  <v-avatar size="24" color="primary">
                    <span style="font-size:9px; color:white">
                      {{ item.user.firstName?.[0] }}{{ item.user.lastName?.[0] }}
                    </span>
                  </v-avatar>
                  <div>
                    <div class="text-caption font-weight-bold text-primary">
                      {{ item.user.firstName }} {{ item.user.lastName }}
                    </div>
                    <div class="text-caption text-medium-emphasis">{{ item.user.employeeId }}</div>
                  </div>
                </div>
                <span v-else class="text-caption text-medium-emphasis">System</span>
              </template>
              <template #item.action="{ item }">
                <v-chip :color="actionColor(item.action)" size="x-small" variant="tonal">
                  {{ item.action }}
                </v-chip>
              </template>
              <template #item.module="{ item }">
                <v-chip color="primary" size="x-small" variant="tonal">{{ item.module }}</v-chip>
              </template>
              <template #item.createdAt="{ item }">
                <div class="text-caption">{{ formatDate(item.createdAt) }}</div>
              </template>
              <template #item.ipAddress="{ item }">
                <span class="text-caption font-mono" style="font-family:monospace">{{ item.ipAddress }}</span>
              </template>
              <template #item.newValue="{ item }">
                <v-btn v-if="item.newValue" size="x-small" variant="text" color="primary"
                  @click="openDetail(item)">
                  <v-icon size="14">mdi-eye</v-icon>
                </v-btn>
              </template>
            </v-data-table>
            <div class="d-flex justify-center mt-3" v-if="totalPages > 1">
              <v-pagination v-model="page" :length="totalPages" rounded="lg" @update:model-value="loadLogs"/>
            </div>
          </v-card-text>
        </v-card>
      </v-window-item>

      <!-- ── SECURITY ALERTS TAB ──────────────────────────── -->
      <v-window-item value="security">
        <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
          <div class="text-subtitle-2 font-weight-bold">Security Overview (last 24h)</div>
          <div class="d-flex ga-2">
            <v-select v-model="alertHours" :items="[1,6,12,24,48,72]" label="Hours"
              density="compact" hide-details style="min-width:90px" @update:model-value="loadAlerts"/>
            <v-btn size="small" variant="tonal" color="primary" @click="loadAlerts" prepend-icon="mdi-refresh">
              Refresh
            </v-btn>
          </div>
        </div>

        <v-row class="mb-4">
          <!-- Failed Logins -->
          <v-col cols="12" md="4">
            <v-card rounded="xl" elevation="1"
              :color="alerts.failedLogins?.length > 5 ? 'error' : 'surface'">
              <v-card-text class="pa-5">
                <div class="d-flex align-center ga-3 mb-3">
                  <v-icon :color="alerts.failedLogins?.length > 5 ? 'white' : 'error'" size="32">
                    mdi-shield-alert
                  </v-icon>
                  <div>
                    <div class="text-h4 font-weight-black"
                      :class="alerts.failedLogins?.length > 5 ? 'text-white' : 'text-error'">
                      {{ alerts.failedLogins?.length || 0 }}
                    </div>
                    <div class="text-caption"
                      :class="alerts.failedLogins?.length > 5 ? 'text-white' : 'text-medium-emphasis'">
                      Failed Login Attempts
                    </div>
                  </div>
                </div>
                <div v-for="log in alerts.failedLogins?.slice(0,5)" :key="log.id"
                  class="text-caption mt-1 d-flex justify-space-between">
                  <span style="font-family:monospace">{{ log.ipAddress }}</span>
                  <span>{{ formatDateShort(log.createdAt) }}</span>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Sensitive Actions -->
          <v-col cols="12" md="4">
            <v-card rounded="xl" elevation="1">
              <v-card-text class="pa-5">
                <div class="d-flex align-center ga-3 mb-3">
                  <v-icon color="warning" size="32">mdi-shield-key</v-icon>
                  <div>
                    <div class="text-h4 font-weight-black text-warning">
                      {{ alerts.sensitiveActions?.length || 0 }}
                    </div>
                    <div class="text-caption text-medium-emphasis">Sensitive Actions</div>
                  </div>
                </div>
                <div v-for="log in alerts.sensitiveActions?.slice(0,5)" :key="log.id"
                  class="text-caption mt-1">
                  <v-chip size="x-small" :color="actionColor(log.action)" class="mr-1">{{ log.action }}</v-chip>
                  {{ log.user?.firstName }} {{ log.user?.lastName }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Multi-IP Users -->
          <v-col cols="12" md="4">
            <v-card rounded="xl" elevation="1">
              <v-card-text class="pa-5">
                <div class="d-flex align-center ga-3 mb-3">
                  <v-icon color="info" size="32">mdi-map-marker-multiple</v-icon>
                  <div>
                    <div class="text-h4 font-weight-black text-info">
                      {{ alerts.multipleIps?.length || 0 }}
                    </div>
                    <div class="text-caption text-medium-emphasis">Multi-IP Users</div>
                  </div>
                </div>
                <div class="text-caption text-medium-emphasis" v-if="!alerts.multipleIps?.length">
                  No suspicious multi-IP activity
                </div>
                <div v-for="entry in alerts.multipleIps?.slice(0,5)" :key="entry.userId + entry.ipAddress"
                  class="text-caption mt-1 d-flex justify-space-between">
                  <span style="font-family:monospace">{{ entry.ipAddress }}</span>
                  <span class="text-warning">{{ entry._count.id }} actions</span>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Sensitive actions full table -->
        <v-card rounded="xl" elevation="1" v-if="alerts.sensitiveActions?.length">
          <v-card-text class="pa-5">
            <div class="text-subtitle-2 font-weight-bold mb-3">
              🔑 Sensitive Actions Detail
            </div>
            <v-data-table :headers="sensitiveHeaders" :items="alerts.sensitiveActions"
              density="compact" hover>
              <template #item.user="{ item }">
                <div v-if="item.user" class="text-caption">
                  <span class="font-weight-bold">{{ item.user.firstName }} {{ item.user.lastName }}</span>
                  <span class="text-medium-emphasis ml-1">{{ item.user.employeeId }}</span>
                </div>
              </template>
              <template #item.action="{ item }">
                <v-chip :color="actionColor(item.action)" size="x-small" variant="tonal">{{ item.action }}</v-chip>
              </template>
              <template #item.createdAt="{ item }">
                <span class="text-caption">{{ formatDate(item.createdAt) }}</span>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-window-item>

      <!-- ── USER ACTIVITY TAB ─────────────────────────────── -->
      <v-window-item value="user">
        <v-card rounded="xl" elevation="1" class="pa-5 mb-4">
          <div class="text-subtitle-2 font-weight-bold mb-3">User Activity Tracker</div>
          <v-row dense align="center">
            <v-col cols="12" sm="6">
              <v-autocomplete v-model="selectedUserId" label="Select User"
                :items="userList" item-title="label" item-value="id"
                clearable prepend-inner-icon="mdi-account-search"/>
            </v-col>
            <v-col cols="12" sm="2">
              <v-select v-model="activityDays" :items="[7,14,30,60,90]" label="Days"
                density="compact" hide-details/>
            </v-col>
            <v-col cols="12" sm="2">
              <v-btn color="primary" @click="loadUserActivity(selectedUserId)"
                :disabled="!selectedUserId" :loading="loadingUser" block>
                Track
              </v-btn>
            </v-col>
            <v-col cols="12" sm="2">
              <v-btn variant="outlined" color="primary" @click="exportUser"
                :disabled="!selectedUserId" block prepend-icon="mdi-download">
                Export
              </v-btn>
            </v-col>
          </v-row>
        </v-card>

        <div v-if="userActivity">
          <!-- Activity Summary -->
          <v-row class="mb-4">
            <v-col v-for="s in userActivity.summary?.slice(0,6)" :key="s.action+s.module" cols="6" sm="2">
              <v-card rounded="xl" elevation="1" class="pa-3 text-center">
                <div class="text-h6 font-weight-black text-primary">{{ s._count.id }}</div>
                <v-chip :color="actionColor(s.action)" size="x-small" class="mt-1">{{ s.action }}</v-chip>
                <div class="text-caption text-medium-emphasis mt-1">{{ s.module }}</div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Activity Timeline -->
          <v-card rounded="xl" elevation="1">
            <v-card-text class="pa-5">
              <div class="text-subtitle-2 font-weight-bold mb-3">
                Activity Timeline — last {{ activityDays }} days
                ({{ userActivity.logs?.length }} actions)
              </div>
              <v-timeline density="compact" align="start" side="end" truncate-line="both">
                <v-timeline-item v-for="log in userActivity.logs?.slice(0,50)" :key="log.id"
                  :dot-color="actionColor(log.action)" size="x-small">
                  <div class="d-flex align-center justify-space-between flex-wrap ga-2">
                    <div>
                      <v-chip :color="actionColor(log.action)" size="x-small" variant="tonal" class="mr-1">
                        {{ log.action }}
                      </v-chip>
                      <span class="text-caption">{{ log.module }}</span>
                      <span v-if="log.targetId" class="text-caption text-medium-emphasis ml-1">
                        → {{ log.targetId?.slice(0,8) }}...
                      </span>
                    </div>
                    <div class="text-right">
                      <div class="text-caption text-medium-emphasis">{{ formatDate(log.createdAt) }}</div>
                      <div class="text-caption font-mono text-medium-emphasis"
                        style="font-family:monospace">
                        {{ log.ipAddress }}
                      </div>
                    </div>
                  </div>
                </v-timeline-item>
              </v-timeline>
            </v-card-text>
          </v-card>
        </div>
      </v-window-item>
    </v-window>

    <!-- Log Detail Dialog -->
    <v-dialog v-model="detailDialog" max-width="600">
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="pa-4 pb-2 font-weight-bold">
          Log Detail
          <div class="text-caption text-medium-emphasis font-weight-regular">
            {{ detailItem?.action }} · {{ detailItem?.module }} · {{ formatDate(detailItem?.createdAt) }}
          </div>
        </v-card-title>
        <v-card-text class="pa-4">
          <pre class="text-caption"
            style="white-space:pre-wrap;word-break:break-all;background:#1e293b;color:#e2e8f0;padding:16px;border-radius:8px;max-height:400px;overflow-y:auto">{{ JSON.stringify(detailItem?.newValue, null, 2) }}</pre>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer/><v-btn variant="outlined" @click="detailDialog=false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" rounded="lg">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { format } from 'date-fns'
import api from '@/plugins/axios'

const tab          = ref('logs')
const loading      = ref(false), loadingUser = ref(false)
const detailDialog = ref(false)
const logs         = ref<any[]>([])
const summary      = ref<any[]>([])
const moduleList   = ref<string[]>([])
const alerts       = ref<any>({})
const userActivity = ref<any>(null)
const userList     = ref<any[]>([])
const detailItem   = ref<any>(null)
const selectedUserId = ref('')
const alertHours   = ref(24)
const activityDays = ref(30)
const total        = ref(0), page = ref(1), totalPages = ref(1)
const snack        = ref({ show:false, text:'', color:'success' })
const filter       = ref({ module:'', action:'', ipAddress:'', startDate:'', endDate:'' })

const ACTION_COLORS: Record<string,string> = {
  LOGIN:'info', LOGIN_FAILED:'error', CREATE:'success', UPDATE:'warning',
  DELETE:'error', APPROVE:'success', REJECT:'error', CANCEL:'grey',
  SUBMIT:'primary', CHANGE_PASSWORD:'deep-orange', RESTORE:'teal',
  ASSIGN:'purple', AVATAR_UPLOAD:'indigo',
}
const actionColor = (a: string) => ACTION_COLORS[a] || 'grey'
const formatDate  = (d: string) => d ? format(new Date(d), 'MMM d HH:mm:ss') : '-'
const formatDateShort = (d: string) => d ? format(new Date(d), 'HH:mm:ss') : '-'

const headers = [
  { title: 'Time',      key: 'createdAt',  width: 140 },
  { title: 'User',      key: 'user',       width: 180 },
  { title: 'Action',    key: 'action',     width: 130 },
  { title: 'Module',    key: 'module',     width: 120 },
  { title: 'Target',    key: 'targetId',   width: 120 },
  { title: 'IP',        key: 'ipAddress',  width: 130 },
  { title: 'Data',      key: 'newValue',   width: 60, sortable: false },
]

const sensitiveHeaders = [
  { title: 'Time',   key: 'createdAt', width: 150 },
  { title: 'User',   key: 'user',      width: 180 },
  { title: 'Action', key: 'action',    width: 150 },
  { title: 'Module', key: 'module',    width: 120 },
  { title: 'IP',     key: 'ipAddress', width: 130 },
]

function openDetail(item: any) { detailItem.value = item; detailDialog.value = true }

let logsTimer: any
function debounceLogs() { clearTimeout(logsTimer); logsTimer = setTimeout(loadLogs, 400) }

async function loadLogs() {
  loading.value = true
  try {
    const params: any = { page: page.value, limit: 50 }
    Object.entries(filter.value).forEach(([k,v]) => { if (v) params[k] = v })
    const res: any = await api.get('/audit-logs', { params })
    const d = res.data || res
    logs.value       = d.data  || []
    total.value      = d.total || 0
    totalPages.value = d.totalPages || 1
  } finally { loading.value = false }
}

async function loadAlerts() {
  const res: any = await api.get('/audit-logs/security-alerts', { params: { hours: alertHours.value } })
  alerts.value = res.data || res
}

async function loadMeta() {
  const [mods, sum, users] = await Promise.all([
    api.get('/audit-logs/modules'),
    api.get('/audit-logs/summary', { params: { days: 7 } }),
    api.get('/users', { params: { limit: 200 } }),
  ])
  moduleList.value = ((mods as any).data || mods).map((m: any) => m.module)
  summary.value    = (sum  as any).data || sum
  const uList = ((users as any).data || users)
  userList.value   = (uList.data || uList).map((u: any) => ({
    ...u, label: `${u.firstName} ${u.lastName} (${u.employeeId})`
  }))
}

async function loadUserActivity(userId: string) {
  if (!userId) return
  selectedUserId.value = userId
  tab.value = 'user'
  loadingUser.value = true
  try {
    const res: any = await api.get(`/audit-logs/user/${userId}`, { params: { days: activityDays.value } })
    userActivity.value = res.data || res
  } finally { loadingUser.value = false }
}

async function exportUser() {
  if (!selectedUserId.value) return
  try {
    const year = new Date().getFullYear()
    const res: any = await api.get(`/audit-logs/user/${selectedUserId.value}/export`, { params: { year } })
    const data = JSON.stringify(res.data || res, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `audit_${selectedUserId.value}_${year}.json`; a.click()
    URL.revokeObjectURL(url)
  } catch (e: any) {
    snack.value = { show:true, text: e?.message||'Export failed', color:'error' }
  }
}

onMounted(() => { loadLogs(); loadAlerts(); loadMeta() })
</script>
