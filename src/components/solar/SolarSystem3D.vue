<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { planets, type Planet, type PlanetId } from '@/data/solar'

type LabelState = {
  id: PlanetId
  name: string
  x: number
  y: number
  visible: boolean
  active: boolean
}

type PlanetConfig = {
  orbitRadius: number
  orbitSpeed: number
  rotationSpeed: number
  size: number
  tilt: number
  startAngle: number
}

type GestureHit = {
  id: PlanetId | null
  world: THREE.Vector3
}

type ParticleBurst = {
  points: THREE.Points
  geometry: THREE.BufferGeometry
  material: THREE.PointsMaterial
  positions: Float32Array
  velocities: Float32Array
  age: number
  duration: number
  attachedTo?: PlanetId
}

const props = withDefaults(
  defineProps<{
    mode?: 'hero' | 'map' | 'detail'
    focusId?: PlanetId
    interactive?: boolean
    selectedId?: PlanetId
    speedMultiplier?: number
    paused?: boolean
    showOrbits?: boolean
    showLabels?: boolean
    scaleMode?: 'demo' | 'real'
    autoCruise?: boolean
  }>(),
  {
    mode: 'hero',
    focusId: 'earth',
    interactive: true,
    selectedId: 'earth',
    speedMultiplier: 1,
    paused: false,
    showOrbits: true,
    showLabels: true,
    scaleMode: 'demo',
    autoCruise: false
  }
)

const emit = defineEmits<{
  select: [id: PlanetId]
  hover: [id: PlanetId | null]
  reset: []
}>()

const stageRef = ref<HTMLDivElement | null>(null)
const hoveredId = ref<PlanetId | null>(null)
const labels = ref<LabelState[]>([])

const activePlanet = computed(() => {
  const id = hoveredId.value || props.selectedId || props.focusId
  return planets.find(planet => planet.id === id) || planets[2]
})

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let animationId = 0
let resizeObserver: ResizeObserver | null = null
let solarRoot: THREE.Group | null = null
let planetGroup: THREE.Group | null = null
let orbitGroup: THREE.Group | null = null
let starField: THREE.Points | null = null
let raycaster: THREE.Raycaster | null = null
let pointer = new THREE.Vector2(10, 10)
let pointerTarget = new THREE.Vector2(0, 0)
let dragStart: { x: number; y: number; rotX: number; rotY: number } | null = null
let targetCameraPosition = new THREE.Vector3()
let targetLookAt = new THREE.Vector3()
let currentLookAt = new THREE.Vector3()
let orbitClock = 0

const planetMeshes = new Map<PlanetId, THREE.Mesh>()
const orbitLines = new Map<PlanetId, THREE.LineLoop>()
const planetConfigs = new Map<PlanetId, PlanetConfig>()
const particleBursts: ParticleBurst[] = []

const isMobile = () => window.matchMedia('(max-width: 760px), (prefers-reduced-motion: reduce)').matches
const sceneCenterX = () => (props.mode === 'hero' ? 1.4 : 0)
const activeIds = () => (props.mode === 'detail' ? [props.focusId] : planets.map(planet => planet.id))

function configFor(index: number): PlanetConfig {
  const demoRadii = [1.7, 2.35, 3.05, 3.75, 5.25, 6.55, 7.65, 8.75]
  const realRadii = [1.35, 2.15, 3.1, 4.25, 7.1, 9.4, 11.4, 13.2]
  const radii = props.scaleMode === 'real' ? realRadii : demoRadii
  const sizeBoost = props.mode === 'hero' ? 1.45 : props.mode === 'map' ? 1 : 2.2
  const sizes = [0.18, 0.26, 0.29, 0.25, 0.58, 0.52, 0.38, 0.39]
  const orbitSpeeds = [0.84, 0.58, 0.42, 0.35, 0.18, 0.14, 0.1, 0.078]
  const rotationSpeeds = [0.26, 0.18, 0.34, 0.3, 0.62, 0.48, 0.22, 0.24]
  const tilts = [0.03, 3.09, 0.41, 0.44, 0.05, 0.47, 1.71, 0.49]

  return {
    orbitRadius: radii[index],
    orbitSpeed: orbitSpeeds[index],
    rotationSpeed: rotationSpeeds[index],
    size: sizes[index] * sizeBoost,
    tilt: tilts[index],
    startAngle: index * 0.82 + 0.6
  }
}

