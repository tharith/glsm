<template>
  <div>
    <div class="mb-6">
      <h2 class="text-h6 font-weight-bold">Roles & Permissions</h2>
      <p class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">
        គ្រប់គ្រងតួនាទី និងសិទ្ធិ — RBAC Module
      </p>
    </div>

    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48"/>
    </div>

    <v-row v-else>
      <!-- Left: Roles list -->
      <v-col cols="12" md="4">
        <v-card rounded="xl" elevation="1">
          <v-card-title class="pa-5 pb-3 text-subtitle-2 font-weight-bold">
            Roles — តួនាទី
          </v-card-title>
          <v-list density="compact" class="pa-2">
            <v-list-item
              v-for="role in roles" :key="role.id"
              :active="selectedRole?.id === role.id"
              active-color="primary"
              rounded="lg"
              @click="selectRole(role)">
              <template #prepend>
                <v-avatar :color="roleColor(role.name)" size="32" class="mr-2">
                  <span class="text-caption text-white font-weight-bold">
                    {{ role.name.charAt(0) }}
                  </span>
                </v-avatar>
              </template>
              <v-list-item-title class="text-caption font-weight-bold">
                {{ role.name.replace(/_/g,' ') }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ role._count?.users || 0 }} users · {{ role.permissions?.length || 0 }} permissions
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>

      <!-- Right: Permissions for selected role -->
      <v-col cols="12" md="8">
        <v-card rounded="xl" elevation="1" v-if="selectedRole">
          <v-card-title class="pa-5 pb-0">
            <div class="text-subtitle-2 font-weight-bold">
              {{ selectedRole.name.replace(/_/g,' ') }} — Permissions
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              Check/uncheck to assign or remove permissions for this role
            </div>
          </v-card-title>
          <v-card-text class="pa-5">
            <div v-for="(perms, module) in groupedPermissions" :key="module" class="mb-4">
              <div class="text-caption font-weight-bold text-primary mb-2 text-uppercase">
                📦 {{ module }}
              </div>
              <v-row dense>
                <v-col v-for="perm in perms" :key="perm.id" cols="12" sm="6">
                  <v-card variant="outlined" rounded="lg" class="pa-2 d-flex align-center ga-2"
                    :color="hasPermission(perm.id) ? 'success' : undefined">
                    <v-checkbox
                      :model-value="hasPermission(perm.id)"
                      :true-icon="'mdi-check-circle'"
                      :false-icon="'mdi-circle-outline'"
                      :color="hasPermission(perm.id) ? 'success' : 'grey'"
                      hide-details density="compact"
                      :disabled="saving || selectedRole.name === 'SYSTEM_ADMIN'"
                      @update:model-value="togglePermission(perm.id, $event)"
                    />
                    <div class="flex-1">
                      <div class="text-caption font-weight-bold">{{ perm.action }}</div>
                      <div class="text-caption text-medium-emphasis">{{ perm.description }}</div>
                    </div>
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </v-card-text>
        </v-card>

        <v-card v-else rounded="xl" elevation="1" class="pa-12 text-center">
          <v-icon size="48" color="grey-lighten-1" class="mb-3">mdi-shield-account</v-icon>
          <div class="text-subtitle-2 text-medium-emphasis">
            Select a role to manage its permissions
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- User Direct Permission Override (PDF spec feature) -->
    <v-card rounded="xl" elevation="1" class="mt-4 pa-5">
      <div class="text-subtitle-2 font-weight-bold mb-1">
        👤 Direct User Permission Override
      </div>
      <div class="text-caption text-medium-emphasis mb-4">
        PDF spec: Grant specific permission directly to a user without changing their role.
        Example: EMPLOYEE + report:view → can view reports without being HR_OFFICER.
      </div>
      <v-row dense align="center">
        <v-col cols="12" sm="4">
          <v-autocomplete v-model="overrideUserId" label="Select User"
            :items="userList" item-title="label" item-value="id"
            density="compact" hide-details clearable
            prepend-inner-icon="mdi-account-search"/>
        </v-col>
        <v-col cols="12" sm="4">
          <v-select v-model="overridePermId" label="Select Permission"
            :items="allPerms" item-title="action" item-value="id"
            density="compact" hide-details clearable/>
        </v-col>
        <v-col cols="12" sm="2">
          <v-select v-model="overrideGrant" label="Action"
            :items="[{title:'Grant ✅', value: true},{title:'Deny ❌', value: false}]"
            density="compact" hide-details/>
        </v-col>
        <v-col cols="12" sm="2">
          <v-btn color="primary" block :disabled="!overrideUserId || !overridePermId"
            @click="applyOverride" :loading="saving">
            Apply
          </v-btn>
        </v-col>
      </v-row>
    </v-card>

    <v-snackbar v-model="snack.show" :color="snack.color" rounded="lg">{{ snack.text }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import api from '@/plugins/axios'
import { API } from '@/config/api'

const loading = ref(false), saving = ref(false)
const roles   = ref<any[]>([])
const allPerms = ref<any[]>([])
const userList = ref<any[]>([])
const selectedRole  = ref<any>(null)
const overrideUserId = ref('')
const overridePermId = ref('')
const overrideGrant  = ref(true)
const snack = ref({ show: false, text: '', color: 'success' })

const ROLE_COLORS: Record<string,string> = {
  SYSTEM_ADMIN: 'purple', INSTITUTION_HEAD: 'deep-purple', DIRECTOR_GENERAL: 'indigo',
  DEPARTMENT_CHIEF: 'primary', OFFICE_CHIEF: 'teal', HR_OFFICER: 'amber', EMPLOYEE: 'grey',
}
const roleColor = (r: string) => ROLE_COLORS[r] || 'grey'

// Group permissions by module
const groupedPermissions = computed(() => {
  const grouped: Record<string, any[]> = {}
  for (const p of allPerms.value) {
    if (!grouped[p.module]) grouped[p.module] = []
    grouped[p.module].push(p)
  }
  return grouped
})

// Check if selected role has a permission
const selectedRolePermIds = computed(() =>
  new Set((selectedRole.value?.permissions || []).map((rp: any) => rp.permission?.id || rp.permissionId))
)
const hasPermission = (permId: string) => selectedRolePermIds.value.has(permId)

async function load() {
  loading.value = true
  try {
    const [rolesRes, permsRes, usersRes] = await Promise.all([
      api.get(API.ROLES.LIST),
      api.get(API.ROLES.PERMISSIONS),
      api.get(API.USERS.SEARCH, { params: { limit: 200 } }),
    ])
    roles.value    = (rolesRes as any).data || rolesRes
    allPerms.value = (permsRes as any).data || permsRes
    const ul = ((usersRes as any).data || usersRes)
    userList.value = (Array.isArray(ul) ? ul : ul.data || []).map((u: any) => ({
      ...u, label: `${u.firstName} ${u.lastName} (${u.employeeId})`
    }))
  } finally { loading.value = false }
}

async function selectRole(role: any) {
  // Fetch full role with permissions
  try {
    const res: any = await api.get(`/roles/${role.id}`)
    selectedRole.value = res.data || res
  } catch {
    selectedRole.value = role
  }
}

async function togglePermission(permId: string, grant: boolean) {
  if (!selectedRole.value) return
  saving.value = true
  try {
    if (grant) {
      await api.post(`/roles/${selectedRole.value.id}/permissions/${permId}`)
      snack.value = { show: true, text: 'Permission granted!', color: 'success' }
    } else {
      await api.delete(`/roles/${selectedRole.value.id}/permissions/${permId}`)
      snack.value = { show: true, text: 'Permission removed!', color: 'warning' }
    }
    // Refresh selected role
    await selectRole(selectedRole.value)
    await load()
  } catch (e: any) {
    snack.value = { show: true, text: e?.message || 'Failed', color: 'error' }
  } finally { saving.value = false }
}

async function applyOverride() {
  if (!overrideUserId.value || !overridePermId.value) return
  saving.value = true
  try {
    const endpoint = overrideGrant.value
      ? API.USERS.PERM_GRANT(overrideUserId.value)
      : API.USERS.PERM_REVOKE(overrideUserId.value)
    await api.post(endpoint, { permissionId: overridePermId.value })
    snack.value = {
      show: true,
      text: `Permission ${overrideGrant.value ? 'granted' : 'denied'} to user!`,
      color: 'success',
    }
  } catch (e: any) {
    snack.value = { show: true, text: e?.message || 'Failed', color: 'error' }
  } finally { saving.value = false }
}

onMounted(load)
</script>
