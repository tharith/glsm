<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h2 class="text-h6 font-weight-bold">My Leave Requests</h2>
        <p class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">ពាក្យសុំច្បាប់របស់ខ្ញុំ</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" to="/requests/new">New Request</v-btn>
    </div>

    <!-- Filters -->
    <v-card rounded="xl" elevation="1" class="pa-4 mb-4">
      <v-row dense align="center">
        <v-col cols="12" sm="5">
          <v-text-field v-model="search" label="Search" prepend-inner-icon="mdi-magnify"
            density="compact" hide-details clearable />
        </v-col>
        <v-col cols="12" sm="4">
          <v-select v-model="filterStatus" label="Status" :items="statusOptions"
            density="compact" hide-details clearable />
        </v-col>
        <v-col cols="12" sm="3">
          <v-select v-model="filterType" label="Leave Type" :items="typeOptions"
            density="compact" hide-details clearable />
        </v-col>
      </v-row>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48" />
    </div>

    <!-- Empty -->
    <v-card v-else-if="filtered.length === 0" rounded="xl" elevation="1" class="pa-12 text-center">
      <v-icon size="64" color="grey-lighten-1" class="mb-3">mdi-clipboard-list-outline</v-icon>
      <div class="text-subtitle-1 font-weight-bold text-medium-emphasis">No requests found</div>
      <div class="text-caption text-medium-emphasis mt-1">Try adjusting your filters or submit a new request.</div>
      <v-btn color="primary" class="mt-4" to="/requests/new" prepend-icon="mdi-plus">New Request</v-btn>
    </v-card>

    <!-- Request Cards -->
    <div v-else>
      <v-card v-for="req in filtered" :key="req.id" rounded="xl" elevation="1" class="mb-3" hover>
        <v-card-text class="pa-4">
          <div class="d-flex align-center justify-space-between flex-wrap ga-3">
            <div class="d-flex align-center ga-3">
              <v-avatar :color="leaveColor(req.leaveType.code)" size="44" rounded="lg">
                <v-icon :icon="leaveIcon(req.leaveType.code)" color="white" size="20" />
              </v-avatar>
              <div>
                <div class="text-subtitle-2 font-weight-bold">{{ req.leaveType.nameEn }}</div>
                <div class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">{{ req.leaveType.nameKh }}</div>
                <div class="text-caption text-medium-emphasis mt-1">
                  <v-icon size="12" class="mr-1">mdi-calendar-range</v-icon>
                  {{ fmt(req.startDate) }} → {{ fmt(req.endDate) }}
                  <strong class="ml-2">{{ req.totalDays }} days</strong>
                </div>
              </div>
            </div>
            <div class="d-flex flex-column align-end ga-2">
              <StatusChip :status="req.status" />
              <div class="text-caption text-medium-emphasis">{{ req.refNumber }}</div>
              <div class="text-caption text-medium-emphasis">{{ fmt(req.submittedAt || req.createdAt) }}</div>
            </div>
          </div>

          <!-- Reason preview -->
          <div class="mt-3 pa-3 rounded-lg bg-grey-lighten-5">
            <span class="text-caption text-medium-emphasis">មូលហេតុ: </span>
            <span class="text-caption">{{ req.reason }}</span>
          </div>

          <!-- Expandable Timeline -->
          <div class="mt-3">
            <v-btn variant="text" size="small" @click="toggle(req.id)"
              :prepend-icon="expanded[req.id] ? 'mdi-chevron-up' : 'mdi-chevron-down'">
              {{ expanded[req.id] ? 'Hide' : 'Show' }} Approval Timeline
            </v-btn>
            <v-expand-transition>
              <div v-if="expanded[req.id]" class="mt-3 pt-3" style="border-top:1px solid #f1f5f9">
                <WorkflowTimeline :request="req" />
              </div>
            </v-expand-transition>
          </div>

          <!-- Actions for DRAFT or SUBMITTED -->
          <div v-if="['DRAFT','SUBMITTED'].includes(req.status)" class="mt-3 d-flex justify-end ga-2">
            <v-btn v-if="req.status === 'DRAFT'" size="small" color="primary" variant="tonal"
              @click="submitDraft(req.id)" :loading="actionLoading === req.id">
              Submit Draft
            </v-btn>
            <v-btn size="small" color="error" variant="tonal"
              @click="confirmCancel(req)" :loading="actionLoading === req.id">
              Cancel Request
            </v-btn>
          </div>
        </v-card-text>
      </v-card>

      <!-- Pagination -->
      <div v-if="total > limit" class="d-flex justify-center mt-4">
        <v-pagination v-model="page" :length="Math.ceil(total / limit)" rounded="lg" />
      </div>
    </div>

    <!-- Cancel Confirm Dialog -->
    <v-dialog v-model="cancelDialog" max-width="380">
      <v-card rounded="xl" class="pa-4">
        <v-card-text class="text-center pa-4">
          <v-icon size="52" color="error" class="mb-3">mdi-close-circle-outline</v-icon>
          <div class="text-h6 font-weight-bold mb-2">Cancel Request?</div>
          <div class="text-body-2 text-medium-emphasis">
            Cancel <strong>{{ cancelTarget?.refNumber }}</strong>? This action cannot be undone.
          </div>
        </v-card-text>
        <v-card-actions class="ga-2">
          <v-btn variant="outlined" @click="cancelDialog = false" block>Keep</v-btn>
          <v-btn color="error" @click="doCancel" :loading="cancelling" block>Cancel Request</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" rounded="lg">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useLeaveStore } from '@/stores/leave.store'
