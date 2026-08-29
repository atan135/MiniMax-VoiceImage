Documentation Index
Fetch the complete documentation index at: /docs/llms.txt

Use this file to discover all available pages before exploring further.

跳转到主要内容
🎉 MiniMax H3 全新发布！新一代开放通用多模态视频模型。查看文档 ➔



搜索...
Ctrl K
文档
定价
控制台
开发指南
API
Token Plan
定价
更新日志
API 指引
接口概览
速率限制
错误码查询

文本
Anthropic SDK（推荐）
OpenAI SDK
AI SDK

Anthropic API

OpenAI Chat Completions API

OpenAI Responses API

视频

MiniMax-H3
NEW
POST
创建视频生成任务
GET
查询任务
GET
查询任务列表
DEL
取消或删除任务
POST
创建 H3-Context-IR 任务
POST
创建视频再生成任务

视频生成

语音

同步语音合成

异步长文本语音合成

音色快速复刻

音色设计

声音管理

图片

图片生成

音乐

音乐生成

文件

文件管理
模型

OpenAI 兼容

Anthropic 兼容


curl --request POST \
  --url https://api.minimaxi.com/v2/video_generation \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
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
}
'

200

400

401

402

422

429

500
{
  "task_id": "424010985738629"
}
MiniMax-H3
创建视频生成任务

复制页面

视频生成 V2 接口，通过多模态 content 数组输入（文本 / 图片 / 视频 / 音频），支持文生视频、图生视频（首尾帧）、多模态参考生视频，2K 直出。

提示：若需要使用 MiniMax H3，请点击 按量购买 API。

POST
/
v2
/
video_generation


试一试
授权
​
Authorization
stringheader必填
HTTP: Bearer Auth

Security Scheme Type: http
HTTP Authorization Scheme: Bearer API_key，用于验证账户信息，可在 账户管理>接口密钥 中查看。
请求头
​
Content-Type
enum<string>默认值:application/json必填
请求体的媒介类型，请设置为 application/json。

可用选项: application/json 
请求体
application/json
​
model
enum<string>必填
模型名称。当前可用值：MiniMax-H3。

可用选项: MiniMax-H3 
​
content
object[]必填
多模态输入内容数组，描述用于生成视频的信息。每个元素通过 type 区分类型（text / image_url / video_url / audio_url），并可通过 role 标注用途。

每次请求必须包含一个非空 text 项（prompt 必填）；缺失会返回参数错误。

支持的输入组合（对应不同生成场景）：

文生视频：仅一个 text 元素。
图生视频-首帧：text + 1 张 image_url（role=first_frame 或不填）。
图生视频-尾帧：text + 1 张 image_url（role=last_frame）。
图生视频-首尾帧：text + 2 张 image_url（role 分别为 first_frame、last_frame）。
多模态参考生视频：text + 参考图片（role=reference_image）+ 参考视频（role=reference_video）+ 参考音频（role=reference_audio）的组合。
图生视频与多模态参考生视频互斥：content 中出现 reference_image / reference_video / reference_audio 任一 role，就不能再出现 first_frame / last_frame（反之亦然），二者不可混用。

输入媒体限制（请求体总大小 ≤ 64 MB，大文件请用公网 URL，勿用 Base64）

图片 image_url：

项	限制
格式	JPG、JPEG、PNG、WEBP、HEIC、HEIF
单文件大小	≤ 30 MB
宽高范围	[256, 5760] px
长宽比（宽/高）	[0.4, 2.5]
数量	首帧 ≤ 1、尾帧 ≤ 1、参考图 ≤ 9
视频 video_url（仅多模态参考场景）：

项	限制
容器 / 格式	MP4（.mp4）、MOV（.mov）
编码	视频 H.264/AVC、H.265/HEVC；音频 AAC、MP3
单文件大小	≤ 50 MB
个数	≤ 3
单段时长	[2, 15] s；总时长 ≤ 15 s
宽高范围	[256, 5760] px
长宽比（宽/高）	[0.4, 2.5]
帧率	[23.976, 60]
音频 audio_url（仅多模态参考场景）：

项	限制
格式	WAV、MP3
单文件大小	≤ 15 MB
个数	≤ 3
单段时长	[2, 15] s；总时长 ≤ 15 s
Show child attributes

​
resolution
enum<string>必填
视频分辨率。当前可用值：768P、2K。

