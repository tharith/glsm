<template>
  <div>
    <div class="mb-6">
      <h2 class="text-h6 font-weight-bold">Organization Structure</h2>
      <p
        class="text-caption text-medium-emphasis"
        style="font-family: &quot;Kantumruy Pro&quot;, sans-serif"
      >
        រចនាសម្ព័ន្ធស្ថាប័ន
      </p>
    </div>

    <v-tabs v-model="tab" class="mb-4">
      <v-tab value="tree">🌳 Tree View</v-tab>
      <v-tab value="list">📋 List / CRUD</v-tab>
    </v-tabs>

    <!-- TREE TAB -->
    <v-window v-model="tab">
      <v-window-item value="tree">
        <v-card rounded="xl" elevation="1" class="pa-6">
          <div v-if="treeLoading" class="text-center py-12">
            <v-progress-circular indeterminate color="primary" />
          </div>
          <div v-else>
            <OrgNode
              v-for="node in tree"
              :key="node.id"
              :node="node"
              :depth="0"
              @edit="openEdit"
            />
          </div>
        </v-card>
      </v-window-item>

      <!-- LIST/CRUD TAB -->
      <v-window-item value="list">
        <CrudTable
          title="Organization Units"
          titleKh="អង្គភាពទាំងអស់"
          :headers="headers"
          :items="orgUnits"
          :loading="loading"
          search-placeholder="Search by name or code..."
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
            <v-select
              v-model="filterType"
              :items="typeOptions"
              label="Type"
              density="compact"
              hide-details
              clearable
              style="min-width: 180px"
              @update:model-value="load"
            />
          </template>
          <template #item.type="{ item }">
            <v-chip
              :color="typeColor(item.type)"
              size="x-small"
              variant="tonal"
              >{{ item.type.replace("_", " ") }}</v-chip
            >
          </template>
          <template #item.parent="{ item }">
            <span class="text-caption">{{ item.parent?.nameEn || "—" }}</span>
          </template>
          <template #item._count="{ item }">
            <v-chip size="x-small" color="primary" variant="tonal" class="mr-1">
              <v-icon start size="10">mdi-account-group</v-icon
              >{{ item._count?.users || 0 }}
            </v-chip>
            <v-chip size="x-small" color="info" variant="tonal">
              <v-icon start size="10">mdi-sitemap</v-icon
              >{{ item._count?.children || 0 }}
            </v-chip>
          </template>
        </CrudTable>
      </v-window-item>
    </v-window>

    <!-- CREATE / EDIT DIALOG -->
    <template>
      <FormDialog
        v-model="dialog"
        :title="editItem ? 'Edit Org Unit' : 'Create Org Unit'"
        :titleKh="editItem ? 'កែប្រែអង្គភាព' : 'បង្កើតអង្គភាពថ្មី'"
        :loading="saving"
        :valid="isValid"
        @submit="save"
      >
        <v-form ref="formRef" v-model="isValid">
          <v-row dense class="pt-2">
            <v-col cols="12" sm="6" class="pb-2">
              <label class="form-label"
                >Code <span class="text-error">*</span></label
              >
              <v-text-field
                v-model="form.code"
                variant="outlined"
                density="comfortable"
                :rules="[(r) => !!r || 'Required']"
                hint="e.g. MOI-DEPT-IT"
                persistent-hint
                :disabled="!!editItem"
                color="primary"
                class="custom-input"
                placeholder="Input here..."
              />
            </v-col>

            <v-col cols="12" sm="6" class="pb-2">
              <label class="form-label"
                >Type <span class="text-error">*</span></label
              >
              <v-select
                v-model="form.type"
                variant="outlined"
                density="comfortable"
                :items="typeItems"
                :rules="[(r) => !!r || 'Required']"
                color="primary"
                class="custom-input"
              />
            </v-col>

            <v-col cols="12" class="pb-2">
              <label class="form-label font-khmer"
                >ឈ្មោះ (ភាសាខ្មែរ) <span class="text-error">*</span></label
              >
              <v-text-field
                v-model="form.nameKh"
                variant="outlined"
                density="comfortable"
                :rules="[(r) => !!r || 'Required']"
                color="primary"
                class="font-khmer custom-input"
              />
            </v-col>

            <v-col cols="12" class="pb-2">
              <label class="form-label"
                >Name (English) <span class="text-error">*</span></label
              >
              <v-text-field
                v-model="form.nameEn"
                variant="outlined"
                density="comfortable"
                :rules="[(r) => !!r || 'Required']"
                color="primary"
                class="custom-input"
              />
            </v-col>

            <v-col cols="12" class="pb-2">
              <label class="form-label">Parent Unit</label>
              <v-autocomplete
                v-model="form.parentId"
                variant="outlined"
                density="comfortable"
                :items="parentOptions"
                item-title="nameEn"
                item-value="id"
                clearable
                chips
                hint="Leave empty for root level"
                persistent-hint
                color="primary"
                class="custom-input custom-autocomplete"
              >
                <template v-slot:chip="{ props, item }">
                  <v-chip
                    v-bind="props"
                    color="grey-darken-3"
                    variant="flat"
                    class="bg-grey-lighten-3 font-weight-medium rounded-md text-body-2"
                    closable
                  >
                    {{ item.title }}
                  </v-chip>
                </template>

                <template v-slot:item="{ props, item }">
                  <v-list-item
                    v-bind="props"
                    class="py-2 text-grey-darken-3"
                    min-height="40"
                  />
                </template>
              </v-autocomplete>
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
          </v-row>
        </v-form>
      </FormDialog>
    </template>

    <!-- DELETE/RESTORE DIALOG -->
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
import { ref, computed, onMounted, defineComponent, h } from "vue";
import api from "@/plugins/axios";
import CrudTable from "@/components/shared/CrudTable.vue";
import FormDialog from "@/components/shared/FormDialog.vue";
import ConfirmDeleteDialog from "@/components/shared/ConfirmDeleteDialog.vue";

