<template>
  <div>
    <div class="mb-6">
      <h2 class="text-h6 font-weight-bold">Position Management</h2>
      <p class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">គ្រប់គ្រងមុខតំណែង</p>
    </div>

    <CrudTable title="Positions" titleKh="មុខតំណែង"
      :headers="headers" :items="positions" :loading="loading"
      @create="openCreate" @edit="openEdit" @delete="openDelete" @restore="openRestore"
      @search="v => { search = v; load() }">

      <template #filters>
        <v-switch v-model="showInactive" label="Show Inactive" density="compact" hide-details color="primary" @change="load" />
      </template>

      <template #item.rank="{ item }">
        <v-chip size="x-small" color="primary" variant="outlined">
          <v-icon start size="10">mdi-medal</v-icon>Rank {{ item.rank }}
        </v-chip>
      </template>
      <template #item._count="{ item }">
        <v-chip size="x-small" color="info" variant="tonal">
          <v-icon start size="10">mdi-account-group</v-icon>{{ item._count?.users || 0 }} users
        </v-chip>
      </template>
    </CrudTable>

    <!-- CREATE / EDIT DIALOG -->
    <FormDialog v-model="dialog" :title="editItem ? 'Edit Position' : 'Create Position'"
      :titleKh="editItem ? 'កែប្រែមុខតំណែង' : 'បង្កើតមុខតំណែងថ្មី'"
      :loading="saving" :valid="isValid" @submit="save">
      <v-form ref="formRef" v-model="isValid">
        <v-row dense>
          <v-col cols="6">
            <v-text-field v-model="form.code" label="Code *" :rules="[r => !!r || 'Required']"
              hint="e.g. DC, OC, STAFF" persistent-hint :disabled="!!editItem" />
          </v-col>
          <v-col cols="6">
            <v-text-field v-model="form.rank" label="Rank *" type="number" min="1" max="10"
              :rules="[r => !!r || 'Required', r => r >= 1 || 'Min 1']"
              hint="1 = highest (Institution Head)" persistent-hint />
          </v-col>
          <v-col cols="12">
            <v-text-field v-model="form.nameEn" label="Name (English) *" :rules="[r => !!r || 'Required']" />
          </v-col>
          <v-col cols="12">
            <v-text-field v-model="form.nameKh" label="ឈ្មោះ (ភាសាខ្មែរ) *" :rules="[r => !!r || 'Required']" />
          </v-col>
          <v-col cols="12" v-if="editItem">
            <v-switch v-model="form.isActive" label="Active" color="success" hide-details />
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
import { ref, onMounted } from 'vue'
import api from '@/plugins/axios'
import CrudTable from '@/components/shared/CrudTable.vue'
import FormDialog from '@/components/shared/FormDialog.vue'
import ConfirmDeleteDialog from '@/components/shared/ConfirmDeleteDialog.vue'

const loading = ref(false), saving = ref(false), dialog = ref(false), confirmDialog = ref(false)
const isValid = ref(false), isRestore = ref(false), showInactive = ref(false)
const formRef = ref(), search = ref('')
const positions = ref<any[]>([])
const editItem = ref<any>(null), deleteItem = ref<any>(null)
const snack = ref({ show: false, text: '', color: 'success' })
const form = ref({ code:'', nameKh:'', nameEn:'', rank: 5, isActive: true })

const headers = [
  { title: 'Code',    key: 'code',    width: 100 },
  { title: 'Name EN', key: 'nameEn'  },
  { title: 'ឈ្មោះ',  key: 'nameKh'  },
  { title: 'Rank',    key: 'rank',    width: 110 },
  { title: 'Users',   key: '_count',  width: 110 },
  { title: 'Status',  key: 'isActive',width: 90  },
  { title: 'Actions', key: 'actions', width: 100, sortable: false },
]

async function load() {
  loading.value = true
  try {
    const res: any = await api.get('/positions', { params: { search: search.value||undefined, includeInactive: showInactive.value } })
    positions.value = res.data || res
  } finally { loading.value = false }
}

function openCreate() { editItem.value = null; form.value = { code:'', nameKh:'', nameEn:'', rank:5, isActive:true }; dialog.value = true }
function openEdit(item: any) { editItem.value = item; form.value = { code:item.code, nameKh:item.nameKh, nameEn:item.nameEn, rank:item.rank, isActive:item.isActive }; dialog.value = true }
function openDelete(item: any) { deleteItem.value = item; isRestore.value = false; confirmDialog.value = true }
function openRestore(item: any) { deleteItem.value = item; isRestore.value = true; confirmDialog.value = true }

async function save() {
  saving.value = true
  try {
    if (editItem.value) await api.patch(`/positions/${editItem.value.id}`, form.value)
    else await api.post('/positions', form.value)
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
    if (isRestore.value) await api.patch(`/positions/${deleteItem.value.id}/restore`)
    else await api.delete(`/positions/${deleteItem.value.id}`)
    confirmDialog.value = false
    snack.value = { show: true, text: isRestore.value ? 'Restored!' : 'Deactivated!', color: 'success' }
    await load()
  } catch (e: any) { snack.value = { show: true, text: e?.message||'Failed', color: 'error' } }
  finally { saving.value = false }
}

onMounted(load)
</script>
