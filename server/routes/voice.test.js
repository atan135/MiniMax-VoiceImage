import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock 业务服务，仅保留常量
vi.mock('../services/voiceService.js', async () => {
  const actual = await vi.importActual('../services/voiceService.js')
  return {
    ...actual,
    textToSpeech: vi.fn(),
    textToSpeechStream: vi.fn(),
    getAllVoices: vi.fn(),
    deleteVoice: vi.fn(),
    designVoice: vi.fn(),
    uploadAudioFile: vi.fn(),
    voiceClone: vi.fn()
  }
})

vi.mock('../services/historyService.js', async () => {
  const actual = await vi.importActual('../services/historyService.js')
  return {
    ...actual,
    addRecord: vi.fn().mockResolvedValue(123),
    getRecordById: vi.fn()
  }
})

vi.mock('../services/voiceInventoryService.js', async () => {
  const actual = await vi.importActual('../services/voiceInventoryService.js')
  return {
    ...actual,
    refreshVoicesFromAPI: vi.fn(),
    getVoicesFromDB: vi.fn().mockResolvedValue([]),
    removeVoice: vi.fn()
  }
})

import express from 'express'
import request from 'supertest'

// 必须放在 mocks 之后导入，确保拿到 mock 实例
const { textToSpeech, textToSpeechStream, MODEL_LIST, AUDIO_FORMAT_LIST, BITRATE_LIST, EMOTION_LIST, LANGUAGE_BOOST_LIST, SAMPLE_RATE_LIST } = await import('../services/voiceService.js')
const { addRecord, getRecordById } = await import('../services/historyService.js')

import voiceRouter from './voice.js'

const buildApp = () => {
  const app = express()
  app.use(express.json())
  app.use('/api/voice', voiceRouter)
  return app
}

describe('GET /api/voice/options', () => {
  beforeEach(() => {
    vi.mocked(textToSpeech).mockReset()
    vi.mocked(addRecord).mockClear()
  })

  it('返回所有常量（含 modelList）', async () => {
    const app = buildApp()
    const res = await request(app).get('/api/voice/options')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.bitrateList).toEqual(BITRATE_LIST)
    expect(res.body.data.emotionList).toEqual(EMOTION_LIST)
    expect(res.body.data.languageBoostList).toEqual(LANGUAGE_BOOST_LIST)
    expect(res.body.data.sampleRateList).toEqual(SAMPLE_RATE_LIST)
    expect(res.body.data.audioFormatList).toEqual(AUDIO_FORMAT_LIST)
    expect(res.body.data.modelList).toEqual(MODEL_LIST)
  })

  it('modelList 包含 5 个官方模型', async () => {
    const app = buildApp()
    const res = await request(app).get('/api/voice/options')
    expect(res.body.data.modelList).toEqual([
      'speech-2.6', 'speech-2.6-hd', 'speech-02', 'speech-02-hd', 'speech-2.8-hd'
    ])
  })

  it('audioFormatList 含 pcm', async () => {
    const app = buildApp()
    const res = await request(app).get('/api/voice/options')
    expect(res.body.data.audioFormatList).toContain('pcm')
  })
})

describe('POST /api/voice（非流式）', () => {
  beforeEach(() => {
    vi.mocked(textToSpeech).mockReset()
    vi.mocked(addRecord).mockClear()
  })

  it('成功返回 audioHex/filePath/subtitle，并写入历史', async () => {
    vi.mocked(textToSpeech).mockResolvedValue({
      audioHex: '48656c6c6f',
      audioSize: 5,
      filePath: 'output/voice/test.mp3',
      subtitle: '{"text":"hi"}'
    })

    const app = buildApp()
    const res = await request(app)
      .post('/api/voice')
      .send({ text: 'hi', voiceId: 'v1', subtitleEnable: true })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.audioHex).toBe('48656c6c6f')
    expect(res.body.data.filePath).toBe('output/voice/test.mp3')
    expect(res.body.data.subtitle).toBe('{"text":"hi"}')
    expect(addRecord).toHaveBeenCalledWith(
      'voice', 'hi', expect.any(Object),
      'output/voice/test.mp3', 5, 'success', null, '{"text":"hi"}'
    )
  })

  it('失败时记录 failed 状态 + 错误信息', async () => {
    vi.mocked(textToSpeech).mockRejectedValue(new Error('channel 必须是 1 或 2'))

    const app = buildApp()
    const res = await request(app)
      .post('/api/voice')
      .send({ text: 'hi', voiceId: 'v1', channel: 0 })

    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toBe('channel 必须是 1 或 2')
    expect(addRecord).toHaveBeenCalledWith(
      'voice', 'hi', expect.any(Object),
      null, 0, 'failed', 'channel 必须是 1 或 2'
    )
  })
})

