# 语音模块（voice）使用与开发文档

> 本文档配套：`AGENTS.md`（项目总览）、`summary/语音模块升级_字段映射表.md`（字段约束来源）、`summary/语音模块升级_checklist.md`（阶段交付记录）。

## 一、概述

语音生成模块基于 MiniMax `t2a_v2` API，使用 `speech-2.8-hd` 模型作为默认；支持文本转音频、流式分块、字幕持久化、音色克隆/设计、多音色权重混音等场景。

### 相关文件

| 文件 | 作用 |
|---|---|
| `server/services/voiceService.js` | 业务逻辑：`textToSpeech` / `textToSpeechStream` / 音色克隆 / 设计 / 删除 / 上传 |
| `server/services/voiceInventoryService.js` | 音色库与 MiniMax 同步、缓存、删除 |
| `server/services/historyService.js` | 历史记录（含字幕持久化） |
| `server/routes/voice.js` | 路由：`/options` / `/` / `/design` / `/upload` / `/clone` / `/refresh` / `/:voiceId` / `/subtitle/:id` |
| `server/utils/db.js` | MySQL 连接池与表结构初始化 |
| `client/src/views/VoiceView.vue` | 前端主界面（基础+高级+折叠区参数面板） |
| `client/src/views/HistoryView.vue` | 历史记录页（含字幕详情） |
| `client/src/api/index.js` | `generateVoice` / `generateVoiceStream` / `getVoiceSubtitle` |

---

## 二、新增字段与默认值（按阶段累计）

### 阶段 2：基础参数扩展

| 字段 | 入参类型 | 默认值 | 范围 | 说明 |
|---|---|---|---|---|
| `channel` | int | `1` | `1`/`2` | 1 = 单声道，2 = 立体声 |
| `audioFormat` | string | `"mp3"` | `mp3`/`wav`/`flac`/`pcm` | 输出音频格式 |
| `text` 长度上限 | int | — | `1 ~ 10000` | 超出抛 `文本长度超过 10000 字符上限` |

### 阶段 3：`voice_setting` 扩展

| 字段 | 入参类型 | 默认值 | 说明 |
|---|---|---|---|
| `textNormalization` | boolean | `false` | 文本规范化 |
| `latexRead` | boolean | `false` | LaTeX 公式朗读 |
| `englishNormalization` | boolean | `false` | 英文缩写展开（hd 模型） |

### 阶段 4：字幕持久化

| 字段 | 入参类型 | 默认值 | 说明 |
|---|---|---|---|
| `subtitleEnable` | boolean | `false` | 是否请求字幕响应 |
| `subtitle` | string（出参） | — | `result.subtitle`；DB `generation_history.subtitle` 列；上限 1MB |

### 阶段 5：模型选择

| 字段 | 入参类型 | 默认值 | 取值 |
|---|---|---|---|
| `model` | string | `"speech-2.8-hd"` | `speech-2.6` / `speech-2.6-hd` / `speech-02` / `speech-02-hd` / `speech-2.8-hd` |

### 阶段 7：流式输出

| 字段 | 入参类型 | 默认值 | 说明 |
|---|---|---|---|
| `stream` | boolean | `false` | 切到 SSE 流式（路由层自动） |
| `streamOptions` | object | `null` | `{exclude_aggregated_audio?, speech_rate?}` |

### 阶段 8：高级参数

| 字段 | 入参类型 | 默认值 | 说明 |
|---|---|---|---|
| `voiceModify` | object | 见下方 | 音色调整子字段（仅在非默认时发送） |
| `pronunciationDict` | string 或 object | `""` | 发音字典（tone 字符串 / phoneme 对象） |
| `timbreWeights` | array | `[]` | 多音色权重 `[{voice_id, weight}]` |

`voiceModify` 子字段（仅当任一字段非默认值才挂载到 payload）：

```js
{
  pitch_decrement: 0,      // int, [-100, 100]
  pitch_increment: 0,      // int, [-100, 100]
  intensity_decrement: 0,  // int, [-100, 100]（仅 hd 模型）
  intensity_boost: 0,      // int, [-100, 100]（仅 hd 模型）
  voice_modify_pitch: 0,   // int, [-100, 100]
  sound_effects: []        // string[], 12 种音效
}
```

