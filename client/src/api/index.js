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
export const getVoiceSubtitle = (id) => api.get(`/voice/subtitle/${id}`, { responseType: 'text' })
export const generateVoiceStream = (data, onChunk, onError) => {
  return fetch('/api/voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(async res => {
    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      let msg = `HTTP ${res.status}`
      try {
        const j = JSON.parse(errText)
        if (j && j.error) msg += `: ${j.error}`
      } catch (e) {
        if (errText) msg += `: ${errText.slice(0, 200)}`
      }
      throw new Error(msg)
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n\n')
      buffer = chunks.pop() || ''
      for (const c of chunks) {
        const trimmed = c.trim()
        if (!trimmed) continue
        // 处理 event: error 形式的错误事件
        if (trimmed.startsWith('event: error')) {
          const dataLine = trimmed.split('\n').find(l => l.startsWith('data:'))
          if (dataLine) {
            try {
              const errObj = JSON.parse(dataLine.replace(/^data:\s*/, ''))
              throw new Error(errObj.error || '流式错误')
            } catch (e) {
              if (e.message && e.message !== '流式错误') throw e
              throw new Error('流式错误')
            }
          }
          continue
        }
        const line = trimmed.replace(/^data:\s*/, '').trim()
        if (!line) continue
        try { onChunk(JSON.parse(line)) } catch (e) { console.warn('chunk parse fail', e) }
      }
    }
    if (buffer.trim()) {
      try { onChunk(JSON.parse(buffer.replace(/^data:\s*/, '').trim())) } catch {}
    }
  }).catch(onError)
}
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

// 视频生成 API
export const getVideoOptions = () => api.get('/video/options')
export const createVideoTask = (data) => api.post('/video', data)
export const getVideoTaskStatus = (taskId) => api.get(`/video/status/${taskId}`)
export const cancelVideoTask = (taskId) => api.delete(`/video/${taskId}`)
export const enhanceVideoPrompt = (data) => api.post('/video/enhance-prompt', data)
export const regenerateVideo = (data) => api.post('/video/regenerate', data)
export const uploadVideoReferenceFile = (formData) => api.post('/video/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

// 旧版视频生成 API（V1）
export const getVideoOldOptions = () => api.get('/video_old/options')
export const createVideoOldTaskT2V = (data) => api.post('/video_old/t2v', data)
export const createVideoOldTaskI2V = (data) => api.post('/video_old/i2v', data)
export const createVideoOldTaskFL2V = (data) => api.post('/video_old/fl2v', data)
export const createVideoOldTaskS2V = (data) => api.post('/video_old/s2v', data)
export const getVideoOldTaskStatus = (taskId) => api.get(`/video_old/status/${taskId}`)
export const retrieveVideoOldFile = (fileId) => api.get(`/video_old/files/${fileId}`)
