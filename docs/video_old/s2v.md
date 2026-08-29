# 主体参考视频生成任务（s2v）

> 使用本接口上传人物主体图片及文本内容，创建视频生成任务。

## 接口信息

- **方法**：`POST`
- **路径**：`/v1/video_generation`
- **鉴权**：Bearer Token
- **适用场景**：使用单张人物面部图片作为主体参考，让生成视频中的人物保持主体一致性

## 请求

### 请求头

| 字段 | 必填 | 说明 |
|------|------|------|
| `Authorization` | 是 | `Bearer <API_KEY>` |
| `Content-Type` | 是 | `application/json` |

### 请求体 `application/json`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | enum\<string\> | 是 | 模型名称（主体参考仅支持 `S2V-01`） |
| `subject_reference` | object[] | 是 | 主体参考，目前仅支持单个人物主体 |
| `prompt` | string | 否 | 视频文本描述，最大 2000 字符 |
| `prompt_optimizer` | boolean | 否 | 是否自动优化 `prompt`，默认 `true` |
| `callback_url` | string | 否 | 任务状态变更的回调 URL |
| `aigc_watermark` | boolean | 否 | 是否在生成的视频中添加水印，默认 `false` |

#### `model` 取值

`S2V-01`

#### `subject_reference` 元素

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | 主体类型，当前仅支持 `character`（人物面部） |
| `image` | string[] | 是 | 包含主体参考图的数组，目前仅支持单张图片 |

主体参考图要求：

- 格式：JPG、JPEG、PNG、WebP
- 体积：< 20 MB
- 短边像素：> 300 px
- 长宽比（短/长）：[0.4, 0.5]（即 2:5 ~ 5:2 之间）

> 主体参考仅当 `model` 为 `S2V-01` 时可用，目前仅支持单个主体。

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

### 主体参考视频（`S2V-01`）

```bash
curl --request POST \
  --url https://api.minimaxi.com/v1/video_generation \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "S2V-01",
    "prompt": "A girl runs toward the camera and winks with a smile.",
    "subject_reference": [
      {
        "type": "character",
        "image": [
          "https://cdn.hailuoai.com/prod/2025-08-12-17/video_cover/1754990600020238321-411603868533342214-cover.jpg"
        ]
      }
    ]
  }'
```

## 任务结果

创建接口只返回 `task_id`。按以下顺序获取最终视频：

1. **轮询查询**：调用 [query.md](./query.md) 接口，参数为 `task_id`，直到 `status="Success"` 或 `status="Fail"`
2. **读取 `file_id`**：从查询响应 `file_id` 字段读取
3. **换取下载链接**：调用 [download.md](./download.md) 接口，参数为 `file_id`，从响应 `file.download_url` 读取（有效期 1 小时）

## 注意事项

- `subject_reference` 是必填项，缺失会返回 `2013` 参数错误。
- `subject_reference[].type` 当前仅支持 `character`，其他类型会返回参数错误。
- `subject_reference[].image` 数组当前仅支持单张图片，传入多张会按平台行为处理（一般取首张）。
- 主体参考生成仅 `S2V-01` 支持，不支持其他模型。
- 与 V2 的多模态参考生视频（`/v2/video_generation` 的 `reference_image` / `reference_video` / `reference_audio` 组合）不同，V1 的 `S2V-01` 仅支持单张人物图片参考，不支持视频 / 音频参考。
- 视频生成是异步任务，提交后需要轮询 `query` 接口获取结果。
