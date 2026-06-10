<template>
  <div>
    <div class="mb-6">
      <h2 class="text-h6 font-weight-bold">New Leave Request</h2>
      <p class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">
        ស្នើសុំច្បាប់ — Fill the form, sign (optional), then submit
      </p>
    </div>

    <v-row>
      <!-- LEFT: Form -->
      <v-col cols="12" md="7">
        <v-card rounded="xl" elevation="1">
          <v-card-text class="pa-6">
            <v-form ref="formRef" v-model="isValid">

              <!-- Leave Type -->
              <p class="text-caption font-weight-bold text-medium-emphasis mb-2">LEAVE TYPE *</p>
              <v-row dense class="mb-4">
                <v-col v-for="lt in leaveTypes" :key="lt.id" cols="6" sm="4">
                  <v-card
                    :color="form.leaveTypeId === lt.id ? COLORS[lt.code]||'primary' : 'surface'"
                    :variant="form.leaveTypeId === lt.id ? 'flat' : 'outlined'"
                    @click="form.leaveTypeId = lt.id"
                    rounded="lg" class="cursor-pointer pa-3" hover>
                    <div class="d-flex align-center ga-2">
                      <v-icon :icon="ICONS[lt.code]||'mdi-calendar'" size="18"
                        :color="form.leaveTypeId===lt.id?'white':COLORS[lt.code]||'primary'" />
                      <div>
                        <div class="text-caption font-weight-bold"
                          :class="form.leaveTypeId===lt.id?'text-white':''"
                        >{{ lt.nameEn }}</div>
                        <div class="text-caption"
                          :class="form.leaveTypeId===lt.id?'text-white':'text-medium-emphasis'"
                          style="font-family:'Kantumruy Pro',sans-serif;font-size:9px"
                        >{{ lt.nameKh }}</div>
                      </div>
                    </div>
                  </v-card>
                </v-col>
              </v-row>

              <!-- Dates -->
              <v-row>
                <v-col cols="6">
                  <v-text-field v-model="form.startDate" label="Start Date *" type="date"
                    :rules="[r=>!!r||'Required']" prepend-inner-icon="mdi-calendar-start"/>
                </v-col>
                <v-col cols="6">
                  <v-text-field v-model="form.endDate" label="End Date *" type="date"
                    :min="form.startDate" :rules="[r=>!!r||'Required']"
                    prepend-inner-icon="mdi-calendar-end"/>
                </v-col>
              </v-row>

              <!-- Half-day toggle -->
              <v-card variant="tonal" rounded="lg" class="pa-3 mb-3">
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <div class="text-caption font-weight-bold">ច្បាប់កន្លះថ្ងៃ — Half Day Leave</div>
                    <div class="text-caption text-medium-emphasis">ឈប់ 0.5 ថ្ងៃ (ព្រឹក ឬ ល្ងាច)</div>
                  </div>
                  <v-switch v-model="form.isHalfDay" color="primary" hide-details
                    @update:model-value="workingDays = form.isHalfDay ? 0 : workingDays"/>
                </div>
              </v-card>

              <!-- Working days preview -->
              <v-alert v-if="workingDays > 0" type="info" density="compact"
                rounded="lg" variant="tonal" class="mb-3">
                <strong>{{ workingDays }} working day(s)</strong> — weekends &amp; holidays excluded
              </v-alert>
              <v-alert v-if="balanceError" type="error" density="compact"
                rounded="lg" variant="tonal" class="mb-3">
                {{ balanceError }}
              </v-alert>

              <!-- Reason -->
              <v-textarea v-model="form.reason" label="Reason / មូលហេតុ *" rows="3"
                :rules="[r=>!!r||'Required', r=>r.length>=5||'Too short']" class="mb-2"/>

              <!-- Senior path selector (only for DEPUTY_INSTITUTION_HEAD) -->
              <v-expand-transition>
                <v-card v-if="isSeniorRole" variant="outlined" color="warning" rounded="lg" class="pa-3 mb-4">
                  <div class="text-caption font-weight-bold text-warning mb-2">
                    ⚠️ Senior Official — Choose submission path:
                  </div>
                  <v-radio-group v-model="form.seniorPath" hide-details>
                    <v-radio value="A">
                      <template #label>
                        <div>
                          <div class="text-caption font-weight-bold">Path A (default)</div>
                          <div class="text-caption text-medium-emphasis">
                            ស្នើតាមប្រធានអង្គភាព → HR កត់ត្រា
                          </div>
                        </div>
                      </template>
                    </v-radio>
                    <v-radio value="B" class="mt-2">
                      <template #label>
                        <div>
                          <div class="text-caption font-weight-bold">Path B</div>
                          <div class="text-caption text-medium-emphasis">
                            ស្នើ HR មុន → HR ហើយជូនដំណឹងប្រធានអង្គភាព
                          </div>
                        </div>
                      </template>
                    </v-radio>
                  </v-radio-group>
                </v-card>
              </v-expand-transition>

              <!-- ── Requester Signature ─────────────────────── -->
              <v-divider class="my-4"/>
              <SignaturePad
                v-model="signatureBlob"
                label="Your Signature / ហត្ថលេខារបស់អ្នក"
                :height="150"
              />

              <!-- Actions -->
              <v-row class="mt-4">
                <v-col>
                  <v-btn variant="outlined" @click="saveDraft" :loading="saving">
                    <v-icon start>mdi-content-save-outline</v-icon>Save Draft
                  </v-btn>
                </v-col>
                <v-col class="text-right">
                  <v-btn color="primary" @click="submit" :loading="saving"
                    :disabled="!isValid || !form.leaveTypeId || !!balanceError">
                    <v-icon start>mdi-send</v-icon>Submit Request
                  </v-btn>
                </v-col>
              </v-row>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- RIGHT: Balance + Workflow -->
      <v-col cols="12" md="5">
        <!-- Balance Check -->
        <v-card v-if="selectedBalance" rounded="xl" elevation="1" class="pa-5 mb-4">
          <div class="text-subtitle-2 font-weight-bold mb-4">📊 Balance Check</div>
          <div class="pa-3 rounded-lg mb-4" :style="'background:' + (COLORS[selectedType?.code]||'#1A2744') + '12'">
            <div class="d-flex align-center ga-3">
              <v-icon :icon="ICONS[selectedType?.code]||'mdi-calendar'"
                :color="COLORS[selectedType?.code]||'primary'" size="28"/>
              <div>
                <div class="text-body-2 font-weight-bold"
                  :style="'color:' + (COLORS[selectedType?.code]||'#1A2744')">
                  {{ selectedType?.nameEn }}
                </div>
                <div class="text-caption text-medium-emphasis"
                  style="font-family:'Kantumruy Pro',sans-serif">
                  {{ selectedType?.nameKh }}
                </div>
              </div>
            </div>
          </div>
          <div v-for="row in balanceRows" :key="row.label"
            class="d-flex justify-space-between py-2"
            style="border-bottom:1px solid #f1f5f9">
            <span class="text-caption text-medium-emphasis">{{ row.label }}</span>
            <span class="text-caption font-weight-bold" :style="{color: row.color}">
              {{ row.value }} days
            </span>
          </div>
        </v-card>

        <!-- Workflow Steps -->
        <v-card rounded="xl" elevation="1" class="pa-5">
          <div class="text-subtitle-2 font-weight-bold mb-3">🔄 Approval Flow</div>
          <v-timeline density="compact" align="start" side="end" truncate-line="both">
            <v-timeline-item v-for="(step, i) in workflowSteps" :key="i"
              dot-color="primary" size="x-small">
              <div class="text-caption font-weight-bold">
                Step {{ i + 1 }}: {{ step.name }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ step.approverRole.replace(/_/g,' ') }}
              </div>
            </v-timeline-item>
          </v-timeline>
        </v-card>
      </v-col>
    </v-row>

    <!-- Success Snackbar -->
    <v-snackbar v-model="snack.show" :color="snack.color" rounded="lg">
      {{ snack.text }}
      <template #actions>
        <v-btn v-if="snack.color==='success'" variant="text" @click="$router.push('/requests/my')">
          View Requests
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import api from '@/plugins/axios'
import SignaturePad from '@/components/shared/SignaturePad.vue'
import { useLeaveStore } from '@/stores/leave.store'

