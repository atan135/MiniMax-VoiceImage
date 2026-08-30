import { createRouter, createWebHistory } from 'vue-router'
import VoiceView from './views/VoiceView.vue'
import ImageView from './views/ImageView.vue'
import ImageI2iView from './views/ImageI2iView.vue'
import VideoView from './views/VideoView.vue'
import VideoOldView from './views/VideoOldView.vue'
import MusicView from './views/MusicView.vue'
import HistoryView from './views/HistoryView.vue'
import VoiceManageView from './views/VoiceManageView.vue'
import VoiceCloneView from './views/VoiceCloneView.vue'

const routes = [
  { path: '/', redirect: '/voice' },
  { path: '/voice', component: VoiceView },
  { path: '/image', component: ImageView },
  { path: '/image/i2i', component: ImageI2iView },
  { path: '/video', component: VideoView },
  { path: '/video_old', component: VideoOldView },
  { path: '/music', component: MusicView },
  { path: '/history', component: HistoryView },
  { path: '/voice/manage', component: VoiceManageView },
  { path: '/voice/clone', component: VoiceCloneView }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
