<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h2 class="text-h6 font-weight-bold">Public Holidays</h2>
        <p class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">ថ្ងៃឈប់សម្រាកបុណ្យជាតិ</p>
      </div>
      <div class="d-flex ga-2">
        <v-select v-model="selectedYear" :items="years" label="Year" density="compact"
          hide-details style="min-width:100px" @update:model-value="load"/>
        <v-btn color="secondary" variant="tonal" prepend-icon="mdi-content-copy" @click="copyDialog=true">Copy Year</v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">Add Holiday</v-btn>
      </div>
    </div>

    <CrudTable title="Cambodia Public Holidays" titleKh="ថ្ងៃបុណ្យជាតិ"
      :headers="headers" :items="holidays" :loading="loading" :searchable="false"
      @create="openCreate" @edit="openEdit" @delete="openDelete">
      <template #item.date="{ item }">
        <div class="text-caption font-weight-bold">{{ formatDate(item.date) }}</div>
        <div class="text-caption text-medium-emphasis">{{ dayOfWeek(item.date) }}</div>
      </template>
      <template #item.isRecurring="{ item }">
        <v-chip :color="item.isRecurring?'success':'grey'" size="x-small" variant="tonal">
          {{ item.isRecurring ? '🔄 Recurring' : 'Once' }}
        </v-chip>
      </template>
      <template #item.actions="{ item }">
        <div class="d-flex ga-1">
          <v-btn icon size="x-small" variant="text" color="primary" @click="openEdit(item)">
            <v-icon size="16">mdi-pencil</v-icon>
          </v-btn>
          <v-btn icon size="x-small" variant="text" color="error" @click="openDelete(item)">
            <v-icon size="16">mdi-delete</v-icon>
          </v-btn>
        </div>
      </template>
    </CrudTable>

    <!-- CREATE/EDIT -->
    <FormDialog v-model="dialog" :title="editItem ? 'Edit Holiday' : 'Add Holiday'"
      :titleKh="editItem ? 'កែប្រែថ្ងៃបុណ្យ' : 'បន្ថែមថ្ងៃបុណ្យ'"
      :loading="saving" :valid="isValid" @submit="save">
      <v-form v-model="isValid">
        <v-row dense>
          <v-col cols="12"><v-text-field v-model="form.nameEn" label="Name (English) *" :rules="[r=>!!r||'Required']"/></v-col>
          <v-col cols="12"><v-text-field v-model="form.nameKh" label="ឈ្មោះ (ខ្មែរ) *" :rules="[r=>!!r||'Required']"/></v-col>
          <v-col cols="6"><v-text-field v-model="form.date" label="Date *" type="date" :rules="[r=>!!r||'Required']"/></v-col>
          <v-col cols="6"><v-text-field v-model.number="form.year" label="Year *" type="number" :rules="[r=>!!r||'Required']"/></v-col>
          <v-col cols="12"><v-switch v-model="form.isRecurring" label="Recurring annually" color="success" hide-details/></v-col>
        </v-row>
      </v-form>
    </FormDialog>

    <!-- COPY YEAR DIALOG -->
    <v-dialog v-model="copyDialog" max-width="380">
      <v-card rounded="xl" class="pa-4">
        <v-card-title class="pa-4 pb-2 font-weight-bold">Copy Recurring Holidays</v-card-title>
        <v-card-text class="pa-4">
          <v-row dense>
            <v-col cols="6"><v-text-field v-model.number="copyFrom" label="From Year" type="number"/></v-col>
            <v-col cols="6"><v-text-field v-model.number="copyTo"   label="To Year"   type="number"/></v-col>
          </v-row>
          <v-alert type="info" density="compact" variant="tonal" class="mt-2">
            Copies all recurring holidays to the new year.
          </v-alert>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0 ga-2">
          <v-btn variant="outlined" @click="copyDialog=false">Cancel</v-btn>
          <v-spacer/>
          <v-btn color="primary" @click="doCopy" :loading="saving">Copy</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- DELETE CONFIRM -->
    <v-dialog v-model="confirmDialog" max-width="360">
      <v-card rounded="xl" class="pa-4">
        <v-card-text class="text-center pa-6">
          <v-icon size="48" color="error" class="mb-3">mdi-delete-outline</v-icon>
          <div class="text-h6 font-weight-bold mb-2">Delete Holiday?</div>
          <div class="text-body-2 text-medium-emphasis">{{ deleteTarget?.nameEn }}</div>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0 ga-2">
          <v-btn variant="outlined" @click="confirmDialog=false" block>Cancel</v-btn>
          <v-btn color="error" @click="doDelete" :loading="saving" block>Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snack.show" :color="snack.color" rounded="lg">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { format } from 'date-fns'