const leaveStore = useLeaveStore()
const isValid   = ref(false), saving = ref(false), formRef = ref()
const workingDays = ref(0), workflowSteps = ref<any[]>([])
const signatureBlob = ref<File | Blob | null>(null)
const snack = ref({ show: false, text: '', color: 'success' })

const COLORS: Record<string,string> = { ANNUAL:'#0369A1',SICK:'#C0392B',MATERNITY:'#db2777',PATERNITY:'#7c3aed',SPECIAL:'#C9A227',STUDY:'#0F7A5A',MISSION:'#0891b2',UNPAID:'#64748b' }
const ICONS:  Record<string,string> = { ANNUAL:'mdi-umbrella-beach',SICK:'mdi-hospital-box',MATERNITY:'mdi-baby-carriage',PATERNITY:'mdi-human-male-child',SPECIAL:'mdi-star',STUDY:'mdi-book-open',MISSION:'mdi-airplane',UNPAID:'mdi-briefcase-outline' }

const form = ref({ leaveTypeId:'', startDate:'', endDate:'', reason:'', isHalfDay: false, seniorPath: 'A' as 'A'|'B' })

const leaveTypes = computed(() => leaveStore.leaveTypes)
const selectedType = computed(() => leaveTypes.value.find(t => t.id === form.value.leaveTypeId))
const selectedBalance = computed(() => leaveStore.myBalances.find(b => b.leaveType.id === form.value.leaveTypeId))