const tab = ref("tree");
const loading = ref(false);
const treeLoading = ref(false);
const saving = ref(false);
const dialog = ref(false);
const confirmDialog = ref(false);
const isValid = ref(false);
const isRestore = ref(false);
const formRef = ref("");
const search = ref("");
const filterType = ref("");
const orgUnits = ref<any[]>([]);
const tree = ref<any[]>([]);
const editItem = ref<any>(null);
const deleteItem = ref<any>(null);
const snack = ref({ show: false, text: "", color: "success" });
const form = ref({
  code: "",
  nameKh: "",
  nameEn: "",
  type: "DEPARTMENT",
  parentId: null as any,
  isActive: true,
});

const TYPE_COLORS: Record<string, string> = {
  INSTITUTION: "deep-purple",
  GENERAL_DEPARTMENT: "primary",
  DEPARTMENT: "info",
  OFFICE: "teal",
};
const typeColor = (t: string) => TYPE_COLORS[t] || "grey";
const typeItems = [
  "INSTITUTION",
  "GENERAL_DEPARTMENT",
  "DEPARTMENT",
  "OFFICE",
].map((v) => ({ title: v.replace("_", " "), value: v }));
const typeOptions = [{ title: "All Types", value: "" }, ...typeItems];

const parentOptions = computed(() => orgUnits.value.filter((u) => u.isActive));

const headers = [
  { title: "Code", key: "code", width: 140 },
  { title: "Name EN", key: "nameEn" },
  { title: "ឈ្មោះ", key: "nameKh" },
  { title: "Type", key: "type", width: 160 },
  { title: "Parent", key: "parent", width: 180 },
  { title: "Staff/Children", key: "_count", width: 140 },
  { title: "Status", key: "isActive", width: 90 },
  { title: "Actions", key: "actions", width: 100, sortable: false },
];

async function load() {
  loading.value = true;
  try {
    const res: any = await api.get("/organization", {
      params: {
        search: search.value || undefined,
        type: filterType.value || undefined,
        includeInactive: true,
      },
    });
    orgUnits.value = res.data || res;
  } finally {
    loading.value = false;
  }
}

async function loadTree() {
  treeLoading.value = true;
  try {
    const res: any = await api.get("/organization/tree");
    tree.value = res.data || res;
  } finally {
    treeLoading.value = false;
  }
}

function openCreate() {
  editItem.value = null;
  form.value = {
    code: "",
    nameKh: "",
    nameEn: "",
    type: "DEPARTMENT",
    parentId: null,
    isActive: true,
  };
  dialog.value = true;
}

