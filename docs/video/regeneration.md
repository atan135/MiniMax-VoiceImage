# 创建视频再生成任务

> 对符合 MiniMax-H3 768P 输出规格的源视频再生成为 2K 视频。

## 能力说明

支持两种方式（二选一）：

- **按任务 ID**：传已有生成任务的 `source_task_id`
- **按源视频**：在 `content` 中传 `base_video`

> **重要限制**：本接口**仅支持对符合 MiniMax-H3 768P 输出规格的生成视频**进行再生成并输出 2K，不支持任意视频的通用处理。

再生成任务的 `task_type` 为 `regeneration`，可通过 [query.md](./query.md)、[list.md](./list.md) 和 [delete.md](./delete.md) 共用接口管理。

## 接口信息

- **方法**：`POST`
- **路径**：`/v2/video_regeneration`
- **鉴权**：Bearer Token

## 请求

### 请求头

| 字段 | 必填 | 说明 |
|------|------|------|
| `Authorization` | 是 | `Bearer <API_KEY>` |
| `Content-Type` | 是 | `application/json` |

### 请求体 `application/json`（按任务 ID）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | enum\<string\> | 是 | 模型名称，当前支持 `MiniMax-H3` |
| `source_task_id` | string | 是 | 已有 `/v2/video_generation` 成功任务的 `task_id`，以其产物为源再生成 |
| `resolution` | enum\<string\> | 是 | 视频再生成的目标分辨率，当前支持 `2K` |
| `callback_url` | string | 否 | 任务状态变更的回调 URL |
| `aigc_watermark` | boolean | 否 | 是否添加 AIGC 水印，默认 `false` |

#### `source_task_id` 使用限制

- 需开通白名单
- 源任务须属于当前账号、状态为 `succeeded`
- 源任务仍可通过 `/v2/query/video_generation` 查到（创建于 7 天内）

### 请求体 `application/json`（按源视频）

通过 `content` 数组传入 `base_video`：

```json
{
  "model": "MiniMax-H3",
  "content": [
    {
      "type": "video_url",
      "video_url": { "url": "https://example.com/source-768p.mp4" },
      "role": "base_video"
    }
  ],
  "resolution": "2K"
}
```

> 按源视频方式同样要求源视频符合 MiniMax-H3 768P 输出规格。

## 响应

### `200 OK`

```json
{
  "task_id": "424010985738631"
}
```

使用该 `task_id` 调用 [query.md](./query.md) 接口获取任务状态与结果。

### 错误码

| HTTP | 含义 |
|------|------|
| 400 | 参数错误 |
| 401 | 鉴权失败 |
| 402 | 余额不足 |
| 422 | 内容不合规 |
| 429 | 触发限流 |
| 500 | 服务端错误 |

## 示例

### 按任务 ID 再生成

```bash
curl --request POST \
  --url https://api.minimaxi.com/v2/video_regeneration \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "MiniMax-H3",
    "source_task_id": "424010985738629",
    "resolution": "2K"
  }'
```

## 任务结果

任务成功时 `task.content.url` 为 2K 视频文件 URL：

```json
{
  "task": {
    "id": "424010985738631",
    "model": "MiniMax-H3",
    "status": "succeeded",
    "created_at": 1785126000,
    "updated_at": 1785126300,
    "content": {
      "url": "https://your-cdn.example.com/h3-regenerated-2k-output.mp4"
    },
    "resolution": "2K",
    "duration": 5,
    "usage": {
      "total_seconds": 5,
      "input_seconds": 0,
      "output_seconds": 5,
      "input_image_count": 0
    },
    "ratio": "",
    "task_type": "regeneration",
    "modality": "video"
  }
}
```

## 注意事项

- 仅 `MiniMax-H3` 768P 输出规格的源视频可用于再生成，任意视频不可处理。
- `source_task_id` 必须属于当前账号、状态为 `succeeded` 且创建于 7 天内。
- 按 `source_task_id` 方式需提前开通白名单。
- `resolution` 当前仅支持 `2K`。
- `task_type` 为 `regeneration`，区别于 `generation` 和 `h3_context_ir`。
- 视频再生成是异步任务，提交后需轮询 `query` 接口获取结果。
