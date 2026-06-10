// useTokenExpiry.ts
// Shows a warning banner when access token is about to expire
// Allows user to extend session before being logged out

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/plugins/axios'

export function useTokenExpiry() {
  const secondsLeft    = ref<number | null>(null)
  const showWarning    = ref(false)
  const isExtending    = ref(false)
  const WARNING_BEFORE = 120  // show warning 2 minutes before expiry

  let interval: ReturnType<typeof setInterval>

  function parseExp(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      return payload.exp ?? null
    } catch { return null }
  }

  function tick() {
    const token = localStorage.getItem('access_token')
    if (!token) { secondsLeft.value = null; showWarning.value = false; return }

    const exp = parseExp(token)
    if (!exp)  { secondsLeft.value = null; showWarning.value = false; return }

    const secs = exp - Math.floor(Date.now() / 1000)
    secondsLeft.value = secs

    // Show warning when within WARNING_BEFORE seconds
    showWarning.value = secs > 0 && secs <= WARNING_BEFORE
  }

  async function extendSession() {
    isExtending.value = true
    try {
      // Make a lightweight authenticated request — interceptor will auto-refresh
      await api.get('/auth/me')
      showWarning.value = false
      tick()  // update countdown
    } catch {
      // If refresh failed, user will be redirected to login
    } finally {
      isExtending.value = false
    }
  }

  const timeDisplay = computed(() => {
    const s = secondsLeft.value
    if (s === null || s <= 0) return '00:00'
    const m = Math.floor(s / 60)
    const r = s % 60
    return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`
  })

  onMounted(() => {
    tick()
    interval = setInterval(tick, 5000)  // check every 5s
  })

  onUnmounted(() => clearInterval(interval))

  return { showWarning, secondsLeft, timeDisplay, isExtending, extendSession }
}
