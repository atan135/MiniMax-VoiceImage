# 视频生成 API

基于 MiniMax H3 多模态视频模型的视频生成 V2 接口集合。

## 模型

| 模型 | 说明 |
|------|------|
| `MiniMax-H3` | 新一代开放通用多模态视频模型，支持 2K 直出 |

## 接口索引

| 文档 | 方法 | 路径 | 说明 |
|------|------|------|------|
| [generation.md](./generation.md) | `POST` | `/v2/video_generation` | 创建视频生成任务 |
| [query.md](./query.md) | `GET` | `/v2/query/video_generation/{task_id}` | 查询单个任务 |
| [list.md](./list.md) | `GET` | `/v2/query/video_generation` | 查询任务列表 |
| [delete.md](./delete.md) | `DELETE` | `/v2/video_generation/{task_id}` | 取消或删除任务 |
| [context-ir.md](./context-ir.md) | `POST` | `/v2/h3_context_ir` | 创建 H3-Context-IR 任务（提示词增强） |
| [regeneration.md](./regeneration.md) | `POST` | `/v2/video_regeneration` | 视频再生成（768P -> 2K） |

## 通用概念

### 鉴权

所有接口均使用 HTTP Bearer 鉴权：

```http
Authorization: Bearer <API_KEY>
```

API Key 在 MiniMax 控制台的「账户管理 -> 接口密钥」中获取。

### 任务类型 `task_type`

| 取值 | 含义 |
|------|------|
| `generation` | 视频生成（`/v2/video_generation`） |
| `h3_context_ir` | H3-Context-IR 提示词增强（`/v2/h3_context_ir`） |
| `regeneration` | 视频再生成（`/v2/video_regeneration`） |

### 任务状态 `status`

| 取值 | 含义 |
|------|------|
| `queued` | 排队中，未开始处理 |
| `running` | 运行中 |
| `succeeded` | 已成功 |
| `failed` | 失败 |
| `cancelled` | 已取消 |

### 多模态 `content` 数组

`content` 是描述生成素材的多模态数组，每个元素通过 `type` 区分类型，可选 `role` 标注用途：

| `type` | 用途 | `role` 可选值 |
|--------|------|---------------|
| `text` | 文本提示词 | - |
| `image_url` | 图片 | `first_frame`、`last_frame`、`reference_image` |
| `video_url` | 视频（仅多模态参考场景） | `reference_video`、`base_video` |
| `audio_url` | 音频（仅多模态参考场景） | `reference_audio` |

> **必含一个非空 `text` 项**，否则返回参数错误。

#### 支持的输入组合

- **文生视频（t2va）**：仅 1 个 `text` 元素
- **图生视频-首帧（i2va）**：`text` + 1 张 `image_url`（`role=first_frame` 或不填）
- **图生视频-尾帧**：`text` + 1 张 `image_url`（`role=last_frame`）
- **图生视频-首尾帧**：`text` + 2 张 `image_url`（`role` 分别为 `first_frame`、`last_frame`）
- **多模态参考生视频（r2va）**：`text` + 参考图（`reference_image`）+ 参考视频（`reference_video`）+ 参考音频（`reference_audio`）的组合

> **互斥规则**：`first_frame` / `last_frame` 与 `reference_image` / `reference_video` / `reference_audio` 不可混用。

#### 输入媒体限制

请求体总大小 **<= 64 MB**，大文件请使用公网 URL，避免 Base64。

**图片 `image_url`**

| 项 | 限制 |
|----|------|
| 格式 | JPG、JPEG、PNG、WEBP、HEIC、HEIF |
| 单文件大小 | <= 30 MB |
| 宽高范围 | [256, 5760] px |
| 长宽比（宽/高） | [0.4, 2.5] |
| 数量 | 首帧 <= 1、尾帧 <= 1、参考图 <= 9 |

**视频 `video_url`（仅多模态参考场景）**

| 项 | 限制 |
|----|------|
| 容器/格式 | MP4（.mp4）、MOV（.mov） |
| 编码 | 视频 H.264/AVC、H.265/HEVC；音频 AAC、MP3 |
| 单文件大小 | <= 50 MB |
| 个数 | <= 3 |
| 单段时长 | [2, 15] s；总时长 <= 15 s |
| 宽高范围 | [256, 5760] px |
| 长宽比（宽/高） | [0.4, 2.5] |
| 帧率 | [23.976, 60] |

