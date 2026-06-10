// useNetwork.ts — reactive network status + offline queue indicator
import { ref, onMounted, onUnmounted } from 'vue'
import { getQueuedCount, replayOfflineQueue } from '@/plugins/axios'

export function useNetwork() {
  const isOnline      = ref(navigator.onLine)
  const queuedCount   = ref(getQueuedCount())
  const isReplaying   = ref(false)

  function onOnline() {
    isOnline.value    = true
    queuedCount.value = getQueuedCount()
    // Auto-replay after a short delay
    setTimeout(async () => {
      if (queuedCount.value > 0) {
        isReplaying.value = true
        await replayOfflineQueue()
        queuedCount.value = getQueuedCount()
        isReplaying.value = false
      }
    }, 1000)
  }

  function onOffline() {
    isOnline.value = false
  }

  // Refresh queue count periodically
  let interval: ReturnType<typeof setInterval>

  onMounted(() => {
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    interval = setInterval(() => { queuedCount.value = getQueuedCount() }, 5000)
  })

  onUnmounted(() => {
    window.removeEventListener('online',  onOnline)
    window.removeEventListener('offline', onOffline)
    clearInterval(interval)
  })

  async function manualReplay() {
    if (!isOnline.value) return
    isReplaying.value = true
    await replayOfflineQueue()
    queuedCount.value = getQueuedCount()
    isReplaying.value = false
  }

  return { isOnline, queuedCount, isReplaying, manualReplay }
}
