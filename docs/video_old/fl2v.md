# 首尾帧生成视频（fl2v）

> 使用本接口上传首尾帧图片及文本内容，创建视频生成任务。

## 接口信息

- **方法**：`POST`
- **路径**：`/v1/video_generation`
- **鉴权**：Bearer Token
- **适用场景**：同时指定视频起始帧与结束帧图片，配合 `prompt` 描述过渡过程

## 请求

### 请求头

| 字段 | 必填 | 说明 |
|------|------|------|
| `Authorization` | 是 | `Bearer <API_KEY>` |
| `Content-Type` | 是 | `application/json` |

### 请求体 `application/json`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | enum\<string\> | 是 | 模型名称（首尾帧仅支持 `MiniMax-Hailuo-02`） |
| `last_frame_image` | string | 是 | 视频结束帧图片 |
| `first_frame_image` | string | 是 | 视频起始帧图片 |
| `prompt` | string | 否 | 视频文本描述，最大 2000 字符 |
| `prompt_optimizer` | boolean | 否 | 是否自动优化 `prompt`，默认 `true` |
| `duration` | integer | 否 | 视频时长（秒），默认 6 |
| `resolution` | enum\<string\> | 否 | 视频分辨率 |
| `callback_url` | string | 否 | 任务状态变更的回调 URL |
| `aigc_watermark` | boolean | 否 | 是否在生成的视频中添加水印，默认 `false` |

#### `model` 取值

`MiniMax-Hailuo-02`

> **注意**：首尾帧生成功能不支持 `512P` 分辨率。

#### `first_frame_image` / `last_frame_image` 要求

支持公网 URL 或 Base64 编码的 Data URL（`data:image/jpeg;base64,...`）。

- 格式：JPG、JPEG、PNG、WebP
- 体积：< 20 MB
- 短边像素：> 300 px
- 长宽比（短/长）：[0.4, 0.5]（即 2:5 ~ 5:2 之间）

> **重要**：生成视频尺寸遵循首帧图片；当首尾帧图片尺寸不一致时，模型会参考首帧对尾帧图片进行裁剪。

#### `duration` 取值

| Model | 768P | 1080P |
|:------|:----:|:-----:|
| `MiniMax-Hailuo-02` | `6` 或 `10` | `6` |

#### `resolution` 取值

| Model | 6s | 10s |
|:------|:--:|:---:|
| `MiniMax-Hailuo-02` | `768P`（默认）、`1080P` | `768P` |

`resolution` 可选枚举值：`768P`、`1080P`。

## 响应

### `200 OK`

```json
{
  "task_id": "106916112212032",
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `task_id` | string | 视频生成任务的 ID，用于后续查询任务状态 |
| `base_resp.status_code` | integer | 状态码（0 表示请求成功） |
| `base_resp.status_msg` | string | 状态详情 |

### 错误码

错误通过 `base_resp.status_code` 返回，详见 [README.md](./README.md#错误码)。

## 示例

### 首尾帧生视频（`MiniMax-Hailuo-02`）

```bash
curl --request POST \
  --url https://api.minimaxi.com/v1/video_generation \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "MiniMax-Hailuo-02",
    "prompt": "A little girl grow up.",
    "first_frame_image": "https://filecdn.minimax.chat/public/fe9d04da-f60e-444d-a2e0-18ae743add33.jpeg",
    "last_frame_image": "https://filecdn.minimax.chat/public/97b7cd08-764e-4b8b-a7bf-87a0bd898575.jpeg",
    "duration": 6,
    "resolution": "1080P"
  }'
```

## 任务结果

创建接口只返回 `task_id`。按以下顺序获取最终视频：

1. **轮询查询**：调用 [query.md](./query.md) 接口，参数为 `task_id`，直到 `status="Success"` 或 `status="Fail"`
2. **读取 `file_id`**：从查询响应 `file_id` 字段读取
3. **换取下载链接**：调用 [download.md](./download.md) 接口，参数为 `file_id`，从响应 `file.download_url` 读取（有效期 1 小时）

## 注意事项

- `last_frame_image` 是必填项，缺失会返回 `2013` 参数错误。
- `first_frame_image` 是必填项，缺失会返回 `2013` 参数错误。
- 首尾帧生成仅 `MiniMax-Hailuo-02` 支持，不支持其他模型。
- 首尾帧生成不支持 `512P` 分辨率。
- 生成视频尺寸遵循首帧图片；当首尾帧尺寸不一致时，模型会按首帧对尾帧进行裁剪。
- 视频生成是异步任务，提交后需要轮询 `query` 接口获取结果。
