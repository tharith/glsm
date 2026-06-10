<!-- Reusable CRUD data table with search + pagination -->
<template>
  <v-card rounded="xl" elevation="1">
    <!-- Header -->
    <v-card-text class="pa-5">
      <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
        <div>
          <div class="text-subtitle-1 font-weight-bold">{{ title }}</div>
          <div class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">{{ titleKh }}</div>
        </div>
        <div class="d-flex ga-2 flex-wrap align-center">
          <v-text-field
            v-if="searchable"
            v-model="localSearch" :placeholder="searchPlaceholder"
            prepend-inner-icon="mdi-magnify" density="compact"
            hide-details clearable style="min-width:220px"
            @update:model-value="$emit('search', $event)"
          />
          <slot name="filters" />
          <v-btn v-if="canCreate" color="primary" :prepend-icon="createIcon" @click="$emit('create')">
            {{ createLabel }}
          </v-btn>
        </div>
      </div>

      <!-- Table -->
      <v-data-table
        :headers="headers"
        :items="items"
        :loading="loading"
        :items-per-page="itemsPerPage"
        density="comfortable"
        rounded="lg"
        hover
      >
        <!-- Pass all slots through -->
        <template v-for="(_, name) in $slots" #[name]="slotData">
          <slot :name="name" v-bind="slotData || {}" />
        </template>

        <!-- Default actions slot -->
        <template #item.actions="{ item }">
          <div class="d-flex ga-1">
            <v-btn icon size="x-small" variant="text" color="primary" @click="$emit('edit', item)">
              <v-icon size="16">mdi-pencil</v-icon>
              <v-tooltip activator="parent">Edit</v-tooltip>
            </v-btn>
            <v-btn v-if="item.isActive !== false" icon size="x-small" variant="text" color="error" @click="$emit('delete', item)">
              <v-icon size="16">mdi-delete</v-icon>
              <v-tooltip activator="parent">Deactivate</v-tooltip>
            </v-btn>
            <v-btn v-else icon size="x-small" variant="text" color="success" @click="$emit('restore', item)">
              <v-icon size="16">mdi-restore</v-icon>
              <v-tooltip activator="parent">Restore</v-tooltip>
            </v-btn>
          </div>
        </template>

        <template #item.isActive="{ item }">
          <v-chip :color="item.isActive ? 'success' : 'error'" size="x-small" variant="tonal">
            {{ item.isActive ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>

        <template #no-data>
          <div class="text-center py-8 text-medium-emphasis">
            <v-icon size="48" class="mb-2">mdi-database-off-outline</v-icon>
            <div class="text-body-2">No data found</div>
          </div>
        </template>
      </v-data-table>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  titleKh?: string
  headers: any[]
  items: any[]
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  canCreate?: boolean
  createLabel?: string
  createIcon?: string
  itemsPerPage?: number
}>(), {
  titleKh: '',
  loading: false,
  searchable: true,
  searchPlaceholder: 'Search...',
  canCreate: true,
  createLabel: 'Add New',
  createIcon: 'mdi-plus',
  itemsPerPage: 15,
})

defineEmits(['create','edit','delete','restore','search'])
const localSearch = ref('')
</script>
