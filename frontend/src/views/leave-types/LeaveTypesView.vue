<template>
  <div>
    <div class="mb-6">
      <h2 class="text-h6 font-weight-bold">Leave Type Management</h2>
      <p class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">គ្រប់គ្រងប្រភេទច្បាប់</p>
    </div>

    <!-- Cards Grid (top) -->
    <v-row class="mb-4">
      <v-col v-for="lt in activeTypes" :key="lt.id" cols="12" sm="6" md="3">
        <v-card rounded="xl" elevation="1" class="pa-4">
          <div class="d-flex align-center justify-space-between mb-3">
            <v-avatar :color="COLORS[lt.code]||'grey'" size="44" rounded="lg">
              <v-icon :icon="ICONS[lt.code]||'mdi-calendar'" color="white" size="20"/>
            </v-avatar>
            <div class="d-flex ga-1">
              <v-btn icon size="x-small" variant="text" color="primary" @click="openEdit(lt)">
                <v-icon size="14">mdi-pencil</v-icon>
              </v-btn>
              <v-btn icon size="x-small" variant="text" color="error" @click="openDelete(lt)">
                <v-icon size="14">mdi-delete</v-icon>
              </v-btn>
            </div>
          </div>
          <div class="text-subtitle-2 font-weight-bold">{{ lt.nameEn }}</div>
          <div class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">{{ lt.nameKh }}</div>
          <v-divider class="my-2"/>
          <div class="d-flex flex-wrap ga-1 mt-1">
            <v-chip size="x-small" color="primary" variant="tonal">📅 {{ lt.maxDaysPerYear }}d/yr</v-chip>
            <v-chip size="x-small" :color="lt.isPaid?'success':'warning'" variant="tonal">{{ lt.isPaid?'Paid':'Unpaid' }}</v-chip>
            <v-chip v-if="lt.requiresDoc" size="x-small" color="info" variant="tonal">📎 Doc</v-chip>
            <v-chip v-if="lt.carryOver" size="x-small" color="purple" variant="tonal">↪ Carry</v-chip>
            <v-chip v-if="lt.gender" size="x-small" color="pink" variant="tonal">{{ lt.gender==='F'?'♀ Female':'♂ Male' }}</v-chip>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Table CRUD -->
    <CrudTable
      title="All Leave Types" titleKh="ប្រភេទច្បាប់ទាំងអស់"
      :headers="headers" :items="leaveTypes" :loading="loading"
      :searchable="false"
      @create="openCreate" @edit="openEdit" @delete="openDelete" @restore="openRestore">

      <template #filters>
        <v-switch v-model="showInactive" label="Show Inactive" density="compact"
          hide-details color="primary" @change="load" />
      </template>

      <template #item.code="{ item }">
        <v-chip :color="COLORS[item.code]||'grey'" size="small" variant="tonal">
          <v-icon start size="14">{{ ICONS[item.code]||'mdi-calendar' }}</v-icon>
          {{ item.code }}
        </v-chip>
      </template>
      <template #item.maxDaysPerYear="{ item }">
        <strong>{{ item.maxDaysPerYear }}</strong> days/yr
      </template>
      <template #item.isPaid="{ item }">
        <v-chip :color="item.isPaid?'success':'warning'" size="x-small" variant="tonal">
          {{ item.isPaid ? 'Paid' : 'Unpaid' }}
        </v-chip>
      </template>
      <template #item.requiresDoc="{ item }">
        <v-icon :color="item.requiresDoc?'info':'grey-lighten-2'" size="18">
          {{ item.requiresDoc ? 'mdi-paperclip' : 'mdi-minus' }}
        </v-icon>
      </template>
      <template #item.carryOver="{ item }">
        <span class="text-caption">{{ item.carryOver ? `✅ max ${item.maxCarryOver}d` : '—' }}</span>
      </template>
      <template #item.gender="{ item }">
        <v-chip v-if="item.gender" size="x-small" color="pink" variant="tonal">{{ item.gender==='F'?'Female Only':'Male Only' }}</v-chip>
        <span v-else class="text-caption text-medium-emphasis">All</span>
      </template>
    </CrudTable>

    <!-- CREATE / EDIT DIALOG -->
    <FormDialog v-model="dialog"
      :title="editItem ? 'Edit Leave Type' : 'Create Leave Type'"
      :titleKh="editItem ? 'កែប្រែប្រភេទច្បាប់' : 'បង្កើតប្រភេទច្បាប់ថ្មី'"
      :loading="saving" :valid="isValid" :max-width="640" @submit="save">
      <v-form ref="formRef" v-model="isValid">
        <v-row dense>
          <v-col cols="6">
            <v-select v-model="form.code" label="Code *" :items="codeOptions"
              :rules="[r => !!r || 'Required']" :disabled="!!editItem"
              hint="Cannot change after creation" persistent-hint />
          </v-col>
          <v-col cols="6">
            <v-text-field v-model.number="form.maxDaysPerYear" label="Max Days / Year *"
              type="number" min="1" max="365" :rules="[r => r>0 || 'Must be > 0']" />
          </v-col>
          <v-col cols="12">
            <v-text-field v-model="form.nameEn" label="Name (English) *" :rules="[r => !!r || 'Required']" />
          </v-col>
          <v-col cols="12">
            <v-text-field v-model="form.nameKh" label="ឈ្មោះ (ភាសាខ្មែរ) *" :rules="[r => !!r || 'Required']" />
          </v-col>
          <v-col cols="6">
            <v-select v-model="form.gender" label="Gender Restriction"
              :items="[{title:'All Genders', value:null},{title:'Female Only (F)', value:'F'},{title:'Male Only (M)', value:'M'}]"
              clearable />
          </v-col>
          <v-col cols="6">
            <v-text-field v-model.number="form.maxCarryOver" label="Max Carry-Over Days"
              type="number" min="0" hint="0 = no carry-over" persistent-hint />
          </v-col>
          <v-col cols="12">
            <v-row dense>
              <v-col cols="6"><v-switch v-model="form.isPaid"      label="Paid Leave"          color="success" hide-details /></v-col>
              <v-col cols="6"><v-switch v-model="form.requiresDoc" label="Requires Document"   color="info"    hide-details /></v-col>
              <v-col cols="6"><v-switch v-model="form.carryOver"   label="Allow Carry-Over"    color="purple"  hide-details /></v-col>
              <v-col cols="6" v-if="editItem">
                <v-switch v-model="form.isActive" label="Active" color="success" hide-details />
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-form>
    </FormDialog>

    <ConfirmDeleteDialog v-model="confirmDialog" :item-name="deleteItem?.nameEn"
      :is-restore="isRestore" :loading="saving" @confirm="confirmAction" />

    <v-snackbar v-model="snack.show" :color="snack.color" rounded="lg">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/plugins/axios'
