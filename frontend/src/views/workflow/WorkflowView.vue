<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h2 class="text-h6 font-weight-bold">Workflow Builder</h2>
        <p class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">
          ម៉ាស៊ីនដំណើរការអនុម័ត — Build & manage approval workflows
        </p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">New Workflow</v-btn>
    </div>

    <v-tabs v-model="tab" class="mb-4">
      <v-tab value="definitions">⚙️ Definitions</v-tab>
      <v-tab value="assignments">🔗 Assignments</v-tab>
      <v-tab value="instances">📊 Active Instances</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <!-- ── DEFINITIONS TAB ──────────────────────────────── -->
      <v-window-item value="definitions">
        <div v-if="loading" class="text-center py-12"><v-progress-circular indeterminate color="primary"/></div>
        <v-row v-else>
          <v-col v-for="wf in workflows" :key="wf.id" cols="12" md="6">
            <v-card rounded="xl" elevation="1" class="pa-5"
              :style="wf.isActive ? 'border-top:3px solid #0F7A5A' : 'border-top:3px solid #94a3b8'">
              <!-- Header -->
              <div class="d-flex align-center justify-space-between mb-3">
                <div>
                  <div class="text-subtitle-2 font-weight-bold">{{ wf.name }}</div>
                  <div class="text-caption text-medium-emphasis">{{ wf.description }}</div>
                </div>
                <div class="d-flex ga-2 align-center">
                  <v-chip :color="wf.isActive?'success':'grey'" size="x-small" variant="tonal">
                    {{ wf.isActive ? 'Active' : 'Inactive' }}
                  </v-chip>
                  <v-btn icon size="x-small" variant="text" color="primary" @click="openEdit(wf)">
                    <v-icon size="14">mdi-pencil</v-icon>
                  </v-btn>
                  <v-btn icon size="x-small" variant="text" color="error" @click="openDelete(wf)">
                    <v-icon size="14">mdi-delete</v-icon>
                  </v-btn>
                </div>
              </div>

              <!-- Steps -->
              <v-timeline density="compact" align="start" side="end" truncate-line="both">
                <v-timeline-item v-for="step in wf.steps" :key="step.id"
                  dot-color="primary" size="x-small">
                  <div class="d-flex align-center justify-space-between">
                    <div>
                      <div class="text-caption font-weight-bold">
                        Step {{ step.stepNumber }}: {{ step.name }}
                      </div>
                      <div class="d-flex ga-1 mt-1">
                        <v-chip size="x-small" color="primary" variant="tonal">
                          {{ step.approverRole.replace(/_/g,' ') }}
                        </v-chip>
                        <v-chip size="x-small" color="grey" variant="tonal">
                          {{ step.timeoutHours }}h SLA
                        </v-chip>
                        <v-chip v-if="step.isOptional" size="x-small" color="orange" variant="tonal">Optional</v-chip>
                      </div>
                    </div>
                    <div class="d-flex ga-1">
                      <v-btn icon size="x-small" variant="text" color="primary" @click="openEditStep(wf.id, step)">
                        <v-icon size="12">mdi-pencil</v-icon>
                      </v-btn>
                      <v-btn icon size="x-small" variant="text" color="error" @click="deleteStep(step.id)">
                        <v-icon size="12">mdi-delete</v-icon>
                      </v-btn>
                    </div>
                  </div>
                </v-timeline-item>
              </v-timeline>

              <!-- Add Step button -->
              <v-btn size="x-small" variant="tonal" color="primary" class="mt-3"
                prepend-icon="mdi-plus" @click="openAddStep(wf.id)">
                Add Step
              </v-btn>

              <!-- Footer: assignments + usage -->
              <v-divider class="mt-3 mb-2"/>
              <div class="d-flex justify-space-between text-caption text-medium-emphasis">
                <span>🔗 {{ wf.assignments?.length || 0 }} org unit(s)</span>
                <span>📋 {{ wf._count?.instances || 0 }} total uses</span>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- ── ASSIGNMENTS TAB ──────────────────────────────── -->
      <v-window-item value="assignments">
        <v-card rounded="xl" elevation="1" class="pa-5">
          <div class="d-flex align-center justify-space-between mb-4">
            <div class="text-subtitle-2 font-weight-bold">Workflow Assignments</div>
            <v-btn size="small" color="primary" prepend-icon="mdi-plus" @click="openAssign">
              Assign Workflow
            </v-btn>
          </div>
          <div v-if="assignments.length === 0" class="text-center py-6 text-medium-emphasis">
            <v-icon size="40" class="mb-2">mdi-link-off</v-icon>
            <div class="text-caption">No assignments yet</div>
          </div>
          <div v-for="a in assignments" :key="a.id" class="mb-3 pa-3 rounded-lg" style="background:#f8f9fc">
            <div class="d-flex align-center justify-space-between">
              <div class="d-flex align-center ga-3">
                <v-icon color="primary">mdi-domain</v-icon>
                <div>
                  <div class="text-caption font-weight-bold">{{ a.orgUnit.nameEn }}</div>
                  <div class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">
                    {{ a.orgUnit.nameKh }}
                  </div>
                </div>
              </div>
              <div class="d-flex align-center ga-2">
                <v-chip size="small" color="primary" variant="tonal" prepend-icon="mdi-arrow-decision">
                  {{ a.definition.name }}
                </v-chip>
                <v-btn icon size="x-small" variant="text" color="error" @click="deleteAssignment(a.id)">
                  <v-icon size="14">mdi-delete</v-icon>
                </v-btn>
              </div>
            </div>
          </div>
        </v-card>
      </v-window-item>

      <!-- ── INSTANCES TAB ────────────────────────────────── -->
      <v-window-item value="instances">
        <v-card rounded="xl" elevation="1" class="pa-5">
          <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
            <div class="text-subtitle-2 font-weight-bold">Active Workflow Instances</div>
            <v-switch v-model="showCompleted" label="Show Completed" density="compact"
              hide-details color="primary" @change="loadInstances"/>
          </div>
          <v-data-table :headers="instanceHeaders" :items="instances" :loading="loadingInst"
            density="comfortable" hover>
            <template #item.leaveRequest="{ item }">
              <div>
                <div class="text-caption font-weight-bold">{{ item.leaveRequest?.refNumber }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.leaveRequest?.user?.firstName }} {{ item.leaveRequest?.user?.lastName }}
                </div>
              </div>
            </template>
            <template #item.leaveType="{ item }">
              <span class="text-caption">{{ item.leaveRequest?.leaveType?.nameEn }}</span>
            </template>
            <template #item.currentRole="{ item }">
              <v-chip v-if="!item.isCompleted" size="x-small" color="warning" variant="tonal">
                {{ item.currentRole?.replace(/_/g,' ') }}
              </v-chip>
              <v-chip v-else size="x-small" color="success" variant="tonal">Done</v-chip>
            </template>
            <template #item.isCompleted="{ item }">
              <v-icon :color="item.isCompleted?'success':'warning'" size="18">
                {{ item.isCompleted ? 'mdi-check-circle' : 'mdi-clock-outline' }}
              </v-icon>
            </template>
          </v-data-table>
        </v-card>
      </v-window-item>
    </v-window>

    <!-- CREATE / EDIT WORKFLOW DIALOG -->
    <FormDialog v-model="dialog" :title="editItem ? 'Edit Workflow' : 'Create Workflow'"
      :loading="saving" :valid="isValid" :max-width="520" @submit="save">
      <v-form v-model="isValid">
        <v-text-field v-model="form.name" label="Name *" :rules="[r=>!!r||'Required']" class="mb-3"/>
        <v-textarea v-model="form.description" label="Description" rows="2" class="mb-3"/>
        <v-switch v-if="editItem" v-model="form.isActive" label="Active" color="success" hide-details/>

        <!-- Steps (for new workflow only) -->
        <div v-if="!editItem" class="mt-4">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="text-caption font-weight-bold text-medium-emphasis">APPROVAL STEPS</div>
            <v-btn size="x-small" variant="tonal" color="primary" @click="addStepToForm">
              <v-icon start size="12">mdi-plus</v-icon>Add Step
            </v-btn>
          </div>
          <div v-for="(step, i) in form.steps" :key="i" class="mb-2 pa-3 rounded-lg" style="background:#f8f9fc">
            <div class="d-flex align-center ga-2">
              <v-chip size="x-small" color="primary">{{ i+1 }}</v-chip>
              <v-text-field v-model="step.name" :label="`Step ${i+1} Name`" density="compact" hide-details/>
              <v-select v-model="step.approverRole" :items="roleOptions" density="compact" hide-details style="min-width:160px"/>
              <v-btn icon size="x-small" variant="text" color="error" @click="removeStepFromForm(i)">
                <v-icon size="14">mdi-close</v-icon>
              </v-btn>
            </div>
          </div>
        </div>
      </v-form>
    </FormDialog>

    <!-- ADD / EDIT STEP DIALOG -->
    <FormDialog v-model="stepDialog" :title="editStep ? 'Edit Step' : 'Add Step'"
      :loading="saving" :valid="stepValid" :max-width="480" @submit="saveStep">
      <v-form v-model="stepValid">
        <v-row dense>
          <v-col cols="4">
            <v-text-field v-model.number="stepForm.stepNumber" label="Step #" type="number" min="1"
              :rules="[r=>r>0||'Must be > 0']"/>
          </v-col>
          <v-col cols="8">
            <v-text-field v-model="stepForm.name" label="Step Name *" :rules="[r=>!!r||'Required']"/>
          </v-col>
          <v-col cols="12">
            <v-select v-model="stepForm.approverRole" label="Approver Role *"
              :items="roleOptions" :rules="[r=>!!r||'Required']"/>
          </v-col>
          <v-col cols="6">
            <v-text-field v-model.number="stepForm.timeoutHours" label="SLA (hours)" type="number" min="1"/>
          </v-col>
          <v-col cols="6">
            <v-switch v-model="stepForm.isOptional" label="Optional Step" color="orange" hide-details class="mt-2"/>
          </v-col>
        </v-row>
      </v-form>
    </FormDialog>

    <!-- ASSIGN WORKFLOW DIALOG -->
    <FormDialog v-model="assignDialog" title="Assign Workflow to Org Unit"
      titleKh="ប្រគល់ Workflow ទៅអង្គភាព"
      :loading="saving" :valid="assignValid" :max-width="480" @submit="saveAssign">
      <v-form v-model="assignValid">
        <v-autocomplete v-model="assignForm.orgUnitId" label="Org Unit *"
          :items="orgUnits" item-title="nameEn" item-value="id"
          :rules="[r=>!!r||'Required']" class="mb-3"/>
        <v-select v-model="assignForm.definitionId" label="Workflow *"
          :items="workflows.map(w=>({title:w.name, value:w.id}))"
          :rules="[r=>!!r||'Required']"/>
        <v-alert type="info" density="compact" variant="tonal" class="mt-2">
          Any existing workflow assignment for this org unit will be replaced.
        </v-alert>
      </v-form>
    </FormDialog>

    <!-- DELETE CONFIRM -->
    <ConfirmDeleteDialog v-model="confirmDialog" :item-name="deleteTarget?.name"
      :loading="saving" @confirm="doDelete"/>

    <v-snackbar v-model="snack.show" :color="snack.color" rounded="lg">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/plugins/axios'
