<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6 flex-wrap ga-3">
      <div>
        <h2 class="text-h6 font-weight-bold">
          {{ t.nav.notifications }}
        </h2>
        <p class="text-caption text-medium-emphasis" style="font-family:'Kantumruy Pro',sans-serif">
          ការជូនដំណឹង — {{ notifStore.unreadCount }} unread
        </p>
      </div>
      <div class="d-flex ga-2 align-center">
        <v-btn v-if="notifStore.unreadCount > 0" variant="outlined" size="small"
          prepend-icon="mdi-check-all" @click="notifStore.markAllRead()">
          {{ t.common.save }}
        </v-btn>
        <v-btn icon size="small" variant="text" @click="load" :loading="loading">
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <v-progress-circular indeterminate color="primary" size="48"/>
    </div>

    <!-- Empty -->
    <v-card v-else-if="!notifStore.notifications.length" rounded="xl" elevation="1"
      class="pa-12 text-center">
      <v-icon size="64" color="grey-lighten-1" class="mb-3">mdi-bell-off-outline</v-icon>
      <div class="text-subtitle-1 text-medium-emphasis">
        {{ locale === 'km' ? 'មិនទាន់មានការជូនដំណឹង' : 'No notifications yet' }}
      </div>
    </v-card>

    <!-- List -->
    <div v-else>
      <v-card v-for="n in notifStore.notifications" :key="n.id"
        rounded="xl" elevation="1" class="mb-3"
        :style="!n.isRead ? 'border-left:4px solid #1A2744' : ''"
        @click="markAndOpen(n)" style="cursor:pointer" hover>
        <v-card-text class="pa-4">
          <div class="d-flex align-center ga-3">
            <v-avatar :color="typeColor(n.type)" size="40" rounded="lg">
              <v-icon :icon="typeIcon(n.type)" color="white" size="18"/>
            </v-avatar>
            <div class="flex-1">
              <div class="text-body-2 font-weight-bold" :class="n.isRead?'text-medium-emphasis':''">
                {{ locale === 'km' ? n.titleKh : n.titleEn }}
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                {{ timeAgo(n.createdAt) }}
              </div>
            </div>
            <v-badge v-if="!n.isRead" dot color="primary"/>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notification.store'
import { useI18n } from '@/i18n'
import { formatDistanceToNow } from 'date-fns'

const notifStore = useNotificationStore()
const router     = useRouter()
const { t, locale } = useI18n()
const loading    = ref(false)

const TYPE_COLORS: Record<string,string> = {
  LEAVE_SUBMITTED: 'info', LEAVE_APPROVED: 'success', LEAVE_REJECTED: 'error',
  LEAVE_RETURNED: 'warning', LEAVE_COMPLETED: 'success', LEAVE_CANCELLED: 'grey',
  BALANCE_LOW: 'warning', DELEGATION_ASSIGNED: 'purple',
}
const TYPE_ICONS: Record<string,string> = {
  LEAVE_SUBMITTED: 'mdi-send', LEAVE_APPROVED: 'mdi-check-circle',
  LEAVE_REJECTED:  'mdi-close-circle', LEAVE_RETURNED: 'mdi-undo',
  LEAVE_COMPLETED: 'mdi-check-all', LEAVE_CANCELLED: 'mdi-cancel',
  BALANCE_LOW:     'mdi-alert', DELEGATION_ASSIGNED: 'mdi-account-switch',
}
const typeColor = (t: string) => TYPE_COLORS[t] || 'grey'
const typeIcon  = (t: string) => TYPE_ICONS[t]  || 'mdi-bell'
const timeAgo   = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true })

async function markAndOpen(n: any) {
  if (!n.isRead) await notifStore.markRead(n.id)
  if (n.leaveRequestId) router.push(`/requests/${n.leaveRequestId}`)
}

async function load() {
  loading.value = true
  try { await notifStore.fetch() }
  finally { loading.value = false }
}

onMounted(load)
</script>
