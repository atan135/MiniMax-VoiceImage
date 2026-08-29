# 图生视频生成任务（i2v）

> 使用本接口上传首帧图片及文本内容，创建视频生成任务。

## 接口信息

- **方法**：`POST`
- **路径**：`/v1/video_generation`
- **鉴权**：Bearer Token
- **适用场景**：单张图片作为视频起始帧，配合 `prompt` 描述运镜 / 动作

## 请求

### 请求头

| 字段 | 必填 | 说明 |
|------|------|------|
| `Authorization` | 是 | `Bearer <API_KEY>` |
| `Content-Type` | 是 | `application/json` |

### 请求体 `application/json`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | enum\<string\> | 是 | 模型名称 |
| `first_frame_image` | string | 是 | 视频起始帧图片（URL 或 Base64 Data URL） |
| `prompt` | string | 否 | 视频文本描述，最大 2000 字符 |
| `prompt_optimizer` | boolean | 否 | 是否自动优化 `prompt`，默认 `true` |
| `fast_pretreatment` | boolean | 否 | 是否缩短 `prompt_optimizer` 优化耗时，默认 `false` |
| `duration` | integer | 否 | 视频时长（秒），默认 6 |
| `resolution` | enum\<string\> | 否 | 视频分辨率 |
| `callback_url` | string | 否 | 任务状态变更的回调 URL |
| `aigc_watermark` | boolean | 否 | 是否在生成的视频中添加水印，默认 `false` |

#### `model` 取值

`MiniMax-Hailuo-2.3`、`MiniMax-Hailuo-2.3-Fast`、`MiniMax-Hailuo-02`、`I2V-01-Director`、`I2V-01-live`、`I2V-01`

#### `first_frame_image` 要求

支持公网 URL 或 Base64 编码的 Data URL（`data:image/jpeg;base64,...`）。

- 格式：JPG、JPEG、PNG、WebP
- 体积：< 20 MB
- 短边像素：> 300 px
- 长宽比（短/长）：[0.4, 0.5]（即 2:5 ~ 5:2 之间）

#### `duration` 取值与模型/分辨率关系

| Model | 720P | 768P | 1080P |
|:------|:----:|:----:|:-----:|
| `MiniMax-Hailuo-2.3` | - | `6` 或 `10` | `6` |
| `MiniMax-Hailuo-2.3-Fast` | - | `6` 或 `10` | `6` |
| `MiniMax-Hailuo-02` | - | `6` 或 `10` | `6` |
| 其他模型 | `6` | - | `6` |

#### `resolution` 取值与模型/时长关系

| Model | 6s | 10s |
|:------|:--:|:---:|
| `MiniMax-Hailuo-2.3` | `768P`（默认）、`1080P` | `768P`（默认） |
| `MiniMax-Hailuo-2.3-Fast` | `768P`（默认）、`1080P` | `768P`（默认） |
| `MiniMax-Hailuo-02` | `512P`、`768P`（默认）、`1080P` | `512P`、`768P`（默认） |
| 其他模型 | `720P`（默认） | 不支持 |

`resolution` 可选枚举值：`512P`、`720P`、`768P`、`1080P`。

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

### 图生视频（`MiniMax-Hailuo-2.3`）

```bash
curl --request POST \
  --url https://api.minimaxi.com/v1/video_generation \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "MiniMax-Hailuo-2.3",
    "prompt": "A mouse runs toward the camera, smiling and blinking.",
    "first_frame_image": "https://cdn.hailuoai.com/prod/2024-09-18-16/user/multi_chat_file/9c0b5c14-ee88-4a5b-b503-4f626f018639.jpeg",
    "duration": 6,
    "resolution": "1080P"
  }'
```

### 带运镜指令的图生视频（`I2V-01-Director`）

```bash
curl --request POST \
  --url https://api.minimaxi.com/v1/video_generation \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "I2V-01-Director",
    "first_frame_image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
    "prompt": "镜头从角色面部缓慢拉远至全身 [拉远]",
    "duration": 6,
    "resolution": "720P"
  }'
```

## 任务结果

创建接口只返回 `task_id`。按以下顺序获取最终视频：

1. **轮询查询**：调用 [query.md](./query.md) 接口，参数为 `task_id`，直到 `status="Success"` 或 `status="Fail"`
2. **读取 `file_id`**：从查询响应 `file_id` 字段读取
3. **换取下载链接**：调用 [download.md](./download.md) 接口，参数为 `file_id`，从响应 `file.download_url` 读取（有效期 1 小时）

## 注意事项

- `first_frame_image` 是必填项，缺失会返回 `2013` 参数错误。
- `first_frame_image` 同时支持公网 URL 与 Base64 Data URL（`data:image/jpeg;base64,...`）。
- 视频生成是异步任务，提交后需要轮询 `query` 接口获取结果。
- `MiniMax-Hailuo-2.3-Fast` 仅支持图生视频，不支持文生视频。
- `MiniMax-Hailuo-02` 的 `resolution` 可选 `512P`，是 V1 中唯一支持 512P 的模型。
- 运镜指令 `[指令]` 仅 `MiniMax-Hailuo-2.3`、`MiniMax-Hailuo-02`、`I2V-01-Director` 支持；详见 [README.md](./README.md#运镜指令-指令)。
