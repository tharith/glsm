<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h2 class="text-h6 font-weight-bold">{{ t.nav.reports }}</h2>
        <p class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">
          របាយការណ៍ — {{ currentYear }}
        </p>
      </div>
      <div class="d-flex ga-2">
        <v-select v-model="filterYear" :items="years" label="Year" density="compact"
          hide-details style="min-width:100px" @update:model-value="load"/>
      </div>
    </div>

    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="48"/>
    </div>

    <div v-else>
      <!-- System Stats -->
      <v-row v-if="dashboard.systemPending !== undefined" class="mb-4">
        <v-col cols="6" sm="3">
          <v-card rounded="xl" elevation="1" class="pa-4 text-center">
            <v-icon size="28" color="warning" class="mb-2">mdi-clock-alert</v-icon>
            <div class="text-h4 font-weight-black text-warning">{{ dashboard.systemPending }}</div>
            <div class="text-caption text-medium-emphasis">System Pending</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card rounded="xl" elevation="1" class="pa-4 text-center">
            <v-icon size="28" color="success" class="mb-2">mdi-check-all</v-icon>
            <div class="text-h4 font-weight-black text-success">{{ dashboard.systemCompleted }}</div>
            <div class="text-caption text-medium-emphasis">Completed</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card rounded="xl" elevation="1" class="pa-4 text-center">
            <v-icon size="28" color="primary" class="mb-2">mdi-account-group</v-icon>
            <div class="text-h4 font-weight-black text-primary">{{ summary.length }}</div>
            <div class="text-caption text-medium-emphasis">Departments</div>
          </v-card>
        </v-col>
        <v-col cols="6" sm="3">
          <v-card rounded="xl" elevation="1" class="pa-4 text-center">
            <v-icon size="28" color="info" class="mb-2">mdi-calendar-clock</v-icon>
            <div class="text-h4 font-weight-black text-info">{{ totalDays }}</div>
            <div class="text-caption text-medium-emphasis">Total Days</div>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mb-4">
        <!-- Leave by Type -->
        <v-col cols="12" md="6">
          <v-card rounded="xl" elevation="1" class="pa-5">
            <div class="text-subtitle-2 font-weight-bold mb-4">📊 Leave Days by Type</div>
            <div v-for="item in leaveByType" :key="item.code" class="mb-3">
              <div class="d-flex justify-space-between mb-1">
                <span class="text-caption font-weight-bold">{{ item.nameEn }}</span>
                <span class="text-caption font-weight-bold" :style="`color:${COLORS[item.code]||'#64748b'}`">
                  {{ item.days }} days ({{ item.count }})
                </span>
              </div>
              <v-progress-linear
                :model-value="maxDays > 0 ? (item.days/maxDays)*100 : 0"
                height="8" rounded :color="COLORS[item.code]||'primary'" bg-color="grey-lighten-3"/>
            </div>
          </v-card>
        </v-col>

        <!-- Dept Summary -->
        <v-col cols="12" md="6">
          <v-card rounded="xl" elevation="1" class="pa-5">
            <div class="text-subtitle-2 font-weight-bold mb-4">🏢 Summary by Department</div>
            <div v-for="dept in summary" :key="dept.dept"
              class="d-flex justify-space-between align-center pa-2 rounded-lg mb-1"
              style="background:#f8f9fc">
              <div>
                <div class="text-caption font-weight-bold">{{ dept.dept }}</div>
                <div class="text-caption text-medium-emphasis">{{ dept.totalRequests }} requests</div>
              </div>
              <div class="text-body-2 font-weight-black text-primary">{{ dept.totalDays }}d</div>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <!-- Leave Requests Table with Export -->
      <v-card rounded="xl" elevation="1">
        <v-card-text class="pa-5">
          <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-3">
            <div class="text-subtitle-2 font-weight-bold">All Leave Requests</div>
            <div class="d-flex ga-2 flex-wrap">
              <v-select v-model="tableFilter.status" label="Status"
                :items="statusOptions" density="compact" hide-details clearable
                style="min-width:160px" @update:model-value="loadTable"/>
              <!-- Export buttons -->
              <v-menu>
                <template #activator="{ props }">
                  <v-btn v-bind="props" variant="tonal" color="success" size="small"
                    prepend-icon="mdi-download">
                    Export
                    <v-icon end>mdi-chevron-down</v-icon>
                  </v-btn>
                </template>
                <v-list density="compact" rounded="xl" elevation="4">
                  <v-list-item prepend-icon="mdi-file-excel" @click="doExport('excel', 'requests')">
                    <v-list-item-title>Export Excel (.xlsx)</v-list-item-title>
                  </v-list-item>
                  <v-list-item prepend-icon="mdi-file-delimited" @click="doExport('csv', 'requests')">
                    <v-list-item-title>Export CSV</v-list-item-title>
                  </v-list-item>
                  <v-divider/>
                  <v-list-item prepend-icon="mdi-file-excel" @click="doExport('excel', 'balances')">
                    <v-list-item-title>Export Balances Excel</v-list-item-title>
                  </v-list-item>
                  <v-list-item prepend-icon="mdi-file-delimited" @click="doExport('csv', 'balances')">
                    <v-list-item-title>Export Balances CSV</v-list-item-title>
                  </v-list-item>
                </v-list>
              </v-menu>
            </div>
          </div>

          <v-data-table
            :headers="headers" :items="tableData" :loading="tableLoading"
            density="compact" rounded="lg" hover>
            <template #item.user="{ item }">
              <div>
                <div class="text-caption font-weight-bold">
                  {{ item.user?.firstName }} {{ item.user?.lastName }}
                </div>
                <div class="text-caption text-medium-emphasis">{{ item.user?.employeeId }}</div>
              </div>
            </template>
            <template #item.leaveType="{ item }">
              <v-chip :color="COLORS[item.leaveType?.code]||'grey'" size="x-small" variant="tonal">
                {{ item.leaveType?.nameEn }}
              </v-chip>
            </template>
            <template #item.status="{ item }">
              <v-chip :color="statusColor(item.status)" size="x-small" variant="tonal">
                {{ item.status?.replace(/_/g,' ') }}
              </v-chip>
            </template>
            <template #item.startDate="{ item }">
              <span class="text-caption">{{ fmt(item.startDate) }}</span>
            </template>
            <template #item.totalDays="{ item }">
              <strong>{{ item.totalDays }}</strong>
            </template>
          </v-data-table>
        </v-card-text>
      </v-card>
    </div>

    <v-snackbar v-model="snack.show" :color="snack.color" rounded="lg">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { format } from 'date-fns'
