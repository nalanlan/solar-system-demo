<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ChevronRight, Compass, Gauge, Route, Satellite, Sparkles } from 'lucide-vue-next'
import GestureControlOverlay from '@/components/solar/GestureControlOverlay.vue'
import SolarSystem3D from '@/components/solar/SolarSystem3D.vue'
import { planetById, planets } from '@/data/solar'

const route = useRoute()
const router = useRouter()
const solarScene = ref<InstanceType<typeof SolarSystem3D> | null>(null)
const planet = computed(() => planetById(String(route.params.id || 'earth')))
const planetIndex = computed(() => planets.findIndex(item => item.id === planet.value.id))
const nextPlanet = computed(() => planets[(planetIndex.value + 1) % planets.length])
const prevPlanet = computed(() => planets[(planetIndex.value - 1 + planets.length) % planets.length])

const atmosphereLabel = computed(() => {
  const map: Record<string, string> = {
    mercury: '强烈太阳侧光 / 暗灰岩石',
    venus: '金黄色浓厚大气 / 雾化高温',
    earth: '蓝色海洋 / 云层与生命信号',
    mars: '红色沙尘 / 荒漠地表',
    jupiter: '条纹云带 / 大红斑风暴',
    saturn: '明亮星环 / 优雅轨道',
    uranus: '青蓝冰巨星 / 侧向自转',
    neptune: '深蓝风暴 / 遥远寒冷'
  }
  return map[planet.value.id]
})

function goPlanet(direction: 1 | -1) {
  const target = direction > 0 ? nextPlanet.value : prevPlanet.value
  router.push(`/solar/planet/${target.id}`)
}
</script>

<template>
  <main class="solar-page detail-page" :style="{ '--planet-accent': planet.color }">
    <section class="detail-hero detail-hero-3d">
      <SolarSystem3D ref="solarScene" mode="detail" :focus-id="planet.id" :selected-id="planet.id" :interactive="false" />
      <GestureControlOverlay
        compact
        :selected-name="planet.name"
        @move="point => solarScene?.gestureMove(point.x, point.y)"
        @pinch="point => solarScene?.gestureBurst(point.x, point.y)"
        @fist="point => solarScene?.gestureBurst(point.x, point.y)"
        @swipe-prev="goPlanet(-1)"
        @swipe-next="goPlanet(1)"
        @zoom="delta => solarScene?.gestureZoom(delta)"
        @rotate="delta => solarScene?.gestureRotate(delta)"
      />

      <RouterLink class="back-link" to="/solar/planets">
        <ArrowLeft :size="18" />
        返回行星图鉴
      </RouterLink>

      <div class="detail-copy scan-panel">
        <p class="kicker">PLANET DOSSIER / {{ planet.englishName.toUpperCase() }}</p>
        <h1>{{ planet.name }}</h1>
        <p>{{ planet.overview }}</p>
        <div class="detail-tags">
          <span>{{ planet.label }}</span>
          <span>{{ planet.category }}</span>
          <span>{{ planet.rings === '无' ? '无光环' : '有光环' }}</span>
        </div>
      </div>

      <div class="planet-atmosphere-card">
        <Gauge :size="18" />
        <span>{{ atmosphereLabel }}</span>
      </div>
    </section>

    <section class="detail-layout">
      <aside class="core-data-panel hud-corners scan-panel">
        <p class="panel-label">CORE DATA</p>
        <div class="data-grid">
          <div>
            <span>与太阳平均距离</span>
            <strong>{{ planet.distance }}</strong>
          </div>
          <div>
            <span>公转周期</span>
            <strong>{{ planet.orbit }}</strong>
          </div>
          <div>
            <span>自转周期</span>
            <strong>{{ planet.rotation }}</strong>
          </div>
          <div>
            <span>直径</span>
            <strong>{{ planet.diameter }}</strong>
          </div>
          <div>
            <span>温度范围</span>
            <strong>{{ planet.temperature }}</strong>
          </div>
          <div>
            <span>卫星数量</span>
            <strong>{{ planet.moons }}</strong>
          </div>
          <div>
            <span>是否有光环</span>
            <strong>{{ planet.rings }}</strong>
          </div>
        </div>
      </aside>

      <div class="detail-content">
        <article class="science-section">
          <div class="section-icon"><Sparkles :size="22" /></div>
          <div>
            <h2>这颗行星有什么特别之处？</h2>
            <p>{{ planet.overview }}</p>
          </div>
        </article>

        <article class="science-section">
          <div class="section-icon"><Compass :size="22" /></div>
          <div>
            <h2>表面或大气是什么样？</h2>
            <p>{{ planet.surface }}</p>
          </div>
        </article>

        <article class="science-section">
          <div class="section-icon"><Satellite :size="22" /></div>
          <div>
            <h2>人类是否探测过它？</h2>
            <p>{{ planet.exploration }}</p>
          </div>
        </article>

        <section class="earth-compare">
          <div>
            <p class="kicker">EARTH COMPARE</p>
            <h2>与地球对比</h2>
            <p>
              把 {{ planet.name }} 和地球放在一起看，能更直观地理解距离、大小、温度和环境差异。
              数据均采用科普近似值，适合课堂展示和快速理解。
            </p>
          </div>
          <div class="compare-mini-grid">
            <span>地球距离太阳：约 1.496 亿 km</span>
            <span>{{ planet.name }}距离太阳：{{ planet.distance }}</span>
            <span>地球卫星：1</span>
            <span>{{ planet.name }}卫星：{{ planet.moons }}</span>
          </div>
        </section>

        <section class="mission-panel">
          <div>
            <p class="kicker">MISSION BRIEF</p>
            <h2>探索任务模块</h2>
            <p>{{ planet.funFact }}</p>
          </div>
          <RouterLink class="glow-button secondary route-button" :to="`/solar/planet/${nextPlanet.id}`">
            <Route :size="18" />
            下一站：{{ nextPlanet.name }}
            <ChevronRight :size="18" />
          </RouterLink>
        </section>
      </div>
    </section>
  </main>
</template>