import FormDialog from '@/components/shared/FormDialog.vue'
import ConfirmDeleteDialog from '@/components/shared/ConfirmDeleteDialog.vue'

const tab = ref('definitions')
const loading = ref(false), loadingInst = ref(false), saving = ref(false)
const dialog = ref(false), stepDialog = ref(false), assignDialog = ref(false), confirmDialog = ref(false)
const isValid = ref(false), stepValid = ref(false), assignValid = ref(false)
const showCompleted = ref(false)
const workflows = ref<any[]>([]), assignments = ref<any[]>([]), instances = ref<any[]>([])
const orgUnits = ref<any[]>([])
const editItem = ref<any>(null), deleteTarget = ref<any>(null)
const editStep = ref<any>(null), editStepDefinitionId = ref('')
const snack = ref({ show: false, text: '', color: 'success' })

const ROLES = ['SYSTEM_ADMIN','INSTITUTION_HEAD','DIRECTOR_GENERAL','HR_OFFICER','DEPARTMENT_CHIEF','OFFICE_CHIEF','EMPLOYEE']
const roleOptions = ROLES.map(r => ({ title: r.replace(/_/g,' '), value: r }))

const defaultForm = () => ({
  name: '', description: '', isActive: true,
  steps: [
    { stepNumber:1, name:'Office Chief Review',      approverRole:'OFFICE_CHIEF',     timeoutHours:48, isOptional:false },
    { stepNumber:2, name:'Department Chief Review',  approverRole:'DEPARTMENT_CHIEF',  timeoutHours:48, isOptional:false },
    { stepNumber:3, name:'HR Verification',          approverRole:'HR_OFFICER',        timeoutHours:24, isOptional:false },
    { stepNumber:4, name:'Director General Approval',approverRole:'DIRECTOR_GENERAL',  timeoutHours:72, isOptional:false },
  ],
})
const form = ref(defaultForm())
const stepForm = ref({ stepNumber:1, name:'', approverRole:'OFFICE_CHIEF', timeoutHours:48, isOptional:false })
const assignForm = ref({ orgUnitId:'', definitionId:'' })