import api from '@/plugins/axios'
import { useI18n } from '@/i18n'
import { exportToExcel, exportToCSV, REPORT_COLUMNS } from '@/utils/export'
import { API } from '@/config/api'

const { t } = useI18n()
const loading      = ref(false), tableLoading = ref(false)
const dashboard    = ref<any>({})
const summary      = ref<any[]>([])
const tableData    = ref<any[]>([])
const leaveTypes   = ref<any[]>([])
const balanceData  = ref<any[]>([])
const currentYear  = new Date().getFullYear()
const filterYear   = ref(currentYear)
const years        = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i)
const tableFilter  = ref({ status: '' })
const snack        = ref({ show: false, text: '', color: 'success' })

const COLORS: Record<string,string> = {
  ANNUAL:'#0369A1', SICK:'#C0392B', MATERNITY:'#db2777', PATERNITY:'#7c3aed',
  SPECIAL:'#C9A227', STUDY:'#0F7A5A', MISSION:'#0891b2', UNPAID:'#64748b',
}
const STATUS_COLORS: Record<string,string> = {
  SUBMITTED:'info', COMPLETED:'success', REJECTED:'error',
  CANCELLED:'grey', RETURNED:'warning',
}
const statusColor = (s: string) => {
  for (const [k,v] of Object.entries(STATUS_COLORS)) if (s?.includes(k)) return v
  return 'primary'
}
const statusOptions = ['','SUBMITTED','OFFICE_APPROVED','DEPT_APPROVED','HR_VERIFIED','DG_APPROVED','COMPLETED','REJECTED','RETURNED','CANCELLED']
const fmt = (d: string) => d ? format(new Date(d), 'MMM d, yyyy') : '-'

const headers = [
  { title: 'Ref#',       key: 'refNumber',  width: 130 },
  { title: 'Employee',   key: 'user' },
  { title: 'Leave Type', key: 'leaveType',  width: 140 },
  { title: 'Start',      key: 'startDate',  width: 120 },
  { title: 'Days',       key: 'totalDays',  width: 70  },
  { title: 'Status',     key: 'status',     width: 150 },
]

const leaveByType = computed(() => {
  const list = dashboard.value.leaveByType || []
  return list.map((item: any) => {
    const lt = leaveTypes.value.find((t: any) => t.id === item.leaveTypeId)
    return {
      code:   lt?.code || 'ANNUAL',
      nameEn: lt?.nameEn || '—',
      days:   item._sum?.totalDays || 0,
      count:  item._count?.id || 0,
    }
  }).sort((a: any, b: any) => b.days - a.days)
})
const maxDays   = computed(() => Math.max(...leaveByType.value.map((x: any) => x.days), 1))
const totalDays = computed(() => leaveByType.value.reduce((s: number, x: any) => s + x.days, 0))

async function loadTable() {
  tableLoading.value = true
  try {
    const params: any = { limit: 200, year: filterYear.value }
    if (tableFilter.value.status) params.status = tableFilter.value.status
    const res: any = await api.get(API.REPORTS.LEAVE, { params })
    tableData.value = (res.data || res)?.data || []
  } finally { tableLoading.value = false }
}

async function loadBalances() {
  try {
    const res: any = await api.get(API.REPORTS.BALANCES, { params: { year: filterYear.value } })
    balanceData.value = res.data || res || []
  } catch {}
}

// Export function
async function doExport(type: 'excel'|'csv', report: string) {
  try {
    const fname = `${report}_${filterYear.value}`
    if (report === 'requests') {
      if (type === 'excel') await exportToExcel(tableData.value, REPORT_COLUMNS.leaveRequests, fname)
      else exportToCSV(tableData.value, REPORT_COLUMNS.leaveRequests, fname)
    } else {
      if (!balanceData.value.length) await loadBalances()
      if (type === 'excel') await exportToExcel(balanceData.value, REPORT_COLUMNS.leaveBalances, fname)
      else exportToCSV(balanceData.value, REPORT_COLUMNS.leaveBalances, fname)
    }
    snack.value = { show: true, text: 'Exported successfully!', color: 'success' }
  } catch (e: any) {
    snack.value = { show: true, text: e?.message || 'Export failed', color: 'error' }
  }
}

async function load() {
  loading.value = true
  try {
    const [dash, sum, lt] = await Promise.all([
      api.get(API.REPORTS.DASHBOARD),
      api.get(API.REPORTS.SUMMARY, { params: { year: filterYear.value } }).catch(() => ({ data: [] })),
      api.get(API.LEAVE_TYPES.LIST),
    ])
    dashboard.value  = (dash as any).data || dash
    summary.value    = (sum  as any).data || []
    leaveTypes.value = (lt   as any).data || lt
    await loadTable()
  } finally { loading.value = false }
}

watch(() => tableFilter.value.status, loadTable)
onMounted(load)
</script>
