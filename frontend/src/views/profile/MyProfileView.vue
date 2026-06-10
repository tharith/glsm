<template>
  <div>
    <div class="mb-6">
      <h2 class="text-h6 font-weight-bold">My Profile</h2>
      <p class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">
        ព័ត៌មានផ្ទាល់ខ្លួន
      </p>
    </div>

    <div v-if="loading" class="text-center py-16">
      <v-progress-circular indeterminate color="primary" size="48"/>
    </div>

    <v-row v-else-if="profile">
      <!-- Left: Avatar + Quick Info -->
      <v-col cols="12" md="4">
        <!-- Profile Card -->
        <v-card rounded="xl" elevation="1" class="mb-4">
          <div class="pa-6 text-center" style="background:linear-gradient(135deg,#1A2744,#0369A1);border-radius:12px 12px 0 0">
            <div class="position-relative d-inline-block mb-3">
              <v-avatar size="96" color="white">
                <v-img v-if="profile.photo || profile.avatarUrl"
                  :src="apiBase + (profile.photo || profile.avatarUrl)" cover/>
                <span v-else class="text-h4 text-primary font-weight-black">
                  {{ initials }}
                </span>
              </v-avatar>
              <v-btn icon size="x-small" color="white" variant="elevated"
                style="position:absolute;bottom:0;right:0"
                @click="avatarDialog = true">
                <v-icon size="14">mdi-camera</v-icon>
              </v-btn>
            </div>
            <div class="text-h6 font-weight-bold text-white">
              {{ profile.firstName }} {{ profile.lastName }}
            </div>
            <div class="text-body-2 text-white mt-1" style="opacity:0.75;font-family:'Kantumruy Pro',sans-serif">
              {{ profile.firstNameKh }} {{ profile.lastNameKh }}
            </div>
            <div class="text-caption mt-2" style="color:rgba(255,255,255,0.6)">
              {{ profile.position?.nameEn }}
            </div>
            <div class="d-flex justify-center flex-wrap ga-1 mt-3">
              <v-chip v-for="ur in profile.userRoles" :key="ur.role.id"
                size="x-small" color="white" variant="tonal" style="color:white;border-color:rgba(255,255,255,0.4)">
                {{ ur.role.name.replace(/_/g,' ') }}
              </v-chip>
            </div>
          </div>
          <v-card-text class="pa-4">
            <InfoRow icon="mdi-badge-account"     :label="t.user.employeeId"   :value="profile.employeeId"/>
            <InfoRow icon="mdi-draw-pen"           label="Signature ID"         :value="profile.signatureOfApplicant"/>
            <InfoRow icon="mdi-email-outline"      label="Email"                :value="profile.email"/>
            <InfoRow icon="mdi-phone"              :label="t.user.phone"        :value="profile.phone"/>
            <InfoRow icon="mdi-domain"             :label="t.user.orgUnit"      :value="profile.orgUnit?.nameEn"/>
            <InfoRow icon="mdi-briefcase-outline"  :label="t.user.position"     :value="profile.position?.nameEn"/>
            <InfoRow icon="mdi-medal"              :label="t.user.rank"         :value="profile.currentRankAndGrade"/>
            <InfoRow icon="mdi-calendar-start"     :label="t.user.hireDate"     :value="fmt(profile.hireDate)"/>
          </v-card-text>
        </v-card>

        <!-- Quick Actions -->
        <v-card rounded="xl" elevation="1" class="pa-4">
          <div class="text-caption font-weight-bold text-medium-emphasis mb-3">QUICK ACTIONS</div>
          <v-btn block variant="tonal" color="primary" class="mb-2"
            prepend-icon="mdi-lock-reset" @click="pwDialog = true">
            {{ t.user.changePassword }}
          </v-btn>
          <v-btn block variant="tonal" color="success"
            prepend-icon="mdi-plus-circle" to="/requests/new">
            New Leave Request
          </v-btn>
        </v-card>
      </v-col>

      <!-- Right: Detail Tabs -->
      <v-col cols="12" md="8">
        <v-card rounded="xl" elevation="1">
          <v-tabs v-model="tab" class="px-4">
            <v-tab value="personal">👤 Personal</v-tab>
            <v-tab value="work">💼 Work</v-tab>
            <v-tab value="family">👨‍👩‍👧 Family</v-tab>
            <v-tab value="balances">📅 Balances</v-tab>
          </v-tabs>
          <v-divider/>
          <v-card-text class="pa-5">
            <v-window v-model="tab">

              <!-- Personal Tab -->
              <v-window-item value="personal">
                <v-row dense>
                  <v-col cols="12" sm="6"><DetailField :label="t.user.firstName" :value="profile.firstName"/></v-col>
                  <v-col cols="12" sm="6"><DetailField :label="t.user.lastName"  :value="profile.lastName"/></v-col>
                  <v-col cols="12" sm="6"><DetailField label="ឈ្មោះ"            :value="profile.firstNameKh"/></v-col>
                  <v-col cols="12" sm="6"><DetailField label="នាម"              :value="profile.lastNameKh"/></v-col>
                  <v-col cols="12" sm="6"><DetailField :label="t.user.gender"    :value="profile.gender"/></v-col>
                  <v-col cols="12" sm="6"><DetailField label="Date of Birth"     :value="fmt(profile.dateOfBirth)"/></v-col>
                  <v-col cols="12" sm="6"><DetailField label="Place of Birth"    :value="profile.dop"/></v-col>
                  <v-col cols="12" sm="6"><DetailField label="National ID"       :value="profile.nationalId"/></v-col>
                  <v-col cols="12" sm="6"><DetailField label="Passport"          :value="profile.passportNumber"/></v-col>
                  <v-col cols="12"      ><DetailField label="Address"            :value="profile.address"/></v-col>
                  <v-col cols="12" sm="6"><DetailField :label="t.user.education" :value="profile.educationLevel"/></v-col>
                  <v-col cols="12" sm="6"><DetailField :label="t.user.languages" :value="profile.foreignLanguages"/></v-col>
                </v-row>
              </v-window-item>

              <!-- Work Tab -->
              <v-window-item value="work">
                <v-row dense>
                  <v-col cols="12" sm="6"><DetailField label="Org Unit"                :value="profile.orgUnit?.nameEn"/></v-col>
                  <v-col cols="12" sm="6"><DetailField label="Position"                :value="profile.position?.nameEn"/></v-col>
                  <v-col cols="12" sm="6"><DetailField label="Hire Date"               :value="fmt(profile.hireDate)"/></v-col>
                  <v-col cols="12" sm="6"><DetailField label="Permanent Appointment"   :value="fmt(profile.dateOfPermanentAppointment)"/></v-col>
                  <v-col cols="12" sm="6"><DetailField label="Work Experience"         :value="profile.workExperience ? `${profile.workExperience} years` : null"/></v-col>
                  <v-col cols="12" sm="6"><DetailField :label="t.user.rank"            :value="profile.currentRankAndGrade"/></v-col>
                  <v-col cols="12" sm="6"><DetailField label="Last Promotion"          :value="fmt(profile.dateOfLastPromotion)"/></v-col>
                  <v-col cols="12" sm="6"><DetailField label="Medal Awarded"           :value="profile.medalAwarded"/></v-col>
                </v-row>
              </v-window-item>

              <!-- Family Tab -->
              <v-window-item value="family">
                <div v-for="section in familySections" :key="section.label" class="mb-4">
                  <div class="text-caption font-weight-bold text-primary mb-2">{{ section.label }}</div>
                  <v-row dense>
                    <v-col v-for="f in section.fields" :key="f.label" cols="12" sm="4">
                      <DetailField :label="f.label" :value="f.value"/>
                    </v-col>
                  </v-row>
                  <v-divider class="mt-2"/>
                </div>
              </v-window-item>

              <!-- Balances Tab -->
              <v-window-item value="balances">
                <div v-if="loadingBalances" class="text-center py-6">
                  <v-progress-circular indeterminate color="primary" size="32"/>
                </div>
                <div v-else>
                  <div v-for="bal in balances" :key="bal.id" class="mb-3">
                    <div class="d-flex justify-space-between align-center mb-1">
                      <span class="text-caption font-weight-bold">{{ bal.leaveType.nameEn }}</span>
                      <span class="text-caption font-weight-bold"
                        :style="`color:${bal.available < 3 ? '#C0392B' : '#0F7A5A'}`">
                        {{ bal.available }} / {{ bal.allocated }} days
                      </span>
                    </div>
                    <v-progress-linear
                      :model-value="bal.allocated > 0 ? (bal.used/bal.allocated)*100 : 0"
                      height="8" rounded
                      :color="COLORS[bal.leaveType.code] || 'primary'"
                      bg-color="grey-lighten-3"/>
                    <div class="d-flex ga-3 mt-1 text-caption text-medium-emphasis">
                      <span>Used: {{ bal.used }}</span>
                      <span>Pending: {{ bal.pending }}</span>
                      <span>Available: {{ bal.available }}</span>
                    </div>
                  </div>
                  <div v-if="!balances.length" class="text-center py-6 text-medium-emphasis">
                    No balances allocated yet
                  </div>
                </div>
              </v-window-item>
            </v-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- CHANGE PASSWORD DIALOG -->
    <v-dialog v-model="pwDialog" max-width="440">
      <v-card rounded="xl" class="pa-2">
        <v-card-title class="pa-5 pb-2 font-weight-bold">
          {{ t.user.changePassword }}
          <div class="text-caption text-medium-emphasis font-weight-regular" style="font-family:'Kantumruy Pro',sans-serif">
            ប្ដូរពាក្យសម្ងាត់
          </div>
        </v-card-title>
        <v-card-text class="pa-5">
          <v-alert type="info" density="compact" variant="tonal" rounded="lg" class="mb-4">
            After changing password, you will be logged out and need to login again.
          </v-alert>
          <v-form ref="pwFormRef" v-model="pwValid">
            <v-text-field
              v-model="pwForm.currentPassword"
              label="Current Password — ពាក្យសម្ងាត់បច្ចុប្បន្ន *"
              :type="showPw.current ? 'text' : 'password'"
              prepend-inner-icon="mdi-lock-outline"
              :append-inner-icon="showPw.current ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPw.current = !showPw.current"
              :rules="[v => !!v || 'Required']"
              class="mb-3"/>
            <v-text-field
              v-model="pwForm.newPassword"
              label="New Password — ពាក្យសម្ងាត់ថ្មី *"
              :type="showPw.new ? 'text' : 'password'"
              prepend-inner-icon="mdi-lock-reset"
              :append-inner-icon="showPw.new ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPw.new = !showPw.new"
              :rules="[v => v?.length >= 8 || 'Min 8 characters', v => v !== pwForm.currentPassword || 'Must be different from current']"
              class="mb-3"/>
            <v-text-field
              v-model="pwForm.confirmPassword"
              label="Confirm New Password — បញ្ជាក់ *"
              :type="showPw.confirm ? 'text' : 'password'"
              prepend-inner-icon="mdi-lock-check"
              :append-inner-icon="showPw.confirm ? 'mdi-eye-off' : 'mdi-eye'"
              @click:append-inner="showPw.confirm = !showPw.confirm"
              :rules="[v => v === pwForm.newPassword || 'Passwords do not match']"/>

            <!-- Password strength indicator -->
            <div class="mt-3">
              <div class="text-caption text-medium-emphasis mb-1">Password Strength</div>
              <v-progress-linear :model-value="pwStrength.score * 25" :color="pwStrength.color" height="6" rounded/>
              <div class="text-caption mt-1" :style="`color:${pwStrength.color}`">{{ pwStrength.label }}</div>
            </div>
          </v-form>
        </v-card-text>
        <v-card-actions class="pa-5 pt-0 ga-2">
          <v-btn variant="outlined" @click="pwDialog = false" :disabled="saving">Cancel</v-btn>
          <v-spacer/>
          <v-btn color="primary" @click="doChangePassword" :loading="saving"
            :disabled="!pwValid || pwForm.newPassword !== pwForm.confirmPassword">
            Change Password
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- AVATAR DIALOG -->
    <v-dialog v-model="avatarDialog" max-width="380">
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="pa-4 pb-2 font-weight-bold">Update Profile Photo</v-card-title>
        <v-card-text class="pa-4">
          <div class="text-center mb-4">
            <v-avatar size="80">
              <v-img v-if="avatarPreview" :src="avatarPreview" cover/>
              <v-img v-else-if="profile.photo || profile.avatarUrl"
                :src="apiBase + (profile.photo || profile.avatarUrl)" cover/>
              <span v-else class="text-h5 text-primary font-weight-bold">{{ initials }}</span>
            </v-avatar>
          </div>
          <v-file-input v-model="avatarFile" label="Choose photo"
            accept="image/jpeg,image/png,image/webp" prepend-icon="mdi-camera"
            show-size @update:model-value="previewAvatar"/>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0 ga-2">
          <v-btn variant="outlined" @click="avatarDialog = false">Cancel</v-btn>
          <v-spacer/>
          <v-btn color="primary" @click="uploadAvatar" :loading="saving" :disabled="!avatarFile?.length">
            Upload
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" rounded="lg">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h } from 'vue'
import { format } from 'date-fns'
import { useRouter } from 'vue-router'
import api from '@/plugins/axios'
import { useAuthStore } from '@/stores/auth.store'
import { useI18n } from '@/i18n'
import { API } from '@/config/api'