import CrudTable from '@/components/shared/CrudTable.vue'
import FormDialog from '@/components/shared/FormDialog.vue'
import ConfirmDeleteDialog from '@/components/shared/ConfirmDeleteDialog.vue'

const loading = ref(false), saving = ref(false)
const dialog = ref(false), confirmDialog = ref(false)
const isValid = ref(false), isRestore = ref(false)
const showInactive = ref(false), formRef = ref()
const leaveTypes = ref<any[]>([])
const editItem = ref<any>(null), deleteItem = ref<any>(null)
const snack = ref({ show: false, text: '', color: 'success' })

const COLORS: Record<string,string> = { ANNUAL:'#0369A1',SICK:'#C0392B',MATERNITY:'#db2777',PATERNITY:'#7c3aed',SPECIAL:'#C9A227',STUDY:'#0F7A5A',MISSION:'#0891b2',UNPAID:'#64748b' }
const ICONS:  Record<string,string> = { ANNUAL:'mdi-umbrella-beach',SICK:'mdi-hospital-box',MATERNITY:'mdi-baby-carriage',PATERNITY:'mdi-human-male-child',SPECIAL:'mdi-star',STUDY:'mdi-book-open',MISSION:'mdi-airplane',UNPAID:'mdi-briefcase-outline' }

const codeOptions = ['ANNUAL','SICK','MATERNITY','PATERNITY','SPECIAL','STUDY','MISSION','UNPAID']
const activeTypes = computed(() => leaveTypes.value.filter(t => t.isActive))

const defaultForm = () => ({ code:'ANNUAL', nameKh:'', nameEn:'', maxDaysPerYear:18, isPaid:true, requiresDoc:false, carryOver:false, maxCarryOver:0, gender:null as any, isActive:true })
const form = ref(defaultForm())

const headers = [
  { title: 'Code',         key: 'code',          width: 140 },
  { title: 'Name EN',      key: 'nameEn'                    },
  { title: 'ឈ្មោះ',       key: 'nameKh'                    },
  { title: 'Max Days',     key: 'maxDaysPerYear', width: 110 },
  { title: 'Paid',         key: 'isPaid',         width: 90  },
  { title: 'Doc Required', key: 'requiresDoc',    width: 120 },
  { title: 'Carry-Over',   key: 'carryOver',      width: 130 },
  { title: 'Gender',       key: 'gender',         width: 110 },
  { title: 'Status',       key: 'isActive',       width: 90  },
  { title: 'Actions',      key: 'actions',        width: 100, sortable: false },
]

async function load() {
  loading.value = true
  try {
    const res: any = await api.get('/leave-types', { params: { includeInactive: showInactive.value } })
    leaveTypes.value = res.data || res
  } finally { loading.value = false }
}

function openCreate() { editItem.value = null; form.value = defaultForm(); dialog.value = true }
function openEdit(item: any) {
  editItem.value = item
  form.value = { code:item.code, nameKh:item.nameKh, nameEn:item.nameEn, maxDaysPerYear:item.maxDaysPerYear, isPaid:item.isPaid, requiresDoc:item.requiresDoc, carryOver:item.carryOver, maxCarryOver:item.maxCarryOver, gender:item.gender, isActive:item.isActive }
  dialog.value = true
}
function openDelete(item: any)  { deleteItem.value = item; isRestore.value = false; confirmDialog.value = true }
function openRestore(item: any) { deleteItem.value = item; isRestore.value = true;  confirmDialog.value = true }

async function save() {
  saving.value = true
  try {
    if (editItem.value) await api.patch(`/leave-types/${editItem.value.id}`, form.value)
    else await api.post('/leave-types', form.value)
    dialog.value = false
    snack.value = { show: true, text: editItem.value ? 'Updated!' : 'Created!', color: 'success' }
    await load()
  } catch (e: any) { snack.value = { show: true, text: e?.message||'Failed', color: 'error' } }
  finally { saving.value = false }
}

async function confirmAction() {
  if (!deleteItem.value) return
  saving.value = true
  try {
    if (isRestore.value) await api.patch(`/leave-types/${deleteItem.value.id}/toggle`, { isActive: true })
    else await api.patch(`/leave-types/${deleteItem.value.id}/toggle`, { isActive: false })
    confirmDialog.value = false
    snack.value = { show: true, text: isRestore.value ? 'Restored!' : 'Deactivated!', color: 'success' }
    await load()
  } catch (e: any) { snack.value = { show: true, text: e?.message||'Failed', color: 'error' } }
  finally { saving.value = false }
}

onMounted(load)
</script>
