<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronDown, ChevronRight, Orbit, Rocket, Sparkles } from 'lucide-vue-next'
import GestureControlOverlay from '@/components/solar/GestureControlOverlay.vue'
import SolarSystem3D from '@/components/solar/SolarSystem3D.vue'
import { planets, featuredMetrics, type PlanetId } from '@/data/solar'

const router = useRouter()
const selectedId = ref<PlanetId>('earth')
const solarScene = ref<InstanceType<typeof SolarSystem3D> | null>(null)
const selectedPlanet = computed(() => planets.find(planet => planet.id === selectedId.value) || planets[2])

function openPlanet(id: PlanetId) {
  selectedId.value = id
  router.push(`/solar/overview`)
}

function nextPlanet(direction: 1 | -1) {
  const index = planets.findIndex(planet => planet.id === selectedId.value)
  const next = planets[(index + direction + planets.length) % planets.length]
  selectedId.value = next.id
  solarScene.value?.gestureFocus(next.id)
}

function handleGesturePinch(point: { x: number; y: number }) {
  const id = solarScene.value?.gesturePinch(point.x, point.y)
  if (id) router.push(`/solar/planet/${id}`)
}
</script>

<template>
  <main class="solar-page home-page">
    <section class="hero-section hero-3d">
      <SolarSystem3D
        ref="solarScene"
        mode="hero"
        :selected-id="selectedId"
        :speed-multiplier="2.4"
        :show-labels="true"
        @select="openPlanet"
        @hover="id => id && (selectedId = id)"
      />
      <GestureControlOverlay
        :selected-name="selectedPlanet.name"
        @move="point => solarScene?.gestureMove(point.x, point.y)"
        @pinch="handleGesturePinch"
        @fist="point => solarScene?.gestureBurst(point.x, point.y)"
        @swipe-prev="nextPlanet(-1)"
        @swipe-next="nextPlanet(1)"
        @zoom="delta => solarScene?.gestureZoom(delta)"
        @rotate="delta => solarScene?.gestureRotate(delta)"
      />
      <div class="hero-overlay"></div>

      <div class="hero-content">
        <div class="hero-copy hud-corners">
          <p class="kicker">SOLAR SYSTEM FLIGHT DECK</p>
          <h1>探索<br />太阳系的奥秘</h1>
          <p class="hero-subtitle">
            跟随行星的轨道，穿越太阳、地球、火星与遥远的海王星，开启一场动态星际科普之旅。
          </p>

          <div class="hero-actions">
            <RouterLink class="glow-button primary" to="/solar/overview">
              开始 3D 探索
              <ChevronRight :size="22" />
            </RouterLink>
            <RouterLink class="glow-button secondary" to="/solar/planets">
              查看行星图鉴
              <ChevronRight :size="20" />
            </RouterLink>
          </div>

          <div class="realtime-panel scan-panel">
            <div class="panel-head">
              <span>实时宇宙数据</span>
              <span>UTC+8</span>
            </div>
            <div v-for="metric in featuredMetrics" :key="metric.label" class="metric-row">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
            </div>
          </div>
        </div>

        <div class="planet-callouts" aria-label="行星快速入口">
          <RouterLink
            v-for="planet in planets"
            :key="planet.id"
            class="planet-chip"
            :class="{ active: selectedId === planet.id }"
            :to="`/solar/planet/${planet.id}`"
            :style="{ '--accent': planet.color }"
            @mouseenter="selectedId = planet.id"
          >
            <img :src="planet.image" :alt="planet.name" />
            <span>{{ planet.name }}</span>
          </RouterLink>
        </div>
      </div>

      <div class="launch-sequence">
        <span>STARFIELD ONLINE</span>
        <span>SOLAR CORE IGNITED</span>
        <span>ORBIT MOTION ACTIVE</span>
      </div>

      <div class="explore-more">
        <span></span>
        <a href="#mission">探索更多</a>
        <span></span>
        <ChevronDown :size="26" />
      </div>
    </section>

    <section class="entry-grid" id="mission">
      <RouterLink class="entry-card" to="/solar/overview">
        <div class="entry-icon"><Orbit :size="30" /></div>
        <div>
          <h2>动态 3D 星图</h2>
          <p>观察八大行星沿轨道运行，拖拽旋转视角，点击行星让镜头飞向目标。</p>
          <span>进入星图 <ChevronRight :size="16" /></span>
        </div>
      </RouterLink>

      <RouterLink class="entry-card featured-entry" to="/solar/planets">
        <div class="entry-icon violet"><Sparkles :size="30" /></div>
        <div>
          <h2>行星图鉴</h2>
          <p>快速浏览八大行星的特征、标签与关键差异，再进入详情深入探索。</p>
          <span>查看图鉴 <ChevronRight :size="16" /></span>
        </div>
        <img :src="planets[4].image" alt="木星" />
      </RouterLink>

      <RouterLink class="entry-card mission-entry" to="/solar/planet/mars">
        <div class="entry-icon"><Rocket :size="30" /></div>
        <div>
          <h2>星际任务</h2>
          <p>从火星开始一次任务式探索，理解人类为什么持续前往深空。</p>
          <span>启动任务 <ChevronRight :size="16" /></span>
        </div>
      </RouterLink>
    </section>

    <section class="topic-strip" id="topics">
      <div>
        <p class="kicker">KNOWLEDGE MODULES</p>
        <h2>把复杂的宇宙问题，拆成看得懂的探索任务</h2>
      </div>
      <div class="topic-list">
        <span>为什么行星会绕太阳转？</span>
        <span>为什么有的行星有光环？</span>
        <span>地球为什么适合生命存在？</span>
        <span>小行星、彗星和流星有什么区别？</span>
      </div>
    </section>
  </main>
</template>