function openEdit(item: any) {
  editItem.value = item;
  form.value = {
    code: item.code,
    nameKh: item.nameKh,
    nameEn: item.nameEn,
    type: item.type,
    parentId: item.parentId,
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
    alert(JSON.stringify(form.value));
    if (editItem.value)
      await api.patch(`/organization/${editItem.value.id}`, form.value);
    else await api.post("/organization", form.value);
    dialog.value = false;
    snack.value = {
      show: true,
      text: editItem.value ? "Updated successfully!" : "Created successfully!",
      color: "success",
    };
    await Promise.all([load(), loadTree()]);
  } catch (e: any) {
    snack.value = {
      show: true,
      text: e?.message || "Operation failed",
      color: "error",
    };
  } finally {
    saving.value = false;
  }
}

async function confirmAction() {
  if (!deleteItem.value) return;
  saving.value = true;
  try {
    if (isRestore.value)
      await api.patch(`/organization/${deleteItem.value.id}/restore`);
    else await api.delete(`/organization/${deleteItem.value.id}`);
    confirmDialog.value = false;
    snack.value = {
      show: true,
      text: isRestore.value ? "Restored!" : "Deactivated!",
      color: "success",
    };
    await Promise.all([load(), loadTree()]);
  } catch (e: any) {
    snack.value = { show: true, text: e?.message || "Failed", color: "error" };
  } finally {
    saving.value = false;
  }
}

// ── Recursive Tree Node ───────────────────────────────────────
const OrgNode = defineComponent({
  name: "OrgNode",
  props: { node: Object as any, depth: Number },
  emits: ["edit"],
  setup(props, { emit }) {
    const open = ref((props.depth || 0) < 2);
    return () => {
      const n = props.node;
      const hasChildren = n.children?.length > 0;
      const color = TYPE_COLORS[n.type] || "#64748b";
      const isDark = false; // always use dark text on light background for readability
      return h(
        "div",
        {
          style: `margin-left:${(props.depth || 0) * 20}px; margin-bottom:6px`,
        },
        [
          h(
            "div",
            {
              style: `display:flex; align-items:center; gap:10px; padding:8px 14px; border-radius:10px; cursor:pointer; background:${isDark ? color : "#f8f9fc"}; border:1.5px solid ${isDark ? "transparent" : "#e2e8f0"}`,
              onClick: () => {
                if (hasChildren) open.value = !open.value;
              },
            },
            [
              hasChildren
                ? h(
                    "span",
                    {
                      style: `font-size:11px; color:${isDark ? "#fff" : "#94a3b8"}; transform:rotate(${open.value ? 90 : 0}deg); display:inline-block; transition:transform 0.2s`,
                    },
                    "▶",
                  )
                : h("span", { style: "width:11px" }),
              h("div", { style: "flex:1" }, [
                h(
                  "div",
                  { style: "font-size:12px; font-weight:700; color:#1e293b" },
                  n.nameEn,
                ),
                h(
                  "div",
                  {
                    style:
                      "font-size:10px; color:#64748b; font-family:'Kantumruy Pro',sans-serif",
                  },
                  n.nameKh,
                ),
              ]),
              h(
                "span",
                {
                  style: `font-size:10px; color:${isDark ? "rgba(255,255,255,0.5)" : "#94a3b8"}`,
                },
                `👥 ${n.staffCount || 0}`,
              ),
              h(
                "button",
                {
                  style: `background:rgba(255,255,255,0.15); border:none; border-radius:6px; padding:2px 8px; cursor:pointer; color:${isDark ? "#fff" : "#475569"}; font-size:11px`,
                  onClick: (e: Event) => {
                    e.stopPropagation();
                    emit("edit", n);
                  },
                },
                "✏️ Edit",
              ),
            ],
          ),
          open.value && hasChildren
            ? h(
                "div",
                {},
                n.children.map((c: any) =>
                  h(OrgNode, {
                    node: c,
                    depth: (props.depth || 0) + 1,
                    key: c.id,
                    onEdit: (item: any) => emit("edit", item),
                  }),
                ),
              )
            : null,
        ],
      );
    };
  },
});

onMounted(() => Promise.all([load(), loadTree()]));
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