import StatusChip from '@/components/shared/StatusChip.vue'
import WorkflowTimeline from '@/components/workflow/WorkflowTimeline.vue'
import api from '@/plugins/axios'
import { format } from 'date-fns'
import type { LeaveRequest } from '@/types'

const leaveStore   = useLeaveStore()
const loading      = ref(false)
const actionLoading= ref('')
const cancelling   = ref(false)
const cancelDialog = ref(false)
const cancelTarget = ref<LeaveRequest | null>(null)
const expanded     = ref<Record<string, boolean>>({})
const search       = ref('')
const filterStatus = ref('')
const filterType   = ref('')
const page         = ref(1)
const limit        = 10
const total        = ref(0)
const snack        = ref({ show: false, text: '', color: 'success' })

const statusOptions = ['DRAFT','SUBMITTED','OFFICE_APPROVED','DEPT_APPROVED','HR_VERIFIED','DG_APPROVED','COMPLETED','REJECTED','RETURNED','CANCELLED']
const typeOptions   = computed(() => leaveStore.leaveTypes.map(t => ({ title: t.nameEn, value: t.id })))

const COLORS: Record<string,string> = { ANNUAL:'#0369A1',SICK:'#C0392B',MATERNITY:'#db2777',PATERNITY:'#7c3aed',SPECIAL:'#C9A227',STUDY:'#0F7A5A',MISSION:'#0891b2',UNPAID:'#64748b' }
const ICONS:  Record<string,string> = { ANNUAL:'mdi-umbrella-beach',SICK:'mdi-hospital-box',MATERNITY:'mdi-baby-carriage',PATERNITY:'mdi-human-male-child',SPECIAL:'mdi-star',STUDY:'mdi-book-open',MISSION:'mdi-airplane',UNPAID:'mdi-briefcase-outline' }
const leaveColor = (c: string) => COLORS[c] || '#64748b'
const leaveIcon  = (c: string) => ICONS[c]  || 'mdi-calendar'
const fmt = (d?: string) => d ? format(new Date(d), 'MMM d, yyyy') : '-'

const filtered = computed(() => {
  let list = leaveStore.myRequests || []
  if (search.value)       list = list.filter(r => r.refNumber.toLowerCase().includes(search.value.toLowerCase()) || r.reason.toLowerCase().includes(search.value.toLowerCase()))
  if (filterStatus.value) list = list.filter(r => r.status === filterStatus.value)
  if (filterType.value)   list = list.filter(r => r.leaveTypeId === filterType.value)
  return list
})

const toggle = (id: string) => { expanded.value[id] = !expanded.value[id] }

async function load() {
  loading.value = true
  try {
    const res = await leaveStore.fetchMyRequests({ page: page.value, limit, status: filterStatus.value || undefined })
    total.value = (res as any).total || 0
  } finally { loading.value = false }
}

async function submitDraft(id: string) {
  actionLoading.value = id
  try {
    await api.post(`/leave-requests/${id}/submit`)
    snack.value = { show: true, text: 'Request submitted!', color: 'success' }
    await load()
  } catch (e: any) {
    snack.value = { show: true, text: e?.message || 'Failed', color: 'error' }
  } finally { actionLoading.value = '' }
}

function confirmCancel(req: LeaveRequest) { cancelTarget.value = req; cancelDialog.value = true }

async function doCancel() {
  if (!cancelTarget.value) return
  cancelling.value = true
  try {
    await leaveStore.cancelRequest(cancelTarget.value.id)
    cancelDialog.value = false
    snack.value = { show: true, text: 'Request cancelled.', color: 'success' }
    await load()
  } catch (e: any) {
    snack.value = { show: true, text: e?.message || 'Failed to cancel', color: 'error' }
  } finally { cancelling.value = false }
}

watch(page, load)
watch([filterStatus, filterType], () => { page.value = 1; load() })
onMounted(async () => { await leaveStore.fetchLeaveTypes(); await load() })
</script>
