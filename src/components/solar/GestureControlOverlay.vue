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

type GestureType = 'none' | 'pointer' | 'pinch' | 'open-palm' | 'fist' | 'swipe' | 'zoom'

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
let detector: import('@mediapipe/tasks-vision').HandLandmarker | null = null
let lastVideoTime = -1
let lastDetectionAt = 0
let pinchLatched = false
let fistStableFrames = 0
let openPalmStableFrames = 0
let lastFistAt = 0
let lastSwipeAt = 0
let lastPalmX: number | null = null
let lastTwoFingerDistance: number | null = null
let swipeStartX: number | null = null
let swipeStartAt = 0
let activeGesture: GestureType = 'none'
let demoStep = 0
let demoStart = 0
let drawWidth = 0
let drawHeight = 0

const detectionInterval = 1000 / 24

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
  if (stream || mode.value === 'real') return
  permissionError.value = ''
  stopAllLoops()
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('media-devices-unavailable')
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
    if (!detector) throw new Error('detector-unavailable')
    lastVideoTime = -1
    lastDetectionAt = 0
    lastFistAt = 0
    lastSwipeAt = 0
    rafId = requestAnimationFrame(detectFrame)
  } catch {
    permissionError.value = '摄像头或手势模型不可用，请重试或使用演示模式。'
    gestureName.value = '未开启'
    stopRealMode()
    setMode('permission')
  }
}

async function initDetector() {
  if (detector) return
  try {
    const vision = await import('@mediapipe/tasks-vision')
    const filesetResolver = await vision.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
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
  } catch {
    detector = null
    throw new Error('hand-landmarker-load-failed')
  }
}

