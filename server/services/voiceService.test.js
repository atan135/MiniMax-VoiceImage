import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest'

vi.mock('axios', () => {
  const post = vi.fn()
  return {
    default: { post }
  }
})

import axios from 'axios'

const loadService = async () => {
  vi.resetModules()
  const mod = await import('./voiceService.js')
  return mod
}

const axiosResponse = (body) => ({ data: body, status: 200, statusText: 'OK', headers: {}, config: {}, request: {} })

describe('textToSpeech 校验（API_KEY 已设置）', () => {
  let textToSpeech
  let mockedPost

  beforeEach(async () => {
    const mod = await loadService()
    textToSpeech = mod.textToSpeech
    mockedPost = vi.mocked(axios.post)
    mockedPost.mockReset()
  })

  it('缺 text 抛 "文本内容不能为空"', async () => {
    await expect(textToSpeech({ text: '', voiceId: 'v1' })).rejects.toThrow('文本内容不能为空')
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('缺 voiceId 抛 "请指定 voice_id"', async () => {
    await expect(textToSpeech({ text: 'hi' })).rejects.toThrow('请指定 voice_id')
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('text.length === 10001 抛 "文本长度超过 10000 字符上限"', async () => {
    await expect(textToSpeech({ text: 'x'.repeat(10001), voiceId: 'v1' })).rejects.toThrow('文本长度超过 10000 字符上限')
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('text.length === 10000 不抛长度错误（应继续走到 axios）', async () => {
    mockedPost.mockResolvedValue(axiosResponse({ base_resp: { status_code: 0 }, data: { audio: '48656c6c6f' } }))
    await textToSpeech({ text: 'x'.repeat(10000), voiceId: 'v1' })
    expect(mockedPost).toHaveBeenCalled()
  })

  it('channel=1 / channel=2 通过校验', async () => {
    mockedPost.mockResolvedValue(axiosResponse({ base_resp: { status_code: 0 }, data: { audio: '48656c6c6f' } }))
    await textToSpeech({ text: 'hi', voiceId: 'v1', channel: 1 })
    await textToSpeech({ text: 'hi', voiceId: 'v1', channel: 2 })
    expect(mockedPost).toHaveBeenCalledTimes(2)
  })

  it('channel=0 / 3 / 1.5 / "1" / null 抛 "channel 必须是 1 或 2"', async () => {
    for (const c of [0, 3, 1.5, '1', null]) {
      await expect(textToSpeech({ text: 'hi', voiceId: 'v1', channel: c })).rejects.toThrow('channel 必须是 1 或 2')
    }
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('textNormalization 非 boolean 抛 "textNormalization 必须是布尔值"', async () => {
    await expect(textToSpeech({ text: 'hi', voiceId: 'v1', textNormalization: 'false' })).rejects.toThrow('textNormalization 必须是布尔值')
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('latexRead 非 boolean 抛 "latexRead 必须是布尔值"', async () => {
    await expect(textToSpeech({ text: 'hi', voiceId: 'v1', latexRead: 1 })).rejects.toThrow('latexRead 必须是布尔值')
    expect(mockedPost).not.toHaveBeenCalled()
  })

  it('englishNormalization 非 boolean 抛 "englishNormalization 必须是布尔值"', async () => {
    await expect(textToSpeech({ text: 'hi', voiceId: 'v1', englishNormalization: 0 })).rejects.toThrow('englishNormalization 必须是布尔值')
    expect(mockedPost).not.toHaveBeenCalled()
  })
})

describe('textToSpeech payload 结构', () => {
  let textToSpeech
  let mockedPost

  beforeEach(async () => {
    const mod = await loadService()
    textToSpeech = mod.textToSpeech
    mockedPost = vi.mocked(axios.post)
    mockedPost.mockReset()
    mockedPost.mockResolvedValue(axiosResponse({ base_resp: { status_code: 0 }, data: { audio: '48656c6c6f' } }))
  })

  it('默认 stream=false，stream_options 不挂载', async () => {
    await textToSpeech({ text: 'hi', voiceId: 'v1' })
    const payload = mockedPost.mock.calls[0][1]
    expect(payload.stream).toBe(false)
    expect(payload.stream_options).toBeUndefined()
  })

  it('stream=true + streamOptions 透传至 axios.post（stream 分支调 axios，responseType: stream）', async () => {
    // 让 axios.post 永远不 resolve，触发 textToSpeechStream 内部 await 挂起
    mockedPost.mockImplementation(() => new Promise(() => {}))
    const promise = textToSpeech(
      { text: 'hi', voiceId: 'v1', stream: true, streamOptions: { exclude_aggregated_audio: true, speech_rate: 1.2 } },
    )
    // 等待 microtask 让 axios.post 被调用
    await new Promise(r => setImmediate(r))
    expect(mockedPost).toHaveBeenCalled()
    const payload = mockedPost.mock.calls[0][1]
    expect(payload.stream).toBe(true)
    expect(payload.stream_options).toEqual({ exclude_aggregated_audio: true, speech_rate: 1.2 })
    const config = mockedPost.mock.calls[0][2]
    expect(config.responseType).toBe('stream')
    // 避免 unhandled rejection
    promise.catch(() => {})
  })

  it('camelCase 入参 → snake_case payload', async () => {
    await textToSpeech({
      text: 'hi',
      voiceId: 'v1',
      channel: 2,
      sampleRate: 44100,
      audioFormat: 'pcm',
      bitrate: 256000,
      textNormalization: true,
      latexRead: true,
      englishNormalization: true,
      aigcWatermark: true,
      subtitleEnable: true
    })
    const payload = mockedPost.mock.calls[0][1]
    expect(payload.audio_setting).toEqual({
      bitrate: 256000,
      sample_rate: 44100,
      format: 'pcm',
      channel: 2
    })
    expect(payload.voice_setting).toMatchObject({
      text_normalization: true,
      latex_read: true,
      english_normalization: true
    })
    expect(payload.subtitle_enable).toBe(true)
    expect(payload.aigc_watermark).toBe(true)
  })
})

describe('textToSpeech subtitle 字段', () => {
  let textToSpeech
  let mockedPost

  beforeEach(async () => {
    const mod = await loadService()
    textToSpeech = mod.textToSpeech
    mockedPost = vi.mocked(axios.post)
    mockedPost.mockReset()
  })

  it('subtitleEnable=false：即使响应有字幕也不返回', async () => {
    mockedPost.mockResolvedValue(axiosResponse({
      base_resp: { status_code: 0 },
      data: { audio: '48656c6c6f', subtitle_file: '{"x":1}' }
    }))
    const r = await textToSpeech({ text: 'hi', voiceId: 'v1', subtitleEnable: false })
    expect(r.subtitle).toBeUndefined()
    expect(r.audioHex).toBe('48656c6c6f')
  })

  it('subtitleEnable=true + resp.data.subtitle_file：返回字幕字符串', async () => {
    mockedPost.mockResolvedValue(axiosResponse({
      base_resp: { status_code: 0 },
      data: { audio: '48656c6c6f', subtitle_file: '{"text":"hi"}' }
    }))
    const r = await textToSpeech({ text: 'hi', voiceId: 'v1', subtitleEnable: true })
    expect(r.subtitle).toBe('{"text":"hi"}')
  })

  it('subtitleEnable=true 但响应无字幕：result.subtitle === undefined', async () => {
    mockedPost.mockResolvedValue(axiosResponse({
      base_resp: { status_code: 0 },
      data: { audio: '48656c6c6f' }
    }))
    const r = await textToSpeech({ text: 'hi', voiceId: 'v1', subtitleEnable: true })
    expect(r.subtitle).toBeUndefined()
  })

  it('fallback 探测顶层 resp.subtitle_file', async () => {
    mockedPost.mockResolvedValue(axiosResponse({
      base_resp: { status_code: 0 },
      subtitle_file: 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nhi',
      data: { audio: '48656c6c6f' }
    }))
    const r = await textToSpeech({ text: 'hi', voiceId: 'v1', subtitleEnable: true })
    expect(typeof r.subtitle).toBe('string')
    expect(r.subtitle.startsWith('WEBVTT')).toBe(true)
  })
})

describe('textToSpeech 错误响应', () => {
  let textToSpeech
  let mockedPost

  beforeEach(async () => {
    const mod = await loadService()
    textToSpeech = mod.textToSpeech
    mockedPost = vi.mocked(axios.post)
    mockedPost.mockReset()
  })

  it('base_resp.status_code !== 0 抛 API 错误', async () => {
    mockedPost.mockResolvedValue(axiosResponse({
      base_resp: { status_code: 1001, status_msg: '权限不足' }
    }))
    await expect(textToSpeech({ text: 'hi', voiceId: 'v1' })).rejects.toThrow(/API 错误.*权限不足/)
  })
})

describe('textToSpeech 无 API_KEY', () => {
  it('缺 API_KEY 抛 "请先在 .env 中配置 API_KEY"', async () => {
    const prev = process.env.API_KEY
    delete process.env.API_KEY
    try {
      vi.resetModules()
      const { textToSpeech } = await import('./voiceService.js')
      await expect(textToSpeech({ text: 'hi', voiceId: 'v1' })).rejects.toThrow('请先在 .env 中配置 API_KEY')
    } finally {
      process.env.API_KEY = prev
    }
  })
})

afterAll(() => {
  vi.restoreAllMocks()
})
