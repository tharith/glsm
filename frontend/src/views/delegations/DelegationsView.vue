<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h2 class="text-h6 font-weight-bold">Approval Delegations</h2>
        <p class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">ការប្រគល់សិទ្ធិអនុម័ត</p>
      </div>
      <div class="d-flex ga-2">
        <v-switch v-model="activeOnly" label="Active Only" density="compact" hide-details color="success" @change="load"/>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">New Delegation</v-btn>
      </div>
    </div>

    <div v-if="loading" class="text-center py-12"><v-progress-circular indeterminate color="primary"/></div>

    <v-row v-else>
      <v-col v-for="d in delegations" :key="d.id" cols="12" md="6">
        <v-card rounded="xl" elevation="1" class="pa-5"
          :style="isActive(d) ? 'border-left: 4px solid #0F7A5A' : ''">
          <div class="d-flex align-center justify-space-between mb-3">
            <v-chip :color="isActive(d)?'success':'grey'" size="small" variant="tonal">
              {{ isActive(d) ? '✅ Active' : '⏸ Inactive' }}
            </v-chip>
            <div class="d-flex ga-1">
              <v-btn icon size="x-small" variant="text" color="primary" @click="openEdit(d)"><v-icon size="14">mdi-pencil</v-icon></v-btn>
              <v-btn v-if="isActive(d)" icon size="x-small" variant="text" color="warning" @click="doDeactivate(d)"><v-icon size="14">mdi-pause</v-icon></v-btn>
              <v-btn icon size="x-small" variant="text" color="error" @click="openDelete(d)"><v-icon size="14">mdi-delete</v-icon></v-btn>
            </div>
          </div>

          <div class="d-flex align-center ga-3 mb-3">
            <div class="text-center">
              <v-avatar color="primary" size="40"><span class="text-caption font-weight-bold text-white">{{ initials(d.fromUser) }}</span></v-avatar>
              <div class="text-caption mt-1 font-weight-bold">{{ d.fromUser.firstName }}</div>
              <div class="text-caption text-medium-emphasis">{{ d.fromUser.position?.nameEn }}</div>
            </div>
            <div class="flex-1 text-center">
              <v-icon color="primary" size="28">mdi-arrow-right-bold</v-icon>
              <div class="text-caption text-medium-emphasis">delegates to</div>
            </div>
            <div class="text-center">
              <v-avatar color="success" size="40"><span class="text-caption font-weight-bold text-white">{{ initials(d.toUser) }}</span></v-avatar>
              <div class="text-caption mt-1 font-weight-bold">{{ d.toUser.firstName }}</div>
              <div class="text-caption text-medium-emphasis">{{ d.toUser.position?.nameEn }}</div>
            </div>
          </div>

          <v-divider class="mb-3"/>
          <div class="d-flex justify-space-between text-caption">
            <span><v-icon size="12" class="mr-1">mdi-calendar-start</v-icon>{{ formatDate(d.startDate) }}</span>
            <v-icon size="14" color="grey">mdi-arrow-right</v-icon>
            <span><v-icon size="12" class="mr-1">mdi-calendar-end</v-icon>{{ formatDate(d.endDate) }}</span>
          </div>
          <div v-if="d.reason" class="text-caption text-medium-emphasis mt-2 pa-2 rounded bg-grey-lighten-5">
            💬 {{ d.reason }}
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- CREATE/EDIT -->
    <FormDialog v-model="dialog" :title="editItem ? 'Edit Delegation' : 'New Delegation'"
      :titleKh="editItem ? 'កែប្រែការប្រគល់សិទ្ធិ' : 'ប្រគល់សិទ្ធិអនុម័ត'"
      :loading="saving" :valid="isValid" @submit="save">
      <v-form v-model="isValid">
        <v-row dense>
          <v-col cols="12">
            <v-autocomplete v-model="form.fromUserId" label="Delegated By (From) *"
              :items="users" item-title="label" item-value="id"
              :rules="[r=>!!r||'Required']" :disabled="!!editItem"/>
          </v-col>
          <v-col cols="12">
            <v-autocomplete v-model="form.toUserId" label="Delegated To *"
              :items="users" item-title="label" item-value="id"
              :rules="[r=>!!r||'Required']" :disabled="!!editItem"/>
          </v-col>
          <v-col cols="6"><v-text-field v-model="form.startDate" label="Start Date *" type="date" :rules="[r=>!!r||'Required']"/></v-col>
          <v-col cols="6"><v-text-field v-model="form.endDate"   label="End Date *"   type="date" :min="form.startDate" :rules="[r=>!!r||'Required']"/></v-col>
          <v-col cols="12"><v-textarea v-model="form.reason" label="Reason" rows="2"/></v-col>
        </v-row>
      </v-form>
    </FormDialog>

    <!-- DELETE -->
    <v-dialog v-model="confirmDialog" max-width="360">
      <v-card rounded="xl" class="pa-4">
        <v-card-text class="text-center pa-6">
          <v-icon size="48" color="error" class="mb-3">mdi-delete-outline</v-icon>
          <div class="text-h6 font-weight-bold mb-2">Delete Delegation?</div>
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
import { format, isWithinInterval } from 'date-fns'
import api from '@/plugins/axios'
import FormDialog from '@/components/shared/FormDialog.vue'

