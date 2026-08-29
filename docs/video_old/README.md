# 视频生成 API（V1 / 旧版）

基于 MiniMax 视频生成 V1 接口集合，针对旧版模型（`MiniMax-Hailuo-2.3`、`MiniMax-Hailuo-02`、`T2V-01` 系列、`I2V-01` 系列、`S2V-01`）。

> 与 `docs/video/`（H3 / V2 接口）相比，本目录文档对应 V1 版本的「创建任务 + 任务状态查询 + 文件下载」三段式工作流。

## 模型

| 模型 | 适用场景 | 说明 |
|------|----------|------|
| `MiniMax-Hailuo-2.3` | t2v / i2v | V1 默认推荐模型，支持 768P / 1080P |
| `MiniMax-Hailuo-2.3-Fast` | i2v | 速度优化版本，仅支持图生视频 |
| `MiniMax-Hailuo-02` | t2v / i2v / fl2v | 支持首尾帧生成 |
| `T2V-01-Director` | t2v | 导演指令版本，支持 `[指令]` 运镜 |
| `T2V-01` | t2v | 基础文生视频 |
| `I2V-01-Director` | i2v | 导演指令版本，支持 `[指令]` 运镜 |
| `I2V-01-live` | i2v | 真人风格模型 |
| `I2V-01` | i2v | 基础图生视频 |
| `S2V-01` | s2v | 主体参考视频生成 |

## 接口索引

| 文档 | 方法 | 路径 | 说明 |
|------|------|------|------|
| [t2v.md](./t2v.md) | `POST` | `/v1/video_generation` | 文生视频（纯文本） |
| [i2v.md](./i2v.md) | `POST` | `/v1/video_generation` | 图生视频（首帧图 + 文本） |
| [fl2v.md](./fl2v.md) | `POST` | `/v1/video_generation` | 首尾帧生视频 |
| [s2v.md](./s2v.md) | `POST` | `/v1/video_generation` | 主体参考视频生成 |
| [query.md](./query.md) | `GET` | `/v1/query/video_generation` | 查询任务状态 |
| [download.md](./download.md) | `GET` | `/v1/files/retrieve` | 检索生成视频文件下载链接 |

## 通用概念

### 鉴权

所有接口均使用 HTTP Bearer 鉴权：

```http
Authorization: Bearer <API_KEY>
```

API Key 在 MiniMax 控制台的「账户管理 -> 接口密钥」中获取。

### 任务状态 `status`

| 取值 | 含义 |
|------|------|
| `Preparing` | 准备中 |
| `Queueing` | 队列中 |
| `Processing` | 生成中 |
| `Success` | 已成功 |
| `Fail` | 失败 |

### 异步任务模式

所有创建接口（t2v / i2v / fl2v / s2v）均采用 V1 异步任务模式：

1. 调用创建接口立即返回 `task_id`
2. 通过「查询任务」接口轮询任务状态
3. 任务状态为 `Success` 时，从响应中拿到 `file_id`
4. 通过「检索文件」接口换取 `download_url` 下载视频

> 与 `docs/video/`（H3 / V2）直接返回 `content.url` 的工作流不同，V1 需要额外查一次文件下载链接。

### 通用请求体字段（创建接口）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `prompt` | string | 否（视接口而定） | 视频文本描述，最大 2000 字符 |
| `prompt_optimizer` | boolean | 否 | 是否自动优化 `prompt`，默认 `true`；设为 `false` 可获得更精确的控制 |
| `fast_pretreatment` | boolean | 否 | 是否缩短 `prompt_optimizer` 优化耗时，默认 `false`；仅对 `MiniMax-Hailuo-2.3` 系列与 `MiniMax-Hailuo-02` 生效 |
| `duration` | integer | 否 | 视频时长（秒），默认 6；可选 6 或 10，依模型与分辨率而定 |
| `resolution` | string | 否 | 视频分辨率，可选 `512P` / `720P` / `768P` / `1080P`，依模型而定 |
| `callback_url` | string | 否 | 任务状态变更的回调 URL |
| `aigc_watermark` | boolean | 否 | 是否在生成的视频中添加水印，默认 `false` |

#### 运镜指令 `[指令]`

对支持模型（`MiniMax-Hailuo-2.3`、`MiniMax-Hailuo-02`、各 `*-Director` 系列），可在 `prompt` 中使用 `[指令]` 语法进行运镜控制：

