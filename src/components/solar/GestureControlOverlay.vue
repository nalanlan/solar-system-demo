<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { Camera, Hand, MousePointer2, Play, ShieldCheck, Sparkles, X } from 'lucide-vue-next'
import type { PlanetId } from '@/data/solar'

type GestureMode = 'off' | 'permission' | 'real' | 'demo' | 'paused'
type GestureName =
  | '未开启'
  | '等待授权'
  | '正在检测手部'
  | '食指光标'
  | '捏合选择'
  | '扫描模式'
  | '握拳爆炸'
  | '挥手切换'
  | '双指缩放'
  | '演示模式'
  | '未检测到手部'
  | '置信度不足'

type Landmark = {
  x: number
  y: number
  z?: number
}

const props = withDefaults(
  defineProps<{
    compact?: boolean
    selectedName?: string
    targetId?: PlanetId
  }>(),
  {
    compact: false,
    selectedName: '',
    targetId: undefined
  }
)

const emit = defineEmits<{
  move: [point: { x: number; y: number }]
  pinch: [point: { x: number; y: number }]
  fist: [point: { x: number; y: number }]
  swipePrev: []
  swipeNext: []
  zoom: [delta: number]
  rotate: [deltaX: number]
  scan: [active: boolean]
  modeChange: [mode: GestureMode]
}>()

const mode = ref<GestureMode>('off')
const gestureName = ref<GestureName>('未开启')
const confidence = ref(0)
const permissionError = ref('')
const showTutorial = ref(localStorage.getItem('solar-gesture-tutorial-dismissed') !== '1')
const cursor = ref({ x: window.innerWidth * 0.72, y: window.innerHeight * 0.45, visible: false })
const trail = ref<{ x: number; y: number; id: number }[]>([])
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let stream: MediaStream | null = null
let rafId = 0
let detector: any = null
let lastVideoTime = -1
let lastPinchAt = 0
let lastFistAt = 0
let lastSwipeAt = 0
let lastDeepScanAt = 0
let lastPalmX: number | null = null
let lastTwoFingerDistance: number | null = null
let demoStep = 0
let demoStart = 0

const statusText = computed(() => {
  if (mode.value === 'off') return '鼠标控制模式'
  if (mode.value === 'permission') return '等待摄像头授权'
  if (mode.value === 'demo') return '演示模式：模拟手势数据'
  if (permissionError.value) return permissionError.value
  return gestureName.value
})

const confidenceLabel = computed(() => {
  if (mode.value === 'demo') return 'SIM'
  if (!confidence.value) return '--'
  return `${Math.round(confidence.value * 100)}%`
})

function updateCursor(nextX: number, nextY: number, visible = true) {
  const smooth = 0.28
  cursor.value = {
    x: cursor.value.x + (nextX - cursor.value.x) * smooth,
    y: cursor.value.y + (nextY - cursor.value.y) * smooth,
    visible
  }
  trail.value = [...trail.value.slice(-13), { x: cursor.value.x, y: cursor.value.y, id: Date.now() }]
  emit('move', { x: cursor.value.x, y: cursor.value.y })
}

function setMode(nextMode: GestureMode) {
  mode.value = nextMode
  emit('modeChange', nextMode)
}

function openPermissionPanel() {
  permissionError.value = ''
  gestureName.value = '等待授权'
  setMode('permission')
}

async function startRealMode() {
  permissionError.value = ''
  stopDemo()
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 480 },
        height: { ideal: 360 },
        facingMode: 'user'
      },
      audio: false
    })
    setMode('real')
    gestureName.value = '正在检测手部'
    await nextTick()
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      await videoRef.value.play()
    }
    await initDetector()
    rafId = requestAnimationFrame(detectFrame)
  } catch (error) {
    permissionError.value = '摄像头不可用，已回到鼠标控制'
    gestureName.value = '未开启'
    stopRealMode()
    setMode('off')
  }
}

async function initDetector() {
  if (detector) return
  try {
    const vision = await import('@mediapipe/tasks-vision')
    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
    )
    detector = await vision.HandLandmarker.createFromOptions(filesetResolver, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numHands: 1
    })
  } catch (error) {
    permissionError.value = '手势模型加载失败，可使用演示模式'
    detector = null
  }
}

function detectFrame() {
  if (mode.value !== 'real') return
  const video = videoRef.value
  if (!video || !detector || video.readyState < 2) {
    rafId = requestAnimationFrame(detectFrame)
    return
  }

  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime
    const result = detector.detectForVideo(video, performance.now())
    const hand = result.landmarks?.[0] as Landmark[] | undefined
    drawSkeleton(hand)
    if (hand) handleLandmarks(hand)
    else {
      cursor.value.visible = false
      gestureName.value = '未检测到手部'
      confidence.value = 0
      emit('scan', false)
    }
  }

  rafId = requestAnimationFrame(detectFrame)
}

