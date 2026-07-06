<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { Menu, Rocket, X } from 'lucide-vue-next'

const mobileOpen = ref(false)
const cursorX = ref(50)
const cursorY = ref(50)
const route = useRoute()

const navItems = [
  { label: '首页', to: '/solar' },
  { label: '太阳系总览', to: '/solar/overview' },
  { label: '行星图鉴', to: '/solar/planets' },
  { label: '行星对比', to: '/solar/overview#compare' },
  { label: '知识专题', to: '/solar#topics' },
  { label: '星际任务', to: '/solar#mission' }
]

const isActiveNav = (to: string) => {
  const [path, hash] = to.split('#')

  if (hash) {
    return route.path === path && route.hash === `#${hash}`
  }

  return route.path === path && !route.hash
}

function updateCursor(event: MouseEvent) {
  cursorX.value = event.clientX
  cursorY.value = event.clientY
}
</script>

<template>
  <div
    class="solar-shell"
    :style="{ '--cursor-x': `${cursorX}px`, '--cursor-y': `${cursorY}px` }"
    @mousemove="updateCursor"
  >
    <header class="solar-nav">
      <RouterLink class="solar-brand" to="/solar" @click="mobileOpen = false">
        <span class="brand-orbit"><Rocket :size="26" /></span>
        <span>
          <strong>探索太阳系</strong>
          <small>科学 · 探索 · 未来</small>
        </span>
      </RouterLink>

      <nav class="solar-nav-links" aria-label="太阳系主导航">
        <RouterLink v-for="item in navItems" :key="item.label" :to="item.to" custom v-slot="{ href, navigate }">
          <a :href="href" :class="{ active: isActiveNav(item.to) }" @click="navigate">
            {{ item.label }}
          </a>
        </RouterLink>
      </nav>

      <RouterLink class="nav-auth" to="/solar/overview">
        <Rocket :size="16" />
        3D 探索
      </RouterLink>

      <button class="mobile-toggle" type="button" aria-label="打开导航" @click="mobileOpen = true">
        <Menu :size="24" />
      </button>
    </header>

    <div v-if="mobileOpen" class="mobile-menu">
      <button class="mobile-close" type="button" aria-label="关闭导航" @click="mobileOpen = false">
        <X :size="24" />
      </button>
      <RouterLink v-for="item in navItems" :key="item.label" :to="item.to" @click="mobileOpen = false">
        {{ item.label }}
      </RouterLink>
    </div>

    <RouterView />
  </div>
</template>