function detectFrame() {
  if (mode.value !== 'real') return
  const video = videoRef.value
  if (!video || !detector || video.readyState < 2) {
    rafId = requestAnimationFrame(detectFrame)
    return
  }

  const now = performance.now()
  if (video.currentTime !== lastVideoTime && now - lastDetectionAt >= detectionInterval) {
    lastVideoTime = video.currentTime
    lastDetectionAt = now
    try {
      const result = detector.detectForVideo(video, now)
      const hand = result.landmarks?.[0] as Landmark[] | undefined
      drawSkeleton(hand)
      if (hand) handleLandmarks(hand)
      else handleNoHand()
    } catch {
      permissionError.value = '手势识别暂时中断，请重试或切换演示模式。'
      stopRealMode()
      setMode('permission')
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
  const nextWidth = video.clientWidth || 176
  const nextHeight = video.clientHeight || 112
  if (drawWidth !== nextWidth || drawHeight !== nextHeight) {
    drawWidth = nextWidth
    drawHeight = nextHeight
    canvas.width = drawWidth
    canvas.height = drawHeight
  }
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

function resetGestureState() {
  pinchLatched = false
  fistStableFrames = 0
  openPalmStableFrames = 0
  lastPalmX = null
  lastTwoFingerDistance = null
  swipeStartX = null
  swipeStartAt = 0
  activeGesture = 'none'
}

function handleNoHand() {
  cursor.value.visible = false
  gestureName.value = '未检测到手部'
  confidence.value = 0
  emit('scan', false)
  resetGestureState()
}

function setActiveGesture(next: GestureType) {
  activeGesture = next
  if (next === 'open-palm') gestureName.value = '扫描模式'
  else if (next === 'fist') gestureName.value = '握拳爆炸'
  else if (next === 'pinch') gestureName.value = '捏合选择'
  else if (next === 'zoom') gestureName.value = '双指缩放'
  else if (next === 'swipe') gestureName.value = '挥手切换'
  else gestureName.value = '食指光标'
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
  const palmScale = Math.max(distance(wrist, hand[9]), 0.04)
  const pinchRatio = pinchDistance / palmScale
  const averageTipRatio = tips.reduce((sum, tip) => sum + distance(tip, wrist) / palmScale, 0) / tips.length
  const isFistCandidate = averageTipRatio < 2.15
  const isOpenPalmCandidate = averageTipRatio > 3.15 && pinchRatio > 0.72
  const isTwoFingerCandidate = twoFingerDistance / palmScale > 0.9 && !isOpenPalmCandidate && !isFistCandidate

  confidence.value = Math.min(0.98, Math.max(0.62, Math.min(1, averageTipRatio / 4)))
  updateCursor(screenX, screenY)

  if (confidence.value < 0.68) {
    gestureName.value = '置信度不足'
    return
  }

  if (pinchRatio < 0.5) {
    if (!pinchLatched) {
      pinchLatched = true
      setActiveGesture('pinch')
      emit('pinch', { x: cursor.value.x, y: cursor.value.y })
      pulseCursor()
    }
    lastPalmX = palmX
    lastTwoFingerDistance = null
    return
  }
  if (pinchLatched && pinchRatio > 0.72) pinchLatched = false

  if (isFistCandidate) fistStableFrames += 1
  else fistStableFrames = 0
  if (fistStableFrames >= 5 && now - lastFistAt > 1200) {
    lastFistAt = now
    setActiveGesture('fist')
    emit('fist', { x: cursor.value.x, y: cursor.value.y })
    pulseCursor()
    return
  }

  openPalmStableFrames = isOpenPalmCandidate ? openPalmStableFrames + 1 : 0
  const palmReady = openPalmStableFrames >= 4
  if (swipeStartX === null) {
    swipeStartX = palmX
    swipeStartAt = now
  }
  const swipeDistance = palmX - swipeStartX
  const swipeDuration = now - swipeStartAt
  if (Math.abs(swipeDistance) > 120 && swipeDuration < 700 && now - lastSwipeAt > 1050) {
    lastSwipeAt = now
    setActiveGesture('swipe')
    if (swipeDistance > 0) emit('swipeNext')
    else emit('swipePrev')
    swipeStartX = palmX
    swipeStartAt = now
    lastPalmX = palmX
    lastTwoFingerDistance = null
    return
  }

  if (palmReady) {
    setActiveGesture('open-palm')
    emit('scan', true)
    if (lastPalmX !== null) emit('rotate', clampDelta(palmX - lastPalmX))
  } else if (isTwoFingerCandidate) {
    setActiveGesture('zoom')
    emit('scan', false)
    const currentDistance = twoFingerDistance / palmScale
    if (lastTwoFingerDistance !== null && Math.abs(currentDistance - lastTwoFingerDistance) > 0.045) {
      emit('zoom', Math.max(-36, Math.min(36, (currentDistance - lastTwoFingerDistance) * 34)))
    }
    lastTwoFingerDistance = currentDistance
  } else {
    setActiveGesture('pointer')
    emit('scan', false)
    lastTwoFingerDistance = null
  }

  lastPalmX = palmX
}

function clampDelta(value: number) {
  return Math.max(-18, Math.min(18, value))
}

function pulseCursor() {
  const current = cursor.value
  trail.value = [...trail.value, { x: current.x, y: current.y, id: Date.now() + 1 }]
}

function startDemoMode() {
  stopRealMode()
  lastFistAt = 0
  lastSwipeAt = 0
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
  cancelAnimationFrame(rafId)
  rafId = 0
}

function stopAllLoops() {
  cancelAnimationFrame(rafId)
  emit('scan', false)
}

function stopRealMode() {
  cancelAnimationFrame(rafId)
  rafId = 0
  stream?.getTracks().forEach(track => track.stop())
  stream = null
  if (videoRef.value) videoRef.value.srcObject = null
  cursor.value.visible = false
  trail.value = []
  resetGestureState()
  lastVideoTime = -1
  lastDetectionAt = 0
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
      <p v-if="permissionError" class="gesture-error">{{ permissionError }}</p>
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

    <div v-if="showTutorial && mode !== 'off' && mode !== 'permission'" class="gesture-tutorial scan-panel">
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
