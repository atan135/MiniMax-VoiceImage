# 创建视频生成任务

> 视频生成 V2 接口，通过多模态 `content` 数组输入（文本 / 图片 / 视频 / 音频），支持文生视频、图生视频（首尾帧）、多模态参考生视频，2K 直出。

> **提示**：若需要使用 MiniMax H3，请点击「按量购买 API」。

## 接口信息

- **方法**：`POST`
- **路径**：`/v2/video_generation`
- **鉴权**：Bearer Token

## 请求

### 请求头

| 字段 | 必填 | 说明 |
|------|------|------|
| `Authorization` | 是 | `Bearer <API_KEY>` |
| `Content-Type` | 是 | `application/json` |

### 请求体 `application/json`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | enum\<string\> | 是 | 模型名称，当前可用值：`MiniMax-H3` |
| `content` | object[] | 是 | 多模态输入内容数组（见下方） |
| `resolution` | enum\<string\> | 是 | 视频分辨率，可用值：`768P`、`2K` |
| `duration` | enum\<integer\> | 是 | 生成视频时长（秒），可用值：4~15 |
| `ratio` | enum\<string\> | 否 | 宽高比，默认 `adaptive`（文生视频必填） |
| `callback_url` | string | 否 | 任务状态变更的回调 URL |
| `aigc_watermark` | boolean | 否 | 是否添加 AIGC 水印，默认 `false` |

#### `content` 元素类型

| `type` | 必填字段 | 可选 `role` |
|--------|----------|--------------|
| `text` | `text: string` | - |
| `image_url` | `image_url: { url: string }` | `first_frame`、`last_frame`、`reference_image` |
| `video_url` | `video_url: { url: string }` | `reference_video`、`base_video` |
| `audio_url` | `audio_url: { url: string }` | `reference_audio` |

#### `duration` 取值

`4`、`5`、`6`、`7`、`8`、`9`、`10`、`11`、`12`、`13`、`14`、`15`

#### `ratio` 取值与场景约束

`adaptive`、`21:9`、`16:9`、`4:3`、`1:1`、`3:4`、`9:16`

- 文生视频：必填，不能为 `adaptive`
- 图生视频：恒为 `adaptive`（由输入图片决定）
- 多模态参考生视频：可选，默认 `adaptive`

## 响应

### `200 OK`

创建成功后返回 `task_id`。

```json
{
  "task_id": "424010985738629"
}
```

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

### 文生视频（t2va）

```bash
curl --request POST \
  --url https://api.minimaxi.com/v2/video_generation \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "MiniMax-H3",
    "content": [
      {
        "type": "text",
        "text": "史诗级太空歌剧院线预告：女舰长独自站在巨大观景窗前，最后一支舰队正在集结并跃迁离去，强光爆闪、舰桥震动，她被留在原地。"
      }
    ],
    "resolution": "2K",
    "duration": 5,
    "ratio": "16:9"
  }'
```

### 图生视频-首帧（i2va）

```bash
curl --request POST \
  --url https://api.minimaxi.com/v2/video_generation \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "MiniMax-H3",
    "content": [
      {
        "type": "text",
        "text": "镜头从静帧缓慢推进，舰长转身走向舷窗，舰桥灯光明灭。"
      },
      {
        "type": "image_url",
        "image_url": { "url": "https://example.com/first_frame.jpg" },
        "role": "first_frame"
      }
    ],
    "resolution": "2K",
    "duration": 6
  }'
```

### 图生视频-首尾帧（i2va）

```bash
curl --request POST \
  --url https://api.minimaxi.com/v2/video_generation \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "MiniMax-H3",
    "content": [
      {
        "type": "text",
        "text": "从静谧的城市清晨过渡到霓虹夜晚的航拍长镜头。"
      },
      {
        "type": "image_url",
        "image_url": { "url": "https://example.com/first_frame.jpg" },
        "role": "first_frame"
      },
      {
        "type": "image_url",
        "image_url": { "url": "https://example.com/last_frame.jpg" },
        "role": "last_frame"
      }
    ],
    "resolution": "2K",
    "duration": 8
  }'
```

### 多模态参考生视频（r2va）

```bash
curl --request POST \
  --url https://api.minimaxi.com/v2/video_generation \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "MiniMax-H3",
    "content": [
      {
        "type": "text",
        "text": "采用与参考素材一致的画面风格与节奏，生成一段 8 秒的宣传片。"
      },
      {
        "type": "image_url",
        "image_url": { "url": "https://example.com/ref_image.jpg" },
        "role": "reference_image"
      },
      {
        "type": "video_url",
        "video_url": { "url": "https://example.com/ref_video.mp4" },
        "role": "reference_video"
      },
      {
        "type": "audio_url",
        "audio_url": { "url": "https://example.com/ref_audio.wav" },
        "role": "reference_audio"
      }
    ],
    "resolution": "2K",
    "duration": 8,
    "ratio": "16:9"
  }'
```

## 任务结果

创建接口本身只返回 `task_id`。使用该 `task_id` 调用 [query.md](./query.md) 接口获取任务状态与产物。

任务成功时 `task.content.url` 为视频文件 URL：

```json
{
  "task": {
    "id": "424010985738629",
    "model": "MiniMax-H3",
    "status": "succeeded",
    "created_at": 1785125529,
    "updated_at": 1785125946,
    "content": {
      "url": "https://your-cdn.example.com/h3-generated-2k-output.mp4"
    },
    "resolution": "2K",
    "duration": 5,
    "usage": {
      "total_seconds": 5,
      "input_seconds": 0,
      "output_seconds": 5,
      "input_image_count": 0
    },
    "ratio": "16:9",
    "task_type": "generation",
    "modality": "video"
  }
}
```

## 注意事项

- `content` 必须包含一个非空 `text` 项（prompt），缺失会返回参数错误。
- `first_frame` / `last_frame` 与 `reference_image` / `reference_video` / `reference_audio` 不可混用。
- 请求体总大小 <= 64 MB，大文件请用公网 URL，勿用 Base64。
- 文生视频的 `ratio` 不能为 `adaptive`，必须显式指定具体比例。
- 视频生成是异步任务，提交后需要轮询 `query` 接口获取结果。
