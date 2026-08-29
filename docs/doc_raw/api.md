# API 文档

## 基础信息

- 基础URL：`http://localhost:3000/api`
- 所有接口返回格式均为 JSON
- 认证方式：通过 `.env` 配置的 `API_KEY` 调用 MiniMax API

---

## 语音接口

### 获取音色列表和参数选项

```
GET /api/voice/options
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "systemVoices": [
      {
        "voiceId": "moss_audio_ce44fc67-7ce3-11f0-8de5-96e35d26fb85",
        "voiceName": "中文女声",
        "description": ["温柔的女声"],
        "source": "system"
      }
    ],
    "cloningVoices": [],
    "generationVoices": [],
    "bitrateList": [64000, 128000, 192000, 256000, 320000],
    "emotionList": ["happy", "sad", "angry", "fearful", "disgusted", "surprised", "calm", "fluent", "whisper"],
    "languageBoostList": ["auto", "Chinese", "English", "Japanese", ...],
    "sampleRateList": [16000, 24000, 32000, 48000],
    "audioFormatList": ["mp3", "wav", "flac"]
  }
}
```

---

### 刷新音色列表

```
POST /api/voice/refresh
```

从 MiniMax API 同步音色到本地数据库。

**响应示例：**

```json
{
  "success": true,
  "data": {
    "systemCount": 50,
    "cloningCount": 5,
    "generationCount": 2,
    "syncedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 音色设计

```
POST /api/voice/design
```

通过文字描述生成全新音色。

**请求体：**

```json
{
  "prompt": "温柔甜美的年轻女声，适合讲故事",
  "preview_text": "从前有座山，山里有座庙",
  "voice_id": "my_custom_voice_001",
  "aigc_watermark": false
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "voiceId": "my_custom_voice_001",
    "trialAudio": "base64_encoded_audio..."
  }
}
```

---

### 上传复刻音频

```
POST /api/voice/upload
Content-Type: multipart/form-data
```

上传音频文件用于音色复刻。

**表单字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | File | 是 | 音频文件（最大20MB） |
| purpose | string | 否 | 用途，默认 voice_clone |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "fileId": "file_xxxxxx",
    "bytes": 1024000,
    "filename": "audio.mp3"
  }
}
```

---

### 音色快速复刻

```
POST /api/voice/clone
```

使用上传的音频文件快速复刻音色。

**请求体：**

```json
{
  "file_id": "file_xxxxxx",
  "voice_id": "my_cloned_voice",
  "clone_prompt": "描述这个声音的特点",
  "text": "试听文本",
  "model": "speech-2.8-hd",
  "language_boost": "Chinese",
  "need_noise_reduction": true,
  "need_volume_normalization": true,
  "aigc_watermark": false
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "voiceId": "my_cloned_voice",
    "demoAudio": "base64_encoded_audio..."
  }
}
```

---

### 删除音色

```
DELETE /api/voice/:voiceId
```

删除克隆音色或生成音色（系统音色不可删除）。

**请求体：**

```json
{
  "source": "voice_cloning"
}
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "voiceId": "my_cloned_voice",
    "deleted": true
  }
}
```

---

### 生成语音

```
POST /api/voice
```

**请求体：**

```json
{
  "text": "你好，欢迎使用语音生成系统",
  "voiceId": "moss_audio_ce44fc67-7ce3-11f0-8de5-96e35d26fb85",
  "model": "speech-2.8-hd",
  "bitrate": 128000,
  "sampleRate": 32000,
  "audioFormat": "mp3",
  "speed": 1.0,
  "vol": 1.0,
  "pitch": 0,
  "emotion": "happy",
  "textNormalization": false,
  "latexRead": false,
  "subtitleEnable": false,
  "outputFormat": "hex",
  "aigcWatermark": false,
  "languageBoost": "Chinese"
}
```

