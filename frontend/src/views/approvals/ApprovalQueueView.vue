<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h2 class="text-h6 font-weight-bold">Approval Queue</h2>
        <p class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">
          ពាក្យសុំរង់ចាំការអនុម័ត
        </p>
      </div>
      <v-chip color="warning" variant="tonal" prepend-icon="mdi-clock-outline">
        {{ queue.length }} Pending
      </v-chip>
    </div>

    <!-- Empty state -->
    <v-card v-if="!loading && queue.length===0" rounded="xl" elevation="1"
      class="pa-12 text-center">
      <v-icon size="64" color="success" class="mb-3">mdi-check-all</v-icon>
      <div class="text-subtitle-1 font-weight-bold">All Clear!</div>
      <div class="text-caption text-medium-emphasis mt-1">No pending requests.</div>
    </v-card>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48"/>
    </div>

    <!-- Request cards -->
    <v-card v-for="req in queue" :key="req.id" rounded="xl" elevation="1" class="mb-4">
      <v-card-text class="pa-6">
        <!-- Header: requester info + status -->
        <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-4">
          <div class="d-flex align-center ga-3">
            <v-avatar :color="'primary'" size="48">
              <v-img v-if="req.user.avatarUrl" :src="apiBase + req.user.avatarUrl" cover/>
              <span v-else class="text-body-2 font-weight-bold text-white">
                {{ req.user.firstName?.[0] }}{{ req.user.lastName?.[0] }}
              </span>
            </v-avatar>
            <div>
              <div class="text-subtitle-2 font-weight-bold">
                {{ req.user.firstName }} {{ req.user.lastName }}
              </div>
              <div class="text-caption" style="font-family:'Kantumruy Pro',sans-serif">
                {{ req.user.firstNameKh }} {{ req.user.lastNameKh }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ req.user.position?.nameEn }} · {{ req.user.orgUnit?.nameEn }}
              </div>
            </div>
          </div>
          <div class="text-right">
            <StatusChip :status="req.status"/>
            <div class="text-caption text-medium-emphasis mt-1">{{ req.refNumber }}</div>
          </div>
        </div>

        <!-- Request details grid -->
        <v-row dense class="mb-4">
          <v-col v-for="info in requestInfo(req)" :key="info.label" cols="6" sm="3">
            <v-card variant="tonal" rounded="lg" class="pa-3">
              <div class="text-caption text-medium-emphasis">{{ info.label }}</div>
              <div class="text-caption font-weight-bold">{{ info.value }}</div>
            </v-card>
          </v-col>
        </v-row>

        <!-- Reason -->
        <v-card variant="tonal" rounded="lg" class="pa-3 mb-4">
          <div class="text-caption text-medium-emphasis mb-1">Reason / មូលហេតុ</div>
          <div class="text-body-2">{{ req.reason }}</div>
        </v-card>

        <!-- Requester signature (if provided) -->
        <div v-if="req.requesterSignatureUrl" class="mb-4">
          <div class="text-caption font-weight-bold text-medium-emphasis mb-2">
            ✍️ Requester Signature — ហត្ថលេខាអ្នកស្នើសុំ
          </div>
          <v-img :src="apiBase + req.requesterSignatureUrl"
            max-height="80" max-width="240" contain
            style="border:1px solid #e2e8f0; border-radius:8px; background:#fafafa"/>
        </div>

        <!-- Workflow Timeline (shows previous approvers + signatures) -->
        <WorkflowTimeline :request="req" class="mb-4"/>

        <!-- Attachments -->
        <div v-if="req.attachments?.length" class="mb-4">
          <div class="text-caption font-weight-bold text-medium-emphasis mb-2">
            📎 Attachments ({{ req.attachments.length }})
          </div>
          <div class="d-flex flex-wrap ga-2">
            <v-chip v-for="att in req.attachments" :key="att.id"
              size="small" color="primary" variant="tonal" prepend-icon="mdi-file">
              {{ att.fileStorage.originalName }}
            </v-chip>
          </div>
        </div>

        <v-divider class="mb-4"/>

        <!-- Comment input -->
        <v-textarea v-model="comments[req.id]" label="Comment / មតិ (optional)"
          rows="2" density="compact" class="mb-4"/>

        <!-- ── Approver Signature Pad ──────────────────────── -->
        <SignaturePad
          v-model="signatures[req.id]"
          label="Your Signature / ហត្ថលេខារបស់អ្នក"
          :height="130"
          class="mb-4"
        />

        <!-- Action buttons -->
        <div class="d-flex ga-2 justify-end flex-wrap">
          <v-btn variant="outlined" color="warning"
            @click="openConfirm(req,'RETURNED')"
            prepend-icon="mdi-undo">Return</v-btn>
          <v-btn color="error"
            @click="openConfirm(req,'REJECTED')"
            prepend-icon="mdi-close">Reject</v-btn>
          <v-btn color="success"
            @click="openConfirm(req,'APPROVED')"
            prepend-icon="mdi-check">Approve</v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Confirm Dialog -->
    <v-dialog v-model="confirmDialog" max-width="420">
      <v-card rounded="xl" class="pa-4">
        <v-card-text class="text-center pa-4">
          <v-icon size="52" :color="cfg.color" class="mb-3">{{ cfg.icon }}</v-icon>
          <div class="text-h6 font-weight-bold mb-2">{{ cfg.title }}</div>
          <div class="text-body-2 text-medium-emphasis">{{ cfg.body }}</div>
          <!-- Show signature preview in confirm dialog -->
          <div v-if="pendingAction && signatures[pendingAction.req.id]" class="mt-3">
            <div class="text-caption text-medium-emphasis mb-1">Your signature will be attached:</div>
            <v-img
              :src="sigPreview"
              max-height="60" max-width="180" contain class="mx-auto"
              style="border:1px solid #e2e8f0; border-radius:6px"/>
          </div>
        </v-card-text>
        <v-card-actions class="ga-2 pa-4 pt-0">
          <v-btn variant="outlined" @click="confirmDialog=false" block>Cancel</v-btn>
          <v-btn :color="cfg.color" @click="doAction" :loading="saving" block>
            Confirm
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" rounded="lg">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { format } from 'date-fns'
import api from '@/plugins/axios'
import { useLeaveStore } from '@/stores/leave.store'
import StatusChip from '@/components/shared/StatusChip.vue'
import WorkflowTimeline from '@/components/workflow/WorkflowTimeline.vue'
import SignaturePad from '@/components/shared/SignaturePad.vue'