| 类别 | 指令 |
|------|------|
| 左右移 | `[左移]`、`[右移]` |
| 左右摇 | `[左摇]`、`[右摇]` |
| 推拉 | `[推进]`、`[拉远]` |
| 升降 | `[上升]`、`[下降]` |
| 上下摇 | `[上摇]`、`[下摇]` |
| 变焦 | `[变焦推近]`、`[变焦拉远]` |
| 其他 | `[晃动]`、`[跟随]`、`[固定]` |

使用规则：

- **组合运镜**：同一组 `[]` 内的多个指令会同时生效，如 `[左摇,上升]`，建议组合不超过 3 个
- **顺序运镜**：prompt 中前后出现的指令会依次生效，如 `...[推进], 然后...[拉远]`
- **自然语言**：也支持通过自然语言描述运镜，但使用标准指令能获得更准确的响应

### 图片要求（图生 / 首尾帧 / 主体参考）

| 项 | 限制 |
|----|------|
| 格式 | JPG、JPEG、PNG、WebP |
| 体积 | <= 20 MB |
| 短边像素 | > 300 px |
| 长宽比（短/长） | [0.4, 0.5]（即 2:5 ~ 5:2 之间） |
| 来源 | 公网 URL 或 Base64 Data URL（`data:image/jpeg;base64,...`） |

> 首尾帧生成时，视频尺寸遵循首帧图片；当首尾帧图片尺寸不一致时，模型会按首帧对尾帧进行裁剪。

### 回调 `callback_url`

可选，配置后 MiniMax 服务器会：

1. 先发送含 `challenge` 字段的验证请求（需 3 秒内原样返回 `challenge` 完成验证）
2. 验证成功后每当任务状态变更即向该地址 POST 推送

回调 `status` 取值：`processing`（生成中）、`success`（成功）、`failed`（失败）。

## 错误码

错误响应包含在 `base_resp` 中：

| `status_code` | 含义 |
|---------------|------|
| `0` | 请求成功 |
| `1000` | 未知错误 |
| `1001` | 超时 |
| `1002` | 触发 RPM 限流 |
| `1004` | 鉴权失败，请检查 API Key |
| `1008` | 账号余额不足 |
| `1013` | 服务内部错误 |
| `1026` | 输入内容错误（含敏感内容） |
| `1027` | 输出内容错误 |
| `1039` | 触发 TPM 限流 |
| `2013` | 传入参数异常 |
| `2049` | 无效的 API Key |

错误响应通用结构：

```json
{
  "task_id": "...",
  "base_resp": {
    "status_code": 1002,
    "status_msg": "trigger rate limit"
  }
}
```

## 完整工作流

1. **创建任务**：按场景调用 `POST /v1/video_generation`（t2v / i2v / fl2v / s2v 任一文档），拿到 `task_id`
2. **轮询结果**：调用 `GET /v1/query/video_generation?task_id=xxx` 直到 `status="Success"` 或 `status="Fail"`
3. **获取文件 ID**：从查询响应 `file_id` 字段读取
4. **换取下载链接**：调用 `GET /v1/files/retrieve?file_id=xxx` 获取 `file.download_url`（有效期 1 小时）
5. **下载视频**：使用下载链接拉取 MP4 文件

## 与 V2 的差异（参考）

| 项 | V1（本文档） | V2（`docs/video/`） |
|----|--------------|---------------------|
| 模型 | `MiniMax-Hailuo-*`、`T2V-01`、`I2V-01`、`S2V-01` | `MiniMax-H3` |
| 创建端点 | `POST /v1/video_generation`（按场景分文档，路径相同） | `POST /v2/video_generation`（统一多模态 `content` 数组） |
| 入参格式 | 单一字段（`prompt` / `first_frame_image` / `subject_reference` 等） | 多模态 `content[]`（`text` + `image_url` + `video_url` + `audio_url`） |
| 任务状态取值 | `Preparing` / `Queueing` / `Processing` / `Success` / `Fail` | `queued` / `running` / `succeeded` / `failed` / `cancelled` |
| 结果获取 | `task_id` -> 轮询 -> `file_id` -> `/v1/files/retrieve` -> `download_url` | `task_id` -> 轮询 -> `task.content.url` |
| 取消 / 删除 | 无专用接口 | `DELETE /v2/video_generation/{task_id}` |
| 视频再生成 | 不支持 | `POST /v2/video_regeneration` |
| H3-Context-IR | 不支持 | `POST /v2/h3_context_ir` |
| 分辨率 | `512P` / `720P` / `768P` / `1080P` | `768P` / `2K` |
| 时长 | 6s / 10s | 4 ~ 15s |