`SOUND_EFFECTS_LIST` 枚举：

```
spacious_echo / lofi_telephone / robotic / ethereal / horror /
auditorium_echo / vinyl / arcade / cinema_whoosh / choral_echo /
glitch_whoosh / 8d_audio
```

---

## 三、错误信息参考

后端 `textToSpeech` 抛错顺序与信息：

| 顺序 | 触发条件 | 中文错误信息 |
|---|---|---|
| 1 | `process.env.API_KEY` 未设置 | `请先在 .env 中配置 API_KEY` |
| 2 | `text` 为空 | `文本内容不能为空` |
| 3 | `text.length > 10000` | `文本长度超过 10000 字符上限` |
| 4 | `voiceId` 为空 | `请指定 voice_id` |
| 5 | `channel` 非 1/2 | `channel 必须是 1 或 2` |
| 6 | `textNormalization` 非 boolean | `textNormalization 必须是布尔值` |
| 7 | `latexRead` 非 boolean | `latexRead 必须是布尔值` |
| 8 | `englishNormalization` 非 boolean | `englishNormalization 必须是布尔值` |
| 9 | API 响应 `base_resp.status_code !== 0` | `API 错误: <status_msg> (code: <status_code>)` |
| 10 | hex 分支响应缺 `data.audio` | `API 返回格式异常: <JSON>` |

`historyService.addRecord` 字幕相关：

| 触发条件 | 错误信息 |
|---|---|
| `subtitle` 非 string | `subtitle 必须是字符串` |
| `subtitle` 字节数 > 1MB | `字幕内容超过 1MB 上限` |

`GET /api/voice/subtitle/:id` 错误响应（HTTP 404）：

| 场景 | 错误信息 |
|---|---|
| 记录不存在 | `记录不存在` |
| type !== voice | `记录类型不是 voice` |
| subtitle 为空 | `字幕内容为空` |

---

## 四、流式输出调用样例

### curl（非流式）

```bash
curl -X POST http://localhost:3000/api/voice \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "你好，这是一个测试",
    "voiceId": "male-qn-qingse",
    "model": "speech-2.8-hd",
    "channel": 1,
    "audioFormat": "mp3",
    "subtitleEnable": true,
    "textNormalization": false,
    "latexRead": false,
    "englishNormalization": false,
    "outputFormat": "hex"
  }'
```

响应（200）：

```json
{
  "success": true,
  "data": {
    "audioHex": "fffaabbcccdd...",
    "audioSize": 12345,
    "filePath": "output/voice/output_1700000000000.mp3",
    "subtitle": "{\"text\":\"你好\"}"
  }
}
```

### curl（流式）

```bash
curl -N -X POST http://localhost:3000/api/voice \
  -H 'Content-Type: application/json' \
  -H 'Accept: text/event-stream' \
  -d '{
    "text": "流式输出测试文本",
    "voiceId": "male-qn-qingse",
    "stream": true,
    "streamOptions": { "exclude_aggregated_audio": true },
    "outputFormat": "hex"
  }'
```

响应（SSE）：

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"data":{"audio":"fffaabbcccdd"},"base_resp":{"status_code":0}}

data: {"data":{"audio":"eeff0011"},"base_resp":{"status_code":0}}

```

错误时：

```
event: error
data: {"error":"流式上游失败"}
```

### 浏览器 fetch（流式消费）

```javascript
const res = await fetch('/api/voice', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: '流式测试',
    voiceId: 'male-qn-qingse',
    stream: true,
    outputFormat: 'hex'
  })
})

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
    const line = c.replace(/^data:\s*/, '').trim()
    if (!line) continue
    const obj = JSON.parse(line)
    console.log('chunk:', obj.data.audio)
  }
}
```

完整示例见 `client/src/api/index.js` 的 `generateVoiceStream`。

---

## 五、本地开发与测试

```bash
# 后端依赖（含 devDeps）
npm install

# 运行单元 + 集成测试
npm test

# 启动后端
npm run dev

# 前端构建
cd client && npm run build
```

测试覆盖：`server/services/voiceService.test.js`（18 项）+ `server/routes/voice.test.js`（12 项），合计 30 项。详见 `AGENTS.md` "### Testing" 段落。
