<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight, Search, Sparkles } from 'lucide-vue-next'
import { planets } from '@/data/solar'

const activeFilter = ref('全部')
const query = ref('')

const filters = ['全部', '类地行星', '气态巨行星', '冰巨星', '有光环']

const filteredPlanets = computed(() => {
  return planets.filter(planet => {
    const matchesFilter =
      activeFilter.value === '全部' ||
      planet.category === activeFilter.value ||
      (activeFilter.value === '有光环' && planet.rings !== '无')
    const normalized = query.value.trim().toLowerCase()
    const matchesQuery =
      !normalized ||
      planet.name.includes(query.value.trim()) ||
      planet.englishName.toLowerCase().includes(normalized) ||
      planet.label.includes(query.value.trim())

    return matchesFilter && matchesQuery
  })
})
</script>

<template>
  <main class="solar-page subpage catalog-page">
    <section class="page-hero">
      <p class="kicker">PLANETARY CODEX</p>
      <h1>行星图鉴</h1>
      <p>
        八大行星像一组深空档案悬浮在全息控制台中。选择标签、搜索名称，或直接进入详情开始单颗行星探索。
      </p>
      <div class="catalog-tools">
        <label class="search-box">
          <Search :size="18" />
          <input v-model="query" type="search" placeholder="搜索行星、标签或英文名" />
        </label>
        <div class="filter-tabs" aria-label="行星分类筛选">
          <button
            v-for="filter in filters"
            :key="filter"
            type="button"
            :class="{ active: activeFilter === filter }"
            @click="activeFilter = filter"
          >
            {{ filter }}
          </button>
        </div>
      </div>
    </section>

    <section class="planet-card-grid">
      <article
        v-for="planet in filteredPlanets"
        :key="planet.id"
        class="planet-card planet-card-3d scan-panel"
        :style="{ '--accent': planet.color }"
      >
        <div class="planet-card-image">
          <div class="mini-orbit"></div>
          <img :src="planet.image" :alt="planet.name" />
        </div>
        <div class="planet-card-body">
          <div class="planet-card-title">
            <div>
              <span>{{ planet.englishName }}</span>
              <h2>{{ planet.name }}</h2>
            </div>
            <strong>{{ planet.label }}</strong>
          </div>
          <p>{{ planet.tagline }}</p>
          <div class="planet-tags">
            <span>{{ planet.category }}</span>
            <span>{{ planet.rings === '无' ? '无光环' : '有光环' }}</span>
            <span>{{ planet.moons }} 卫星</span>
          </div>
          <RouterLink class="card-link" :to="`/solar/planet/${planet.id}`">
            <Sparkles :size="15" />
            查看详情
            <ChevronRight :size="16" />
          </RouterLink>
        </div>
      </article>
    </section>
  </main>
</template>