describe('POST /api/voice（流式 stream=true）', () => {
  beforeEach(() => {
    vi.mocked(textToSpeech).mockReset()
    vi.mocked(textToSpeechStream).mockReset()
    vi.mocked(addRecord).mockClear()
  })

  it('设置 Content-Type: text/event-stream 并写出 SSE chunks', async () => {
    vi.mocked(textToSpeech).mockImplementation(async (req, onChunk, onEnd) => {
      onChunk({ data: { audio: 'aabb' } })
      onChunk({ data: { audio: 'ccdd' } })
      onEnd()
    })

    const app = buildApp()
    const res = await request(app)
      .post('/api/voice')
      .send({ text: 'hi', voiceId: 'v1', stream: true })

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/event-stream/)
    expect(res.text).toContain('data: ')
    expect(res.text).toContain('"audio":"aabb"')
    expect(res.text).toContain('"audio":"ccdd"')
    // 流式模式不写历史
    expect(addRecord).not.toHaveBeenCalled()
  })

  it('流式出错时返回 event: error 并 end', async () => {
    vi.mocked(textToSpeech).mockImplementation(async (req, onChunk, onEnd, onError) => {
      onError(new Error('流式上游失败'))
    })

    const app = buildApp()
    const res = await request(app)
      .post('/api/voice')
      .send({ text: 'hi', voiceId: 'v1', stream: true })

    expect(res.text).toContain('event: error')
    expect(res.text).toContain('流式上游失败')
  })
})

describe('GET /api/voice/subtitle/:id', () => {
  beforeEach(() => {
    vi.mocked(getRecordById).mockReset()
  })

  it('记录存在 + type=voice + 有字幕：返回字幕内容（json content-type）', async () => {
    vi.mocked(getRecordById).mockResolvedValue({
      id: 42, type: 'voice', subtitle: '{"text":"hi"}'
    })
    const app = buildApp()
    const res = await request(app).get('/api/voice/subtitle/42')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/application\/json/)
    expect(res.text).toBe('{"text":"hi"}')
  })

  it('记录存在 + type=voice + 有字幕（WEBVTT）：返回 text/vtt', async () => {
    vi.mocked(getRecordById).mockResolvedValue({
      id: 43, type: 'voice', subtitle: 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nhi'
    })
    const app = buildApp()
    const res = await request(app).get('/api/voice/subtitle/43')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/vtt/)
  })

  it('记录不存在：返回 404', async () => {
    vi.mocked(getRecordById).mockResolvedValue(null)
    const app = buildApp()
    const res = await request(app).get('/api/voice/subtitle/999')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toBe('记录不存在')
  })

  it('记录存在但 type !== voice：返回 404', async () => {
    vi.mocked(getRecordById).mockResolvedValue({
      id: 44, type: 'image', subtitle: 'whatever'
    })
    const app = buildApp()
    const res = await request(app).get('/api/voice/subtitle/44')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('记录类型不是 voice')
  })

  it('记录存在 + type=voice + subtitle 为空：返回 404', async () => {
    vi.mocked(getRecordById).mockResolvedValue({
      id: 45, type: 'voice', subtitle: null
    })
    const app = buildApp()
    const res = await request(app).get('/api/voice/subtitle/45')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('字幕内容为空')
  })
})
