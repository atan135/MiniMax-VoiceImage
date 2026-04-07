import { createRouter, createWebHistory } from 'vue-router'
import VoiceView from './views/VoiceView.vue'
import ImageView from './views/ImageView.vue'
import HistoryView from './views/HistoryView.vue'

const routes = [
  { path: '/', redirect: '/voice' },
  { path: '/voice', component: VoiceView },
  { path: '/image', component: ImageView },
  { path: '/history', component: HistoryView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
