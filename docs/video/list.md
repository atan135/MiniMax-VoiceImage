# 查询任务列表

> 分页查询最近 7 天内的任务列表，支持按状态、任务 ID、模型和任务类型过滤。

## 接口信息

- **方法**：`GET`
- **路径**：`/v2/query/video_generation`
- **鉴权**：Bearer Token

## 请求

### 请求头

| 字段 | 必填 | 说明 |
|------|------|------|
| `Authorization` | 是 | `Bearer <API_KEY>` |

### 查询参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page_num` | integer | 否 | 页码，从 1 开始 |
| `page_size` | integer | 否 | 每页数量 |
| `filter.status` | enum\<string\> | 否 | 按任务状态过滤：`queued`/`running`/`succeeded`/`failed`/`cancelled` |
| `filter.task_ids` | string[] | 否 | 按任务 ID 过滤，可传多个 |
| `filter.model` | string | 否 | 按模型名称过滤，如 `MiniMax-H3` |
| `filter.task_type` | enum\<string\> | 否 | 按任务类型过滤：`generation`/`h3_context_ir`/`regeneration` |

## 响应

### `200 OK`

```json
{
  "items": [
    {
      "id": "424635601932571",
      "model": "MiniMax-H3",
      "status": "succeeded",
      "created_at": 1785225940,
      "updated_at": 1785226100,
      "content": {
        "url": "https://video-product.cdn.minimax.io/inference_output/rollout/2026-07-28/5fe7ec4a-6f51-4d69-880e-220e59535d98/output.mp4"
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
      "ratio": "adaptive",
      "task_type": "generation"
    },
    {
      "id": "424635601932588",
      "model": "MiniMax-H3",
      "status": "running",
      "created_at": 1785225940,
      "updated_at": 1785226100,
      "resolution": "2K",
      "duration": 10,
      "usage": {},
      "ratio": "9:16",
      "task_type": "generation"
    },
    {
      "id": "424635601932587",
      "model": "MiniMax-H3",
      "status": "queued",
      "created_at": 1785225940,
      "updated_at": 1785226100,
      "resolution": "2K",
      "duration": 8,
      "usage": {},
      "ratio": "9:16",
      "task_type": "generation"
    },
    {
      "id": "424635601932586",
      "model": "MiniMax-H3",
      "status": "failed",
      "created_at": 1785225940,
      "updated_at": 1785226100,
      "error": {
        "code": "1026",
        "message": "video description contains sensitive content"
      },
      "resolution": "2K",
      "duration": 12,
      "usage": {},
      "ratio": "9:16",
      "task_type": "generation"
    }
  ],
  "total": 476
}
```

### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `items` | object[] | 任务列表，结构同 [query.md](./query.md) 中的 `task` 对象 |
| `total` | integer | 符合过滤条件的任务总数（仅统计最近 7 天内的任务） |

### 错误码

| HTTP | 含义 |
|------|------|
| 400 | 参数错误 |
| 401 | 鉴权失败 |
| 429 | 触发限流 |
| 500 | 服务端错误 |

## 示例

### 分页查询

```bash
curl --request GET \
  --url 'https://api.minimaxi.com/v2/query/video_generation?page_num=1&page_size=20' \
  --header 'Authorization: Bearer <token>'
```

### 按状态过滤（只查成功的任务）

```bash
curl --request GET \
  --url 'https://api.minimaxi.com/v2/query/video_generation?page_num=1&page_size=20&filter.status=succeeded' \
  --header 'Authorization: Bearer <token>'
```

### 按任务类型过滤（只查 H3-Context-IR）

```bash
curl --request GET \
  --url 'https://api.minimaxi.com/v2/query/video_generation?page_num=1&page_size=20&filter.task_type=h3_context_ir' \
  --header 'Authorization: Bearer <token>'
```

## 注意事项

- `total` 仅统计最近 7 天内的任务，超出范围的任务不会计入。
- `filter.task_ids` 接受多个 ID，可批量查询指定任务的当前状态。
- `filter.status` 与 `filter.task_type` 可同时使用，组合过滤。
