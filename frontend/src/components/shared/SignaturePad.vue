<!--
  SignaturePad.vue
  ─────────────────
  Canvas-based signature drawing pad.
  Emits a PNG Blob when user finishes signing.
  Usage:
    <SignaturePad v-model="signatureBlob" label="Your Signature (optional)" />
-->
<template>
  <div>
    <div class="text-caption font-weight-bold text-medium-emphasis mb-2">
      {{ label }}
      <v-chip v-if="!required" size="x-small" color="grey" variant="tonal" class="ml-1">optional</v-chip>
      <v-chip v-else            size="x-small" color="error" variant="tonal" class="ml-1">required</v-chip>
    </div>

    <v-card variant="outlined" rounded="lg" :color="hasSig ? 'success' : undefined">
      <!-- Canvas drawing area -->
      <div style="position:relative">
        <canvas
          ref="canvas"
          :width="width"
          :height="height"
          style="display:block; touch-action:none; cursor:crosshair; border-radius:8px; background:#fafafa"
          @mousedown="startDraw"
          @mousemove="draw"
          @mouseup="endDraw"
          @mouseleave="endDraw"
          @touchstart.prevent="startDrawTouch"
          @touchmove.prevent="drawTouch"
          @touchend="endDraw"
        />

        <!-- Placeholder text when empty -->
        <div v-if="!hasSig" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none">
          <div class="text-center">
            <v-icon size="32" color="grey-lighten-2">mdi-draw-pen</v-icon>
            <div class="text-caption text-disabled mt-1">Sign here — ចុះហត្ថលេខា</div>
          </div>
        </div>

        <!-- Clear button (top-right) -->
        <v-btn v-if="hasSig"
          icon size="x-small" color="error" variant="elevated"
          style="position:absolute; top:6px; right:6px"
          @click="clear">
          <v-icon size="14">mdi-close</v-icon>
          <v-tooltip activator="parent">Clear signature</v-tooltip>
        </v-btn>
      </div>

      <!-- Footer actions -->
      <div class="d-flex align-center justify-space-between pa-2" style="border-top:1px solid rgba(0,0,0,0.08)">
        <div class="text-caption text-medium-emphasis">
          <v-icon size="12" class="mr-1">mdi-gesture-tap-hold</v-icon>
          Draw your signature above
        </div>
        <div class="d-flex ga-2 align-center">
          <!-- Upload existing signature image -->
          <v-btn size="x-small" variant="text" color="primary"
            prepend-icon="mdi-upload" @click="triggerUpload">
            Upload Image
          </v-btn>
          <v-btn v-if="hasSig" size="x-small" variant="tonal" color="error" @click="clear">
            Clear
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- Preview of uploaded signature -->
    <div v-if="uploadPreview" class="mt-2">
      <v-img :src="uploadPreview" max-height="80" contain rounded="lg"
        style="border:1px solid #e2e8f0; background:#fafafa"/>
    </div>

    <!-- Hidden file input for image upload -->
    <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp"
      style="display:none" @change="handleUpload"/>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: File | Blob | null
  label?: string
  required?: boolean
  width?: number
  height?: number
}>(), {
  label:    'Signature',
  required: false,
  width:    500,
  height:   160,
})

const emit = defineEmits<{
  (e: 'update:modelValue', val: File | Blob | null): void
}>()

const canvas      = ref<HTMLCanvasElement>()
const fileInput   = ref<HTMLInputElement>()
const isDrawing   = ref(false)
const hasSig      = ref(false)
const uploadPreview = ref<string>('')

let ctx: CanvasRenderingContext2D | null = null
let lastX = 0, lastY = 0

onMounted(() => {
  if (!canvas.value) return
  ctx = canvas.value.getContext('2d')!
  ctx.strokeStyle = '#1A2744'
  ctx.lineWidth   = 2.5
  ctx.lineCap     = 'round'
  ctx.lineJoin    = 'round'
})

function getPos(e: MouseEvent) {
  const rect = canvas.value!.getBoundingClientRect()
  const scaleX = canvas.value!.width / rect.width
  const scaleY = canvas.value!.height / rect.height
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
}

function getTouchPos(e: TouchEvent) {
  const rect  = canvas.value!.getBoundingClientRect()
  const touch = e.touches[0]
  const scaleX = canvas.value!.width / rect.width
  const scaleY = canvas.value!.height / rect.height
  return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
}

function startDraw(e: MouseEvent) {
  isDrawing.value = true
  const { x, y } = getPos(e)
  lastX = x; lastY = y
  ctx!.beginPath(); ctx!.moveTo(x, y)
}

function draw(e: MouseEvent) {
  if (!isDrawing.value) return
  const { x, y } = getPos(e)
  ctx!.lineTo(x, y); ctx!.stroke()
  lastX = x; lastY = y
  hasSig.value = true
  uploadPreview.value = ''
  emitBlob()
}

function startDrawTouch(e: TouchEvent) {
  isDrawing.value = true
  const { x, y } = getTouchPos(e)
  lastX = x; lastY = y
  ctx!.beginPath(); ctx!.moveTo(x, y)
}

function drawTouch(e: TouchEvent) {
  if (!isDrawing.value) return
  const { x, y } = getTouchPos(e)
  ctx!.lineTo(x, y); ctx!.stroke()
  hasSig.value = true
  uploadPreview.value = ''
  emitBlob()
}

function endDraw() { isDrawing.value = false }

function clear() {
  if (!canvas.value || !ctx) return
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  hasSig.value = false
  uploadPreview.value = ''
  emit('update:modelValue', null)
}

function emitBlob() {
  canvas.value?.toBlob(blob => {
    if (blob) emit('update:modelValue', blob)
  }, 'image/png')
}

// Upload existing signature image
function triggerUpload() { fileInput.value?.click() }

function handleUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  uploadPreview.value = ''
  hasSig.value = true

  const reader = new FileReader()
  reader.onload = evt => {
    uploadPreview.value = evt.target?.result as string
    // Draw it on canvas too
    const img = new Image()
    img.onload = () => {
      ctx!.clearRect(0, 0, canvas.value!.width, canvas.value!.height)
      ctx!.drawImage(img, 0, 0, canvas.value!.width, canvas.value!.height)
    }
    img.src = uploadPreview.value
  }
  reader.readAsDataURL(file)
  emit('update:modelValue', file)
}
</script>
