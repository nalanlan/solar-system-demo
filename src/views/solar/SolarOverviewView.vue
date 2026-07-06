<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChevronRight,
  Eye,
  EyeOff,
  Gauge,
  Grid3X3,
  Info,
  Orbit,
  Pause,
  Play,
  Radar
} from 'lucide-vue-next'
import SolarSystem3D from '@/components/solar/SolarSystem3D.vue'
import { planets, type PlanetId } from '@/data/solar'

const viewMode = ref<'orbit' | 'cards'>('orbit')
const selectedId = ref<PlanetId>('earth')
const speedMultiplier = ref(1)
const paused = ref(false)
const showOrbits = ref(true)
const showLabels = ref(true)
const scaleMode = ref<'demo' | 'real'>('demo')
const autoCruise = ref(false)

const selectedPlanet = computed(() => planets.find(planet => planet.id === selectedId.value) || planets[2])
const selectedIndex = computed(() => planets.findIndex(planet => planet.id === selectedId.value))

function toggleSpeed(next: number) {
  speedMultiplier.value = next
  paused.value = next === 0
}
</script>

<template>
  <main class="solar-page subpage">
    <section class="page-hero compact-hero">
      <div>
        <p class="kicker">LIVE ORBITAL SIMULATOR</p>
        <h1>动态 3D 太阳系</h1>
        <p>
          行星正在沿轨道公转并持续自转。拖拽旋转视角，滚轮缩放，点击行星让镜头飞向目标，
          用速度倍率观察内侧行星和外侧行星的运动差异。
        </p>
      </div>
      <div class="view-switch" role="tablist" aria-label="视图切换">
        <button :class="{ active: viewMode === 'orbit' }" type="button" @click="viewMode = 'orbit'">
          <Orbit :size="18" /> 动态星图
        </button>
        <button :class="{ active: viewMode === 'cards' }" type="button" @click="viewMode = 'cards'">
          <Grid3X3 :size="18" /> 数据卡片
        </button>
      </div>
    </section>

    <section class="overview-grid">
      <div v-if="viewMode === 'orbit'" class="orbit-stage orbit-stage-3d hud-corners">
        <SolarSystem3D
          mode="map"
          :selected-id="selectedId"
          :speed-multiplier="speedMultiplier"
          :paused="paused"
          :show-orbits="showOrbits"
          :show-labels="showLabels"
          :scale-mode="scaleMode"
          :auto-cruise="autoCruise"
          @select="id => (selectedId = id)"
          @reset="selectedId = 'earth'"
        />

        <div class="scale-note">
          <Info :size="16" />
          当前为{{ scaleMode === 'demo' ? '科普展示比例' : '接近真实比例' }}，公转速度为{{ paused ? '暂停' : `${speedMultiplier}x` }}。
        </div>

        <div class="map-controls live-controls">
          <button :class="{ active: !paused }" type="button" @click="paused = !paused">
            <component :is="paused ? Play : Pause" :size="16" />
            {{ paused ? '播放' : '暂停' }}
          </button>
          <button :class="{ active: speedMultiplier === 1 && !paused }" type="button" @click="toggleSpeed(1)">
            <Gauge :size="16" /> 1x
          </button>
          <button :class="{ active: speedMultiplier === 5 && !paused }" type="button" @click="toggleSpeed(5)">
            5x
          </button>
          <button :class="{ active: speedMultiplier === 20 && !paused }" type="button" @click="toggleSpeed(20)">
            20x
          </button>
          <button :class="{ active: autoCruise }" type="button" @click="autoCruise = !autoCruise">
            <Radar :size="16" /> 自动巡航
          </button>
        </div>

        <div class="scale-toggle">
          <button :class="{ active: scaleMode === 'demo' }" type="button" @click="scaleMode = 'demo'">科普比例</button>
          <button :class="{ active: scaleMode === 'real' }" type="button" @click="scaleMode = 'real'">接近真实比例</button>
          <button :class="{ active: showOrbits }" type="button" @click="showOrbits = !showOrbits">
            <component :is="showOrbits ? Eye : EyeOff" :size="15" />
            轨道
          </button>
          <button :class="{ active: showLabels }" type="button" @click="showLabels = !showLabels">
            <component :is="showLabels ? Eye : EyeOff" :size="15" />
            标签
          </button>
        </div>

        <div class="orbit-bottom-nav">
          <button
            v-for="planet in planets"
            :key="planet.id"
            :class="{ active: selectedId === planet.id }"
            :style="{ '--accent': planet.color }"
            type="button"
            @click="selectedId = planet.id"
          >
            {{ planet.name }}
          </button>
        </div>
      </div>

      <div v-else class="overview-card-list">
        <button
          v-for="planet in planets"
          :key="planet.id"
          class="overview-mini-card"
          :class="{ active: selectedId === planet.id }"
          :style="{ '--accent': planet.color }"
          type="button"
          @click="selectedId = planet.id"
        >
          <img :src="planet.image" :alt="planet.name" />
          <div>
            <strong>{{ planet.name }}</strong>
            <span>{{ planet.distance }}</span>
          </div>
        </button>
      </div>

      <aside class="inspector-panel scan-panel">
        <p class="panel-label">SELECTED PLANET</p>
        <div class="selected-planet-head">
          <img :src="selectedPlanet.image" :alt="selectedPlanet.name" />
          <div>
            <h2>{{ selectedPlanet.name }}</h2>
            <span>{{ selectedPlanet.englishName }} / {{ selectedPlanet.category }}</span>
          </div>
        </div>
        <p class="inspector-intro">{{ selectedPlanet.tagline }}</p>

        <div class="data-grid compact-data">
          <div>
            <span>与太阳平均距离</span>
            <strong>{{ selectedPlanet.distance }}</strong>
          </div>
          <div>
            <span>公转周期</span>
            <strong>{{ selectedPlanet.orbit }}</strong>
          </div>
          <div>
            <span>自转周期</span>
            <strong>{{ selectedPlanet.rotation }}</strong>
          </div>
          <div>
            <span>温度范围</span>
            <strong>{{ selectedPlanet.temperature }}</strong>
          </div>
          <div>
            <span>直径</span>
            <strong>{{ selectedPlanet.diameter }}</strong>
          </div>
          <div>
            <span>卫星数量</span>
            <strong>{{ selectedPlanet.moons }}</strong>
          </div>
        </div>

        <div class="mission-readout">
          <Radar :size="18" />
          <span>目标轨道：第 {{ selectedIndex + 1 }} 层</span>
        </div>

        <RouterLink class="glow-button secondary full-width" :to="`/solar/planet/${selectedPlanet.id}`">
          进入详情
          <ChevronRight :size="18" />
        </RouterLink>
      </aside>
    </section>

    <section class="compare-section" id="compare">
      <div class="section-head">
        <p class="kicker">QUICK COMPARE</p>
        <h2>从距离开始理解太阳系</h2>
      </div>
      <div class="distance-bars">
        <div v-for="(planet, index) in planets" :key="planet.id" class="bar-row">
          <span>{{ planet.name }}</span>
          <div class="bar-track">
            <div class="bar-fill" :style="{ width: `${12 + index * 10}%`, background: planet.color }"></div>
          </div>
          <small>{{ planet.distance }}</small>
        </div>
      </div>
    </section>
  </main>
</template>