const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const leaveStore    = useLeaveStore()
const loading       = ref(false), saving = ref(false)
const confirmDialog = ref(false)
const queue         = computed(() => leaveStore.approvalQueue)
const comments      = ref<Record<string, string>>({})
const signatures    = ref<Record<string, File|Blob|null>>({})
const snack         = ref({ show:false, text:'', color:'success' })
const pendingAction = ref<{ req: any; action: string } | null>(null)

// Signature preview URL for confirm dialog
const sigPreview = computed(() => {
  const blob = pendingAction.value ? signatures.value[pendingAction.value.req.id] : null
  if (!blob) return ''
  return URL.createObjectURL(blob)
})

const ACTION_CONFIGS: Record<string,any> = {
  APPROVED: { title:'Confirm Approval',        body:'Request will be approved and forwarded.',  color:'success', icon:'mdi-check-circle' },
  REJECTED: { title:'Confirm Rejection',        body:'Request will be permanently rejected.',    color:'error',   icon:'mdi-close-circle' },
  RETURNED: { title:'Return for Correction',    body:'Request will be returned to the requester.', color:'warning', icon:'mdi-undo-variant' },
}
const cfg = computed(() => pendingAction.value ? ACTION_CONFIGS[pendingAction.value.action] : ACTION_CONFIGS.APPROVED)

function requestInfo(req: any) {
  return [
    { label:'Leave Type', value: req.leaveType.nameEn },
    { label:'Duration',   value: `${req.totalDays} days` },
    { label:'Start',      value: format(new Date(req.startDate), 'MMM d, yyyy') },
    { label:'End',        value: format(new Date(req.endDate),   'MMM d, yyyy') },
  ]
}

function openConfirm(req: any, action: string) {
  pendingAction.value = { req, action }
  confirmDialog.value = true
}

async function doAction() {
  if (!pendingAction.value) return
  const { req, action } = pendingAction.value
  saving.value = true
  try {
    // Build multipart FormData with optional signature
    const fd = new FormData()
    fd.append('action',  action)
    if (comments.value[req.id]) fd.append('comment', comments.value[req.id])
    const sig = signatures.value[req.id]
    if (sig) fd.append('signature', sig, 'signature.png')

    await api.post(`/leave-requests/${req.id}/approve`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    confirmDialog.value = false
    snack.value = { show:true, text:`Action: ${action} completed!`, color:'success' }
    // Clear state for this request
    delete comments.value[req.id]
    delete signatures.value[req.id]
    await leaveStore.fetchApprovalQueue()
  } catch (e: any) {
    snack.value = { show:true, text: e?.message||'Action failed', color:'error' }
  } finally { saving.value = false }
}

onMounted(async () => {
  loading.value = true
  try { await leaveStore.fetchApprovalQueue() }
  finally { loading.value = false }
})
</script>
