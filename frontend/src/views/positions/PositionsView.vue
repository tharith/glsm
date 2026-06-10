<template>
  <div>
    <div class="mb-6">
      <h2 class="text-h6 font-weight-bold">Position Management</h2>
      <p
        class="text-caption text-medium-emphasis"
        style="font-family: &quot;Kantumruy Pro&quot;, sans-serif"
      >
        គ្រប់គ្រងមុខតំណែង
      </p>
    </div>

    <CrudTable
      title="Positions"
      titleKh="មុខតំណែង"
      :headers="headers"
      :items="positions"
      :loading="loading"
      @create="openCreate"
      @edit="openEdit"
      @delete="openDelete"
      @restore="openRestore"
      @search="
        (v) => {
          search = v;
          load();
        }
      "
    >
      <template #filters>
        <v-switch
          v-model="showInactive"
          label="Show Inactive"
          density="compact"
          hide-details
          color="primary"
          @change="load"
        />
      </template>

      <template #item.rank="{ item }">
        <v-chip size="x-small" color="primary" variant="outlined">
          <v-icon start size="10">mdi-medal</v-icon>Rank {{ item.rank }}
        </v-chip>
      </template>
      <template #item._count="{ item }">
        <v-chip size="x-small" color="info" variant="tonal">
          <v-icon start size="10">mdi-account-group</v-icon
          >{{ item._count?.users || 0 }} users
        </v-chip>
      </template>
    </CrudTable>

    <!-- CREATE / EDIT DIALOG -->
    <FormDialog
      v-model="dialog"
      :title="editItem ? 'Edit Position' : 'Create Position'"
      :titleKh="editItem ? 'កែប្រែមុខតំណែង' : 'បង្កើតមុខតំណែងថ្មី'"
      :loading="saving"
      :valid="isValid"
      @submit="save"
    >
      <v-form ref="formRef" v-model="isValid">
        <v-row dense>
          <v-col cols="6" class="pb-2">
            <label class="form-label"
              >Code <span class="text-error">*</span></label
            >
            <v-text-field
              v-model="form.code"
              variant="outlined"
              density="comfortable"
              :rules="[(r) => !!r || 'Required']"
              hint="e.g. DC, OC, STAFF"
              persistent-hint
              :disabled="!!editItem"
              placeholder="Input here..."
            />
          </v-col>
          <v-col cols="6" class="pb-2">
            <label class="form-label"
              >Rank <span class="text-error">*</span></label
            >
            <v-text-field
              v-model="form.rank"
              type="number"
              min="1"
              max="10"
              :rules="[(r) => !!r || 'Required', (r) => r >= 1 || 'Min 1']"
              hint="1 = highest (Institution Head)"
              persistent-hint
              variant="outlined"
              density="comfortable"
              placeholder="Input here..."
            />
          </v-col>

          <v-col cols="12" class="pb-2">
            <label class="form-label"
              >ឈ្មោះ (ភាសាខ្មែរ) <span class="text-error">*</span></label
            >
            <v-text-field
              v-model="form.nameKh"
              :rules="[(r) => !!r || 'Required']"
              variant="outlined"
              density="comfortable"
              placeholder="Input here..."
            />
          </v-col>

          <v-col cols="12" class="pb-2">
            <label class="form-label"
              >Name (English) <span class="text-error">*</span></label
            >
            <v-text-field
              v-model="form.nameEn"
              :rules="[(r) => !!r || 'Required']"
              variant="outlined"
              density="comfortable"
              placeholder="Input here..."
            />
          </v-col>

          <v-col cols="12" v-if="editItem" class="pt-2">
            <div
              :class="
                form.isActive ? 'status-box-active' : 'status-box-inactive'
              "
              class="status-container"
            >
              <div class="d-flex align-center justify-space-between w-100">
                <div class="d-flex flex-column">
                  <span class="status-title">Status Visibility</span>
                  <span class="status-desc font-khmer">
                    {{
                      form.isActive
                        ? "កំពុងបើកដំណើរការលើប្រព័ន្ធ"
                        : "បានបិទផ្អាកដំណើរការបណ្ដោះអាសន្ន"
                    }}
                  </span>
                </div>
                <v-switch
                  v-model="form.isActive"
                  :color="form.isActive ? 'success' : 'grey'"
                  true-icon="mdi-check"
                  false-icon="mdi-close"
                  hide-details
                  class="action-switch m-0"
                />
              </div>
            </div>
          </v-col>

          <!-- <v-col cols="12" v-if="editItem">
            <v-switch
              v-model="form.isActive"
              label="Active"
              color="success"
              hide-details
            />
          </v-col> -->
        </v-row>
      </v-form>
    </FormDialog>

    <ConfirmDeleteDialog
      v-model="confirmDialog"
      :item-name="deleteItem?.nameEn"
      :is-restore="isRestore"
      :loading="saving"
      @confirm="confirmAction"
    />

    <v-snackbar v-model="snack.show" :color="snack.color" rounded="lg">{{
      snack.text
    }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import api from "@/plugins/axios";
import CrudTable from "@/components/shared/CrudTable.vue";
import FormDialog from "@/components/shared/FormDialog.vue";
import ConfirmDeleteDialog from "@/components/shared/ConfirmDeleteDialog.vue";

const loading = ref(false),
  saving = ref(false),
  dialog = ref(false),
  confirmDialog = ref(false);
const isValid = ref(false),
  isRestore = ref(false),
  showInactive = ref(false);
const formRef = ref(),
  search = ref("");
const positions = ref<any[]>([]);
const editItem = ref<any>(null),
  deleteItem = ref<any>(null);
const snack = ref({ show: false, text: "", color: "success" });
const form = ref({ code: "", nameKh: "", nameEn: "", rank: 5, isActive: true });

const headers = [
  { title: "Code", key: "code", width: 100 },
  { title: "Name EN", key: "nameEn" },
  { title: "ឈ្មោះ", key: "nameKh" },
  { title: "Rank", key: "rank", width: 110 },
  { title: "Users", key: "_count", width: 110 },
  { title: "Status", key: "isActive", width: 90 },
  { title: "Actions", key: "actions", width: 100, sortable: false },
];

async function load() {
  loading.value = true;
  try {
    const res: any = await api.get("/positions", {
      params: {
        search: search.value || undefined,
        includeInactive: showInactive.value,
      },
    });
    positions.value = res.data || res;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editItem.value = null;
  form.value = { code: "", nameKh: "", nameEn: "", rank: 5, isActive: true };
  dialog.value = true;
}
function openEdit(item: any) {
  editItem.value = item;
  form.value = {
    code: item.code,
    nameKh: item.nameKh,
    nameEn: item.nameEn,
    rank: item.rank,
    isActive: item.isActive,
  };
  dialog.value = true;
}
function openDelete(item: any) {
  deleteItem.value = item;
  isRestore.value = false;
  confirmDialog.value = true;
}
function openRestore(item: any) {
  deleteItem.value = item;
  isRestore.value = true;
  confirmDialog.value = true;
}

async function save() {
  saving.value = true;
  try {
    // បង្កើត Object ថ្មីមួយដើម្បីកុំឱ្យប៉ះពាល់ Form ដើមលើ UI
    const payload = { ...form.value };
    if (editItem.value) {
      await api.patch(`/positions/${editItem.value.id}`, payload);
    } else {
      // បើជាការ Add ថ្មី លុប field isActive ចេញមិនបាច់បញ្ជូនទៅ Backend ឡើយ
      delete (payload as any).isActive;
      await api.post("/positions", payload);
    }
    dialog.value = false;
    snack.value = {
      show: true,
      text: editItem.value ? "Updated!" : "Created!",
      color: "success",
    };
    await load();
  } catch (e: any) {
    snack.value = { show: true, text: e?.message || "Failed", color: "error" };
  } finally {
    saving.value = false;
  }
}

async function confirmAction() {
  if (!deleteItem.value) return;
  saving.value = true;
  try {
    if (isRestore.value)
      await api.patch(`/positions/${deleteItem.value.id}/restore`);
    else await api.delete(`/positions/${deleteItem.value.id}`);
    confirmDialog.value = false;
    snack.value = {
      show: true,
      text: isRestore.value ? "Restored!" : "Deactivated!",
      color: "success",
    };
    await load();
  } catch (e: any) {
    snack.value = { show: true, text: e?.message || "Failed", color: "error" };
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>
<style scoped>
/* កំណត់ទម្រង់អក្សរ Label ខាងលើប្រអប់ */
.form-label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #1f2937; /* ពណ៌ Charcoal ទំនើប */
  margin-bottom: 6px;
  letter-spacing: 0.2px;
}

/* ហ្វុងខ្មែរទន់ភ្លន់ */
.font-khmer,
.font-khmer :deep(input) {
  font-family: "Kantumruy Pro", sans-serif !important;
}

/* កែសម្រួលប្រអប់ Input របស់ Vuetify ឱ្យទៅជាទម្រង់ Premium Minimalist */
.custom-input :deep(.v-field) {
  border-radius: 10px !important; /* ជ្រុងកោងស្អាតល្មម */
  background-color: #ffffff !important;
}
.custom-input :deep(.v-field__border) {
  border-color: #e5e7eb !important; /* បន្ទាត់ប្រអប់ស្ដើងស្រាល */
}
.custom-input :deep(.v-field--focused .v-field__border) {
  border-width: 2px !important;
}

/* បង្ហាញពណ៌អក្សរក្នុង Autocomplete ឱ្យដិតច្បាស់ */
.custom-autocomplete :deep(input) {
  color: #111827 !important;
  font-weight: 500;
}

/* រចនាប្រអប់ Status Switch ថ្មីទាំងស្រុង (Modern Card Design) */
.status-container {
  display: flex;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.status-box-active {
  background-color: #f0fdf4; /* ផ្ទៃបៃតងស្រទន់ */
  border-color: #bbf7d0;
}
.status-box-inactive {
  background-color: #f9fafb; /* ផ្ទៃប្រផេះស្រទន់ */
  border-color: #e5e7eb;
}
.status-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
}
.status-desc {
  font-size: 0.78rem;
  color: #6b7280;
  margin-top: 2px;
}

/* កែសម្រួលគម្លាតអក្សរជំនួយ (Hint) ខាងក្រោម */
:deep(.v-messages) {
  font-size: 0.75rem;
  padding-top: 2px;
  color: #9ca3af !important;
}
</style>
