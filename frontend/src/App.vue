<template>
  <v-app>
    <TokenExpiryWarning />
    <NetworkStatusBar />
    <router-view />
  </v-app>
</template>

<script setup lang="ts">
import TokenExpiryWarning from "@/components/shared/TokenExpiryWarning.vue";
import NetworkStatusBar from "@/components/shared/NetworkStatusBar.vue";
</script>