可用选项: 768P, 2K 
​
duration
enum<integer>必填
生成视频时长（秒），必选，整数。可用值：4~15。

可用选项: 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 
​
ratio
enum<string>
生成视频的宽高比，默认 adaptive（自动，由输入自适应选择最合适的宽高比，实际比例可在查询接口的 ratio 字段获取）。可用值：adaptive、21:9、16:9、4:3、1:1、3:4、9:16。

文生视频（t2va，content 仅含 text）：ratio 必填，且不能为 adaptive；可用值 21:9、16:9、4:3、1:1、3:4、9:16。

图生视频（i2va，content 含 first_frame / last_frame 图片）：宽高比由输入图片决定，ratio 恒为 adaptive；传入其他合理值不会报错，但会被忽略并按 adaptive 处理。

多模态参考生视频（r2va，content 含 reference_image / reference_video / reference_audio）：ratio 可选，默认 adaptive；也可显式指定上述任一具体比例。

可用选项: adaptive, 21:9, 16:9, 4:3, 1:1, 3:4, 9:16 
​
callback_url
string
任务状态变更的回调通知地址。配置后 MiniMax 服务器会先发送含 challenge 字段的验证请求（需 3 秒内原样返回 challenge 完成验证），验证成功后每当任务状态变更即向该地址 POST 推送，推送体结构与查询任务接口的响应一致。

回调 status 取值：queued（排队中）、running（运行中）、succeeded（成功）、failed（失败）、cancelled（已取消）。

​
aigc_watermark
boolean
是否在生成视频中添加 AIGC 标识水印，默认 false。

响应

200

application/json
创建成功后返回 task_id。使用该 task_id 调用查询任务接口获取任务状态与结果。

查询任务成功响应示例

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
​
task_id
string
任务 ID，用于后续查询任务状态与结果。

此页面对您有帮助吗？


是

否
Token 估算
查询任务

discord
x
linkedin
github
备案信息

沪公网安备31010402010179号
沪ICP备2023003282号-38
MiniMax官方客服

MiniMax官方客服
开放平台公众号

开放平台公众号
飞书交流群

飞书交流群
创建视频生成任务 - MiniMax 开放平台文档中心

Documentation Index
Fetch the complete documentation index at: /docs/llms.txt

Use this file to discover all available pages before exploring further.

跳转到主要内容
🎉 MiniMax H3 全新发布！新一代开放通用多模态视频模型。查看文档 ➔



搜索...
Ctrl K
文档
定价
控制台
开发指南
API
Token Plan
定价
更新日志
API 指引
接口概览
速率限制
错误码查询

文本
Anthropic SDK（推荐）
OpenAI SDK
AI SDK

Anthropic API

OpenAI Chat Completions API

OpenAI Responses API

视频

MiniMax-H3
NEW
POST
创建视频生成任务
GET
查询任务
GET
查询任务列表
DEL
取消或删除任务
POST
创建 H3-Context-IR 任务
POST
创建视频再生成任务

视频生成

语音

同步语音合成

异步长文本语音合成

音色快速复刻

音色设计

声音管理

图片

图片生成

音乐

音乐生成

文件

文件管理
模型

OpenAI 兼容

Anthropic 兼容
查询任务

curl --request GET \
  --url https://api.minimaxi.com/v2/query/video_generation/{task_id} \
  --header 'Authorization: Bearer <token>'


