# 视频文件下载

> 通过本接口进行生成视频文件下载。

> **本接口仅返回视频文件的下载链接，不直接返回视频二进制流。** 客户端拿到 `download_url` 后自行拉取 MP4 文件，且链接有效期仅 1 小时。

## 接口信息

- **方法**：`GET`
- **路径**：`/v1/files/retrieve`
- **鉴权**：Bearer Token
- **适用场景**：根据 `query` 接口返回的 `file_id` 换取真实下载链接

## 请求

### 请求头

| 字段 | 必填 | 说明 |
|------|------|------|
| `Authorization` | 是 | `Bearer <API_KEY>` |

### 查询参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file_id` | integer (int64) | 是 | 文件的唯一标识符，可从 [query.md](./query.md) 接口的 `file_id` 字段获取 |

## 响应

### `200 OK`

```json
{
  "file": {
    "file_id": 176844028768320,
    "bytes": 0,
    "created_at": 1700469398,
    "filename": "output_aigc.mp4",
    "purpose": "video_generation",
    "download_url": "https://cdn.example.com/path/to/output_aigc.mp4?..."
  },
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

### 响应字段

#### `file`

| 字段 | 类型 | 说明 |
|------|------|------|
| `file_id` | integer (int64) | 文件的唯一标识符 |
| `bytes` | integer (int64) | 文件大小（字节） |
| `created_at` | integer (int64) | 创建文件时的 Unix 时间戳（秒） |
| `filename` | string | 文件的名称 |
| `purpose` | string | 文件的使用目的 |
| `download_url` | string (url) | 文件下载的 URL 地址，**有效期 1 小时** |

#### `base_resp`

| 字段 | 类型 | 说明 |
|------|------|------|
| `status_code` | integer | 状态码（0 表示请求成功） |
| `status_msg` | string | 状态详情 |

#### `base_resp.status_code` 取值

| 取值 | 含义 |
|------|------|
| `0` | 请求成功 |
| `1000` | 未知错误 |
| `1001` | 超时 |
| `1002` | 触发 RPM 限流 |
| `1004` | 鉴权失败 |
| `1008` | 余额不足 |
| `1013` | 服务内部错误 |
| `1026` | 输入内容错误 |
| `1027` | 输出内容错误 |
| `1039` | 触发 TPM 限流 |
| `2013` | 输入格式信息不正常 |

## 示例

### 换取下载链接

```bash
curl --request GET \
  --url 'https://api.minimaxi.com/v1/files/retrieve?file_id=176844028768320' \
  --header 'Authorization: Bearer <token>'
```

### 下载视频文件

拿到 `download_url` 后，再发起一次 GET 请求下载 MP4：

```bash
curl --request GET \
  --url '<download_url>' \
  --output output.mp4
```

## 工作流

本接口是 V1 工作流的末段环节。完整流程：

1. 通过 t2v / i2v / fl2v / s2v 任一创建接口拿到 `task_id`
2. 调用 [query.md](./query.md) 接口轮询任务，直到 `status="Success"`
3. 从查询响应中拿到 `file_id`
4. 调用本接口，参数为 `file_id`，从响应 `file.download_url` 读取下载链接
5. 使用 `download_url` 拉取 MP4 文件（**链接有效期 1 小时**，过期需重新换取）

## 注意事项

- `download_url` 有效期 1 小时，过期需重新调用本接口换取。
- 本接口**不返回视频二进制流**，仅返回下载 URL。
- `file_id` 来自 `query` 接口的响应；其他来源的 `file_id` 可能无法识别。
- `file.bytes` 在某些场景下可能为 `0`（参考响应示例），不影响下载。
- `file.purpose` 当前主要为 `video_generation`。
- 与 [docs/video/](../video/download.md)（V2）相比，V2 的查询接口直接返回 `task.content.url`，无需额外的文件检索步骤。