const instanceHeaders = [
  { title: 'Request',      key: 'leaveRequest', width: 180 },
  { title: 'Leave Type',   key: 'leaveType',    width: 140 },
  { title: 'Step',         key: 'currentStep',  width: 70  },
  { title: 'Waiting For',  key: 'currentRole',  width: 160 },
  { title: 'Workflow',     key: 'definition.name', width: 180 },
  { title: 'Done',         key: 'isCompleted',  width: 70  },
]

async function load() {
  loading.value = true
  try {
    const [wf, asn, orgs] = await Promise.all([
      api.get('/workflow'),
      api.get('/workflow/assignments'),
      api.get('/organization'),
    ])
    workflows.value  = (wf  as any).data || wf
    assignments.value= (asn as any).data || asn
    orgUnits.value   = (orgs as any).data || orgs
  } finally { loading.value = false }
}

async function loadInstances() {
  loadingInst.value = true
  try {
    const res: any = await api.get('/workflow/instances', { params: { completed: showCompleted.value } })
    instances.value = res.data || res
  } finally { loadingInst.value = false }
}

// ── Workflow CRUD ─────────────────────────────────────────────
function openCreate() { editItem.value=null; form.value=defaultForm(); dialog.value=true }
function openEdit(wf: any) {
  editItem.value = wf
  form.value = { name:wf.name, description:wf.description||'', isActive:wf.isActive, steps:[] }
  dialog.value = true
}

