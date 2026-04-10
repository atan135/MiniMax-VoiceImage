import axios from 'axios'

const api = axios.create({
  baseURL: '/api'
})

export const getVoiceOptions = () => api.get('/voice/options')
export const refreshVoiceOptions = () => api.post('/voice/refresh')
export const designVoice = (data) => api.post('/voice/design', data)
export const uploadVoiceFile = (formData) => api.post('/voice/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const cloneVoice = (data) => api.post('/voice/clone', data)
export const generateVoice = (data) => api.post('/voice', data)
export const deleteVoice = (voiceId, voiceType) => api.delete(`/voice/${voiceId}`, { data: { voice_type: voiceType } })

export const getImageOptions = () => api.get('/image/options')
export const generateImage = (data) => api.post('/image', data)

export const getMusicOptions = () => api.get('/music/options')
export const generateLyrics = (data) => api.post('/music/lyrics', data)
export const generateMusic = (data) => api.post('/music', data)
export const getMusicJobStatus = (jobId) => api.get(`/music/status/${jobId}`)

export const getHistory = (type, page, pageSize) => api.get('/history', { params: { type, page, pageSize } })
export const getHistoryById = (id) => api.get(`/history/${id}`)

export default api
