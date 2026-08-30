# 语音模块字段映射表（项目 ↔ 官方 ↔ 改造点）

> 配套文档：`summary/语音模块升级_checklist.md` 阶段 1 交付物
> 官方接口：`https://platform.minimaxi.com/docs/api-reference/speech-t2a-http`
> 适用文件：`server/services/voiceService.js`、`server/routes/voice.js`、`client/src/views/VoiceView.vue`、`client/src/views/VoiceCloneView.vue`、`client/src/views/VoiceManageView.vue`

## 一、`t2a_v2` 主接口请求体字段映射

| 官方字段 | 项目当前实现位置 | 项目当前处理 | 官方约束 | 改造点（阶段） |
|---|---|---|---|---|
| `model` | `voiceService.js:272` 默认值 `DEFAULT_MODEL = "speech-2.8-hd"`（`voiceService.js:8`） | 默认值固定，无 UI 选择 | `speech-2.6` / `speech-2.6-hd` / `speech-02` / `speech-02-hd` / `speech-2.8-hd` | 阶段 2 / 5：后端新增 `MODEL_LIST` 常量与 `/options.modelList`，前端加下拉，默认 `speech-2.8-hd` |
| `text` | `voiceService.js:270` | 入参必填校验 | 必填，最大 10000 字符（文档） | 阶段 2：补字符上限校验 |
| `stream` | `voiceService.js:299` 硬编码 `false` | 不支持流式 | `false` / `true` | 阶段 7：透传 + 流式响应处理 |
| `audio_setting.bitrate` | `voiceService.js:301` 默认 `128000` | `BITRATE_LIST` 5 档 | 32000~320000 | 阶段 2：保持 |
| `audio_setting.sample_rate` | `voiceService.js:302` 默认 `32000` | `SAMPLE_RATE_LIST` 4 档 | 8000/16000/24000/32000/44100/48000 | 阶段 2：可选加入 8000/44100 |
| `audio_setting.format` | `voiceService.js:303` 默认 `"mp3"` | `AUDIO_FORMAT_LIST`：`mp3/wav/flac` | `mp3/wav/flac/pcm` | 阶段 2：追加 `pcm` |
| `audio_setting.channel` | `voiceService.js:304` **硬编码 `1`** | 不支持立体声 | `enum: [1, 2]` | 阶段 2：透传入参 `channel`，默认 `1` |
| `voice_setting.voice_id` | `voiceService.js:307` | 入参必填校验 | 必填 | 阶段 2：保持 |
| `voice_setting.speed` | `voiceService.js:308` 默认 `1` | 透传 | `[-1, 1]`，可超出区间但有限制 | 阶段 2：保持 |
| `voice_setting.vol` | `voiceService.js:309` 默认 `1` | 透传 | `(0, 10]` | 阶段 2：保持 |
| `voice_setting.pitch` | `voiceService.js:310` 默认 `0` | 透传 | `[-12, 12]` | 阶段 2：保持 |
| `voice_setting.emotion` | `voiceService.js:311` 默认 `"fluent"` | `EMOTION_LIST` 9 种 | 同 9 种 | 阶段 2：保持 |
| `voice_setting.text_normalization` | `voiceService.js:312` 默认 `false` | 透传 | bool | 阶段 3：保持 |
| `voice_setting.latex_read` | `voiceService.js:313` 默认 `false` | 透传 | bool | 阶段 3：保持 |
| `voice_setting.english_normalization` | **缺失** | 未透传 | bool（默认 false） | 阶段 3：新增入参 `englishNormalization` 与透传 |
| `subtitle_enable` | `voiceService.js:315` 默认 `false` | 透传但响应中 `subtitle_file` 未保存 | bool | 阶段 4：响应中 `subtitle_file` 持久化 |
| `output_format` | `voiceService.js:316` 默认 `"hex"` | `hex` / `url` 两个分支 | `hex` / `url` | 阶段 2：保持 |
| `aigc_watermark` | `voiceService.js:317` 默认 `false` | 透传 | bool | 阶段 2：保持 |
| `language_boost` | `voiceService.js:320` | `LANGUAGE_BOOST_LIST` 39 种 + 条件追加 | 39 种 + `auto` | 阶段 2：保持 |
| `pronunciation_dict` | `voiceService.js:321` | 条件追加 | object 或 string（音素级 / tone 字符串） | 阶段 8：UI 增加 JSON 编辑器 |
| `timbre_weights` | `voiceService.js:322` | 条件追加 | 数组 `{voice_id, weight}` | 阶段 8：UI 多音色权重列表 |
| `voice_modify` | `voiceService.js:323` | 条件追加 | 子对象 | 阶段 8：UI 子项展开 |
| `stream_options` | **缺失** | 未实现 | `{exclude_aggregated_audio, speech_rate}` | 阶段 7：新增透传 + 流式处理 |

## 二、`voice_modify` 子字段映射

| 官方字段 | 类型 | 范围/枚举 | 项目当前 | 改造点（阶段 8） |
|---|---|---|---|---|
| `pitch_decrement` | int | `[-100, 100]` | 无 | UI 滑杆 |
| `pitch_increment` | int | `[-100, 100]` | 无 | UI 滑杆 |
| `intensity_decrement` | int | `[-100, 100]`（仅 hd 模型） | 无 | UI 滑杆 |
| `intensity_boost` | int | `[-100, 100]`（仅 hd 模型） | 无 | UI 滑杆 |
| `sound_effects` | string[] | `spacious_echo` / `lofi_telephone` / `robotic` / `ethereal` / `horror` / `auditorium_echo` / `vinyl` / `arcade` / `cinema_whoosh` / `choral_echo` / `glitch_whoosh` / `8d_audio` 等 | 无 | UI 多选 |
| `voice_modify_pitch` | int | `[-100, 100]` | 无 | UI 滑杆 |