**音频 `audio_url`（仅多模态参考场景）**

| 项 | 限制 |
|----|------|
| 格式 | WAV、MP3 |
| 单文件大小 | <= 15 MB |
| 个数 | <= 3 |
| 单段时长 | [2, 15] s；总时长 <= 15 s |

### 宽高比 `ratio`

可用值：`adaptive`、`21:9`、`16:9`、`4:3`、`1:1`、`3:4`、`9:16`。

不同生成场景的约束不同：

- **文生视频（t2va）**：`ratio` 必填，且不能为 `adaptive`；可用值 `21:9`、`16:9`、`4:3`、`1:1`、`3:4`、`9:16`。
- **图生视频（i2va）**：宽高比由输入图片决定，`ratio` 恒为 `adaptive`；传入其他值会被忽略。
- **多模态参考生视频（r2va）**：`ratio` 可选，默认 `adaptive`，也可显式指定具体比例。

### 回调 `callback_url`

可选，配置后 MiniMax 服务器会：

1. 先发送含 `challenge` 字段的验证请求（需 3 秒内原样返回 `challenge` 完成验证）
2. 验证成功后每当任务状态变更即向该地址 POST 推送，结构与「查询任务」接口的响应一致

推送的 `status` 取值：`queued`、`running`、`succeeded`、`failed`、`cancelled`。

### 异步任务模式

除查询接口外，所有写接口（创建/取消/删除）均采用异步任务模式：

1. 调用创建接口立即返回 `task_id`
2. 通过「查询任务」接口轮询任务状态
3. 任务成功后从 `content.url` 读取生成的视频 URL

## 错误码

| HTTP | `error.type` | 含义 | 内部码示例 |
|------|--------------|------|------------|
| 400 | `bad_request_error` | 参数错误 | `(2013)` |
| 401 | `authorized_error` | 鉴权失败 | `(1004)` |
| 402 | `insufficient_balance_error` | 余额不足 | - |
| 422 | `unprocessable_entity_error` | 内容不合规 | - |
| 429 | `rate_limit_error` | 触发限流 | `(1002)` |
| 500 | `server_error` | 服务端错误 | `(1000)` |
| 529 | `overloaded_error` | 服务过载 | - |

错误响应示例：

```json
{
  "type": "error",
  "error": {
    "type": "bad_request_error",
    "message": "invalid params, content must include a non-empty text item (prompt is required) (2013)",
    "http_code": "400"
  },
  "request_id": "021785229015510a2c883cf675b9804d"
}
```

## 任务对象 `task`

「查询任务」和「查询任务列表」接口共享以下任务对象结构：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务 ID |
| `model` | string | 模型名称 |
| `status` | string | 任务状态 |
| `created_at` | integer | 创建时间（Unix 秒） |
| `updated_at` | integer | 更新时间（Unix 秒） |
| `content` | object | 任务产物（不同 `task_type` 字段不同） |
| `resolution` | string | 视频分辨率 |
| `duration` | integer | 视频时长（秒） |
| `ratio` | string | 实际宽高比（输入为 `adaptive` 时由模型决定） |
| `task_type` | string | 任务类型 |
| `modality` | string | 模态（`video` 或 `text`） |
| `usage` | object | 用量统计（不同任务字段不同） |
| `error` | object | 错误信息（仅失败时存在） |

`content` 字段按 `task_type` 区分：

- `generation` / `regeneration`：`content.url` 为视频文件 URL
- `h3_context_ir`：`content.prompt` 为增强后的结构化提示词

`usage` 字段（`generation` 示例）：

```json
{
  "total_seconds": 5,
  "input_seconds": 0,
  "output_seconds": 5,
  "input_image_count": 1,
  "input_audio_seconds": 6,
  "total_tokens": 273890,
  "prompt_tokens": 13500,
  "completion_tokens": 260390
}
```

## 完整工作流

1. **创建任务**：调用 `POST /v2/video_generation` 拿到 `task_id`
2. **轮询结果**：调用 `GET /v2/query/video_generation/{task_id}` 直到 `status="succeeded"`
3. **下载视频**：从响应 `task.content.url` 拉取视频文件
4. **（可选）再生成 2K**：若需要更高分辨率，对 768P 任务调用 `POST /v2/video_regeneration`
5. **（可选）取消/删除**：调用 `DELETE /v2/video_generation/{task_id}` 释放任务记录
