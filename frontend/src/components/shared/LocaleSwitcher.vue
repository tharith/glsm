<template>
  <v-btn-toggle v-model="currentLocale" mandatory density="compact" rounded="lg"
    color="primary" @update:model-value="setLocale($event)">
    <v-btn value="km" size="small" style="font-family:'Kantumruy Pro',sans-serif">ខ្មែរ</v-btn>
    <v-btn value="en" size="small">EN</v-btn>
  </v-btn-toggle>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from '@/i18n'

const { locale, setLocale } = useI18n()
const currentLocale = ref(locale.value)
</script>