import api from '@/plugins/axios'
import CrudTable from '@/components/shared/CrudTable.vue'
import FormDialog from '@/components/shared/FormDialog.vue'

const currentYear = new Date().getFullYear()
const years = Array.from({ length: 6 }, (_, i) => currentYear - 1 + i)
const selectedYear = ref(currentYear)
const copyFrom = ref(currentYear), copyTo = ref(currentYear + 1)

const loading = ref(false), saving = ref(false)
const dialog = ref(false), confirmDialog = ref(false), copyDialog = ref(false)
const isValid = ref(false)
const holidays = ref<any[]>([])
const editItem = ref<any>(null), deleteTarget = ref<any>(null)
const snack = ref({ show: false, text: '', color: 'success' })
const defaultForm = () => ({ nameKh:'', nameEn:'', date:'', year: selectedYear.value, isRecurring: true })
const form = ref(defaultForm())

const headers = [
  { title: 'Date',        key: 'date',        width: 140 },
  { title: 'Name EN',     key: 'nameEn'                  },
  { title: 'ឈ្មោះ',      key: 'nameKh'                  },
  { title: 'Recurring',   key: 'isRecurring', width: 130 },
  { title: 'Actions',     key: 'actions',     width: 100, sortable: false },
]

const formatDate = (d: string) => format(new Date(d), 'MMM dd, yyyy')
const dayOfWeek  = (d: string) => format(new Date(d), 'EEEE')

async function load() {
  loading.value = true
  try {
    const res: any = await api.get('/public-holidays', { params: { year: selectedYear.value } })
    holidays.value = res.data || res
  } finally { loading.value = false }
}

function openCreate() { editItem.value=null; form.value=defaultForm(); dialog.value=true }
function openEdit(h: any) {
  editItem.value = h
  form.value = { nameKh:h.nameKh, nameEn:h.nameEn, date:h.date.split('T')[0], year:h.year, isRecurring:h.isRecurring }
  dialog.value = true
}
function openDelete(h: any) { deleteTarget.value=h; confirmDialog.value=true }

async function save() {
  saving.value = true
  try {
    if (editItem.value) await api.patch(`/public-holidays/${editItem.value.id}`, form.value)
    else await api.post('/public-holidays', form.value)
    dialog.value = false
    snack.value = { show:true, text: editItem.value?'Updated!':'Created!', color:'success' }
    await load()
  } catch (e: any) { snack.value = { show:true, text: e?.message||'Failed', color:'error' } }
  finally { saving.value = false }
}

async function doDelete() {
  saving.value = true
  try {
    await api.delete(`/public-holidays/${deleteTarget.value.id}`)
    confirmDialog.value = false
    snack.value = { show:true, text:'Deleted!', color:'success' }
    await load()
  } catch (e: any) { snack.value = { show:true, text: e?.message||'Failed', color:'error' } }
  finally { saving.value = false }
}

async function doCopy() {
  saving.value = true
  try {
    const res: any = await api.post('/public-holidays/copy-year', { fromYear: copyFrom.value, toYear: copyTo.value })
    copyDialog.value = false
    snack.value = { show:true, text: `Copied ${(res.data||res).count} holidays to ${copyTo.value}!`, color:'success' }
    selectedYear.value = copyTo.value
    await load()
  } catch (e: any) { snack.value = { show:true, text: e?.message||'Failed', color:'error' } }
  finally { saving.value = false }
}

onMounted(load)
</script>
