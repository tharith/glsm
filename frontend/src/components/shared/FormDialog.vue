<template>
  <v-dialog
    v-model="isActive"
    :max-width="maxWidth"
    scrollable
    persistent
    transition="dialog-bottom-transition"
  >
    <v-card rounded="xl" class="position-relative">
      <v-card-title class="d-flex align-start justify-space-between pa-5 pb-3">
        <div>
          <div
            class="text-h6 font-weight-bold text-high-emphasis leading-tight"
          >
            {{ title }}
          </div>
          <div
            v-if="titleKh"
            class="text-body-2 text-medium-emphasis font-khmer mt-1"
          >
            {{ titleKh }}
          </div>
        </div>

        <v-btn
          icon="mdi-close"
          variant="text"
          density="comfortable"
          color="grey-darken-1"
          :disabled="loading"
          @click="isActive = false"
          class="mt-n1 mr-n2"
        ></v-btn>
      </v-card-title>

      <v-divider class="border-opacity-25"></v-divider>

      <v-card-text class="pa-5 bg-grey-lighten-5">
        <slot />
      </v-card-text>

      <v-divider class="border-opacity-25"></v-divider>

      <v-card-actions class="pa-4 ga-3 justify-end">
        <v-btn
          variant="tonal"
          color="error"
          rounded="lg"
          class="px-5 font-weight-medium text-capitalize"
          :disabled="loading"
          @click="isActive = false"
        >
          Cancel
        </v-btn>

        <v-btn
          color="primary"
          variant="flat"
          rounded="lg"
          class="px-5 font-weight-medium text-capitalize"
          :loading="loading"
          :disabled="!valid"
          @click="$emit('submit')"
        >
          {{ submitLabel }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
// ប្រើ defineModel ដើម្បីកាត់បន្ថយការសរសេរ emit update ដោយដៃ និងធ្វើឱ្យកូដខ្លីស្អាត
const isActive = defineModel<boolean>({ required: true });

withDefaults(
  defineProps<{
    title: string;
    titleKh?: string;
    submitLabel?: string;
    loading?: boolean;
    valid?: boolean;
    maxWidth?: number;
  }>(),
  { submitLabel: "Save", loading: false, valid: true, maxWidth: 760 },
);

defineEmits(["submit"]);
</script>

<style scoped>
.font-khmer {
  font-family: "Kantumruy Pro", sans-serif;
  /* បន្ថែម line-height ដើម្បីកុំឱ្យជើងអក្សរខ្មែរកាត់ដាច់ */
  line-height: 1.5;
}

/* ជំនួយដល់ការ Scroll ខាងក្នុងឱ្យមើលទៅស្រឡះស្អាត */
.v-card-text {
  max-height: 65vh;
}
</style>