## 三、`t2a_v2` 响应字段映射

| 官方响应字段 | 项目当前处理 | 改造点（阶段） |
|---|---|---|
| `data.audio` (hex) | `voiceService.js:264` 保存并返回 `audioHex`/`filePath` | 阶段 2：保持 |
| `data.audio_url` | `voiceService.js:255-261` 当 `output_format: "url"` 时处理 | 阶段 2：保持 |
| `subtitle_file` | **未处理** | 阶段 4：识别格式（`json` / `vtt`）→ 持久化 → 返回路径 / 内联内容 |
| `base_resp.status_code` | `voiceService.js:336` 检查非 0 | 阶段 2：保持 |

## 四、`voice_clone` 请求字段映射

| 官方字段 | 项目当前实现位置 | 项目当前 | 改造点 |
|---|---|---|---|
| `file_id` | `voiceService.js:218` | 必填校验 | 保持 |
| `voice_id` | `voiceService.js:218` | 必填校验 | 保持 |
| `clone_prompt` | `voiceService.js:229` | 条件追加 | 保持 |
| `text` | `voiceService.js:230` | 条件追加 | 保持 |
| `model` | `voiceService.js:231` | 条件追加，默认走 `DEFAULT_MODEL` | 阶段 9：暴露到前端 |
| `language_boost` | `voiceService.js:232` | 条件追加 | 保持 |
| `need_noise_reduction` | `voiceService.js:233` | 条件追加 | UI 加开关 |
| `need_volume_normalization` | `voiceService.js:234` | 条件追加 | UI 加开关 |
| `aigc_watermark` | `voiceService.js:235` | 条件追加 | UI 加开关 |

## 五、`voice_design` 请求字段映射

| 官方字段 | 项目当前实现位置 | 项目当前 | 改造点 |
|---|---|---|---|
| `prompt` | `voiceService.js:95` | 必填校验 | 保持 |
| `preview_text` | `voiceService.js:95` | 必填校验 | 保持 |
| `voice_id` | `voiceService.js:96` | 条件追加 | 保持 |
| `aigc_watermark` | `voiceService.js:97` | 条件追加 | 保持 |

## 六、`files/upload` 请求字段映射

| 官方字段 | 项目当前实现位置 | 项目当前 | 改造点 |
|---|---|---|---|
| `purpose` | `voiceService.js:181` 默认 `voice_clone` | 仅默认 `voice_clone` | 阶段 9：UI 增加 `prompt_audio` 选项 |
| `file` | `voiceService.js:183` | 文件流 | 保持 |

## 七、前端 UI 暴露度对照表

| 后端能力 | `VoiceView.vue` 当前 | 需新增 UI 控件 | 阶段 |
|---|---|---|---|
| `model` | 无 | 模型下拉 | 5 |
| `channel` | 无 | 单声道 / 立体声切换 | 5 |
| `english_normalization` | 无 | 开关 | 5 |
| `text_normalization` | 无 | 开关 | 5 |
| `latex_read` | 无 | 开关 | 5 |
| `aigc_watermark` | 无 | 开关 | 5 |
| `subtitle_enable` | 无 | 开关 + 字幕展示 | 6 |
| `pronunciation_dict` | 无 | JSON 编辑器 | 8 |
| `timbre_weights` | 无 | 多音色权重列表 | 8 |
| `voice_modify.*` | 无 | 子项展开 | 8 |
| `stream` | 无 | 流式开关（阶段 7） | 7 |

## 八、改造影响范围与依赖

### 直接修改文件
- `server/services/voiceService.js` — 主战场，所有请求体字段与常量
- `server/routes/voice.js` — `/options` 路由透出新常量、`POST /` 调用 `textToSpeech`
- `client/src/views/VoiceView.vue` — 主 UI 改造

### 间接修改文件
- `server/utils/db.js` 或 `server/services/historyService.js` — 阶段 4 增加 `subtitle_file_path` 字段（决策：DB 存储）
- `server/db.js` / `server/utils/db.js` — 阶段 9 引入 `vitest` 时确认路径
- `client/src/views/HistoryView.vue` — 阶段 6 历史详情字幕展示
- `package.json` — 阶段 9 增加 `vitest` 与 `supertest` devDeps、`test` 脚本
- `AGENTS.md` — 阶段 9 更新 Key Patterns 段落

### 新增文件（建议）
- `server/services/voiceService.test.js` — 单测
- `server/routes/voice.test.js` — 集成测试（流式输出）
- `docs/voice.md` — 阶段 9 文档

## 九、关键约束与默认值汇总

| 字段 | 推荐默认值 | 说明 |
|---|---|---|
| `model` | `speech-2.8-hd` | 当前最强版本 |
| `channel` | `1`（单声道） | 兼容历史 |
| `english_normalization` | `false` | 不破坏现有发音 |
| `stream` | `false` | 流式作为高级选项 |
| `subtitle_enable` | `false` | 默认按需开启 |
| `output_format` | `hex` | 现有默认 |
| `aigc_watermark` | `false` | 默认不加水印 |

## 十、回归要点

- 旧请求体不带新字段时，所有 `if (x) payload.x = x` 模式必须保留默认值。
- 数据库 `generation_history.params` JSON 中旧记录无新字段时，反序列化不应报错（前端读取需兼容）。
- `voiceService.js` 中所有 `if (...) payload.xxx = ...` 模式（行 320–323）不允许改为直接赋值，否则会发送 `undefined` 字段给 API。