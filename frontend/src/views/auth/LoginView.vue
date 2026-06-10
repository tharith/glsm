<template>
  <v-app>
    <v-main style="background:linear-gradient(135deg,#1A2744 0%,#2D4080 60%,#1e4db7 100%)">
      <v-container class="fill-height" fluid>
        <v-row justify="center" align="center" class="fill-height">
          <v-col cols="12" sm="8" md="5" lg="4">

            <!-- Logo -->
            <div class="text-center mb-8">
              <v-avatar size="80" color="white" class="mb-4 elevation-8">
                <v-icon size="44" color="primary">mdi-bank-outline</v-icon>
              </v-avatar>
              <h1 class="text-h5 font-weight-bold text-white">GLMS</h1>
              <p class="text-body-2 mt-1" style="color:rgba(255,255,255,0.75)">
                Government Leave Management System
              </p>
              <p class="mt-1" style="font-family:'Kantumruy Pro',sans-serif;color:rgba(255,255,255,0.55);font-size:13px">
                ប្រព័ន្ធគ្រប់គ្រងច្បាប់ — អង្គភាពប្រឆាំងអំពើពុករលួយ
              </p>
            </div>

            <!-- Card -->
            <v-card rounded="xl" elevation="12" class="pa-2">
              <v-card-text class="pa-6">
                <h2 class="text-h6 font-weight-bold mb-1">Sign In — ចូលប្រព័ន្ធ</h2>
                <p class="text-caption text-medium-emphasis mb-6"
                  style="font-family:'Kantumruy Pro',sans-serif">
                  វាយបញ្ចូលអត្តលេខ ឬ អត្ថលេខ
                </p>

                <!-- Error Alert -->
                <!-- Session expired alert -->
                <v-alert v-if="sessionExpired && !error" type="warning"
                  density="compact" rounded="lg" class="mb-4" variant="tonal"
                  prepend-icon="mdi-clock-alert-outline">
                  <strong>Session expired</strong> — សូមចូលប្រព័ន្ធម្ដងទៀត
                </v-alert>

                <v-alert v-if="error" type="error" density="compact"
                  rounded="lg" class="mb-4" variant="tonal">
                  {{ error }}
                </v-alert>

                <v-form ref="formRef" v-model="isValid" @submit.prevent="handleLogin">

                  <!-- Identifier input -->
                  <v-text-field
                    v-model="form.identifier"
                    :label="identifierLabel"
                    :placeholder="identifierPlaceholder"
                    :prepend-inner-icon="identifierIcon"
                    :hint="identifierHint"
                    persistent-hint
                    class="mb-3"
                    autofocus
                    clearable
                    :rules="[v => !!v || 'Required — ត្រូវការ']"
                  />

                  <!-- Password -->
                  <v-text-field
                    v-model="form.password"
                    label="Password / ពាក្យសម្ងាត់"
                    :type="showPw ? 'text' : 'password'"
                    prepend-inner-icon="mdi-lock-outline"
                    :append-inner-icon="showPw ? 'mdi-eye-off' : 'mdi-eye'"
                    @click:append-inner="showPw = !showPw"
                    class="mb-2"
                    :rules="[v => !!v || 'Required — ត្រូវការ']"
                  />

                  <!-- Login type toggle -->
                  <div class="d-flex align-center justify-end mb-5">
                    <span class="text-caption text-medium-emphasis mr-2">Login with:</span>
                    <v-btn-toggle v-model="loginType" mandatory density="compact"
                      rounded="lg" color="primary" variant="outlined">
                      <v-btn value="employeeId" size="small">
                        <v-icon start size="14">mdi-badge-account</v-icon>
                        Employee ID
                      </v-btn>
                      <v-btn value="signatureOfApplicant" size="small">
                        <v-icon start size="14">mdi-draw-pen</v-icon>
                        Signature ID
                      </v-btn>
                    </v-btn-toggle>
                  </div>

                  <!-- Submit -->
                  <v-btn
                    type="submit"
                    color="primary" block size="large"
                    rounded="lg" :loading="loading"
                    :disabled="!isValid"
                    elevation="0"
                    prepend-icon="mdi-login">
                    Sign In — ចូលប្រព័ន្ធ
                  </v-btn>
                </v-form>
              </v-card-text>

              <!-- Footer -->
              <v-card-text class="pa-4 pt-0 text-center">
                <div class="text-caption text-medium-emphasis">
                  <v-icon size="12" class="mr-1">mdi-shield-lock</v-icon>
                  Secured with JWT · {{ new Date().getFullYear() }}
                </div>
              </v-card-text>
            </v-card>

          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'

const auth    = useAuthStore()
const route   = useRoute()
const sessionExpired = route.query.reason === 'session_expired'
const router  = useRouter()
const loading = ref(false)
const error   = ref('')
const showPw  = ref(false)
const isValid = ref(false)
const formRef = ref()

// Login type: employeeId | signatureOfApplicant
const loginType = ref<'employeeId' | 'signatureOfApplicant'>('employeeId')

const form = ref({
  identifier: '',
  password:   '',
})

// Dynamic label/placeholder/hint based on login type
const identifierLabel = computed(() =>
  loginType.value === 'employeeId'
    ? 'Employee ID / លេខអត្តលេខ'
    : 'Signature ID / អត្ថលេខ'
)

const identifierPlaceholder = computed(() =>
  loginType.value === 'employeeId' ? 'e.g. EMP-001' : 'e.g. SIG-2025-001'
)

const identifierIcon = computed(() =>
  loginType.value === 'employeeId' ? 'mdi-badge-account-outline' : 'mdi-draw-pen'
)

const identifierHint = computed(() =>
  loginType.value === 'employeeId'
    ? 'ប្រើ Employee ID ដែលបានផ្តល់ដោយ HR'
    : 'ប្រើ Signature ID (អត្ថលេខ) ដែលមានក្នុងប្រព័ន្ធ'
)

// Clear identifier when switching type
function clearIdentifier() {
  form.value.identifier = ''
  error.value = ''
}

// Watch loginType manually
import { watch } from 'vue'
watch(loginType, clearIdentifier)

async function handleLogin() {
  loading.value = true
  error.value   = ''
  try {
    await auth.login(form.value.identifier.trim(), form.value.password)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e?.message?.message || e?.message || 'Login failed — ចូលប្រព័ន្ធបានបរាជ័យ'
  } finally {
    loading.value = false
  }
}
</script>
