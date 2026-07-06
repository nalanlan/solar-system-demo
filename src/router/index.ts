import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/solar'
  },
  {
    path: '/solar',
    component: () => import('@/layout/SolarLayout.vue'),
    children: [
      {
        path: '',
        name: 'SolarHome',
        component: () => import('@/views/solar/SolarHomeView.vue'),
        meta: { title: '探索太阳系的奥秘' }
      },
      {
        path: 'overview',
        name: 'SolarOverview',
        component: () => import('@/views/solar/SolarOverviewView.vue'),
        meta: { title: '太阳系总览' }
      },
      {
        path: 'planets',
        name: 'PlanetCatalog',
        component: () => import('@/views/solar/PlanetCatalogView.vue'),
        meta: { title: '行星图鉴' }
      },
      {
        path: 'planet/:id',
        name: 'PlanetDetail',
        component: () => import('@/views/solar/PlanetDetailView.vue'),
        meta: { title: '行星详情' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/solar'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: to => {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }

    return { top: 0, behavior: 'smooth' }
  }
})

router.afterEach(to => {
  const title = (to.meta?.title as string) || '探索太阳系'
  document.title = `${title} | 3D 太阳系科普 Demo`
})

export default router
