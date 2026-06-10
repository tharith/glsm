<template>
  <div>
    <div class="text-caption font-weight-bold text-medium-emphasis mb-3">
      {{ locale === 'km' ? 'ដំណើរការអនុម័ត' : 'APPROVAL TIMELINE' }}
    </div>

    <!-- 3-column grid layout -->
    <v-row dense>
      <v-col v-for="(step, i) in steps" :key="i"
        :cols="12" :sm="steps.length <= 3 ? 4 : 6" :md="steps.length <= 3 ? 4 : Math.ceil(12/steps.length)">
        <v-card
          :color="cardColor(step)"
          :variant="step.done ? 'flat' : step.current ? 'outlined' : 'tonal'"
          rounded="xl" class="pa-3 text-center h-100"
          :style="step.current ? 'border:2px solid #D97706' : ''">

          <!-- Step number badge -->
          <div class="d-flex justify-center mb-2">
            <v-avatar :color="dotColor(step)" size="32">
              <v-icon v-if="step.done"    color="white" size="16">mdi-check</v-icon>
              <v-icon v-else-if="step.current" color="white" size="16">mdi-clock</v-icon>
              <span  v-else class="text-caption font-weight-bold" :style="'color:white'">{{ i+1 }}</span>
            </v-avatar>
          </div>

          <!-- Role name -->
          <div class="text-caption font-weight-bold mb-1"
            :class="step.done ? 'text-white' : 'text-medium-emphasis'">
            {{ formatRole(step.approverRole) }}
          </div>

          <!-- Status chip -->
          <v-chip
            :color="chipColor(step)"
            size="x-small" variant="tonal" class="mb-2">
            {{ stepLabel(step) }}
          </v-chip>

          <!-- Approver info (if done) -->
          <div v-if="step.approval" class="mt-1">
            <div class="text-caption" :class="step.done ? 'text-white' : ''"
              style="font-size:10px; opacity:0.85">
              {{ step.approval.approver?.firstName }} {{ step.approval.approver?.lastName }}
            </div>
            <div class="text-caption" style="font-size:10px; opacity:0.65">
              {{ formatDate(step.approval.stampedAt || step.approval.actionedAt) }}
            </div>
            <!-- Signature thumbnail -->
            <div v-if="step.approval.signatureUrl" class="mt-2">
              <v-img
                :src="apiBase + step.approval.signatureUrl"
                max-height="40" contain
                style="border-radius:4px; background:rgba(255,255,255,0.15)"
              />
            </div>
            <!-- Comment -->
            <div v-if="step.approval.comment"
              class="text-caption mt-1 pa-1 rounded"
              style="background:rgba(0,0,0,0.08); font-size:10px; opacity:0.85">
              "{{ step.approval.comment }}"
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Requester signature (if any) -->
    <div v-if="request.requesterSignatureUrl" class="mt-3 pa-3 rounded-lg" style="background:#f8f9fc">
      <div class="text-caption font-weight-bold text-medium-emphasis mb-2">
        ✍️ {{ locale === 'km' ? 'ហត្ថលេខាអ្នកស្នើសុំ' : 'Requester Signature' }}
      </div>
      <v-img
        :src="apiBase + request.requesterSignatureUrl"
        max-height="60" max-width="200" contain
        style="border:1px solid #e2e8f0; border-radius:6px; background:#fff"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'date-fns'
import { useI18n } from '@/i18n'
import type { LeaveRequest } from '@/types'

const props = defineProps<{ request: LeaveRequest }>()
const { locale } = useI18n()
const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const ROLE_LABELS: Record<string,string> = {
  OFFICE_CHIEF:     'Office Chief',
  DEPARTMENT_CHIEF: 'Dept. Chief',
  HR_OFFICER:       'HR Officer',
  DIRECTOR_GENERAL: 'Dir. General',
  INSTITUTION_HEAD: 'Inst. Head',
  SYSTEM_ADMIN:     'Admin',
}
const ROLE_LABELS_KM: Record<string,string> = {
  OFFICE_CHIEF:     'ប្រធានការិយាល័យ',
  DEPARTMENT_CHIEF: 'ប្រធាននាយកដ្ឋាន',
  HR_OFFICER:       'នាយកដ្ឋានបុគ្គលិក',
  DIRECTOR_GENERAL: 'អគ្គនាយក',
  INSTITUTION_HEAD: 'ប្រធានអង្គភាព',
  SYSTEM_ADMIN:     'អ្នកគ្រប់គ្រង',
}

const formatRole = (r: string) =>
  locale.value === 'km' ? (ROLE_LABELS_KM[r] || r) : (ROLE_LABELS[r] || r.replace(/_/g, ' '))

const steps = computed(() => {
  const wfSteps    = (props.request as any).workflowInstance?.definition?.steps || []
  const currStep   = (props.request as any).workflowInstance?.currentStep || 0
  const terminal   = ['COMPLETED','REJECTED','CANCELLED'].includes(props.request.status)
  const completed  = props.request.status === 'COMPLETED'

  return wfSteps.map((s: any) => ({
    ...s,
    done:    completed ? true : s.stepNumber < currStep,
    isNotifyOnly: (props.request as any).workflowInstance?.definition?.name?.includes('SENIOR_A') &&
                  s.approverRole === 'HR_OFFICER' && s.stepNumber > 1,
    current: !terminal && s.stepNumber === currStep,
    approval: (props.request as any).approvals?.find((a: any) => a.stepNumber === s.stepNumber),
  }))
})

const dotColor  = (s: any) => s.done ? '#0F7A5A' : s.current ? '#D97706' : '#cbd5e1'
const cardColor = (s: any) => s.done ? 'success' : s.current ? undefined : undefined
const chipColor = (s: any) => s.done ? 'success' : s.current ? 'warning' : 'default'
const stepLabel = (s: any) => {
  if (s.done)    return locale.value === 'km' ? 'អនុម័ត' : 'Approved'
  if (s.current) return locale.value === 'km' ? 'រង់ចាំ' : 'Pending'
  return locale.value === 'km' ? 'នៅសល់' : 'Waiting'
}
const formatDate = (d?: string) => d ? format(new Date(d), 'MMM d HH:mm') : ''
</script>
