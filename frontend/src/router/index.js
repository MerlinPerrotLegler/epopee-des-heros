import { createRouter, createWebHistory } from 'vue-router'

const routes = [
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
    path: '/molecules',
    name: 'Molecules',
    component: () => import('@/views/MoleculesView.vue')
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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
