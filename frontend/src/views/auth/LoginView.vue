<template>
  <v-app>
    <v-main class="auth-background">
      <v-container class="fill-height" fluid>
        <v-row justify="center" align="center">
          <v-col cols="12" sm="8" md="5" lg="4" xl="3">
            <div class="text-center mb-6 animate-fade-in">
              <v-avatar size="84" color="white" class="mb-4 brand-avatar">
                <v-icon size="44" color="indigo-darken-3"
                  >mdi-bank-outline</v-icon
                >
              </v-avatar>
              <h1
                class="text-h4 font-weight-black text-white tracking-wider mb-1"
              >
                GLMS
              </h1>
              <p
                class="text-body-2 font-weight-medium text-blue-lighten-4 opacity-90"
              >
                Government Leave Management System
              </p>
              <p class="font-khmer sub-brand-title mt-1">
                ប្រព័ន្ធគ្រប់គ្រងច្បាប់ឈប់សម្រាក — អង្គភាពប្រឆាំងអំពើពុករលួយ
              </p>
            </div>

            <v-card rounded="xl" elevation="24" class="auth-card pa-2">
              <v-card-text class="pa-6">
                <h2 class="text-h5 font-weight-bold mb-1 text-grey-darken-4">
                  Sign In
                </h2>
                <p class="text-body-2 text-grey-darken-1 font-khmer mb-6">
                  សូមបំពេញព័ត៌មានខាងក្រោមដើម្បីចូលប្រើប្រាស់ប្រព័ន្ធ
                </p>

                <v-alert
                  v-if="sessionExpired && !error"
                  type="warning"
                  density="comfortable"
                  rounded="lg"
                  class="mb-5 text-body-2 font-khmer"
                  variant="tonal"
                  prepend-icon="mdi-clock-alert-outline"
                >
                  <strong>Session expired</strong> — សូមចូលប្រព័ន្ធម្ដងទៀត
                </v-alert>

                <v-alert
                  v-if="error"
                  type="error"
                  density="comfortable"
                  rounded="lg"
                  class="mb-5 text-body-2 font-khmer"
                  variant="tonal"
                  prepend-icon="mdi-alert-circle-outline"
                >
                  {{ error }}
                </v-alert>

                <v-form
                  ref="formRef"
                  v-model="isValid"
                  @submit.prevent="handleLogin"
                >
                  <div class="mb-5">
                    <label class="form-label text-grey-darken-2"
                      >ជម្រើសនៃការចូលប្រព័ន្ធ / Login Method</label
                    >
                    <v-btn-toggle
                      v-model="loginType"
                      mandatory
                      density="comfortable"
                      rounded="lg"
                      color="green-darken-1"
                      variant="outlined"
                      block
                      class="custom-toggle"
                    >
                      <v-btn
                        value="employeeId"
                        class="w-50 text-capitalize font-weight-medium"
                      >
                        <div
                          class="d-flex align-center justify-space-between w-100 px-1"
                        >
                          <div class="d-flex align-center">
                            <v-icon start size="16" class="mr-1"
                              >mdi-badge-account-outline</v-icon
                            >
                            <span>អត្ថលេខមន្ត្រី</span>
                          </div>
                          <v-icon
                            v-if="loginType === 'employeeId'"
                            color="green-darken-1"
                            size="16"
                            class="ml-1"
                          >
                            mdi-check-bold
                          </v-icon>
                        </div>
                      </v-btn>

                      <v-btn
                        value="signatureOfApplicant"
                        class="w-50 text-capitalize font-weight-medium"
                      >
                        <div
                          class="d-flex align-center justify-space-between w-100 px-1"
                        >
                          <div class="d-flex align-center">
                            <v-icon start size="16" class="mr-1"
                              >mdi-draw-pen</v-icon
                            >
                            <span>អត្ថលេខ អ.ប.ព.</span>
                          </div>
                          <v-icon
                            v-if="loginType === 'signatureOfApplicant'"
                            color="green-darken-1"
                            size="16"
                            class="ml-1"
                          >
                            mdi-check-bold
                          </v-icon>
                        </div>
                      </v-btn>
                    </v-btn-toggle>
                  </div>

                  <div class="mb-4">
                    <label class="form-label font-khmer"
                      >{{ identifierLabel }}
                      <span class="text-error">*</span></label
                    >
                    <v-text-field
                      v-model="form.identifier"
                      variant="outlined"
                      density="comfortable"
                      :placeholder="identifierPlaceholder"
                      :prepend-inner-icon="identifierIcon"
                      :hint="identifierHint"
                      persistent-hint
                      autofocus
                      clearable
                      :rules="[(v) => !!v || 'Required — ត្រូវការបញ្ចូល']"
                      class="custom-input"
                    />
                  </div>

                  <div class="mb-6">
                    <label class="form-label font-khmer"
                      >Password / ពាក្យសម្ងាត់
                      <span class="text-error">*</span></label
                    >
                    <v-text-field
                      v-model="form.password"
                      variant="outlined"
                      density="comfortable"
                      placeholder="••••••••"
                      prepend-inner-icon="mdi-lock-outline"
                      :append-inner-icon="showPw ? 'mdi-eye-off' : 'mdi-eye'"
                      :type="showPw ? 'text' : 'password'"
                      @click:append-inner="showPw = !showPw"
                      :rules="[(v) => !!v || 'Required — ត្រូវការបញ្ចូល']"
                      class="custom-input"
                    />
                  </div>

                  <v-btn
                    type="submit"
                    color="indigo-darken-3"
                    variant="flat"
                    block
                    size="large"
                    rounded="lg"
                    :loading="loading"
                    :disabled="!isValid"
                    class="font-weight-bold font-khmer py-3 text-white submit-btn"
                    prepend-icon="mdi-login"
                  >
                    ចូលប្រើប្រាស់ប្រព័ន្ធ — Sign In
                  </v-btn>
                </v-form>
              </v-card-text>

              <v-card-text class="pa-4 pt-0 text-center">
                <div
                  class="text-caption text-grey-darken-1 d-flex align-center justify-center ga-1 opacity-75"
                >
                  <v-icon size="14" color="success">mdi-shield-check</v-icon>
                  <span>អង្គភាពប្រឆាំងអំពើពុករលួយ · © 2026 GLMS</span>
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
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth.store";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const sessionExpired = route.query.reason === "session_expired";
const loading = ref(false);
const error = ref("");
const showPw = ref(false);
const isValid = ref(false);
const formRef = ref();

