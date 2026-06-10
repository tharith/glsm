<!--
  TokenExpiryWarning.vue
  Shows a fixed banner at top when access token expires in < 2 minutes.
  User can click "Stay Logged In" to refresh token proactively.
-->
<template>
  <v-slide-y-transition>
    <v-alert
      v-if="showWarning"
      type="warning"
      variant="flat"
      density="compact"
      rounded="0"
      style="position:fixed;top:0;left:0;right:0;z-index:10000;padding:8px 16px"
      icon="mdi-clock-alert">
      <div class="d-flex align-center justify-space-between flex-wrap ga-2">
        <div>
          <strong>Session expiring in {{ timeDisplay }}</strong>
          <span class="ml-2 d-none d-sm-inline" style="opacity:0.85">
            — វគ្គស្នើសុំត្រូវផុតកំណត់
          </span>
        </div>
        <v-btn
          size="small"
          color="white"
          variant="elevated"
          :loading="isExtending"
          prepend-icon="mdi-refresh"
          @click="extendSession">
          Stay Logged In
        </v-btn>
      </div>
    </v-alert>
  </v-slide-y-transition>
</template>

<script setup lang="ts">
import { useTokenExpiry } from '@/composables/useTokenExpiry'
const { showWarning, timeDisplay, isExtending, extendSession } = useTokenExpiry()
</script>