**参数说明：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| text | string | 必填 | 文本内容（最大10000字符） |
| voiceId | string | 必填 | 音色ID |
| model | string | speech-2.8-hd | 语音模型 |
| bitrate | number | 128000 | 比特率 |
| sampleRate | number | 32000 | 采样率 |
| audioFormat | string | mp3 | 音频格式 |
| speed | number | 1.0 | 语速（0.5~2.0） |
| vol | number | 1.0 | 音量（0~10） |
| pitch | number | 0 | 音调（-12~12） |
| emotion | string | fluent | 情感 |
| languageBoost | string | null | 语言增强 |
| outputFormat | string | hex | 输出格式（hex/url） |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "audioHex": "f0a12c...",
    "audioSize": 45678,
    "filePath": "output/voice/output_1705312200000.mp3"
  }
}
```

---

## 图片接口

### 获取图片配置选项

```
GET /api/image/options
```

**响应示例：**

```json
{
  "modelList": ["image-01", "image-01-live"],
  "aspectRatioList": ["1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9"],
  "responseFormatList": ["url", "base64"],
  "styleList": ["realness", "hd", "anime", "illustration", "3d"]
}
```

---

### 生成图片

```
POST /api/image
```

**请求体：**

```json
{
  "model": "image-01-live",
  "prompt": "一个穿着汉服的少女在樱花树下，动漫风格",
  "n": 4,
  "aspect_ratio": "16:9",
  "response_format": "url",
  "prompt_optimizer": false,
  "aigc_watermark": false,
  "style": "anime"
}
```

**参数说明：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| model | string | image-01 | 生成模型 |
| prompt | string | 必填 | 图片描述（最大1500字符） |
| n | number | 1 | 生成数量（1~9） |
| aspect_ratio | string | 1:1 | 画布比例 |
| width | number | - | 宽度（512~2048） |
| height | number | - | 高度（512~2048） |
| response_format | string | url | 返回格式 |
| style | string | - | 风格（仅image-01-live） |
| prompt_optimizer | boolean | false | 提示词优化 |
| aigc_watermark | boolean | false | 添加水印 |
| seed | number | - | 随机种子 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": "img_xxxxxx",
    "success_count": 4,
    "failed_count": 0,
    "images": [
      {
        "filePath": "output/image/image_1705312200000_0.png",
        "fileSize": 245678
      },
      {
        "filePath": "output/image/image_1705312200000_1.png",
        "fileSize": 234567
      }
    ]
  }
}
```

---

## 历史接口

### 获取历史记录列表

```
GET /api/history?type=voice&page=1&pageSize=20
```

**查询参数：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| type | string | - | 筛选类型：voice/image |
| page | number | 1 | 页码 |
| pageSize | number | 20 | 每页数量 |

**响应示例：**

```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": 1,
        "type": "voice",
        "prompt": "测试文本",
        "params": {},
        "file_path": "output/voice/output_xxx.mp3",
        "file_size": 45678,
        "status": "success",
        "error_msg": null,
        "created_at": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

---

### 获取历史记录详情

```
GET /api/history/:id
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "type": "voice",
    "prompt": "测试文本",
    "params": {
      "voiceId": "moss_audio_xxx",
      "model": "speech-2.8-hd",
      "bitrate": 128000
    },
    "file_path": "output/voice/output_xxx.mp3",
    "file_size": 45678,
    "status": "success",
    "error_msg": null,
    "created_at": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## 错误响应

所有接口错误响应格式：

```json
{
  "success": false,
  "error": "错误信息描述"
}
```

常见 HTTP 状态码：

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 错误码

MiniMax API 返回的错误码：

| 错误码 | 说明 |
|--------|------|
| 0 | 请求成功 |
| 1002 | 触发限流 |
| 1004 | 账号鉴权失败 |
| 1008 | 账号余额不足 |
| 1026 | 内容涉及敏感词 |
| 2013 | 参数异常 |
| 2049 | 无效的API Key |
