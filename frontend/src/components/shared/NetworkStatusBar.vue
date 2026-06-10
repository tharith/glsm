<!-- Shows a banner when offline + how many requests are queued -->
<template>
  <div>
    <!-- Offline banner -->
    <v-slide-y-transition>
      <v-alert
        v-if="!isOnline"
        type="warning"
        variant="flat"
        density="compact"
        rounded="0"
        style="position:fixed;top:0;left:0;right:0;z-index:9999"
        icon="mdi-wifi-off">
        <div class="d-flex align-center justify-space-between">
          <span>
            <strong>គ្មានអ៊ីនធឺណែត — Offline</strong>
            <span v-if="queuedCount > 0" class="ml-2">
              · {{ queuedCount }} request(s) queued and will retry when connected
            </span>
          </span>
        </div>
      </v-alert>
    </v-slide-y-transition>

    <!-- Back online + replaying -->
    <v-slide-y-transition>
      <v-alert
        v-if="isOnline && (queuedCount > 0 || isReplaying)"
        type="info"
        variant="flat"
        density="compact"
        rounded="0"
        style="position:fixed;top:0;left:0;right:0;z-index:9999">
        <div class="d-flex align-center justify-space-between">
          <span>
            <v-progress-circular v-if="isReplaying" size="14" width="2"
              indeterminate class="mr-2"/>
            <span v-if="isReplaying">
              Syncing {{ queuedCount }} queued request(s)...
            </span>
            <span v-else>
              {{ queuedCount }} request(s) pending sync
              <v-btn size="x-small" variant="text" @click="manualReplay" class="ml-1">
                Sync Now
              </v-btn>
            </span>
          </span>
        </div>
      </v-alert>
    </v-slide-y-transition>
  </div>
</template>

<script setup lang="ts">
import { useNetwork } from '@/composables/useNetwork'
const { isOnline, queuedCount, isReplaying, manualReplay } = useNetwork()
</script>