// Check if user is DEPUTY_INSTITUTION_HEAD (senior path)
import { useAuthStore } from '@/stores/auth.store'
const authStore = useAuthStore()
const isSeniorRole = computed(() =>
  authStore.hasRole('DEPUTY_INSTITUTION_HEAD')
)

const balanceError = computed(() => {
  if (!selectedBalance.value || workingDays.value === 0) return ''
  if (workingDays.value > selectedBalance.value.available)
    return `Insufficient balance: ${selectedBalance.value.available}d available, ${workingDays.value}d requested`
  return ''
})

const balanceRows = computed(() => {
  const b = selectedBalance.value
  if (!b) return []
  return [
    { label:'Allocated', value: b.allocated, color:'#0369A1' },
    { label:'Used',      value: b.used,      color:'#D97706' },
    { label:'Pending',   value: b.pending,   color:'#7c3aed' },
    { label:'Available', value: b.available, color: b.available<3?'#C0392B':'#0F7A5A' },
    { label:'Requesting',value: workingDays.value, color: balanceError.value?'#C0392B':'#1A2744' },
  ]
})

// Calculate working days when dates change
watch([() => form.value.startDate, () => form.value.endDate], async ([s, e]) => {
  if (!s || !e || e < s) { workingDays.value = 0; return }
  try {
    const res: any = await api.get('/leave-balances/working-days', { params: { startDate:s, endDate:e } })
    workingDays.value = res.data ?? res
  } catch { workingDays.value = 0 }
})

// Build FormData with optional signature
function buildFormData(asDraft: boolean): FormData {
  const fd = new FormData()
  fd.append('leaveTypeId', form.value.leaveTypeId)
  fd.append('startDate',   form.value.startDate)
  fd.append('endDate',     form.value.endDate)
  fd.append('reason',      form.value.reason)
  fd.append('asDraft',     String(asDraft))
  fd.append('isHalfDay',   String(form.value.isHalfDay || false))
  if (form.value.seniorPath) fd.append('seniorPath', form.value.seniorPath)
  if (signatureBlob.value) {
    fd.append('signature', signatureBlob.value, 'signature.png')
  }
  return fd
}

async function submit() {
  saving.value = true
  try {
    await api.post('/leave-requests', buildFormData(false), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    snack.value = { show:true, text:'✅ Request submitted successfully!', color:'success' }
    form.value  = { leaveTypeId:'', startDate:'', endDate:'', reason:'' }
    signatureBlob.value = null
    workingDays.value   = 0
    await leaveStore.fetchMyBalances()
  } catch (e: any) {
    snack.value = { show:true, text: e?.message||'Submission failed', color:'error' }
  } finally { saving.value = false }
}

async function saveDraft() {
  saving.value = true
  try {
    await api.post('/leave-requests', buildFormData(true), {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    snack.value = { show:true, text:'Draft saved!', color:'info' }
  } catch (e: any) {
    snack.value = { show:true, text: e?.message||'Failed to save draft', color:'error' }
  } finally { saving.value = false }
}

onMounted(async () => {
  await Promise.all([leaveStore.fetchLeaveTypes(), leaveStore.fetchMyBalances()])
  try {
    const wf: any = await api.get('/workflow/my')
    workflowSteps.value = ((wf.data||wf)?.steps || [])
  } catch {}
})
</script>
