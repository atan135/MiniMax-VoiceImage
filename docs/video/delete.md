# 取消或删除任务

> 按任务当前状态取消排队中的任务，或删除成功和失败的视频生成、H3-Context-IR 及视频再生成任务记录。

本接口会根据任务的**当前状态**自动执行取消或删除，行为如下：

| 任务状态             | 执行操作（action） | 说明                       |
| :------------------- | :----------------- | :------------------------- |
| `queued`（排队中）   | `cancelled`        | 取消任务，任务尚未开始处理，无扣费 |
| `succeeded`（成功）  | `deleted`          | 删除任务记录               |
| `failed`（失败）     | `deleted`          | 删除任务记录               |
| `running`（运行中）  | -                  | 不可操作，返回错误（处理中无法取消） |
| `cancelled`（已取消）| -                  | 不可操作，返回错误         |

## 接口信息

- **方法**：`DELETE`
- **路径**：`/v2/video_generation/{task_id}`
- **鉴权**：Bearer Token

## 请求

### 请求头

| 字段 | 必填 | 说明 |
|------|------|------|
| `Authorization` | 是 | `Bearer <API_KEY>` |

### 路径参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `task_id` | string | 是 | 要取消或删除的任务 ID |

## 响应

### `200 OK`

```json
{
  "task_id": "424010985738629",
  "action": "cancelled",
  "status": "cancelled"
}
```

### 响应字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `task_id` | string | 被操作的任务 ID |
| `action` | string | 实际执行的操作：`cancelled`（取消，仅 `queued` 态）或 `deleted`（删除成功或失败的任务记录） |
| `status` | string | 操作结果状态：`cancelled` 或 `deleted` |

### 错误码

| HTTP | 含义 |
|------|------|
| 400 | 参数错误 |
| 401 | 鉴权失败 |
| 429 | 触发限流 |
| 500 | 服务端错误 |

> 任务处于 `running` / `cancelled` 状态时调用本接口会返回错误。

## 示例

### 取消排队中的任务

```bash
curl --request DELETE \
  --url https://api.minimaxi.com/v2/video_generation/424010985738629 \
  --header 'Authorization: Bearer <token>'
```

响应：

```json
{
  "task_id": "424010985738629",
  "action": "cancelled",
  "status": "cancelled"
}
```

### 删除已完成的任务记录

```bash
curl --request DELETE \
  --url https://api.minimaxi.com/v2/video_generation/424010985738571 \
  --header 'Authorization: Bearer <token>'
```

响应：

```json
{
  "task_id": "424010985738571",
  "action": "deleted",
  "status": "deleted"
}
```

## 注意事项

- 仅可操作最近 7 天内创建的任务。
- `running`（运行中）的任务**不可取消**，需等待任务完成（成功或失败）后才能删除。
- 取消 `queued` 状态的任务不会产生费用。
- 本接口对 `generation`、`h3_context_ir`、`regeneration` 三类任务均生效。