function makeHalo(color: string, size = 256) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, color)
  gradient.addColorStop(0.22, color)
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

function createStars() {
  const count = isMobile() ? 650 : 1800
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  for (let index = 0; index < count; index += 1) {
    const radius = 20 + Math.random() * 46
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[index * 3 + 2] = radius * Math.cos(phi)
    const tint = 0.62 + Math.random() * 0.38
    colors[index * 3] = tint * 0.55
    colors[index * 3 + 1] = tint * 0.82
    colors[index * 3 + 2] = tint
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: props.mode === 'hero' ? 0.048 : 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    })
  )
}

function createOrbit(radius: number, index: number) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius * 0.58, 0, Math.PI * 2)
  const points = curve.getPoints(220).map(point => new THREE.Vector3(point.x + sceneCenterX(), 0, point.y))
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  const line = new THREE.LineLoop(
    geometry,
    new THREE.LineBasicMaterial({
      color: index % 2 ? 0x8b5cf6 : 0x22d3ee,
      transparent: true,
      opacity: 0.36,
      fog: false
    })
  )
  line.rotation.x = Math.PI * 0.08
  return line
}

function createAsteroidBelt() {
  const count = isMobile() ? 420 : 1600
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(count * 3)

  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2
    const radius = 4.45 + Math.random() * 0.55
    positions[index * 3] = Math.cos(angle) * radius + sceneCenterX()
    positions[index * 3 + 1] = (Math.random() - 0.5) * 0.18
    positions[index * 3 + 2] = Math.sin(angle) * radius * 0.58
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xaecbff,
      size: 0.032,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    })
  )
}

function createSun() {
  if (!planetGroup) return
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(props.mode === 'hero' ? 1.08 : 0.78, 72, 72),
    new THREE.MeshBasicMaterial({ color: props.mode === 'hero' ? 0xffdd44 : 0xffc733, fog: false })
  )
  sun.position.set(sceneCenterX(), 0, 0)
  sun.userData.kind = 'sun'
  planetGroup.add(sun)

  const haloTexture = makeHalo('rgba(250, 204, 21, 0.82)')
  if (haloTexture) {
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    )
    const scale = props.mode === 'hero' ? 6.6 : 4.3
    halo.scale.set(scale, scale, 1)
    halo.position.copy(sun.position)
    planetGroup.add(halo)
  }
}