const loading = ref(false), saving = ref(false)
const dialog = ref(false), confirmDialog = ref(false)
const isValid = ref(false), activeOnly = ref(false)
const delegations = ref<any[]>([]), users = ref<any[]>([])
const editItem = ref<any>(null), deleteTarget = ref<any>(null)
const snack = ref({ show: false, text: '', color: 'success' })
const defaultForm = () => ({ fromUserId:'', toUserId:'', startDate:'', endDate:'', reason:'' })
const form = ref(defaultForm())

const formatDate = (d: string) => format(new Date(d), 'MMM dd, yyyy')
const initials = (u: any) => `${u?.firstName?.[0]||''}${u?.lastName?.[0]||''}`
const isActive = (d: any) => {
  if (!d.isActive) return false
  const now = new Date()
  return now >= new Date(d.startDate) && now <= new Date(d.endDate)
}

async function load() {
  loading.value = true
  try {
    const res: any = await api.get('/delegations', { params: { activeOnly: activeOnly.value } })
    delegations.value = res.data || res
  } finally { loading.value = false }
}

async function loadUsers() {
  const res: any = await api.get('/users/search', { params: { limit: 200 } })
  const list = (res.data || res).data || res.data || []
  users.value = list.map((u: any) => ({ ...u, label: `${u.firstName} ${u.lastName} (${u.employeeId})` }))
}

function openCreate() { editItem.value=null; form.value=defaultForm(); dialog.value=true }
function openEdit(d: any) {
  editItem.value = d
  form.value = { fromUserId:d.fromUserId, toUserId:d.toUserId, startDate:d.startDate.split('T')[0], endDate:d.endDate.split('T')[0], reason:d.reason||'' }
  dialog.value = true
}
function openDelete(d: any) { deleteTarget.value=d; confirmDialog.value=true }

async function save() {
  saving.value = true
  try {
    if (editItem.value) await api.patch(`/delegations/${editItem.value.id}`, form.value)
    else await api.post('/delegations', form.value)
    dialog.value = false
    snack.value = { show:true, text: editItem.value?'Updated!':'Created!', color:'success' }
    await load()
  } catch (e: any) { snack.value = { show:true, text: e?.message||'Failed', color:'error' } }
  finally { saving.value = false }
}

async function doDeactivate(d: any) {
  try {
    await api.patch(`/delegations/${d.id}/deactivate`)
    snack.value = { show:true, text:'Deactivated!', color:'success' }
    await load()
  } catch (e: any) { snack.value = { show:true, text: e?.message||'Failed', color:'error' } }
}

async function doDelete() {
  saving.value = true
  try {
    await api.delete(`/delegations/${deleteTarget.value.id}`)
    confirmDialog.value = false
    snack.value = { show:true, text:'Deleted!', color:'success' }
    await load()
  } catch (e: any) { snack.value = { show:true, text: e?.message||'Failed', color:'error' } }
  finally { saving.value = false }
}

onMounted(() => Promise.all([load(), loadUsers()]))
</script>