const auth    = useAuthStore()
const router  = useRouter()
const { t }   = useI18n()
const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const loading         = ref(false)
const loadingBalances = ref(false)
const saving          = ref(false)
const tab             = ref('personal')
const profile         = ref<any>(null)
const balances        = ref<any[]>([])
const pwDialog        = ref(false)
const avatarDialog    = ref(false)
const pwValid         = ref(false)
const pwFormRef       = ref()
const avatarFile      = ref<any[]>([])
const avatarPreview   = ref('')
const snack           = ref({ show: false, text: '', color: 'success' })

const showPw  = ref({ current: false, new: false, confirm: false })
const pwForm  = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })

const COLORS: Record<string,string> = {
  ANNUAL:'#0369A1', SICK:'#C0392B', MATERNITY:'#db2777', PATERNITY:'#7c3aed',
  SPECIAL:'#C9A227', STUDY:'#0F7A5A', MISSION:'#0891b2', UNPAID:'#64748b',
}

const initials = computed(() =>
  `${profile.value?.firstName?.[0] || ''}${profile.value?.lastName?.[0] || ''}`
)

// Password strength
const pwStrength = computed(() => {
  const pw = pwForm.value.newPassword
  if (!pw) return { score: 0, color: 'grey', label: '' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const labels = ['Too Short', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
  const colors = ['error', 'error', 'warning', 'info', 'success', 'success']
  return { score, color: colors[score] || 'grey', label: labels[score] || '' }
})

const familySections = computed(() => {
  const p = profile.value
  if (!p) return []
  return [
    {
      label: '💍 Spouse — ប្ដីឬប្រពន្ធ',
      fields: [
        { label: 'Name', value: p.nameOfSpouse },
        { label: 'Occupation', value: p.occupationOfSpouse },
        { label: 'Children', value: p.numberOfChildren?.toString() },
      ],
    },
    {
      label: '👨 Father — ឪពុក',
      fields: [
        { label: 'Name', value: p.fathersName },
        { label: 'Place of Birth', value: p.dopOfFathers },
        { label: 'Occupation', value: p.fathersOccupation },
      ],
    },
    {
      label: '👩 Mother — ម្ដាយ',
      fields: [
        { label: 'Name', value: p.mothersName },
        { label: 'Place of Birth', value: p.dopOfMothers },
        { label: 'Occupation', value: p.mothersOccupation },
      ],
    },
    {
      label: '👨 Father-in-Law — ឪពុកក្មេក',
      fields: [
        { label: 'Name', value: p.fathersInLawName },
        { label: 'Place of Birth', value: p.dopOfFathersInLaw },
        { label: 'Occupation', value: p.fathersInLawOccupation },
      ],
    },
    {
      label: '👩 Mother-in-Law — ម្ដាយក្មេក',
      fields: [
        { label: 'Name', value: p.mothersInLawName },
        { label: 'Place of Birth', value: p.dopOfMothersInLaw },
        { label: 'Occupation', value: p.mothersInLawOccupation },
      ],
    },
  ]
})

// ── Mini components ────────────────────────────────────────────
const InfoRow = defineComponent({
  props: { icon: String, label: String, value: String },
  setup(p) {
    return () => p.value ? h('div', {
      style: 'display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #f1f5f9'
    }, [
      h('v-icon', { size: 14, color: 'primary' }, () => p.icon),
      h('div', {}, [
        h('div', { style: 'font-size:10px;color:#94a3b8' }, p.label),
        h('div', { style: 'font-size:12px;font-weight:600;color:#1e293b' }, p.value),
      ]),
    ]) : null
  },
})

const DetailField = defineComponent({
  props: { label: String, value: String },
  setup(p) {
    return () => h('div', {
      class: 'pa-3 rounded-lg mb-2',
      style: 'background:#f8f9fc'
    }, [
      h('div', { style: 'font-size:10px;color:#94a3b8;margin-bottom:2px' }, p.label),
      h('div', { style: 'font-size:13px;font-weight:600;color:#1e293b' },
        p.value || h('span', { style: 'color:#cbd5e1;font-weight:400' }, '—')),
    ])
  },
})

const fmt = (d?: string) => d ? format(new Date(d), 'MMM d, yyyy') : null

async function load() {
  loading.value = true
  try {
    const res: any = await api.get(API.AUTH.ME)
    profile.value  = res.data || res
    await loadBalances()
  } finally { loading.value = false }
}

async function loadBalances() {
  loadingBalances.value = true
  try {
    const res: any = await api.get(API.BALANCES.MY)
    balances.value = res.data || res || []
  } finally { loadingBalances.value = false }
}

async function doChangePassword() {
  saving.value = true
  try {
    await api.post('/auth/change-password', {
      currentPassword: pwForm.value.currentPassword,
      newPassword:     pwForm.value.newPassword,
    })
    pwDialog.value = false
    snack.value = { show: true, text: 'Password changed! Please login again.', color: 'success' }
    setTimeout(() => { auth.logout(); router.push('/login') }, 1500)
  } catch (e: any) {
    snack.value = { show: true, text: e?.message || 'Failed to change password', color: 'error' }
  } finally { saving.value = false }
}

function previewAvatar(files: any) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return
  const reader = new FileReader()
  reader.onload = e => { avatarPreview.value = e.target?.result as string }
  reader.readAsDataURL(file)
}

async function uploadAvatar() {
  if (!avatarFile.value?.length || !profile.value) return
  saving.value = true
  try {
    const file = Array.isArray(avatarFile.value) ? avatarFile.value[0] : avatarFile.value
    const fd   = new FormData()
    fd.append('file', file as File)
    await api.post(API.USERS.AVATAR(profile.value.id), fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    avatarDialog.value = false
    snack.value = { show: true, text: 'Photo updated!', color: 'success' }
    await load()
  } catch (e: any) {
    snack.value = { show: true, text: e?.message || 'Upload failed', color: 'error' }
  } finally { saving.value = false }
}

onMounted(load)
</script>