function drawSkeleton(hand?: Landmark[]) {
  const canvas = canvasRef.value
  const video = videoRef.value
  if (!canvas || !video) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  canvas.width = video.clientWidth || 176
  canvas.height = video.clientHeight || 112
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!hand) return

  const links = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20]
  ]
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.9)'
  ctx.lineWidth = 2
  links.forEach(([a, b]) => {
    const from = hand[a]
    const to = hand[b]
    ctx.beginPath()
    ctx.moveTo((1 - from.x) * canvas.width, from.y * canvas.height)
    ctx.lineTo((1 - to.x) * canvas.width, to.y * canvas.height)
    ctx.stroke()
  })
  ctx.fillStyle = '#facc15'
  hand.forEach(point => {
    ctx.beginPath()
    ctx.arc((1 - point.x) * canvas.width, point.y * canvas.height, 2.5, 0, Math.PI * 2)
    ctx.fill()
  })
}

function distance(a: Landmark, b: Landmark) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function handleLandmarks(hand: Landmark[]) {
  const now = performance.now()
  const indexTip = hand[8]
  const thumbTip = hand[4]
  const middleTip = hand[12]
  const wrist = hand[0]
  const tips = [hand[8], hand[12], hand[16], hand[20]]
  const mirroredX = 1 - indexTip.x
  const screenX = mirroredX * window.innerWidth
  const screenY = indexTip.y * window.innerHeight
  const palmX = (1 - wrist.x) * window.innerWidth
  const pinchDistance = distance(indexTip, thumbTip)
  const twoFingerDistance = distance(indexTip, middleTip)
  const averageTipDistance = tips.reduce((sum, tip) => sum + distance(tip, wrist), 0) / tips.length
  const isFist = averageTipDistance < 0.23
  const isOpenPalm = averageTipDistance > 0.34 && pinchDistance > 0.08

  confidence.value = Math.min(0.98, Math.max(0.62, averageTipDistance * 2.35))
  updateCursor(screenX, screenY)

  if (confidence.value < 0.68) {
    gestureName.value = '置信度不足'
    return
  }

  if (pinchDistance < 0.055 && now - lastPinchAt > 520) {
    lastPinchAt = now
    gestureName.value = '捏合选择'
    emit('pinch', { x: cursor.value.x, y: cursor.value.y })
    pulseCursor()
    return
  }

  if (isFist && now - lastFistAt > 1200) {
    lastFistAt = now
    gestureName.value = '握拳爆炸'
    emit('fist', { x: cursor.value.x, y: cursor.value.y })
    pulseCursor()
    return
  }

  if (lastPalmX !== null && now - lastSwipeAt > 1050) {
    const deltaX = palmX - lastPalmX
    if (Math.abs(deltaX) > 84) {
      lastSwipeAt = now
      gestureName.value = '挥手切换'
      if (deltaX > 0) emit('swipeNext')
      else emit('swipePrev')
      lastPalmX = palmX
      return
    }
  }

  if (isOpenPalm) {
    gestureName.value = '扫描模式'
    emit('scan', true)
    if (lastPalmX !== null) emit('rotate', palmX - lastPalmX)
    if (now - lastDeepScanAt > 1000) lastDeepScanAt = now
  } else {
    emit('scan', false)
    gestureName.value = '食指光标'
  }

  if (lastTwoFingerDistance !== null && Math.abs(twoFingerDistance - lastTwoFingerDistance) > 0.018) {
    gestureName.value = '双指缩放'
    emit('zoom', (twoFingerDistance - lastTwoFingerDistance) * 260)
  }

  lastPalmX = palmX
  lastTwoFingerDistance = twoFingerDistance
}

function pulseCursor() {
  const current = cursor.value
  trail.value = [...trail.value, { x: current.x, y: current.y, id: Date.now() + 1 }]
}

function startDemoMode() {
  stopRealMode()
  setMode('demo')
  gestureName.value = '演示模式'
  confidence.value = 1
  demoStep = 0
  demoStart = performance.now()
  rafId = requestAnimationFrame(runDemo)
}

function runDemo(now: number) {
  if (mode.value !== 'demo') return
  const elapsed = (now - demoStart) / 1000
  const phase = elapsed % 15
  const cx = window.innerWidth * (0.5 + Math.sin(elapsed * 0.85) * 0.24)
  const cy = window.innerHeight * (0.42 + Math.cos(elapsed * 0.72) * 0.14)
  updateCursor(cx, cy)

  if (phase < 3) {
    gestureName.value = '食指光标'
  } else if (phase < 5) {
    gestureName.value = '扫描模式'
    emit('scan', true)
    emit('rotate', Math.sin(elapsed) * 10)
  } else if (phase < 7 && demoStep !== 1) {
    demoStep = 1
    gestureName.value = '捏合选择'
    emit('pinch', { x: cursor.value.x, y: cursor.value.y })
  } else if (phase < 10 && demoStep !== 2) {
    demoStep = 2
    gestureName.value = '挥手切换'
    emit('swipeNext')
  } else if (phase < 12 && demoStep !== 3) {
    demoStep = 3
    gestureName.value = '握拳爆炸'
    emit('fist', { x: cursor.value.x, y: cursor.value.y })
  } else if (phase >= 12) {
    if (demoStep !== 4) {
      demoStep = 4
      emit('zoom', -80)
    }
    if (phase > 14.7) demoStep = 0
  }

  rafId = requestAnimationFrame(runDemo)
}