function createPlanet(planet: Planet, index: number, textureLoader: THREE.TextureLoader) {
  if (!planetGroup) return
  const config = configFor(index)
  planetConfigs.set(planet.id, config)

  const texture = textureLoader.load(planet.image)
  texture.colorSpace = THREE.SRGBColorSpace
  const sphereSegments = isMobile() ? 36 : props.mode === 'detail' ? 96 : 56
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(props.mode === 'detail' ? 1.75 : config.size, sphereSegments, sphereSegments),
    new THREE.MeshStandardMaterial({
      map: texture,
      roughness: planet.id === 'mercury' || planet.id === 'mars' ? 0.9 : 0.62,
      metalness: 0.03,
      emissive: new THREE.Color(planet.color),
      emissiveIntensity: props.mode === 'hero' ? 0.18 : planet.id === props.selectedId ? 0.16 : 0.05
    })
  )

  mesh.rotation.z = config.tilt
  mesh.userData.planetId = planet.id
  mesh.userData.index = index
  mesh.userData.config = config

  if (props.mode === 'detail') {
    mesh.position.set(1.15, 0, 0)
  } else {
    const angle = config.startAngle
    mesh.position.set(
      Math.cos(angle) * config.orbitRadius + sceneCenterX(),
      0,
      Math.sin(angle) * config.orbitRadius * 0.58
    )
  }

  if (planet.id === 'earth') {
    const cloud = new THREE.Mesh(
      new THREE.SphereGeometry((props.mode === 'detail' ? 1.75 : config.size) * 1.025, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.16,
        depthWrite: false
      })
    )
    cloud.userData.cloudLayer = true
    mesh.add(cloud)

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry((props.mode === 'detail' ? 0.16 : 0.08), 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xc9d0d8, roughness: 0.9 })
    )
    moon.userData.moon = true
    moon.position.set(props.mode === 'detail' ? 2.6 : 0.65, 0.08, 0)
    mesh.add(moon)
  }

  if (planet.id === 'saturn' || planet.id === 'uranus') {
    const inner = planet.id === 'saturn' ? 1.45 : 1.25
    const outer = planet.id === 'saturn' ? 2.08 : 1.45
    const ring = new THREE.Mesh(
      new THREE.RingGeometry((props.mode === 'detail' ? 1.75 : config.size) * inner, (props.mode === 'detail' ? 1.75 : config.size) * outer, 128),
      new THREE.MeshBasicMaterial({
        color: planet.id === 'saturn' ? 0xf8dda0 : 0x9be7ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: planet.id === 'saturn' ? 0.58 : 0.22,
        depthWrite: false
      })
    )
    ring.rotation.x = Math.PI * 0.62
    ring.userData.ring = true
    mesh.add(ring)
  }

  const haloTexture = makeHalo(`${planet.color}88`, 160)
  if (haloTexture) {
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: haloTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: props.mode === 'detail' ? 0.58 : 0.34
      })
    )
    const haloScale = props.mode === 'detail' ? 4.5 : config.size * 4.2
    halo.scale.set(haloScale, haloScale, 1)
    mesh.add(halo)
  }

  planetMeshes.set(planet.id, mesh)
  planetGroup.add(mesh)
}

function setCameraPreset() {
  if (!camera) return
  if (props.mode === 'hero') {
    camera.position.set(-1.4, 4.2, 10.4)
    targetCameraPosition.copy(camera.position)
    targetLookAt.set(sceneCenterX() + 1.6, 0, 0)
  } else if (props.mode === 'map') {
    camera.position.set(0, 6.2, 10.6)
    targetCameraPosition.copy(camera.position)
    targetLookAt.set(sceneCenterX(), 0, 0)
  } else {
    camera.position.set(0.5, 1.25, 5.2)
    targetCameraPosition.copy(camera.position)
    targetLookAt.set(1.15, 0, 0)
  }
  currentLookAt.copy(targetLookAt)
  camera.lookAt(currentLookAt)
}

function buildScene() {
  const stage = stageRef.value
  if (!stage) return

  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x020617, props.mode === 'detail' ? 0.045 : 0.032)

  camera = new THREE.PerspectiveCamera(48, stage.clientWidth / Math.max(stage.clientHeight, 1), 0.1, 140)
  setCameraPreset()

  renderer = new THREE.WebGLRenderer({ antialias: !isMobile(), alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile() ? 1.25 : 1.8))
  renderer.setSize(stage.clientWidth, stage.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  stage.appendChild(renderer.domElement)

  scene.add(new THREE.AmbientLight(0x9fdcff, props.mode === 'hero' ? 0.92 : props.mode === 'detail' ? 0.72 : 0.54))
  const sunLight = new THREE.PointLight(0xffd06a, props.mode === 'hero' ? 7.2 : 4.2, 48)
  sunLight.position.set(sceneCenterX(), 0.5, 0.35)
  scene.add(sunLight)
  const rimLight = new THREE.DirectionalLight(0x62e7ff, props.mode === 'hero' ? 2.05 : 1.35)
  rimLight.position.set(4, 5, 6)
  scene.add(rimLight)

  starField = createStars()
  scene.add(starField)

  solarRoot = new THREE.Group()
  planetGroup = new THREE.Group()
  orbitGroup = new THREE.Group()
  solarRoot.add(orbitGroup, planetGroup)
  solarRoot.rotation.x = props.mode === 'detail' ? 0 : Math.PI * 0.08
  scene.add(solarRoot)

  const textureLoader = new THREE.TextureLoader()
  if (props.mode !== 'detail') createSun()

  const ids = activeIds()
  planets.forEach((planet, index) => {
    if (!ids.includes(planet.id)) return
    if (props.mode !== 'detail' && orbitGroup) {
      const orbit = createOrbit(configFor(index).orbitRadius, index)
      orbit.visible = props.showOrbits
      orbitLines.set(planet.id, orbit)
      orbitGroup.add(orbit)
    }
    createPlanet(planet, index, textureLoader)
  })

  if (props.mode !== 'detail' && orbitGroup) orbitGroup.add(createAsteroidBelt())

  raycaster = new THREE.Raycaster()
}

