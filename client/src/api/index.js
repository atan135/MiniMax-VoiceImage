import axios from 'axios'

const api = axios.create({
  baseURL: '/api'
})

export const getVoiceOptions = () => api.get('/voice/options')
export const refreshVoiceOptions = () => api.post('/voice/refresh')
export const generateVoice = (data) => api.post('/voice', data)
export const deleteVoice = (voiceId, voiceType) => api.delete(`/voice/${voiceId}`, { data: { voice_type: voiceType } })

export const getImageOptions = () => api.get('/image/options')
export const generateImage = (data) => api.post('/image', data)

export const getHistory = (type, page, pageSize) => api.get('/history', { params: { type, page, pageSize } })
export const getHistoryById = (id) => api.get(`/history/${id}`)

export default api
