# 创建 H3-Context-IR 任务

> 深度理解多模态上下文，并生成结构化、语义更丰富的视频提示词。

## 能力说明

H3-Context-IR 对文本、图像、音频和视频等多模态上下文进行深度理解，分析素材之间以及素材与目标生成结果之间的关系，并进行复杂逻辑推理。系统会将理解结果转换为结构化表达，在尽量保持用户原始意图的前提下丰富语义细节。

H3-Context-IR 是一个复杂系统，暂不提供开源实现；本 API 既可用于验证 Full 2K-Workflow 的官方效果，也可集成到生产工作流中。

创建成功后，使用 [query.md](./query.md) 或 [list.md](./list.md) 接口查询。H3-Context-IR 任务的 `task_type` 为 `h3_context_ir`；任务成功后，从 `content.prompt` 获取增强提示词。

> **重要**：本接口**只返回增强后的视频提示词，不会创建视频生成任务**。

## 接口信息

- **方法**：`POST`
- **路径**：`/v2/h3_context_ir`
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
| `content` | object[] | 是 | 多模态上下文输入数组 |
| `duration` | enum\<integer\> | 是 | 目标视频时长（秒），可用值：4~15 |
| `ratio` | enum\<string\> | 否 | 目标视频的宽高比，默认 `adaptive`（文生视频必填） |
| `callback_url` | string | 否 | 任务状态变更的回调 URL |

> 与 [generation.md](./generation.md) 相比，本接口**不包含 `resolution` 字段**（不直接生成视频）。

#### `content` 元素类型

支持的 `type` 与 `role` 组合与视频生成接口一致（参见 [README.md](./README.md)），但接口不消费 `base_video` 这类专属 `regeneration` 的角色。

#### `duration` 取值

`4`、`5`、`6`、`7`、`8`、`9`、`10`、`11`、`12`、`13`、`14`、`15`

#### `ratio` 取值

`adaptive`、`21:9`、`16:9`、`4:3`、`1:1`、`3:4`、`9:16`

- 文生视频（`content` 仅含 `text`）：必填，不能为 `adaptive`
- 图生视频：恒为 `adaptive`（由输入图片决定）
- 多模态参考生视频：可选，默认 `adaptive`

## 响应

### `200 OK`

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

### 文生视频场景的提示词增强

```bash
curl --request POST \
  --url https://api.minimaxi.com/v2/h3_context_ir \
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
    "duration": 5,
    "ratio": "16:9"
  }'
```

## 任务结果

任务成功时 `task.content.prompt` 为增强后的结构化提示词：

```json
{
  "task": {
    "id": "426586401755526",
    "model": "MiniMax-H3",
    "status": "succeeded",
    "created_at": 1785702855,
    "updated_at": 1785702884,
    "content": {
      "prompt": "integrated_multimodal_description: [Shot 1] Cinematic, wide shot with a slow push in on a female captain standing center frame with her back to the camera. ...\noverall_soundscape: Deep, resonant low-frequency thrumming of ship engines, ...\nnon_diegetic_music: Symphonic orchestral score, ..."
    },
    "duration": 5,
    "usage": {
      "total_tokens": 9090,
      "prompt_tokens": 5664,
      "completion_tokens": 3426
    },
    "ratio": "16:9",
    "task_type": "h3_context_ir",
    "modality": "text"
  }
}
```

增强后的 `prompt` 通常包含以下结构化段落：

- `integrated_multimodal_description`：分镜画面描述（包含镜头、构图、光影、动作、运镜等）
- `overall_soundscape`：环境音 / 音效描述
- `non_diegetic_music`：配乐风格 / 情绪描述

将增强后的 `prompt` 拼接到 [generation.md](./generation.md) 接口的 `content.text` 中即可获得 Full 2K-Workflow 官方效果。

## 注意事项

- 本接口**不会创建视频生成任务**，仅生成增强提示词。
- `content` 必须包含一个非空 `text` 项，缺失会返回参数错误。
- 输入媒体限制（图片 / 视频 / 音频大小、宽高、时长等）与视频生成接口完全一致，参见 [README.md](./README.md)。
- `first_frame` / `last_frame` 与 `reference_image` / `reference_video` / `reference_audio` 不可混用。
- `task_type` 为 `h3_context_ir`，`modality` 为 `text`，区别于视频生成任务。
