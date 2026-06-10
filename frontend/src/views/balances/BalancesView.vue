<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h2 class="text-h6 font-weight-bold">Leave Balance Management</h2>
        <p class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">គ្រប់គ្រងសមតុល្យច្បាប់ — {{ currentYear }}</p>
      </div>
      <div class="d-flex ga-2 flex-wrap">
        <v-btn variant="outlined" color="primary" prepend-icon="mdi-calendar-sync"
          @click="bulkDialog = true" v-if="isAdminOrHR">
          Bulk Allocate
        </v-btn>
        <v-select v-model="selectedYear" :items="years" label="Year" density="compact"
          hide-details style="min-width:100px" @update:model-value="load" />
      </div>
    </div>

    <!-- MY Balances (Employee view) -->
    <div v-if="!isAdminOrHR">
      <div v-if="loading" class="text-center py-12"><v-progress-circular indeterminate color="primary"/></div>
      <v-row v-else>
        <v-col v-for="bal in myBalances" :key="bal.id" cols="12" sm="6" md="4">
          <v-card rounded="xl" elevation="1" class="pa-5">
            <div class="d-flex align-center ga-3 mb-4">
              <v-avatar :color="COLORS[bal.leaveType.code]||'grey'" size="44" rounded="lg">
                <v-icon :icon="ICONS[bal.leaveType.code]||'mdi-calendar'" color="white" size="20"/>
              </v-avatar>
              <div>
                <div class="text-subtitle-2 font-weight-bold">{{ bal.leaveType.nameEn }}</div>
                <div class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">{{ bal.leaveType.nameKh }}</div>
              </div>
              <v-spacer/>
              <v-chip v-if="bal.available < 3 && bal.allocated > 0" color="error" size="x-small" variant="tonal">Low</v-chip>
            </div>

            <div class="mb-2">
              <div class="d-flex justify-space-between mb-1">
                <span class="text-caption text-medium-emphasis">Used</span>
                <span class="text-caption font-weight-bold">{{ bal.used }}/{{ bal.allocated }} days</span>
              </div>
              <v-progress-linear
                :model-value="bal.allocated>0?(bal.used/bal.allocated)*100:0"
                height="8" rounded
                :color="COLORS[bal.leaveType.code]||'primary'"
                bg-color="grey-lighten-3"/>
            </div>

            <v-row dense class="mt-2 text-center">
              <v-col cols="4">
                <div class="text-caption text-medium-emphasis">Allocated</div>
                <div class="text-body-2 font-weight-bold">{{ bal.allocated }}</div>
              </v-col>
              <v-col cols="4" style="border-left:1px solid #f1f5f9;border-right:1px solid #f1f5f9">
                <div class="text-caption text-medium-emphasis">Pending</div>
                <div class="text-body-2 font-weight-bold text-warning">{{ bal.pending }}</div>
              </v-col>
              <v-col cols="4">
                <div class="text-caption text-medium-emphasis">Available</div>
                <div class="text-body-2 font-weight-bold" :style="`color:${bal.available<3?'#C0392B':'#0F7A5A'}`">{{ bal.available }}</div>
              </v-col>
            </v-row>
          </v-card>
        </v-col>
      </v-row>
    </div>

    <!-- HR/Admin view: full table -->
    <div v-else>
      <!-- Search + Filter -->
      <v-card rounded="xl" elevation="1" class="pa-4 mb-4">
        <v-row dense align="center">
          <v-col cols="12" sm="5">
            <v-text-field v-model="searchUser" label="Search employee..." prepend-inner-icon="mdi-magnify"
              density="compact" hide-details clearable @update:model-value="debounceLoad"/>
          </v-col>
          <v-col cols="12" sm="4">
            <v-select v-model="filterLeaveType" label="Leave Type" :items="leaveTypeOptions"
              density="compact" hide-details clearable @update:model-value="load"/>
          </v-col>
          <v-col cols="12" sm="3" class="text-right">
            <span class="text-caption text-medium-emphasis">{{ allBalances.length }} records</span>
          </v-col>
        </v-row>
      </v-card>

      <v-card rounded="xl" elevation="1">
        <v-data-table
          :headers="headers" :items="filteredBalances"
          :loading="loading" density="comfortable" hover>
          <template #item.user="{ item }">
            <div>
              <div class="text-caption font-weight-bold">{{ item.user.firstName }} {{ item.user.lastName }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.user.employeeId }} · {{ item.user.orgUnit?.nameEn }}</div>
            </div>
          </template>
          <template #item.leaveType="{ item }">
            <v-chip :color="COLORS[item.leaveType.code]||'grey'" size="x-small" variant="tonal">
              {{ item.leaveType.nameEn }}
            </v-chip>
          </template>
          <template #item.available="{ item }">
            <span class="font-weight-bold" :style="`color:${item.available<3?'#C0392B':'#0F7A5A'}`">
              {{ item.available }}
            </span>
          </template>
          <template #item.pending="{ item }">
            <span class="text-warning font-weight-bold">{{ item.pending }}</span>
          </template>
          <template #item.actions="{ item }">
            <v-btn size="x-small" variant="tonal" color="primary" @click="openAdjust(item)" prepend-icon="mdi-tune">
              Adjust
            </v-btn>
          </template>
        </v-data-table>
      </v-card>
    </div>

    <!-- ADJUST DIALOG -->
    <v-dialog v-model="adjustDialog" max-width="440">
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="pa-4 pb-2 font-weight-bold">
          Adjust Balance
          <div class="text-caption text-medium-emphasis font-weight-regular" v-if="adjustTarget">
            {{ adjustTarget.user.firstName }} {{ adjustTarget.user.lastName }} — {{ adjustTarget.leaveType.nameEn }}
          </div>
        </v-card-title>
        <v-card-text class="pa-4">
          <v-row dense>
            <v-col cols="12">
              <v-card variant="tonal" color="primary" rounded="lg" class="pa-3 mb-4">
                <v-row class="text-center" dense>
                  <v-col cols="4"><div class="text-caption">Allocated</div><div class="font-weight-bold">{{ adjustTarget?.allocated }}</div></v-col>
                  <v-col cols="4"><div class="text-caption">Used</div><div class="font-weight-bold">{{ adjustTarget?.used }}</div></v-col>
                  <v-col cols="4"><div class="text-caption">Available</div><div class="font-weight-bold">{{ adjustTarget?.available }}</div></v-col>
                </v-row>
              </v-card>
            </v-col>
            <v-col cols="12">
              <v-text-field v-model.number="adjustForm.days" label="Adjustment Days *"
                type="number" hint="Positive = add days | Negative = deduct days" persistent-hint
                :rules="[r => r !== 0 || 'Cannot be 0']" />
            </v-col>
            <v-col cols="12">
              <v-textarea v-model="adjustForm.reason" label="Reason *" rows="2"
                :rules="[r => !!r || 'Required']" />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0 ga-2">
          <v-btn variant="outlined" @click="adjustDialog = false" :disabled="saving">Cancel</v-btn>
          <v-spacer/>
          <v-btn color="primary" @click="saveAdjust" :loading="saving"
            :disabled="!adjustForm.days || !adjustForm.reason">
            Save Adjustment
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- BULK ALLOCATE DIALOG -->
    <v-dialog v-model="bulkDialog" max-width="440">
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="pa-4 pb-2 font-weight-bold">Bulk Allocate Balances</v-card-title>
        <v-card-text class="pa-4">
          <v-alert type="info" variant="tonal" density="compact" rounded="lg" class="mb-4">
            This will allocate leave balances for ALL active users for the selected year.
            Existing allocations will be skipped.
          </v-alert>
          <v-text-field v-model.number="bulkYear" label="Year *" type="number" min="2020" max="2100" />
        </v-card-text>
        <v-card-actions class="pa-4 pt-0 ga-2">
          <v-btn variant="outlined" @click="bulkDialog = false" :disabled="saving">Cancel</v-btn>
          <v-spacer/>
          <v-btn color="primary" @click="doBulkAllocate" :loading="saving" prepend-icon="mdi-calendar-sync">
            Allocate Year {{ bulkYear }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" rounded="lg">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/plugins/axios'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const isAdminOrHR = computed(() => auth.hasRole('SYSTEM_ADMIN') || auth.hasRole('HR_OFFICER'))

const currentYear = new Date().getFullYear()
const years       = Array.from({ length: 5 }, (_, i) => currentYear - 1 + i)
const selectedYear = ref(currentYear)
const bulkYear     = ref(currentYear)

const loading = ref(false), saving = ref(false)
const adjustDialog = ref(false), bulkDialog = ref(false)
const searchUser = ref(''), filterLeaveType = ref('')
const myBalances  = ref<any[]>([])
const allBalances = ref<any[]>([])
const adjustTarget = ref<any>(null)
const adjustForm   = ref({ days: 0, reason: '' })
const leaveTypes   = ref<any[]>([])
const snack        = ref({ show: false, text: '', color: 'success' })

const COLORS: Record<string,string> = { ANNUAL:'#0369A1',SICK:'#C0392B',MATERNITY:'#db2777',PATERNITY:'#7c3aed',SPECIAL:'#C9A227',STUDY:'#0F7A5A',MISSION:'#0891b2',UNPAID:'#64748b' }
const ICONS:  Record<string,string> = { ANNUAL:'mdi-umbrella-beach',SICK:'mdi-hospital-box',MATERNITY:'mdi-baby-carriage',PATERNITY:'mdi-human-male-child',SPECIAL:'mdi-star',STUDY:'mdi-book-open',MISSION:'mdi-airplane',UNPAID:'mdi-briefcase-outline' }

const leaveTypeOptions = computed(() => [
  { title: 'All Types', value: '' },
  ...leaveTypes.value.map(t => ({ title: t.nameEn, value: t.id })),
])

const filteredBalances = computed(() => {
  let list = allBalances.value
  if (searchUser.value) {
    const q = searchUser.value.toLowerCase()
    list = list.filter(b =>
      b.user.firstName?.toLowerCase().includes(q) ||
      b.user.lastName?.toLowerCase().includes(q) ||
      b.user.employeeId?.toLowerCase().includes(q)
    )
  }
  if (filterLeaveType.value) list = list.filter(b => b.leaveType.id === filterLeaveType.value)
  return list
})

const headers = [
  { title: 'Employee',   key: 'user',              width: 200 },
  { title: 'Leave Type', key: 'leaveType',          width: 140 },
  { title: 'Allocated',  key: 'allocated',          width: 100 },
  { title: 'Used',       key: 'used',               width: 80  },
  { title: 'Pending',    key: 'pending',            width: 90  },
  { title: 'Available',  key: 'available',          width: 100 },
  { title: 'Actions',    key: 'actions',            width: 100, sortable: false },
]

let searchTimer: any
function debounceLoad() { clearTimeout(searchTimer); searchTimer = setTimeout(load, 400) }

async function load() {
  loading.value = true
  try {
    if (isAdminOrHR.value) {
      const [balRes, ltRes] = await Promise.all([
        api.get('/leave-balances/all', { params: { year: selectedYear.value } }),
        api.get('/leave-types'),
      ])
      allBalances.value = (balRes as any).data || balRes
      leaveTypes.value  = (ltRes  as any).data || ltRes
    } else {
      const res: any = await api.get('/leave-balances/my', { params: { year: selectedYear.value } })
      myBalances.value = res.data || res
    }
  } finally { loading.value = false }
}

function openAdjust(item: any) {
  adjustTarget.value = item
  adjustForm.value   = { days: 0, reason: '' }
  adjustDialog.value = true
}

async function saveAdjust() {
  if (!adjustTarget.value) return
  saving.value = true
  try {
    await api.patch(`/leave-balances/${adjustTarget.value.id}/adjust`, adjustForm.value)
    adjustDialog.value = false
    snack.value = { show: true, text: 'Balance adjusted successfully!', color: 'success' }
    await load()
  } catch (e: any) {
    snack.value = { show: true, text: e?.message || 'Adjustment failed', color: 'error' }
  } finally { saving.value = false }
}

async function doBulkAllocate() {
  saving.value = true
  try {
    const res: any = await api.post('/leave-balances/allocate', { year: bulkYear.value })
    bulkDialog.value = false
    const d = res.data || res
    snack.value = { show: true, text: `✅ ${d.message} — ${d.created} created`, color: 'success' }
    await load()
  } catch (e: any) {
    snack.value = { show: true, text: e?.message || 'Allocation failed', color: 'error' }
  } finally { saving.value = false }
}

onMounted(load)
</script>