function stopDemo() {
  if (mode.value === 'demo') cancelAnimationFrame(rafId)
}

function stopRealMode() {
  cancelAnimationFrame(rafId)
  stream?.getTracks().forEach(track => track.stop())
  stream = null
  if (videoRef.value) videoRef.value.srcObject = null
  cursor.value.visible = false
  emit('scan', false)
}

function closeGestureMode() {
  stopRealMode()
  stopDemo()
  gestureName.value = '未开启'
  confidence.value = 0
  permissionError.value = ''
  setMode('off')
}

function dismissTutorial() {
  showTutorial.value = false
  localStorage.setItem('solar-gesture-tutorial-dismissed', '1')
}

onBeforeUnmount(() => {
  closeGestureMode()
})
</script>

<template>
  <div class="gesture-layer" :class="{ compact }">
    <button v-if="mode === 'off'" class="gesture-open-button" type="button" @click="openPermissionPanel">
      <Hand :size="18" />
      开启手势探索
    </button>

    <div v-if="mode === 'permission'" class="gesture-permission scan-panel">
      <button class="gesture-close" type="button" aria-label="关闭手势说明" @click="closeGestureMode">
        <X :size="18" />
      </button>
      <p class="panel-label">AI GESTURE CONTROL</p>
      <h3>开启视觉手势控制</h3>
      <p>摄像头仅用于本地识别手部关键点，不上传、不保存、不截图画面。你可以随时关闭并回到鼠标控制。</p>
      <div class="gesture-privacy-list">
        <span><ShieldCheck :size="16" /> 本地识别</span>
        <span><Camera :size="16" /> 需要摄像头授权</span>
        <span><MousePointer2 :size="16" /> 鼠标模式保留</span>
      </div>
      <div class="gesture-actions">
        <button class="glow-button primary" type="button" @click="startRealMode">
          <Camera :size="17" /> 授权并开启
        </button>
        <button class="glow-button secondary" type="button" @click="startDemoMode">
          <Play :size="17" /> 使用演示模式
        </button>
      </div>
    </div>

    <div v-if="mode !== 'off' && mode !== 'permission'" class="gesture-hud scan-panel">
      <div class="gesture-hud-head">
        <span>{{ mode === 'demo' ? 'DEMO GESTURE' : 'CAMERA ONLINE' }}</span>
        <button type="button" @click="closeGestureMode">关闭</button>
      </div>
      <strong>{{ statusText }}</strong>
      <small>置信度 {{ confidenceLabel }} · 目标 {{ selectedName || '未锁定' }}</small>
      <div class="gesture-signal">
        <span :style="{ width: mode === 'demo' ? '100%' : `${Math.round(confidence * 100)}%` }"></span>
      </div>
    </div>

    <div v-if="mode === 'real'" class="camera-preview">
      <video ref="videoRef" muted playsinline></video>
      <canvas ref="canvasRef"></canvas>
      <span>{{ gestureName }}</span>
    </div>

    <div v-if="showTutorial && mode !== 'off'" class="gesture-tutorial scan-panel">
      <button class="gesture-close" type="button" aria-label="关闭手势教学" @click="dismissTutorial">
        <X :size="16" />
      </button>
      <p class="panel-label">GESTURE GUIDE</p>
      <div class="gesture-guide-grid">
        <span>食指移动：移动光标</span>
        <span>捏合：选择 / 点击</span>
        <span>张开手掌：扫描信息</span>
        <span>握拳：粒子爆炸 / 返回全景</span>
        <span>左右挥手：切换行星</span>
        <span>双指张合：缩放镜头</span>
      </div>
    </div>

    <div
      v-if="cursor.visible || mode === 'demo'"
      class="gesture-cursor"
      :class="{ pulse: gestureName === '捏合选择' || gestureName === '握拳爆炸' }"
      :style="{ left: `${cursor.x}px`, top: `${cursor.y}px` }"
    >
      <Sparkles :size="16" />
    </div>
    <span
      v-for="point in trail"
      :key="point.id"
      class="gesture-trail-dot"
      :style="{ left: `${point.x}px`, top: `${point.y}px` }"
    ></span>
  </div>
</template>