async function save() {
  saving.value = true
  try {
    if (editItem.value) await api.patch(`/workflow/${editItem.value.id}`, { name:form.value.name, description:form.value.description, isActive:form.value.isActive })
    else await api.post('/workflow', form.value)
    dialog.value = false
    snack.value = { show:true, text: editItem.value?'Updated!':'Workflow created!', color:'success' }
    await load()
  } catch (e: any) { snack.value = { show:true, text:e?.message||'Failed', color:'error' } }
  finally { saving.value = false }
}

function addStepToForm() {
  const n = form.value.steps.length + 1
  form.value.steps.push({ stepNumber:n, name:'', approverRole:'OFFICE_CHIEF', timeoutHours:48, isOptional:false })
}
function removeStepFromForm(i: number) { form.value.steps.splice(i,1); form.value.steps.forEach((s,j) => s.stepNumber=j+1) }

// ── Step CRUD ─────────────────────────────────────────────────
function openAddStep(defId: string) { editStep.value=null; editStepDefinitionId.value=defId; stepForm.value={stepNumber:1,name:'',approverRole:'OFFICE_CHIEF',timeoutHours:48,isOptional:false}; stepDialog.value=true }
function openEditStep(defId: string, step: any) { editStep.value=step; editStepDefinitionId.value=defId; stepForm.value={...step}; stepDialog.value=true }

async function saveStep() {
  saving.value = true
  try {
    if (editStep.value) await api.patch(`/workflow/steps/${editStep.value.id}`, stepForm.value)
    else await api.post(`/workflow/${editStepDefinitionId.value}/steps`, stepForm.value)
    stepDialog.value = false
    snack.value = { show:true, text:'Step saved!', color:'success' }
    await load()
  } catch (e: any) { snack.value = { show:true, text:e?.message||'Failed', color:'error' } }
  finally { saving.value = false }
}

async function deleteStep(stepId: string) {
  try {
    await api.delete(`/workflow/steps/${stepId}`)
    snack.value = { show:true, text:'Step deleted!', color:'success' }
    await load()
  } catch (e: any) { snack.value = { show:true, text:e?.message||'Failed', color:'error' } }
}

// ── Assignment CRUD ───────────────────────────────────────────
function openAssign() { assignForm.value={orgUnitId:'',definitionId:''}; assignDialog.value=true }

async function saveAssign() {
  saving.value = true
  try {
    await api.post('/workflow/assign', assignForm.value)
    assignDialog.value = false
    snack.value = { show:true, text:'Workflow assigned!', color:'success' }
    await load()
  } catch (e: any) { snack.value = { show:true, text:e?.message||'Failed', color:'error' } }
  finally { saving.value = false }
}

async function deleteAssignment(id: string) {
  try {
    await api.delete(`/workflow/assignments/${id}`)
    snack.value = { show:true, text:'Assignment removed!', color:'success' }
    await load()
  } catch (e: any) { snack.value = { show:true, text:e?.message||'Failed', color:'error' } }
}

// ── Delete workflow ───────────────────────────────────────────
function openDelete(wf: any) { deleteTarget.value=wf; confirmDialog.value=true }
async function doDelete() {
  saving.value = true
  try {
    await api.delete(`/workflow/${deleteTarget.value.id}`)
    confirmDialog.value = false
    snack.value = { show:true, text:'Deleted!', color:'success' }
    await load()
  } catch (e: any) { snack.value = { show:true, text:e?.message||'Failed', color:'error' } }
  finally { saving.value = false }
}

onMounted(() => { load(); loadInstances() })
</script>