function updatePointer(event: PointerEvent) {
  if (!stageRef.value) return
  const bounds = stageRef.value.getBoundingClientRect()
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
  pointer.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1)
  pointerTarget.x = pointer.x
  pointerTarget.y = pointer.y
}

function screenToStagePointer(screenX: number, screenY: number) {
  if (!stageRef.value) return null
  const bounds = stageRef.value.getBoundingClientRect()
  const x = THREE.MathUtils.clamp((screenX - bounds.left) / Math.max(bounds.width, 1), 0, 1)
  const y = THREE.MathUtils.clamp((screenY - bounds.top) / Math.max(bounds.height, 1), 0, 1)
  pointer.x = x * 2 - 1
  pointer.y = -(y * 2 - 1)
  pointerTarget.x = pointer.x
  pointerTarget.y = pointer.y
  return { x: pointer.x, y: pointer.y }
}

function hitFromScreen(screenX: number, screenY: number): GestureHit | null {
  if (!camera || !raycaster) return null
  const nextPointer = screenToStagePointer(screenX, screenY)
  if (!nextPointer) return null

  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects([...planetMeshes.values()], true)
  const hit = hits.find(item => item.object.userData.planetId || item.object.parent?.userData.planetId)
  const id = (hit?.object.userData.planetId || hit?.object.parent?.userData.planetId || null) as PlanetId | null

  if (hit) {
    return { id, world: hit.point.clone() }
  }

  const fallback = raycaster.ray.origin.clone().add(raycaster.ray.direction.clone().multiplyScalar(props.mode === 'detail' ? 4.2 : 7.4))
  return { id: null, world: fallback }
}

