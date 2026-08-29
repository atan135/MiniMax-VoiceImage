# 查询视频生成任务状态

> 使用本接口查询视频生成的任务状态。

## 接口信息

- **方法**：`GET`
- **路径**：`/v1/query/video_generation`
- **鉴权**：Bearer Token
- **适用场景**：根据 `task_id` 轮询任意 V1 创建接口（t2v / i2v / fl2v / s2v）提交的任务状态

## 请求

### 请求头

| 字段 | 必填 | 说明 |
|------|------|------|
| `Authorization` | 是 | `Bearer <API_KEY>` |

### 查询参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | string | 是 | 待查询的任务 ID。只能查询当前账号创建的任务 |

## 响应

### `200 OK`

```json
{
  "task_id": "176843862716480",
  "status": "Success",
  "file_id": "176844028768320",
  "video_width": 1920,
  "video_height": 1080,
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `task_id` | string | 被查询的任务 ID |
| `status` | enum\<string\> | 任务状态，详见下文 |
| `file_id` | string | 任务成功时返回，用于换取视频文件下载链接 |
| `video_width` | integer | 任务成功时返回，生成视频的宽度（像素） |
| `video_height` | integer | 任务成功时返回，生成视频的高度（像素） |
| `base_resp.status_code` | integer | 状态码（0 表示请求成功） |
| `base_resp.status_msg` | string | 状态详情 |

#### 任务状态 `status`

| 取值 | 含义 |
|------|------|
| `Preparing` | 准备中 |
| `Queueing` | 队列中 |
| `Processing` | 生成中 |
| `Success` | 已成功 |
| `Fail` | 失败 |

#### `base_resp.status_code` 取值

| 取值 | 含义 |
|------|------|
| `0` | 请求成功 |
| `1002` | 触发限流，请稍后再试 |
| `1004` | 账号鉴权失败，请检查 API Key 是否填写正确 |
| `1026` | 输入内容涉及敏感内容 |
| `1027` | 生成视频涉及敏感内容 |

> 完整错误码列表见 [README.md](./README.md#错误码)。

## 示例

```bash
curl --request GET \
  --url 'https://api.minimaxi.com/v1/query/video_generation?task_id=176843862716480' \
  --header 'Authorization: Bearer <token>'
```

## 工作流

本接口是 V1 工作流的中段环节。典型查询流程：

1. 通过 t2v / i2v / fl2v / s2v 任一创建接口拿到 `task_id`
2. **轮询本接口**直到 `status` 为 `Success` 或 `Fail`
3. 若 `status=Success`，从响应中拿到 `file_id`
4. 调用 [download.md](./download.md) 接口，参数为 `file_id`，获取 `download_url`
5. 使用 `download_url` 拉取 MP4 文件（链接有效期 1 小时）

## 注意事项

- 仅可查询当前账号创建的任务；其他账号的 `task_id` 会返回错误。
- 任务一旦进入 `Success` 或 `Fail` 终态，建议停止轮询避免触发限流。
- 视频生成是异步任务，提交后必须轮询本接口获取结果；本接口**不会主动推送**结果（若需要推送请配置创建接口的 `callback_url`）。
- 任务失败时 `base_resp.status_msg` 会给出错误描述，但具体敏感内容等敏感字段可能仅 `status_code` 可见。
- `file_id` / `video_width` / `video_height` 仅在 `status=Success` 时有值；其他状态这些字段可能缺失。
