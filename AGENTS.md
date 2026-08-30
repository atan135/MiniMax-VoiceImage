# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Voice and image generation platform using MiniMax API with Express.js backend and Vue 3 frontend.

## Commands

```bash
# Install all dependencies
npm run install:all

# Start backend (server on port 3000)
npm run dev

# Start frontend dev server (Vite on port 5173)
cd client && npm run dev

# Build frontend for production
cd client && npm run build
```

## Architecture

### Backend (Express.js)

- Routes in `server/routes/` handle HTTP requests and responses
- Services in `server/services/` contain business logic
- `voiceService.js` and `imageService.js` call MiniMax API
- `voiceInventoryService.js` syncs voices API → MySQL database
- `historyService.js` manages generation history in MySQL
- Database tables auto-create on server startup via `initDatabase()` in `db.js`

### Frontend (Vue 3 + Element Plus)

- Views in `client/src/views/` correspond to pages
- API calls centralized in `client/src/api/index.js`
- Vite proxies `/api/*` to backend port 3000 and `/output/*` to static files

### Data Flow

1. Voice/Image generation requests → route → service → MiniMax API
2. Successful generation → `historyService.addRecord()` stores to MySQL
3. Voice options → `voiceInventoryService` reads from MySQL (cached)
4. Refresh voices → syncs from MiniMax API to MySQL, then reads back

### Key Patterns

- Routes use `maskSensitiveData()` from logger to sanitize logs (hides API_KEY)
- Voice deletion: API call + local MySQL delete (even if API fails)
- History records store masked params JSON, not raw sensitive data

### Frontend Error Handling

API请求报错时，catch块必须优先使用后端返回的错误信息：

```javascript
// ✅ 正确：优先使用 e.response?.data?.error
error.value = e.response?.data?.error || e.message || '操作失败'
ElMessage.error(e.response?.data?.error || e.message || '操作失败')

// ❌ 错误：只使用 e.message，会显示 "Request failed with status code 500"
error.value = e.message || '操作失败'
```

涉及文件：`VoiceView.vue`、`ImageView.vue`、`VoiceCloneView.vue`、`VoiceManageView.vue`

## Database

Two MySQL tables: `generation_history` (all generations) and `voice_inventory` (cached voices).
Tables created automatically on `npm run dev`.

## Environment

Create `.env` with `API_KEY`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `PORT`.

#### Voice service 字段映射约定

后端 `server/services/voiceService.js` 中 `textToSpeech` 入参采用 **camelCase**，传给 MiniMax `/v1/t2a_v2` API 时统一转换为 **snake_case**：

| 入参（camelCase） | API payload（snake_case） | 顶层路径 |
|---|---|---|
| `sampleRate` | `sample_rate` | `audio_setting` |
| `audioFormat` | `format` | `audio_setting` |
| `textNormalization` | `text_normalization` | `voice_setting` |
| `latexRead` | `latex_read` | `voice_setting` |
| `englishNormalization` | `english_normalization` | `voice_setting` |
| `languageBoost` | `language_boost`（条件追加） | 顶层 |
| `pronunciationDict` | `pronunciation_dict`（条件追加） | 顶层 |
| `timbreWeights` | `timbre_weights`（条件追加） | 顶层 |
| `voiceModify` | `voice_modify`（条件追加） | 顶层 |
| `subtitleEnable` | `subtitle_enable` | 顶层 |
| `aigcWatermark` | `aigc_watermark` | 顶层 |
| `outputFormat` | `output_format` | 顶层 |
| `stream` / `streamOptions` | `stream` / `stream_options` | 顶层 |

#### `stream` 与 `stream_options` 透传规则

- `stream: true`：路由层切换为 SSE（`Content-Type: text/event-stream`），后端调 `textToSpeechStream(payload, onChunk, onEnd, onError)` 走流式分支，**不写历史记录**。
- `stream: false`（默认）：调原 `axios.post`，写历史记录。
- `streamOptions` 为 null 时**不挂载**到 payload；有值时（如 `{exclude_aggregated_audio: true, speech_rate: 1.2}`）直接透传至 MiniMax API。
- SSE chunk 格式：`data: <json>\n\n`；错误事件：`event: error\ndata: <json>\n\n`。

#### `subtitle_file` 持久化策略

- 后端在 `generation_history` 表新增 `subtitle MEDIUMTEXT NULL` 列（`server/utils/db.js` `initDatabase()`）。
- 存储路径：响应中 `data.subtitle_file` 字段（fallback 探测顶层 `subtitle_file`），仅当 `subtitleEnable === true` 且响应含字幕时入库。
- `historyService.addRecord` 第 8 参数为 `subtitle = null`，string 类型，**1MB 上限**（`Buffer.byteLength(subtitle, "utf8") > 1024*1024` 抛 `字幕内容超过 1MB 上限`）。
- 下载接口：`GET /api/voice/subtitle/:id`，Content-Type 自动嗅探（`{` → `application/json`；`WEBVTT` → `text/vtt`；其它 → `text/plain`）。

#### `addRecord` 新签名

```
addRecord(type, prompt, params, filePath, fileSize, status, errorMsg = null, subtitle = null)
```

- `subtitle` 为可选第 8 参数，**所有既有调用方无需改动**（默认 null）。
- 流式模式跳过 `addRecord`（`routes/voice.js` 流式分支提前 `return`）。

#### `textToSpeech` 校验失败抛错顺序

严格按以下顺序检查，前一项通过才检查下一项：

1. `!API_KEY` → `请先在 .env 中配置 API_KEY`
2. `!text` → `文本内容不能为空`
3. `text.length > 10000` → `文本长度超过 10000 字符上限`
4. `!voiceId` → `请指定 voice_id`
5. `!Number.isInteger(channel) || channel !== 1 && channel !== 2` → `channel 必须是 1 或 2`
6. `typeof textNormalization !== "boolean"` → `textNormalization 必须是布尔值`
7. `typeof latexRead !== "boolean"` → `latexRead 必须是布尔值`
8. `typeof englishNormalization !== "boolean"` → `englishNormalization 必须是布尔值`

涉及文件：`server/services/voiceService.js`（`textToSpeech` 函数 `voiceService.js:269-300`）。

### Testing

```bash
npm install
npm test
```

- 测试框架：**Vitest** ^2.1.0 + **supertest** ^7.0.0 + **nock** ^14.0.0（devDependencies）
- 测试目录：`server/**/*.test.js`
- 当前覆盖：`server/services/voiceService.test.js`（18 项：校验、payload、subtitle、错误响应）+ `server/routes/voice.test.js`（12 项：options / POST 流式 / POST 非流式 / 字幕路由）
- 配置文件：`vitest.config.js`（environment=node）+ `vitest.setup.js`（设置 `process.env.API_KEY`）
- 历史扩展调用方（`image.js` / `music.js` / `video.js` / `videoOld.js`）暂无单测，靠集成/E2E 验证。