{
  "task": {
    "id": "424010985738629",
    "model": "MiniMax-H3",
    "status": "succeeded",
    "created_at": 1785125529,
    "updated_at": 1785125946,
    "content": {
      "url": "https://cdn.hailuoai.com/prod/hailuo_demo/testsets/h3_promo_eval_ref2va/gallery/sr_v2p26_trio_seed42_20260724/inputs/89f8c0bbee5b_denoise_ids_0_final.mp4"
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
    "ratio": "16:9",
    "task_type": "generation",
    "modality": "video"
  }
}
MiniMax-H3
查询任务

复制页面

按 task_id 查询最近 7 天内单个视频生成、H3-Context-IR 或视频再生成任务的状态与结果。

GET
/
v2
/
query
/
video_generation
/
{task_id}


试一试
授权
​
Authorization
stringheader必填
HTTP: Bearer Auth

Security Scheme Type: http
HTTP Authorization Scheme: Bearer API_key，用于验证账户信息，可在 账户管理>接口密钥 中查看。
路径参数
​
task_id
string必填
要查询的任务 ID（创建任务返回的 task_id）。

响应

200

application/json
​
task
object
H3 共享任务查询和列表接口返回的任务对象。

Show child attributes

此页面对您有帮助吗？


是

否
创建视频生成任务
查询任务列表

discord
x
linkedin
github
备案信息

沪公网安备31010402010179号
沪ICP备2023003282号-38
MiniMax官方客服

MiniMax官方客服
开放平台公众号

开放平台公众号
飞书交流群

飞书交流群
查询任务 - MiniMax 开放平台文档中心

Documentation Index
Fetch the complete documentation index at: /docs/llms.txt

Use this file to discover all available pages before exploring further.

跳转到主要内容
🎉 MiniMax H3 全新发布！新一代开放通用多模态视频模型。查看文档 ➔



搜索...
Ctrl K
文档
定价
控制台
开发指南
API
Token Plan
定价
更新日志
API 指引
接口概览
速率限制
错误码查询

文本
Anthropic SDK（推荐）
OpenAI SDK
AI SDK

Anthropic API

OpenAI Chat Completions API

OpenAI Responses API

视频

MiniMax-H3
NEW
POST
创建视频生成任务
GET
查询任务
GET
查询任务列表
DEL
取消或删除任务
POST
创建 H3-Context-IR 任务
POST
创建视频再生成任务

视频生成

语音

同步语音合成

异步长文本语音合成

音色快速复刻

音色设计

声音管理

图片

图片生成

音乐

音乐生成

文件

文件管理
模型

OpenAI 兼容

Anthropic 兼容
cURL

curl --request GET \
  --url 'https://api.minimaxi.com/v2/query/video_generation?page_num=1&page_size=4' \
  --header 'Authorization: Bearer <token>'

200

400

401

429

500
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
MiniMax-H3
查询任务列表

复制页面

分页查询最近 7 天内的任务列表，支持按状态、任务 ID、模型和任务类型过滤。

GET
/
v2
/
query
/
video_generation


试一试
授权
​
Authorization
stringheader必填
HTTP: Bearer Auth

Security Scheme Type: http
HTTP Authorization Scheme: Bearer API_key，用于验证账户信息，可在 账户管理>接口密钥 中查看。
查询参数
​
page_num
integer
页码，从 1 开始。

示例:
1

​
page_size
integer
每页数量。

示例:
20

​
filter.status
enum<string>
按任务状态过滤。可用值：queued、running、succeeded、failed、cancelled。

可用选项: queued, running, succeeded, failed, cancelled 
​
filter.task_ids
string[]
按任务 ID 过滤，可传多个。

​
filter.model
string
按模型名称过滤，如 MiniMax-H3。

​
filter.task_type
enum<string>
按任务类型过滤。可用值：generation（视频生成）、h3_context_ir（H3-Context-IR）、regeneration（视频再生成）。

可用选项: generation, h3_context_ir, regeneration 
响应

200

application/json
​
items
object[]
任务列表。

Show child attributes

​
total
integer
符合过滤条件的任务总数（仅统计最近 7 天内的任务）。

此页面对您有帮助吗？


是

否
查询任务
取消或删除任务

discord
x
linkedin
github
备案信息

沪公网安备31010402010179号
沪ICP备2023003282号-38
MiniMax官方客服

MiniMax官方客服
开放平台公众号

开放平台公众号
飞书交流群

飞书交流群
查询任务列表 - MiniMax 开放平台文档中心

> ## Documentation Index
> Fetch the complete documentation index at: https://platform.minimaxi.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# 取消或删除任务

> 按任务当前状态取消排队中的任务，或删除成功和失败的视频生成、H3-Context-IR 及视频再生成任务记录。

本接口会根据任务的**当前状态**自动执行取消或删除，行为如下：

| 任务状态             | 执行操作（action） | 说明                 |
| :--------------- | :----------- | :----------------- |
| `queued`（排队中）    | `cancelled`  | 取消任务，任务尚未开始处理，无扣费  |
| `succeeded`（成功）  | `deleted`    | 删除任务记录             |
| `failed`（失败）     | `deleted`    | 删除任务记录             |
| `running`（运行中）   | —            | 不可操作，返回错误（处理中无法取消） |
| `cancelled`（已取消） | —            | 不可操作，返回错误          |


## OpenAPI

````yaml api-reference/video/generation/api/v2-video-generation.json DELETE /v2/video_generation/{task_id}
openapi: 3.1.0
info:
  title: MiniMax API
  description: MiniMax video generation V2 (Hailuo-03) API
  license:
    name: MIT
  version: 2.0.0
servers:
  - url: https://api.minimaxi.com
security:
  - bearerAuth: []
paths:
  /v2/video_generation/{task_id}:
    delete:
      tags:
        - Video V2
      summary: 取消或删除任务
      description: |-
        根据任务当前状态取消或删除视频生成、H3-Context-IR 及视频再生成任务：
        - `queued`（排队中）：取消任务（`action=cancelled`），任务尚未开始处理。
        - `succeeded` / `failed`：删除任务记录（`action=deleted`）。
        - `running`（运行中）/ `cancelled`（已取消）：不可操作，返回错误。
      operationId: videoGenerationV2Delete
      parameters:
        - name: task_id
          in: path
          required: true
          description: 要取消或删除的任务 ID。
          schema:
            type: string
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DeleteVideoGenerationV2Resp'
        '400':
          $ref: '#/components/responses/Err400'
        '401':
          $ref: '#/components/responses/Err401'
        '429':
          $ref: '#/components/responses/Err429'
        '500':
          $ref: '#/components/responses/Err500'
components:
  schemas:
    DeleteVideoGenerationV2Resp:
      type: object
      properties:
        task_id:
          type: string
          description: 被操作的任务 ID。
        action:
          type: string
          description: 实际执行的操作：`cancelled`（取消，仅 queued 态）或 `deleted`（删除成功或失败的任务记录）。
          enum:
            - cancelled
            - deleted
        status:
          type: string
          description: 操作结果状态：`cancelled`（已取消）或 `deleted`（记录已删除）。
          enum:
            - cancelled
            - deleted
      example:
        task_id: '424010985738629'
        action: cancelled
        status: cancelled
    OaiError:
      type: object
      description: OpenAI 风格错误响应。出错时 HTTP 状态码为真实错误码(401/400/429/402/422/500…),响应体为该结构。
      properties:
        type:
          type: string
          description: 固定为 `error`。
          example: error
        error:
          $ref: '#/components/schemas/OaiErrorDetail'
        request_id:
          type: string
          description: 请求追踪 ID(便于排查)。
    OaiErrorDetail:
      type: object
      properties:
        type:
          type: string
          description: >-
            错误类型:`authorized_error`(401)/`bad_request_error`(400)/`rate_limit_error`(429)/`insufficient_balance_error`(402)/`unprocessable_entity_error`(422)/`overloaded_error`(529)/`server_error`(500)
            等。
        message:
          type: string
          description: 错误详情,结尾括号内为内部错误码(如 `... (1004)`)。
        http_code:
          type: string
          description: HTTP 状态码字符串,如 `401`。
  responses:
    Err400:
      description: 参数错误
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: bad_request_error
              message: >-
                invalid params, content must include a non-empty text item
                (prompt is required) (2013)
              http_code: '400'
            request_id: 021785229015510a2c883cf675b9804d
    Err401:
      description: 鉴权失败
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: authorized_error
              message: >-
                login fail: Please carry the API secret key in the
                'Authorization' field of the request header (1004)
              http_code: '401'
            request_id: 021785229015510a2c883cf675b9804d
    Err429:
      description: 触发限流
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: rate_limit_error
              message: rate limit, please retry later (1002)
              http_code: '429'
            request_id: 021785229015510a2c883cf675b9804d
    Err500:
      description: 服务端错误
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/OaiError'
          example:
            type: error
            error:
              type: server_error
              message: internal error (1000)
              http_code: '500'
            request_id: 021785229015510a2c883cf675b9804d
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |-
        `HTTP: Bearer Auth`
         - Security Scheme Type: http
         - HTTP Authorization Scheme: Bearer API_key，用于验证账户信息，可在 [账户管理>接口密钥](https://platform.minimaxi.com/user-center/basic-information/interface-key) 中查看。

````

Documentation Index
Fetch the complete documentation index at: /docs/llms.txt

Use this file to discover all available pages before exploring further.

跳转到主要内容
🎉 MiniMax H3 全新发布！新一代开放通用多模态视频模型。查看文档 ➔



搜索...
Ctrl K
文档
定价
控制台
开发指南
API
Token Plan
定价
更新日志
API 指引
接口概览
速率限制
错误码查询

文本
Anthropic SDK（推荐）
OpenAI SDK
AI SDK

Anthropic API

OpenAI Chat Completions API

OpenAI Responses API

视频

MiniMax-H3
NEW
POST
创建视频生成任务
GET
查询任务
GET
查询任务列表
DEL
取消或删除任务
POST
创建 H3-Context-IR 任务
POST
创建视频再生成任务

视频生成

语音

同步语音合成

异步长文本语音合成

音色快速复刻

音色设计

声音管理

图片

图片生成

音乐

音乐生成

文件

文件管理
模型

OpenAI 兼容

Anthropic 兼容


curl --request POST \
  --url https://api.minimaxi.com/v2/h3_context_ir \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "model": "MiniMax-H3",
  "content": [
    {
      "type": "text",
      "text": "史诗级太空歌剧院线预告：女舰长独自站在巨大观景窗前，最后一支舰队正在集结并跃迁离去，强光爆闪、舰桥震动，她被留在原地。"
    }
  ],
  "duration": 5,
  "ratio": "16:9"
}
'

200

400

401

402

422

429

500
{
  "task_id": "424010985738629"
}
MiniMax-H3
创建 H3-Context-IR 任务

复制页面

深度理解多模态上下文，并生成结构化、语义更丰富的视频提示词。

POST
/
v2
/
h3_context_ir


试一试
本接口只返回增强后的视频提示词，不会创建视频生成任务。
H3-Context-IR 对文本、图像、音频和视频等多模态上下文进行深度理解，分析素材之间以及素材与目标生成结果之间的关系，并进行复杂逻辑推理。系统会将理解结果转换为结构化表达，在尽量保持用户原始意图的前提下丰富语义细节。
H3-Context-IR 是一个复杂系统，暂不提供开源实现；本 API 既可用于验证 Full 2K-Workflow 的官方效果，也可集成到生产工作流中。
创建成功后，使用查询任务或查询任务列表接口查询。H3-Context-IR 任务的 task_type 为 h3_context_ir；任务成功后，从 content.prompt 获取增强提示词。
授权
​
Authorization
stringheader必填
HTTP: Bearer Auth

Security Scheme Type: http
HTTP Authorization Scheme: Bearer API_key，用于验证账户信息，可在 账户管理>接口密钥 中查看。
请求头
​
Content-Type
enum<string>默认值:application/json必填
请求体的媒介类型，请设置为 application/json。

可用选项: application/json 
请求体
application/json
创建 H3-Context-IR 任务的请求参数。

​
model
enum<string>必填
模型名称。当前可用值：MiniMax-H3。

可用选项: MiniMax-H3 
​
content
object[]必填
多模态上下文输入数组，用于描述目标视频及各类素材之间的关系。每个元素通过 type 区分类型（text / image_url / video_url / audio_url），并可通过 role 标注用途。

每次请求必须包含一个非空 text 项（prompt 必填）；缺失会返回参数错误。

支持的输入组合（对应不同生成场景）：

文生视频：仅一个 text 元素。
图生视频-首帧：text + 1 张 image_url（role=first_frame 或不填）。
图生视频-尾帧：text + 1 张 image_url（role=last_frame）。
图生视频-首尾帧：text + 2 张 image_url（role 分别为 first_frame、last_frame）。
多模态参考生视频：text + 参考图片（role=reference_image）+ 参考视频（role=reference_video）+ 参考音频（role=reference_audio）的组合。
图生视频与多模态参考生视频互斥：content 中出现 reference_image / reference_video / reference_audio 任一 role，就不能再出现 first_frame / last_frame（反之亦然），二者不可混用。

输入媒体限制（请求体总大小 ≤ 64 MB，大文件请用公网 URL，勿用 Base64）

图片 image_url：

项	限制
格式	JPG、JPEG、PNG、WEBP、HEIC、HEIF
单文件大小	≤ 30 MB
宽高范围	[256, 5760] px
长宽比（宽/高）	[0.4, 2.5]
数量	首帧 ≤ 1、尾帧 ≤ 1、参考图 ≤ 9
视频 video_url（仅多模态参考场景）：

项	限制
容器 / 格式	MP4（.mp4）、MOV（.mov）
编码	视频 H.264/AVC、H.265/HEVC；音频 AAC、MP3
单文件大小	≤ 50 MB
个数	≤ 3
单段时长	[2, 15] s；总时长 ≤ 15 s
宽高范围	[256, 5760] px
长宽比（宽/高）	[0.4, 2.5]
帧率	[23.976, 60]
音频 audio_url（仅多模态参考场景）：

项	限制
格式	WAV、MP3
单文件大小	≤ 15 MB
个数	≤ 3
单段时长	[2, 15] s；总时长 ≤ 15 s
Show child attributes

​
duration
enum<integer>必填
目标视频时长（秒），必选，整数。可用值：4~15。

可用选项: 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 
​
ratio
enum<string>
目标视频的宽高比，默认 adaptive。可用值：adaptive、21:9、16:9、4:3、1:1、3:4、9:16。

文生视频（t2va，content 仅含 text）：ratio 必填，且不能为 adaptive；可用值 21:9、16:9、4:3、1:1、3:4、9:16。

图生视频（i2va，content 含 first_frame / last_frame 图片）：宽高比由输入图片决定，ratio 恒为 adaptive；传入其他合理值不会报错，但会被忽略并按 adaptive 处理。

多模态参考生视频（r2va，content 含 reference_image / reference_video / reference_audio）：ratio 可选，默认 adaptive；也可显式指定上述任一具体比例。

可用选项: adaptive, 21:9, 16:9, 4:3, 1:1, 3:4, 9:16 
​
callback_url
string
任务状态变更的回调通知地址。配置后 MiniMax 服务器会先发送含 challenge 字段的验证请求（需 3 秒内原样返回 challenge 完成验证），验证成功后每当任务状态变更即向该地址 POST 推送，推送体结构与查询任务接口的响应一致。

回调 status 取值：queued（排队中）、running（运行中）、succeeded（成功）、failed（失败）、cancelled（已取消）。

响应

200

application/json
创建成功后返回 task_id。使用该 task_id 调用查询任务接口获取任务状态与结果。任务成功后，从 content.prompt 获取增强提示词。

查询任务成功响应示例

{
  "task": {
    "id": "426586401755526",
    "model": "MiniMax-H3",
    "status": "succeeded",
    "created_at": 1785702855,
    "updated_at": 1785702884,
    "content": {
      "prompt": "integrated_multimodal_description: [Shot 1] Cinematic, wide shot with a slow push in on a female captain standing center frame with her back to the camera. She has a slender build and short, swept-back silver hair, wearing a crisp, dark navy-blue futuristic military uniform adorned with rigid silver epaulets. Before her stretches a colossal, curved glass observation window dominating the dimly lit starship bridge. The interior features sleek metallic consoles on the left and right emitting soft cyan light. Outside the window, a massive fleet of dark-grey, heavily armored dreadnoughts and cruisers is assembling against a backdrop of a swirling deep-purple and magenta nebula. The rear thrusters of the distant ships glow intensely with fiery orange light. [Shot 2] At 00:02.800, the camera cuts to a medium close-up of the captain from Shot 1 in profile facing right, while the camera shakes strongly. Her facial features are now visible, revealing a woman in her late forties with sharp cheekbones and a stoic expression. A sudden, blinding flash of brilliant cyan and white light bursts through the window as the fleet outside simultaneously jumps into warp, casting harsh, overexposed illumination across her face. The bridge vibrates violently, causing her shoulders to tense and her uniform collar to tremble. The intense light instantly fades into deep shadow, leaving her completely alone against the newly emptied, pitch-black void of space.\noverall_soundscape: Deep, resonant low-frequency thrumming of ship engines, overlaid with rhythmic, high-pitched electronic beeps from the consoles, followed by a sudden, deafening sub-bass boom and a loud, sizzling crackle as the warp drives engage. The immense acoustic impact causes a heavy, metallic clattering of the bridge panels, which instantly drops off into a stark, quiet mechanical hum.\nnon_diegetic_music: Symphonic orchestral score, beginning with a slow, rising brass and string crescendo that abruptly cuts off, instantly transitioning into a single, sustained, low-register solo cello note with no dynamic swell."
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
​
task_id
string
任务 ID，用于后续查询任务状态与结果。

此页面对您有帮助吗？


是

否
取消或删除任务
创建视频再生成任务

discord
x
linkedin
github
备案信息

沪公网安备31010402010179号
沪ICP备2023003282号-38
MiniMax官方客服

MiniMax官方客服
开放平台公众号

开放平台公众号
飞书交流群

飞书交流群
创建 H3-Context-IR 任务 - MiniMax 开放平台文档中心

Documentation Index
Fetch the complete documentation index at: /docs/llms.txt

Use this file to discover all available pages before exploring further.

跳转到主要内容
🎉 MiniMax H3 全新发布！新一代开放通用多模态视频模型。查看文档 ➔



搜索...
Ctrl K
文档
定价
控制台
开发指南
API
Token Plan
定价
更新日志
API 指引
接口概览
速率限制
错误码查询

文本
Anthropic SDK（推荐）
OpenAI SDK
AI SDK

Anthropic API

OpenAI Chat Completions API

OpenAI Responses API

视频

MiniMax-H3
NEW
POST
创建视频生成任务
GET
查询任务
GET
查询任务列表
DEL
取消或删除任务
POST
创建 H3-Context-IR 任务
POST
创建视频再生成任务

视频生成

语音

同步语音合成

异步长文本语音合成

音色快速复刻

音色设计

声音管理

图片

图片生成

音乐

音乐生成

文件

文件管理
模型

OpenAI 兼容

Anthropic 兼容


curl --request POST \
  --url https://api.minimaxi.com/v2/video_regeneration \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "model": "MiniMax-H3",
  "source_task_id": "424010985738629",
  "resolution": "2K"
}
'

200

400

401

402

422

429

500
{
  "task_id": "424010985738629"
}
MiniMax-H3
创建视频再生成任务

复制页面

对符合 MiniMax-H3 768P 输出规格的源视频再生成为 2K 视频。

POST
/
v2
/
video_regeneration


试一试
支持两种方式（二选一）：
按任务 ID：传已有生成任务的 source_task_id
按源视频：在 content 中传 base_video
本接口仅支持对符合 MiniMax-H3 768P 输出规格的生成视频进行再生成并输出 2K，不支持任意视频的通用处理。
再生成任务的 task_type 为 regeneration，可通过 H3 共用的查询任务、查询任务列表和取消或删除任务接口管理。
授权
​
Authorization
stringheader必填
HTTP: Bearer Auth

Security Scheme Type: http
HTTP Authorization Scheme: Bearer API_key，用于验证账户信息，可在 账户管理>接口密钥 中查看。
请求头
​
Content-Type
enum<string>默认值:application/json必填
请求体的媒介类型,请设置为 application/json。

可用选项: application/json 
请求体
application/json
按任务 ID 再生成（source_task_id）
按源视频再生成（base_video）
​
model
enum<string>必填
模型名称，必填。当前支持 MiniMax-H3。

可用选项: MiniMax-H3 
​
source_task_id
string必填
已有 /v2/video_generation 成功任务的 task_id，以其产物为源再生成。使用限制：需开通白名单；源任务须属于当前账号、状态为 succeeded，且仍可通过 /v2/query/video_generation 查到（创建于 7 天内）。

​
resolution
enum<string>必填
视频再生成的目标分辨率，必填。当前支持 2K。

可用选项: 2K 
​
callback_url
string
任务状态变更的回调 URL,可选。行为同创建视频生成任务的 callback_url。

​
aigc_watermark
boolean默认值:false
是否为生成视频添加 AIGC 水印，可选，默认 false。

响应

200

application/json
创建成功后返回 task_id。使用该 task_id 调用查询任务接口获取任务状态与结果。

查询任务成功响应示例

{
  "task": {
    "id": "424010985738631",
    "model": "MiniMax-H3",
    "status": "succeeded",
    "created_at": 1785126000,
    "updated_at": 1785126300,
    "content": {
      "url": "https://your-cdn.example.com/h3-regenerated-2k-output.mp4"
    },
    "resolution": "2K",
    "duration": 5,
    "usage": {
      "total_seconds": 5,
      "input_seconds": 0,
      "output_seconds": 5,
      "input_image_count": 0
    },
    "ratio": "",
    "task_type": "regeneration",
    "modality": "video"
  }
}
​
task_id
string
任务 ID，用于后续查询任务状态与结果。

此页面对您有帮助吗？


是

否
创建 H3-Context-IR 任务
创建文生视频任务

discord
x
linkedin
github
备案信息

沪公网安备31010402010179号
沪ICP备2023003282号-38
MiniMax官方客服

MiniMax官方客服
开放平台公众号

开放平台公众号
飞书交流群

飞书交流群
创建视频再生成任务 - MiniMax 开放平台文档中心