<template>
  <v-dialog
    v-model="isActive"
    max-width="400"
    transition="dialog-bottom-transition"
    persistent
  >
    <v-card rounded="xl" class="pa-4">
      <v-card-text class="text-center pt-6 pb-4">
        <v-avatar
          :color="isRestore ? 'green-lighten-5' : 'red-lighten-5'"
          size="80"
          class="mb-4"
        >
          <v-icon
            size="40"
            :color="isRestore ? 'green-darken-1' : 'red-darken-1'"
          >
            {{ isRestore ? "mdi-autorenew" : "mdi-alert-circle-outline" }}
          </v-icon>
        </v-avatar>

        <h3 class="text-h5 font-weight-bold mb-3 text-grey-darken-4">
          {{ isRestore ? "Restore Item?" : "Deactivate Item?" }}
        </h3>

        <p class="text-body-1 text-grey-darken-1 px-2 m-0 leading-relaxed">
          Are you sure you want to {{ isRestore ? "restore" : "deactivate" }}
          <span class="font-weight-bold text-grey-darken-4"
            >"{{ itemName }}"</span
          >?
          <span
            v-if="!isRestore"
            class="d-block mt-2 text-body-2 text-red-darken-1"
          >
            This item will be soft-deleted but can be restored later.
          </span>
        </p>
      </v-card-text>

      <v-card-actions class="px-2 pb-2 pt-0">
        <v-row dense>
          <v-col cols="6">
            <v-btn
              variant="flat"
              color="grey-lighten-3"
              @click="isActive = false"
              block
              rounded="lg"
              size="large"
              class="font-weight-bold text-grey-darken-2 text-capitalize"
            >
              Cancel
            </v-btn>
          </v-col>
          <v-col cols="6">
            <v-btn
              :color="isRestore ? 'green-darken-1' : 'red-darken-1'"
              variant="flat"
              @click="$emit('confirm')"
              :loading="loading"
              block
              rounded="lg"
              size="large"
              class="font-weight-bold text-white text-capitalize"
            >
              {{ isRestore ? "Restore" : "Deactivate" }}
            </v-btn>
          </v-col>
        </v-row>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
const isActive = defineModel<boolean>({ required: true });

defineProps<{
  itemName?: string;
  isRestore?: boolean;
  loading?: boolean;
}>();

defineEmits(["confirm"]);
</script>
