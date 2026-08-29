# 查询任务

> 按 `task_id` 查询最近 7 天内单个视频生成、H3-Context-IR 或视频再生成任务的状态与结果。

## 接口信息

- **方法**：`GET`
- **路径**：`/v2/query/video_generation/{task_id}`
- **鉴权**：Bearer Token

## 请求

### 请求头

| 字段 | 必填 | 说明 |
|------|------|------|
| `Authorization` | 是 | `Bearer <API_KEY>` |

### 路径参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | string | 是 | 要查询的任务 ID（创建任务返回的 `task_id`） |

## 响应

### `200 OK`

```json
{
  "task": {
    "id": "424010985738629",
    "model": "MiniMax-H3",
    "status": "succeeded",
    "created_at": 1785125529,
    "updated_at": 1785125946,
    "content": {
      "url": "https://cdn.hailuoai.com/prod/hailuo_demo/testsets/h3_promo_eval_ref2va/gallery/sr_v2p26_trio_seed42_20260724/inputs/89f8c0bbee5b_denoise_ids_0_final.mp4"
    },
    "resolution": "2K",
    "duration": 5,
    "usage": {
      "total_seconds": 5,
      "input_seconds": 0,
      "output_seconds": 5,
      "input_image_count": 1,
      "input_audio_seconds": 6,
      "total_tokens": 273890,
      "prompt_tokens": 13500,
      "completion_tokens": 260390
    },
    "ratio": "16:9",
    "task_type": "generation",
    "modality": "video"
  }
}
```

### 错误码

| HTTP | 含义 |
|------|------|
| 400 | 参数错误 |
| 401 | 鉴权失败 |
| 429 | 触发限流 |
| 500 | 服务端错误 |

## 示例

```bash
curl --request GET \
  --url https://api.minimaxi.com/v2/query/video_generation/424010985738629 \
  --header 'Authorization: Bearer <token>'
```

## `task` 对象字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务 ID |
| `model` | string | 模型名称 |
| `status` | string | 任务状态（`queued`/`running`/`succeeded`/`failed`/`cancelled`） |
| `created_at` | integer | 创建时间（Unix 秒） |
| `updated_at` | integer | 更新时间（Unix 秒） |
| `content` | object | 任务产物 |
| `resolution` | string | 视频分辨率 |
| `duration` | integer | 视频时长（秒） |
| `usage` | object | 用量统计 |
| `ratio` | string | 实际宽高比 |
| `task_type` | string | 任务类型（`generation`/`h3_context_ir`/`regeneration`） |
| `modality` | string | 模态（`video` 或 `text`） |
| `error` | object | 错误信息（仅失败时存在） |

`content` 内容按 `task_type` 区分：

- `generation` / `regeneration`：`{ "url": "<视频文件URL>" }`
- `h3_context_ir`：`{ "prompt": "<增强后的结构化提示词>" }`

## 注意事项

- 仅可查询最近 7 天内创建的任务。
- 视频生成是异步任务，提交后需轮询本接口直到 `status` 为 `succeeded`、`failed` 或 `cancelled`。
- 任务失败时 `task.error.code` / `task.error.message` 提供错误码与错误信息。