const loginType = ref<"employeeId" | "signatureOfApplicant">("employeeId");

const form = ref({
  identifier: "",
  password: "",
});

// Dynamic Configuration
const identifierLabel = computed(() =>
  loginType.value === "employeeId"
    ? "លេខអត្តលេខ / Employee ID"
    : "អត្ថលេខគណនី / Signature ID",
);

const identifierPlaceholder = computed(() =>
  loginType.value === "employeeId" ? "e.g. EMP-001" : "e.g. SIG-2026-001",
);

const identifierIcon = computed(() =>
  loginType.value === "employeeId"
    ? "mdi-badge-account-outline"
    : "mdi-draw-pen",
);

const identifierHint = computed(() =>
  loginType.value === "employeeId"
    ? "បញ្ចូលអត្តលេខមន្ត្រីដែលផ្តល់ដោយផ្នែកធនធានមនុស្ស (HR)"
    : "បញ្ចូលលេខសម្គាល់ហត្ថលេខាឌីជីថលរបស់អ្នកក្នុងប្រព័ន្ធ",
);

function clearIdentifier() {
  form.value.identifier = "";
  error.value = "";
}

watch(loginType, clearIdentifier);

async function handleLogin() {
  if (!isValid.value) return;
  loading.value = true;
  error.value = "";
  try {
    await auth.login(
      form.value.identifier.trim(),
      form.value.password,
      loginType.value,
    );
    router.push("/dashboard");
  } catch (e: any) {
    error.value =
      e?.message?.message ||
      e?.message ||
      "ឈ្មោះអ្នកប្រើប្រាស់ ឬ ពាក្យសម្ងាត់មិនត្រឹមត្រូវឡើយ។";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
/* ហ្វុងខ្មែរផ្លូវការ */
.font-khmer,
:deep(.v-btn),
:deep(input),
:deep(.v-alert) {
  font-family: "Kantumruy Pro", sans-serif !important;
}

/* Background បែបទំនើបហ្មត់ចត់ */
.auth-background {
  background: radial-gradient(
    circle at top right,
    #1e3a8a 0%,
    #0f172a 100%
  ) !important;
}

/* អក្សររៀបរាប់ស្ថាប័នខាងលើ */
.sub-brand-title {
  color: rgba(255, 255, 255, 0.65);
  font-size: 13px;
  letter-spacing: 0.3px;
}

/* Logo Shadow Effect */
.brand-avatar {
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.3),
    0 8px 10px -6px rgba(0, 0, 0, 0.3) !important;
}

/* ទម្រង់ Card បញ្ចូលទិន្នន័យ */
.auth-card {
  background-color: rgba(255, 255, 255, 0.98) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* រចនា HTML Label */
.form-label {
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
  letter-spacing: 0.1px;
}

/* កែសម្រួលប្រអប់ Input របស់ Vuetify ឱ្យទន់ភ្លន់កម្រិត Premium */
.custom-input :deep(.v-field) {
  border-radius: 12px !important;
  background-color: #f9fafb !important;
  transition: all 0.2s ease-in-out;
}
.custom-input :deep(.v-field__border) {
  border-color: #e5e7eb !important;
}
.custom-input :deep(.v-field--focused) {
  background-color: #ffffff !important;
  box-shadow: 0 0 0 4px rgba(63, 131, 248, 0.15) !important;
}

/* កែសម្រួលទម្រង់ Toggle Button */
.custom-toggle {
  border-color: #e5e7eb !important;
  background-color: #f3f4f6;
  padding: 2px;
  height: auto !important;
}
.custom-toggle :deep(.v-btn) {
  border: none !important;
  border-radius: 8px !important;
  font-size: 0.8rem !important;
}
.custom-toggle :deep(.v-btn--active) {
  background-color: #ffffff !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
}

/* ប៊ូតុង Submit */
.submit-btn {
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
  height: 48px !important;
}
.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 10px 15px -3px rgba(30, 58, 138, 0.3) !important;
}

/* គម្លាតអក្សរ Hint ខាងក្រោម */
:deep(.v-messages) {
  font-size: 0.74rem;
  padding-top: 4px;
  color: #6b7280 !important;
}

/* ចលនាពេលបើកទំព័រដំបូង */
.animate-fade-in {
  animation: fadeIn 0.6s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
