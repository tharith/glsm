<template>
  <div>
    <div class="d-flex align-center ga-3 mb-6">
      <v-btn icon variant="text" @click="router.back()"><v-icon>mdi-arrow-left</v-icon></v-btn>
      <div>
        <h2 class="text-h6 font-weight-bold">Request Detail</h2>
        <p class="text-caption text-medium-emphasis">{{ request?.refNumber }}</p>
      </div>
    </div>

    <div v-if="loading" class="text-center py-16"><v-progress-circular indeterminate color="primary" size="48"/></div>

    <v-row v-else-if="request">
      <!-- Left: Details -->
      <v-col cols="12" md="7">
        <!-- Header Card -->
        <v-card rounded="xl" elevation="1" class="mb-4">
          <v-card-text class="pa-6">
            <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
              <div class="d-flex align-center ga-3">
                <v-avatar :color="leaveColor(request.leaveType.code)" size="52" rounded="xl">
                  <v-icon :icon="leaveIcon(request.leaveType.code)" color="white" size="24"/>
                </v-avatar>
                <div>
                  <div class="text-h6 font-weight-bold">{{ request.leaveType.nameEn }}</div>
                  <div class="text-caption" style="font-family:'Kantumruy Pro',sans-serif">{{ request.leaveType.nameKh }}</div>
                </div>
              </div>
              <StatusChip :status="request.status" />
            </div>

            <v-row dense>
              <v-col v-for="info in infoItems" :key="info.label" cols="6">
                <v-card variant="tonal" rounded="lg" class="pa-3 mb-2">
                  <div class="text-caption text-medium-emphasis mb-1">{{ info.label }}</div>
                  <div class="text-body-2 font-weight-bold" :style="info.color ? `color:${info.color}` : ''">{{ info.value }}</div>
                </v-card>
              </v-col>
            </v-row>

            <div class="pa-4 rounded-lg mt-2" style="background:#f8f9fc">
              <div class="text-caption text-medium-emphasis mb-1">Reason / មូលហេតុ</div>
              <div class="text-body-2">{{ request.reason }}</div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Approval History -->
        <v-card rounded="xl" elevation="1" class="mb-4">
          <v-card-text class="pa-6">
            <div class="text-subtitle-2 font-weight-bold mb-4">Approval History</div>
            <div v-if="!request.approvals?.length" class="text-caption text-medium-emphasis text-center py-4">No approvals yet</div>
            <v-timeline v-else density="compact" align="start" side="end" truncate-line="both">
              <v-timeline-item v-for="ap in request.approvals" :key="ap.id"
                :dot-color="actionColor(ap.action)" size="small">
                <div class="d-flex align-center justify-space-between flex-wrap ga-2">
                  <div>
                    <div class="text-caption font-weight-bold">{{ ap.approverRole.replace(/_/g,' ') }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ ap.approver.firstName }} {{ ap.approver.lastName }} · {{ fmt(ap.actionedAt) }}
                    </div>
                    <div v-if="ap.comment" class="text-caption mt-1 fst-italic">"{{ ap.comment }}"</div>
                  </div>
                  <v-chip size="x-small" :color="actionColor(ap.action)" variant="tonal">{{ ap.action }}</v-chip>
                </div>
              </v-timeline-item>
            </v-timeline>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Right: Workflow + Actions -->
      <v-col cols="12" md="5">
        <v-card rounded="xl" elevation="1" class="mb-4 pa-5">
          <WorkflowTimeline :request="request" />
        </v-card>

        <!-- Actions -->
        <v-card v-if="['DRAFT','SUBMITTED'].includes(request.status)" rounded="xl" elevation="1" class="pa-5">
          <div class="text-subtitle-2 font-weight-bold mb-3">Actions</div>
          <v-btn v-if="request.status === 'DRAFT'" color="primary" block class="mb-2"
            @click="doSubmit" :loading="acting" prepend-icon="mdi-send">
            Submit Request
          </v-btn>
          <v-btn color="error" variant="outlined" block @click="cancelDialog = true" prepend-icon="mdi-close">
            Cancel Request
          </v-btn>
        </v-card>
      </v-col>
    </v-row>

    <!-- Cancel Dialog -->
    <v-dialog v-model="cancelDialog" max-width="360">
      <v-card rounded="xl" class="pa-4">
        <v-card-text class="text-center pa-4">
          <v-icon size="52" color="error" class="mb-3">mdi-close-circle-outline</v-icon>
          <div class="text-h6 font-weight-bold mb-2">Cancel this request?</div>
          <div class="text-body-2 text-medium-emphasis">This action cannot be undone.</div>
        </v-card-text>
        <v-card-actions class="ga-2">
          <v-btn variant="outlined" @click="cancelDialog = false" block>Keep</v-btn>
          <v-btn color="error" @click="doCancel" :loading="acting" block>Yes, Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/plugins/axios'
import { format } from 'date-fns'
import StatusChip from '@/components/shared/StatusChip.vue'
import WorkflowTimeline from '@/components/workflow/WorkflowTimeline.vue'
import type { LeaveRequest } from '@/types'

const route   = useRoute()
const router  = useRouter()
const loading = ref(false)
const acting  = ref(false)
const cancelDialog = ref(false)
const request = ref<LeaveRequest | null>(null)

const COLORS: Record<string,string> = { ANNUAL:'#0369A1',SICK:'#C0392B',MATERNITY:'#db2777',PATERNITY:'#7c3aed',SPECIAL:'#C9A227',STUDY:'#0F7A5A',MISSION:'#0891b2',UNPAID:'#64748b' }
const ICONS:  Record<string,string> = { ANNUAL:'mdi-umbrella-beach',SICK:'mdi-hospital-box',MATERNITY:'mdi-baby-carriage',PATERNITY:'mdi-human-male-child',SPECIAL:'mdi-star',STUDY:'mdi-book-open',MISSION:'mdi-airplane',UNPAID:'mdi-briefcase-outline' }
const leaveColor = (c: string) => COLORS[c] || '#64748b'
const leaveIcon  = (c: string) => ICONS[c]  || 'mdi-calendar'
const actionColor = (a: string) => ({ APPROVED:'success',REJECTED:'error',RETURNED:'warning',VERIFIED:'info' }[a] || 'grey')
const fmt = (d?: string) => d ? format(new Date(d), 'MMM d, yyyy HH:mm') : '-'

const infoItems = computed(() => !request.value ? [] : [
  { label: 'Reference',   value: request.value.refNumber,                      color: '#0369A1' },
  { label: 'Duration',    value: `${request.value.totalDays} working days`,    color: '#1A2744' },
  { label: 'Start Date',  value: fmt(request.value.startDate) },
  { label: 'End Date',    value: fmt(request.value.endDate) },
  { label: 'Submitted',   value: fmt(request.value.submittedAt) },
  { label: 'Status',      value: request.value.status.replace(/_/g,' ') },
])

async function load() {
  loading.value = true
  try {
    const res: any = await api.get(`/leave-requests/${route.params.id}`)
    request.value = res.data || res
  } finally { loading.value = false }
}

async function doSubmit() {
  acting.value = true
  try { await api.post(`/leave-requests/${request.value!.id}/submit`); await load() }
  finally { acting.value = false }
}

async function doCancel() {
  acting.value = true
  try { await api.post(`/leave-requests/${request.value!.id}/cancel`); router.push('/requests/my') }
  finally { acting.value = false; cancelDialog.value = false }
}

onMounted(load)
</script>
