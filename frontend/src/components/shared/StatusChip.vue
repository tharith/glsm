<template>
  <v-chip :color="cfg.color" size="small" :variant="variant" rounded="lg">
    <v-icon start size="10">mdi-circle</v-icon>
    {{ cfg.label }}
  </v-chip>
</template>
<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{ status: string; variant?: string }>(), { variant: 'tonal' })
const STATUS: Record<string, { label: string; color: string }> = {
  DRAFT:           { label: 'Draft',          color: 'grey'     },
  SUBMITTED:       { label: 'Submitted',       color: 'info'     },
  OFFICE_APPROVED: { label: 'Office Approved', color: 'blue'     },
  DEPT_APPROVED:   { label: 'Dept Approved',   color: 'purple'   },
  HR_VERIFIED:     { label: 'HR Verified',     color: 'warning'  },
  DG_APPROVED:     { label: 'DG Approved',     color: 'teal'     },
  COMPLETED:       { label: 'Completed',       color: 'success'  },
  REJECTED:        { label: 'Rejected',        color: 'error'    },
  RETURNED:        { label: 'Returned',        color: 'warning'  },
  CANCELLED:       { label: 'Cancelled',       color: 'grey'     },
}
const cfg = computed(() => STATUS[props.status] || { label: props.status, color: 'grey' })
</script>
