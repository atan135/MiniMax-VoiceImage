# 图生图（Image-to-Image）

> 官方文档：<https://platform.minimaxi.com/docs/api-reference/image-generation-i2i>
> 原文快照：`docs/doc_raw/api_image_i2i.html`（2026-01-28）
> 文生图（t2i）见：`docs/doc_raw/api_image_t2i.md`

使用本接口，上传图片内容，进行图片生成（即「图生图」）。当前官方文档将文生图（t2i）和图生图（i2i）拆分为两个独立页面，但二者使用 **同一个端点** `POST /v1/image_generation`，区别仅在于图生图额外支持 `subject_reference` 字段。

## 一、接口信息

- **Method**：`POST`
- **URL**：`https://api.minimaxi.com/v1/image_generation`
- **Content-Type**：`application/json`
- **认证**：`Authorization: Bearer <API_KEY>`

## 二、请求体

### 公共字段（与文生图一致）

| 字段 | 类型 | 默认值 | 必填 | 说明 |
|---|---|---|---|---|
| `model` | enum | — | 是 | 模型名称，可选 `image-01`、`image-01-live` |
| `prompt` | string | — | 是 | 图像的文本描述，最长 1500 字符 |
| `style` | object | — | 否 | 画风设置，仅当 `model=image-01-live` 时生效 |
| `aspect_ratio` | enum | `1:1` | 否 | 画布比例，可选：`1:1`/`16:9`/`4:3`/`3:2`/`2:3`/`3:4`/`9:16`/`21:9`（`21:9` 仅 `image-01`） |
| `width` | integer | — | 否 | 仅 `image-01`，与 `height` 同时设置；`[512, 2048]` 且 8 的倍数；与 `aspect_ratio` 同时设置时优先 `aspect_ratio` |
| `height` | integer | — | 否 | 同 `width` |
| `response_format` | enum | `url` | 否 | `url` 或 `base64`；⚠️ `url` 仅 24 小时有效 |
| `seed` | integer<int64\> | — | 否 | 相同 seed + 参数可复现结果 |
| `n` | integer | `1` | 否 | 单次生成数量，`[1, 9]` |
| `prompt_optimizer` | boolean | `false` | 否 | 是否开启 prompt 自动优化 |
| `aigc_watermark` | boolean | `false` | 否 | 是否在图片中添加水印 |

### i2i 专有字段（新增）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `subject_reference` | object[] | 否 | 人物主体参考，用于图生图。每一项为一个参考对象 |

#### `subject_reference[]` 子字段

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `type` | enum | 是 | 参考对象类型，可选值：`character` |
| `image_file` | string | 是 | 参考图片的 URL（公网可访问），用于提取主体特征 |

## 三、响应（200 - application/json）

```json
{
  "id": "03ff3cd0820949eb8a410056b5f21d38",
  "data": {
    "image_urls": ["XXX", "XXX", "XXX"]
  },
  "metadata": {
    "failed_count": "0",
    "success_count": "3"
  },
  "base_resp": {
    "status_code": 0,
    "status_msg": "success"
  }
}
```

### 响应字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `data.image_urls` | string[] | `response_format=url` 时返回，包含图片链接数组 |
| `data.image_base64` | string[] | `response_format=base64` 时返回，包含图片 Base64 编码数组 |
| `metadata.success_count` | integer | 成功生成的图片数量 |
| `metadata.failed_count` | integer | 因内容安全检查失败而未返回的图片数量 |
| `id` | string | 生成任务的 ID，用于后续查询任务状态 |
| `base_resp.status_code` | integer | 业务状态码，详见「错误码」 |
| `base_resp.status_msg` | string | 具体错误详情 |

## 四、请求示例

### cURL

```bash
curl --request POST \
  --url https://api.minimaxi.com/v1/image_generation \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '{
  "model": "image-01",
  "prompt": "A girl looking into the distance from a library window",
  "aspect_ratio": "16:9",
  "subject_reference": [
    {
      "type": "character",
      "image_file": "https://cdn.hailuoai.com/prod/2025-08-12-17/video_cover/1754990600020238321-411603868533342214-cover.jpg"
    }
  ],
  "n": 2
}'
```

### Python

```python
import requests

url = "https://api.minimaxi.com/v1/image_generation"

payload = {
    "model": "image-01",
    "prompt": "A girl looking into the distance from a library window",
    "aspect_ratio": "16:9",
    "subject_reference": [
        {
            "type": "character",
            "image_file": "https://cdn.hailuoai.com/prod/2025-08-12-17/video_cover/1754990600020238321-411603868533342214-cover.jpg"
        }
    ],
    "n": 2,
}
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer <token>",
}

response = requests.post(url, json=payload, headers=headers)
print(response.text)
```

## 五、错误码

`base_resp.status_code` 取值与含义：

| 状态码 | 含义 |
|---|---|
| `0` | 请求成功 |
| `1002` | 触发限流，请稍后再试 |
| `1004` | 账号鉴权失败，请检查 API-Key 是否填写正确 |
| `1008` | 账号余额不足 |
| `1026` | 图片描述涉及敏感内容 |
| `2013` | 传入参数异常，请检查入参是否按要求填写 |
| `2049` | 无效的 api key |

更多内容可查看官方错误码查询列表。
