import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    redirect: '/layouts'
  },
  {
    path: '/layouts',
    name: 'Layouts',
    component: () => import('@/views/LayoutsView.vue')
  },
  {
    path: '/editor/:id',
    name: 'Editor',
    component: () => import('@/views/EditorView.vue'),
    props: true
  },
  {
    path: '/components',
    name: 'Components',
    component: () => import('@/views/ComponentsView.vue')
  },
  {
    path: '/components/:id/editor',
    name: 'ComponentEditor',
    component: () => import('@/views/ComponentEditorView.vue'),
    props: true
  },
  {
    path: '/media',
    name: 'Media',
    component: () => import('@/views/MediaView.vue')
  },
  {
    path: '/cards/:layoutId?',
    name: 'Cards',
    component: () => import('@/views/CardsView.vue'),
    props: true
  },
  {
    path: '/export',
    name: 'Export',
    component: () => import('@/views/ExportView.vue')
  },
  {
    path: '/snapshots',
    name: 'Snapshots',
    component: () => import('@/views/SnapshotsView.vue')
  },
  {
    path: '/config',
    name: 'Config',
    component: () => import('@/views/ConfigView.vue')
  },
  {
    path: '/atoms-config',
    name: 'AtomsConfig',
    component: () => import('@/views/AtomsConfigView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.ready) {
    await auth.fetchMe()
  }
  if (to.meta.public) {
    if (auth.user && to.name === 'Login') {
      return { path: '/layouts' }
    }
    return true
  }
  if (!auth.user) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