function spawnParticleBurst(position: THREE.Vector3, type: 'pinch' | 'fist' | 'focus' = 'pinch', attachedTo?: PlanetId | null) {
  if (!scene) return
  const count = isMobile() ? (type === 'fist' ? 72 : 34) : type === 'fist' ? 210 : type === 'focus' ? 130 : 70
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const palette = [
    new THREE.Color(0x22d3ee),
    new THREE.Color(0x8b5cf6),
    new THREE.Color(0xfacc15)
  ]

  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2
    const z = Math.random() * 2 - 1
    const radial = Math.sqrt(Math.max(0, 1 - z * z))
    const speed = type === 'fist' ? 0.055 + Math.random() * 0.105 : 0.02 + Math.random() * 0.055
    const ringBias = type === 'focus' ? 0.3 : 1
    positions[index * 3] = position.x
    positions[index * 3 + 1] = position.y
    positions[index * 3 + 2] = position.z
    velocities[index * 3] = Math.cos(angle) * radial * speed
    velocities[index * 3 + 1] = z * speed * ringBias
    velocities[index * 3 + 2] = Math.sin(angle) * radial * speed
    const color = palette[index % palette.length]
    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const material = new THREE.PointsMaterial({
    size: type === 'fist' ? 0.075 : 0.052,
    vertexColors: true,
    transparent: true,
    opacity: type === 'fist' ? 0.96 : 0.82,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const points = new THREE.Points(geometry, material)
  scene.add(points)
  particleBursts.push({
    points,
    geometry,
    material,
    positions,
    velocities,
    age: 0,
    duration: type === 'fist' ? 1.25 : 0.72,
    attachedTo: attachedTo || undefined
  })
}

function updateHover(event: PointerEvent) {
  updatePointer(event)
  if (!camera || !raycaster || !props.interactive) return
  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObjects([...planetMeshes.values()], true)
  const hit = hits.find(item => item.object.userData.planetId || item.object.parent?.userData.planetId)
  const nextId = (hit?.object.userData.planetId || hit?.object.parent?.userData.planetId || null) as PlanetId | null
  if (nextId !== hoveredId.value) {
    hoveredId.value = nextId
    emit('hover', nextId)
  }
}

function setHover(id: PlanetId | null) {
  hoveredId.value = id
  emit('hover', id)
}

function selectPlanet(id: PlanetId) {
  emit('select', id)
}

function handleClick() {
  if (hoveredId.value) {
    emit('select', hoveredId.value)
    focusPlanet(hoveredId.value)
  }
}

function handleDoubleClick() {
  emit('reset')
  setCameraPreset()
}

function handlePointerDown(event: PointerEvent) {
  updatePointer(event)
  if (props.mode !== 'map' || !solarRoot) return
  dragStart = {
    x: event.clientX,
    y: event.clientY,
    rotX: solarRoot.rotation.x,
    rotY: solarRoot.rotation.y
  }
}

function handlePointerMove(event: PointerEvent) {
  updateHover(event)
  if (!dragStart || props.mode !== 'map' || !solarRoot) return
  solarRoot.rotation.y = dragStart.rotY + (event.clientX - dragStart.x) * 0.006
  solarRoot.rotation.x = THREE.MathUtils.clamp(dragStart.rotX + (event.clientY - dragStart.y) * 0.003, -0.25, 0.95)
}

function handlePointerUp() {
  dragStart = null
}

function handleWheel(event: WheelEvent) {
  if (props.mode !== 'map') return
  event.preventDefault()
  const nextZ = THREE.MathUtils.clamp(targetCameraPosition.z + event.deltaY * 0.008, 5.6, 18)
  targetCameraPosition.z = nextZ
}

function focusPlanet(id: PlanetId) {
  const mesh = planetMeshes.get(id)
  if (!mesh || !camera) return
  const worldPosition = new THREE.Vector3()
  mesh.getWorldPosition(worldPosition)
  targetLookAt.copy(worldPosition)
  const side = new THREE.Vector3(1.6, 1.15, 2.35)
  targetCameraPosition.copy(worldPosition.clone().add(side))

  planetMeshes.forEach((item, planetId) => {
    const material = item.material as THREE.MeshStandardMaterial
    material.emissiveIntensity = planetId === id ? 0.22 : 0.035
  })
  orbitLines.forEach((line, planetId) => {
    const material = line.material as THREE.LineBasicMaterial
    material.opacity = planetId === id ? 0.82 : 0.18
  })
}

function gestureMove(screenX: number, screenY: number) {
  const hit = hitFromScreen(screenX, screenY)
  const nextId = hit?.id || null
  if (nextId !== hoveredId.value) {
    hoveredId.value = nextId
    emit('hover', nextId)
  }
  return nextId
}

function gesturePinch(screenX: number, screenY: number) {
  const hit = hitFromScreen(screenX, screenY)
  if (!hit) return null
  spawnParticleBurst(hit.world, hit.id ? 'focus' : 'pinch', hit.id)
  if (hit.id) {
    hoveredId.value = hit.id
    emit('hover', hit.id)
    focusPlanet(hit.id)
    emit('select', hit.id)
  }
  return hit.id
}

function gestureBurst(screenX: number, screenY: number) {
  const hit = hitFromScreen(screenX, screenY)
  if (!hit) return null
  spawnParticleBurst(hit.world, 'fist', hit.id)
  if (hit.id) {
    const orbit = orbitLines.get(hit.id)
    if (orbit) {
      const material = orbit.material as THREE.LineBasicMaterial
      material.opacity = 0.92
    }
  } else if (props.mode === 'map') {
    emit('reset')
    setCameraPreset()
  }
  return hit.id
}

function gestureZoom(delta: number) {
  if (props.mode === 'detail') {
    targetCameraPosition.z = THREE.MathUtils.clamp(targetCameraPosition.z - delta * 0.014, 3.4, 7.2)
    return
  }
  targetCameraPosition.z = THREE.MathUtils.clamp(targetCameraPosition.z - delta * 0.018, 5.4, 18)
}

function gestureRotate(deltaX: number) {
  if (!solarRoot) return
  solarRoot.rotation.y += deltaX * 0.0035
}

function gestureFocus(id: PlanetId) {
  hoveredId.value = id
  emit('hover', id)
  focusPlanet(id)
}

function updateParticleBursts(delta: number) {
  for (let index = particleBursts.length - 1; index >= 0; index -= 1) {
    const burst = particleBursts[index]
    burst.age += delta
    const progress = Math.min(burst.age / burst.duration, 1)
    const drag = 1 - progress * 0.035

    for (let pointIndex = 0; pointIndex < burst.positions.length / 3; pointIndex += 1) {
      const offset = pointIndex * 3
      burst.positions[offset] += burst.velocities[offset]
      burst.positions[offset + 1] += burst.velocities[offset + 1]
      burst.positions[offset + 2] += burst.velocities[offset + 2]
      burst.velocities[offset] *= drag
      burst.velocities[offset + 1] *= drag
      burst.velocities[offset + 2] *= drag
    }

    burst.material.opacity = Math.max(0, 1 - progress)
    burst.geometry.attributes.position.needsUpdate = true

    if (progress >= 1) {
      scene?.remove(burst.points)
      burst.geometry.dispose()
      burst.material.dispose()
      particleBursts.splice(index, 1)
    }
  }
}

function updateLabels() {
  if (!stageRef.value || !camera) return
  const width = stageRef.value.clientWidth
  const height = stageRef.value.clientHeight
  const nextLabels: LabelState[] = []

  planetMeshes.forEach((mesh, id) => {
    const planet = planets.find(item => item.id === id)
    if (!planet) return
    const position = new THREE.Vector3()
    mesh.getWorldPosition(position)
    position.y += props.mode === 'detail' ? 1.85 : 0.48
    const projected = position.clone().project(camera!)
    const x = (projected.x * 0.5 + 0.5) * width
    const y = (-projected.y * 0.5 + 0.5) * height
    nextLabels.push({
      id,
      name: planet.name,
      x,
      y,
      visible: projected.z < 1 && x > -80 && x < width + 80 && y > -80 && y < height + 80,
      active: hoveredId.value === id || (props.mode !== 'hero' && props.selectedId === id)
    })
  })

  labels.value = nextLabels
}

function animate() {
  if (!renderer || !scene || !camera || !solarRoot) return
  const delta = 1 / 60
  const timeSpeed = props.paused ? 0 : props.speedMultiplier
  orbitClock += delta * timeSpeed

  starField && (starField.rotation.y += 0.00045)

  if (props.autoCruise && props.mode === 'map' && !dragStart) {
    solarRoot.rotation.y += 0.0018
  }

  if (props.mode === 'hero') {
    targetCameraPosition.x = -1.4 + pointerTarget.x * 0.38
    targetCameraPosition.y = 4.2 + pointerTarget.y * 0.24
  }

  camera.position.lerp(targetCameraPosition, 0.055)
  currentLookAt.lerp(targetLookAt, 0.07)
  camera.lookAt(currentLookAt)

  planetMeshes.forEach((mesh, id) => {
    const config = planetConfigs.get(id)
    if (!config) return
    const isActive = hoveredId.value === id || props.selectedId === id
    const targetScale = isActive ? 1.18 : 1
    mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08)

    const rotationDelta = props.paused ? delta * config.rotationSpeed * 0.16 : delta * config.rotationSpeed
    mesh.rotation.y += rotationDelta
    mesh.children.forEach(child => {
      if (child.userData.cloudLayer) child.rotation.y += delta * 0.18
      if (child.userData.moon) {
        const moonTime = orbitClock * 1.35
        child.position.x = Math.cos(moonTime) * (props.mode === 'detail' ? 2.6 : 0.65)
        child.position.z = Math.sin(moonTime) * (props.mode === 'detail' ? 2.6 : 0.65)
      }
      if (child.userData.ring) child.rotation.z += delta * 0.035
    })

    if (props.mode !== 'detail') {
      const angle = orbitClock * config.orbitSpeed + config.startAngle
      mesh.position.x = Math.cos(angle) * config.orbitRadius + sceneCenterX()
      mesh.position.z = Math.sin(angle) * config.orbitRadius * 0.58
      mesh.position.y = Math.sin(orbitClock * 0.35 + config.startAngle) * 0.035
    }
  })

  updateParticleBursts(delta)

  updateLabels()
  renderer.render(scene, camera)
  animationId = requestAnimationFrame(animate)
}

function resize() {
  if (!stageRef.value || !renderer || !camera) return
  const width = stageRef.value.clientWidth
  const height = Math.max(stageRef.value.clientHeight, 1)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function setOrbitsVisible() {
  orbitLines.forEach(line => {
    line.visible = props.showOrbits
  })
}

function rebuildScene() {
  cleanupScene()
  buildScene()
  resize()
}

function cleanupScene() {
  cancelAnimationFrame(animationId)
  resizeObserver?.disconnect()
  renderer?.dispose()
  renderer?.domElement.remove()
  scene?.traverse(object => {
    const mesh = object as THREE.Mesh
    mesh.geometry?.dispose?.()
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(material)) material.forEach(item => item.dispose())
    else material?.dispose?.()
  })
  planetMeshes.clear()
  orbitLines.clear()
  planetConfigs.clear()
  particleBursts.splice(0).forEach(burst => {
    scene?.remove(burst.points)
    burst.geometry.dispose()
    burst.material.dispose()
  })
  labels.value = []
}

onMounted(() => {
  buildScene()
  resizeObserver = new ResizeObserver(resize)
  stageRef.value && resizeObserver.observe(stageRef.value)
  animationId = requestAnimationFrame(animate)
})

watch(() => props.selectedId, id => id && focusPlanet(id))
watch(() => props.showOrbits, setOrbitsVisible)
watch(() => props.scaleMode, rebuildScene)
watch(() => props.focusId, () => props.mode === 'detail' && rebuildScene())

defineExpose({
  gestureMove,
  gesturePinch,
  gestureBurst,
  gestureZoom,
  gestureRotate,
  gestureFocus,
  resetCamera: setCameraPreset
})

onBeforeUnmount(cleanupScene)
</script>

<template>
  <div
    ref="stageRef"
    class="solar-3d-stage true-webgl-stage"
    :class="[`mode-${mode}`, { 'is-interactive': interactive }]"
    @click="handleClick"
    @dblclick="handleDoubleClick"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerleave="hoveredId = null; emit('hover', null)"
    @pointerup="handlePointerUp"
    @wheel="handleWheel"
  >
    <button
      v-for="label in labels"
      v-show="showLabels && label.visible"
      :key="label.id"
      class="webgl-planet-label"
      :class="{ active: label.active }"
      :style="{ left: `${label.x}px`, top: `${label.y}px` }"
      type="button"
      @mouseenter="setHover(label.id)"
      @mouseleave="setHover(null)"
      @click.stop="selectPlanet(label.id); focusPlanet(label.id)"
    >
      {{ label.name }}
    </button>

    <div v-if="interactive && activePlanet" class="floating-planet-hud" :class="{ visible: hoveredId || mode === 'map' }">
      <span>ACTIVE CELESTIAL BODY</span>
      <strong>{{ activePlanet.name }}</strong>
      <small>{{ activePlanet.tagline }}</small>
    </div>
  </div>
</template>
