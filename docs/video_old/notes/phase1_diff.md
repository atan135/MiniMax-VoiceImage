# V1 vs V2 视频生成差异笔记（阶段 1 内部参考）

> 本文件为旧版视频生成模块开发「阶段 1：需求和边界确认」产出物，**不是 checklist**，仅供后续阶段对照 V2 实现、确定 v1 模块暴露边界时参考。
> 冲突时优先以 `docs/video_old/README.md` 为准，并以 `docs/doc_raw/api_video_old.md` 提供的 6 个上游文档链接为权威源。
> V2 对照文件：`server/services/videoService.js`、`server/routes/video.js`、`client/src/views/VideoView.vue`。

---

## 1. 端点差异

V1 共 4 个创建端点 + 1 个查询端点 + 1 个文件检索端点，全部走 `/v1/` 前缀。
V2 共 1 个统一创建端点 + 1 个查询 + 1 个列出 + 1 个取消/删除 + 1 个 H3-Context-IR + 1 个视频再生成，全部走 `/v2/` 前缀。

| 能力 | V1 URL | V1 方法 | V2 URL | V2 方法 | 异步 | 是否需要轮询 |
|------|--------|---------|--------|---------|------|--------------|
| 文生视频（t2v） | `/v1/video_generation` | POST | `/v2/video_generation` | POST | 是 | 是 |
| 图生视频（i2v） | `/v1/video_generation` | POST | `/v2/video_generation` | POST | 是 | 是 |
| 首尾帧（fl2v） | `/v1/video_generation` | POST | `/v2/video_generation` | POST | 是 | 是 |
| 主体参考（s2v） | `/v1/video_generation` | POST | `/v2/video_generation` | POST | 是 | 是 |
| 多模态参考（image/video/audio） | —（不支持） | — | `/v2/video_generation` | POST | 是 | 是 |
| 任务状态查询 | `/v1/query/video_generation?task_id=xxx` | GET | `/v2/query/video_generation?task_id=xxx` | GET | — | — |
| 文件检索 / 换取下载链接 | `/v1/files/retrieve?file_id=xxx` | GET | —（V2 无此步） | — | — | — |
| 任务列表 | —（不支持） | — | `/v2/list/video_generation` | GET | — | — |
| 取消 / 删除 | —（不支持） | — | `/v2/video_generation/{task_id}` | DELETE | — | — |
| 视频再生成 | —（不支持） | — | `/v2/video_regeneration` | POST | 是 | 是 |
| H3-Context-IR（提示词增强） | —（不支持） | — | `/v2/h3_context_ir` | POST | 是 | 是 |

要点：

- V1 4 个场景共用同一 URL `/v1/video_generation`，靠请求体里的「模型 + 是否带图」区分；V2 1 个 URL 覆盖所有场景，靠 `content[]` 数组 + `role` 区分。
- V1 创建后必须再调 `/v1/files/retrieve` 才能拿到 `download_url`；V2 直接在查询响应里读 `task.content.url`。
- V1 无取消 / 删除 / 再生成 / 提示词增强端点。

---

## 2. 入参差异

### 2.1 请求体结构

| 项 | V1 | V2 |
|----|----|----|
| 顶层结构 | 扁平字段（`prompt`、`first_frame_image`、`subject_reference[]` 等） | `content[]` 多模态数组 + `ratio`（`resolution` / `duration` 仍为顶层） |
| 图片字段命名 | `first_frame_image`、`last_frame_image`、`subject_reference[].image[]` | `content[]` 里 `{ type: "image_url", image_url: { url }, role: "first_frame" \| "last_frame" \| "reference_image" }` |
| 参考视频 / 音频 | 不支持 | `content[]` 里 `video_url` / `audio_url` + `role: "reference_video" \| "reference_audio"` |
| 互斥规则 | 单张首帧/尾帧/主体参考，三选一 | `first_frame`/`last_frame` 与 `reference_*` **互斥**（参考 V2 `buildContent` 校验） |

### 2.2 V1 独有字段

下列字段 V1 可用、V2 无对应或语义不同，需要在 v1 模块单独透传：

| 字段 | 类型 | 说明 | V2 是否支持 |
|------|------|------|------------|
| `prompt_optimizer` | boolean | 自动优化 prompt，默认 `true`；设 `false` 获得更精确控制 | 否 |
| `fast_pretreatment` | boolean | 缩短 `prompt_optimizer` 耗时，默认 `false`；仅 `MiniMax-Hailuo-2.3` 系列与 `MiniMax-Hailuo-02` 生效 | 否 |
| `aigc_watermark` | boolean | 是否在生成视频里加水印，默认 `false` | 是（`aigc_watermark` 顶层字段，V2 用同一字段） |
| `callback_url` | string | 服务端异步推送任务状态变更 | 是（顶层 `callback_url`），但 v1 模块**不暴露服务端接收**（仅作为请求体透传） |
| `subject_reference[]` | object[] | 主体参考对象数组，仅 `S2V-01` 必填 | V2 用 `reference_images[]`（无主体/非主体区分） |

### 2.3 必填字段对比（按场景）

| 场景 | V1 必填 | V2 必填 |
|------|---------|---------|
| 文生 t2v | `model` | `model`、`prompt`（`content[0]`）、`ratio`（不能 adaptive） |
| 图生 i2v | `model`、`first_frame_image` | `model`、`prompt`、`first_frame`（或 `reference_images`） |
| 首尾帧 fl2v | `model`、`first_frame_image`、`last_frame_image` | `model`、`prompt`、`first_frame`、`last_frame` |
| 主体参考 s2v | `model`、`subject_reference[]` | V2 用 `reference_images[]` 表达（无专门 `subject_reference` 概念） |

---

## 3. 状态枚举差异

V1 与 V2 的状态名采用不同大小写风格（V1 PascalCase，V2 lowercase），且 V2 多出 `cancelled`。

| V1 `status` | 含义 | V2 `status` 对应 | 说明 |
|-------------|------|------------------|------|
| `Preparing` | 准备中 | `queued`（初期） | V1 准备阶段，V2 没有同名阶段，计入队列前置 |
| `Queueing` | 队列中 | `queued` | 排队等算力 |
| `Processing` | 生成中 | `running` | 实际生成阶段 |
| `Success` | 已成功 | `succeeded` | 终态，可读 `file_id` |
| `Fail` | 失败 | `failed` | 终态，可读 `base_resp.status_msg` |
| （无） | 取消 | `cancelled` | V1 无取消入口，故无该状态 |

统一映射建议（v1 模块内部使用，避免暴露 V1 原始大小写给前端）：

```text
Preparing | Queueing | Processing → 内部仍以 "processing" 表示
Success                              → 内部 "succeeded"
Fail                                 → 内部 "failed"
（V1 无 cancelled，无法产生）
```

实现层面：v1 服务层调用 `/v1/query/video_generation` 后，将 `status` 字段按上表映射成 V2 同款语义字符串，再走 V2 的 `pollUntilDone` / `finalizeTask` 之类逻辑（如果想最大化复用 V2 代码）。但要注意 `cancelOrDeleteVideoTask`（V2 DELETE）在 V1 没有对应端点，必须显式禁用。

---

## 4. 模型清单差异

### 4.1 V1 全部模型一览（来自 README.md + t2v.md + i2v.md + fl2v.md + s2v.md）

| 模型 | 场景 | 分辨率 | 时长 | 支持运镜 `[指令]` | 备注 |
|------|------|--------|------|------------------|------|
| `MiniMax-Hailuo-2.3` | t2v / i2v | 768P（默认）、1080P（仅 6s） | 6 / 10s（仅 768P 支持 10s） | 是 | V1 默认推荐 |
| `MiniMax-Hailuo-2.3-Fast` | 仅 i2v | 768P（默认）、1080P（仅 6s） | 6 / 10s（仅 768P 支持 10s） | 否 | 速度优化版 |
| `MiniMax-Hailuo-02` | t2v / i2v / fl2v | t2v/i2v：512P、768P、1080P；fl2v：768P、1080P（不支持 512P） | 6 / 10s（仅 768P 支持 10s） | 是 | 唯一支持 fl2v；唯一支持 512P |
| `T2V-01-Director` | 仅 t2v | 720P（默认）、1080P | 仅 6s | 是（专长） | 导演指令版本 |
| `T2V-01` | 仅 t2v | 720P（默认）、1080P | 仅 6s | 否 | 基础文生视频 |
| `I2V-01-Director` | 仅 i2v | 720P（默认）、1080P | 仅 6s | 是（专长） | 导演指令版本 |
| `I2V-01-live` | 仅 i2v | 720P（默认）、1080P | 仅 6s | 否 | 真人风格模型 |
| `I2V-01` | 仅 i2v | 720P（默认）、1080P | 仅 6s | 否 | 基础图生视频 |
| `S2V-01` | 仅 s2v | 文档未列具体分辨率（默认走模型自身） | 文档未列具体时长 | 否 | 主体参考，**单主体单图** |

### 4.2 V2 默认模型

| 模型 | 场景 | 分辨率 | 时长 | 备注 |
|------|------|--------|------|------|
| `MiniMax-H3` | t2v / i2v / fl2v / 多模态参考 | 768P、2K | 4 ~ 15s（任意整秒） | 单模型覆盖所有场景 |

### 4.3 关键差异

- V1 一个场景往往对应多个模型（t2v 有 4 个、i2v 有 6 个），V2 单模型通吃。前端选模型下拉框需要在 v1 模块里按场景动态筛选。
- V1 各模型的分辨率 / 时长约束差异较大（参见第 6 节），必须在入参校验里按 `model` 分支判断；V2 用统一 `RESOLUTION_LIST` / `DURATION_LIST` 即可。
- V1 各模型支持的运镜 `[指令]` 不一致（仅 `MiniMax-Hailuo-2.3` / `MiniMax-Hailuo-02` / `T2V-01-Director` / `I2V-01-Director` 支持），见第 7 节。

---

## 5. 流程差异

### 5.1 V1 三段式异步工作流

```text
[1] POST /v1/video_generation            → 拿到 task_id（4 个场景共用）
[2] GET  /v1/query/video_generation       → 轮询直到 status="Success" / "Fail"，拿到 file_id
[3] GET  /v1/files/retrieve              → 用 file_id 换 download_url（有效期 1 小时）
[4] GET  <download_url>                  → 真正下载 MP4 二进制，落到 output/video/
```

注意：

- 步骤 [3] 是 V1 独有；V2 把这步合并到步骤 [2] 的轮询响应里（`task.content.url`）。
- `download_url` **有效期 1 小时**，过期需重调步骤 [3]；本地落盘必须在 1 小时内完成（V2 没这限制，因为 V2 的 `content.url` 通常也是 CDN 链接，但 V2 实现是拿到就立刻下载，不再二次请求）。
- V1 `query` 响应里附带 `video_width` / `video_height`，V2 没有这两个字段（V2 的 `task.content` 只有 `url`）。

### 5.2 V2 两段式工作流

```text
[1] POST /v2/video_generation            → 拿到 task_id
[2] GET  /v2/query/video_generation       → 轮询直到 status="succeeded"，task.content.url 即下载链接
[3] GET  <content.url>                   → 真正下载 MP4 二进制，落到 output/video/
```

可选增强：

- `POST /v2/h3_context_ir` 一站式（创建 + 轮询 + 返回 prompt）做提示词增强；V1 无此能力。
- `POST /v2/video_regeneration` 用 `source_task_id` 或 `base_video` 升级 768P → 2K；V1 无此能力。
- `DELETE /v2/video_generation/{task_id}` 主动取消；V1 无此能力。

### 5.3 流程建议

- v1 服务层对外仍维持「创建 → 查询 → 本地落盘」三步接口（前端只需调一次「查询」接口，落地动作由后端 `finalize` 自动完成，与 V2 一致）。
- v1 服务内部在 `finalize` 时：调 `/v1/query` → 拿到 `file_id` → 调 `/v1/files/retrieve` → 拿到 `download_url` → 下载二进制 → 写 `output/video/video_<ts>_<task_id>.mp4`。
- 与 V2 一致，`download_url` 不入历史表（数据库存的是本地路径 + task_id + file_id 可选）。

---

## 6. 分辨率 / 时长枚举

### 6.1 V1 分辨率（4 种）

| 取值 | 说明 | 出现的模型 |
|------|------|-----------|
| `512P` | 仅 `MiniMax-Hailuo-02` 的 t2v/i2v 支持，fl2v 不支持 | `MiniMax-Hailuo-02` |
| `720P` | 老 `*-01` / `*-Director` 系列默认 | `T2V-01`、`T2V-01-Director`、`I2V-01`、`I2V-01-Director`、`I2V-01-live` |
| `768P` | `Hailuo-2.3` / `Hailuo-2.3-Fast` / `Hailuo-02` 默认 | `MiniMax-Hailuo-2.3`、`MiniMax-Hailuo-2.3-Fast`、`MiniMax-Hailuo-02` |
| `1080P` | 全部模型均支持（仅 6s） | 全部 |

V1 总枚举（取并集）：`512P`、`720P`、`768P`、`1080P`。

### 6.2 V1 时长（2 种）

| 取值 | 适用 |
|------|------|
| `6` | 全部模型全部分辨率 |
| `10` | 仅 `MiniMax-Hailuo-2.3` 系列与 `MiniMax-Hailuo-02` 在 `768P` 下；其他组合不支持 |

V2 时长枚举：`4、5、6、7、8、9、10、11、12、13、14、15`（任意整秒）。

### 6.3 模型 × 分辨率 × 时长 矩阵（V1）

| 模型 | 512P | 720P | 768P | 1080P | 6s | 10s |
|------|:----:|:----:|:----:|:-----:|:--:|:---:|
| `MiniMax-Hailuo-2.3` (t2v/i2v) | ✗ | ✗ | ✓ 默认 | ✓ | ✓ | ✓（仅 768P） |
| `MiniMax-Hailuo-2.3-Fast` (i2v) | ✗ | ✗ | ✓ 默认 | ✓ | ✓ | ✓（仅 768P） |
| `MiniMax-Hailuo-02` (t2v/i2v) | ✓ | ✗ | ✓ 默认 | ✓ | ✓ | ✓（仅 768P） |
| `MiniMax-Hailuo-02` (fl2v) | ✗ | ✗ | ✓ 默认 | ✓ | ✓ | ✓（仅 768P） |
| `T2V-01-Director` (t2v) | ✗ | ✓ 默认 | ✗ | ✓ | ✓ | ✗ |
| `T2V-01` (t2v) | ✗ | ✓ 默认 | ✗ | ✓ | ✓ | ✗ |
| `I2V-01-Director` (i2v) | ✗ | ✓ 默认 | ✗ | ✓ | ✓ | ✗ |
| `I2V-01-live` (i2v) | ✗ | ✓ 默认 | ✗ | ✓ | ✓ | ✗ |
| `I2V-01` (i2v) | ✗ | ✓ 默认 | ✗ | ✓ | ✓ | ✗ |
| `S2V-01` (s2v) | 文档未列 | 文档未列 | 文档未列 | 文档未列 | 文档未列 | 文档未列 |

> 备注：S2V-01 在 `s2v.md` 未列具体分辨率 / 时长表，按 V1 老模型默认行为应是 720P / 6s。**待主 agent 在阶段 2 决定是否需要走实测补全**。

### 6.4 与 V2 的差异

| 项 | V1 | V2 |
|----|----|----|
| 分辨率 | `512P` / `720P` / `768P` / `1080P`（4 种，按模型分支） | `768P` / `2K`（2 种） |
| 时长 | `6` / `10`（2 种，按模型 × 分辨率分支） | `4` ~ `15`（12 种，任意整秒） |
| 宽高比 | 跟随图片（无 ratio 概念） | `adaptive` / `21:9` / `16:9` / `4:3` / `1:1` / `3:4` / `9:16` |

---

## 7. 运镜指令 `[指令]`

V1 文档明确列出 **15 种**标准运镜（`README.md` 「运镜指令 `[指令]`」 章节）：

| 类别 | 指令（共 15 种） |
|------|------------------|
| 左右移 | `[左移]`、`[右移]` |
| 左右摇 | `[左摇]`、`[右摇]` |
| 推拉 | `[推进]`、`[拉远]` |
| 升降 | `[上升]`、`[下降]` |
| 上下摇 | `[上摇]`、`[下摇]` |
| 变焦 | `[变焦推近]`、`[变焦拉远]` |
| 其他 | `[晃动]`、`[跟随]`、`[固定]` |

支持模型：`MiniMax-Hailuo-2.3`、`MiniMax-Hailuo-02`、`T2V-01-Director`、`I2V-01-Director`。

使用规则（V1 README 明示）：

- **组合运镜**：同一组 `[]` 内多个指令同时生效，如 `[左摇,上升]`，建议组合不超过 3 个。
- **顺序运镜**：prompt 中前后出现的指令依次生效，如 `...[推进], 然后...[拉远]`。
- **自然语言**：也支持自然语言描述运镜，但标准指令响应更准。

实现层面：v1 模块在 UI 上可以做一个「运镜快捷按钮」面板，点击自动在 `prompt` 末尾插入 `[指令]`。需要校验：

- 仅当模型在白名单（`Hailuo-2.3` / `Hailuo-02` / `*-Director`）时才暴露运镜按钮。
- 顺序运镜插入符（逗号）需在 UI 层做好拼接。
- V2 没有 `[指令]` 语法（V2 改用自然语言 + 多模态参考控制镜头）；这是 v1 模块独有的前端交互。

---

## 8. 图片要求

V1 三类图片字段（`first_frame_image` / `last_frame_image` / `subject_reference[].image[]`）的要求一致：

| 项 | 限制 |
|----|------|
| 格式 | JPG、JPEG、PNG、WebP |
| 体积 | `<= 20 MB` |
| 短边像素 | `> 300 px` |
| 长宽比（短/长） | `[0.4, 0.5]`（即 `2:5 ~ 5:2` 之间） |
| 来源 | 公网 URL **或** Base64 Data URL（`data:image/jpeg;base64,...`） |

补充：

- 首尾帧生成时，视频尺寸遵循首帧图片；当首尾帧图片尺寸不一致时，模型按首帧对尾帧裁剪。
- `S2V-01` 的 `subject_reference[]` 仅支持 `type: "character"`（人物面部），`image[]` 数组当前仅支持单张图片。
- Content-Type：V1 创建接口要求 `application/json`；图片本身通过 URL 或 Base64 内嵌在 JSON 体里，**不需要**单独 `multipart/form-data`。
- 与 V2 图片上传对比：V2 提供 `POST /api/video/upload`（multer 本地文件 → `uploadFileToMiniMax` → `file_id`），再把 `file_id` 放进 `content[].image_url.url`。V1 不需要这一步：直接把 URL 或 Base64 写在 `first_frame_image` 字段即可。

实现建议：v1 模块可在路由层做一次图片预校验（短边像素、长宽比），失败时返回 `2013` 同款参数错误，避免打到上游再被拒绝。

---

## 9. v1 暴露 / 不暴露范围对照

下列范围对照是「v1 模块对外（前端）暴露 vs 不暴露」的初步划分，与 V2 当前能力做并列：

| 能力 | V2 是否暴露 | V1 是否暴露 | 说明 |
|------|:-----------:|:-----------:|------|
| 文生视频（t2v） | ✓ | ✓ | 复用同一后端，区分 model 即可 |
| 图生视频（i2v） | ✓ | ✓ | 同上 |
| 首尾帧（fl2v） | ✓ | ✓ | V1 强约束只支持 `Hailuo-02` + `768P/1080P` |
| 主体参考（s2v） | 通过 `reference_images` 表达 | ✓（独立表单） | V1 必须把 `reference_images` 改写为 `subject_reference[]` |
| 多模态参考（image/video/audio） | ✓ | ✗ | V1 完全不支持 `reference_video` / `reference_audio`，**不暴露** |
| 任务状态查询 + 落盘 | ✓ | ✓ | 实现路径不同：V1 多一步 `/v1/files/retrieve` |
| 历史记录（MySQL） | ✓ | ✓ | 复用 `historyService.addRecord`，字段命名同 V2 |
| 本地落盘（`output/video/`） | ✓ | ✓ | 文件命名规则同 V2：`video_<ts>_<task_id>.mp4` |
| 提示词增强（H3-Context-IR） | ✓ | ✗ | V1 无对应端点 |
| 视频再生成（768P → 2K） | ✓ | ✗ | V1 无对应端点 |
| 取消 / 删除任务 | ✓ | ✗ | V1 无 DELETE 端点；前端隐藏「取消」按钮 |
| `options` 接口（前端拿到 model / resolution / duration 枚举） | ✓ | ✓ | v1 模块需要返回按场景分支的 `MODEL_LIST` / `RESOLUTION_LIST` / `DURATION_LIST` |
| 文件上传（`POST /api/video/upload`） | ✓ | ✗ | V1 不需要；URL / Base64 直接放请求体 |
| `callback_url` 服务端接收回调 | ✓（仅入参透传） | ✗ | V1 文档说「**可选**，配置后 MiniMax 会推 challenge + 状态变更」。本项目不部署公网回调接收服务，**不暴露**，仅允许前端表单填了写到请求体里透传给上游（仍然无效但无副作用）。或者干脆前端不暴露该字段 |

UI 建议：

- 模型下拉框按场景动态渲染：t2v（4 个）、i2v（6 个）、fl2v（1 个：`Hailuo-02`）、s2v（1 个：`S2V-01`）。
- 分辨率下拉框根据所选模型动态过滤。
- 时长 slider 在 v1 模块固定为 `[6, 10]` 两档（用 el-radio 而非 el-slider）。
- 运镜 `[指令]` 按钮面板仅在白名单模型下显示。
- 「取消任务」按钮在 v1 模块**不渲染**。

---

## 10. 风险与待确认

| # | 项 | 风险 / 现状 | 建议 / 待主 agent 决策 |
|---|----|------------|------------------------|
| 1 | 账号 Credit / 余额 | V1 老模型可能要求单独的 Credit 套餐，与 V2 `MiniMax-H3` 不同 | 阶段 2 实现前用小请求实测 1 次，确认账号是否已开通 V1 权限 |
| 2 | `download_url` 1 小时有效期 | 拿到 `file_id` 后必须立刻调 `/v1/files/retrieve`，再立刻下载 | 服务层在 `finalize` 里串行：`query` → `files/retrieve` → `downloadVideo`，不要缓存 `download_url` |
| 3 | `file_id` 是否存库 | V2 不存 `file_id`（直接拿 `content.url`）；V1 需要先有 `file_id` 再换 url | 建议**不新增列**，复用 `generation_history`；本地落盘后 `file_id` 仅作日志。如确需保留以便重下，可加一列 `file_id VARCHAR(64)`，但非必需 |
| 4 | 错误码差异 | V1 用 `base_resp.status_code`（`1002` 限流、`1008` 余额、`1026/1027` 敏感内容、`2013` 参数）；V2 用 HTTP 状态码 + `error.message` | v1 服务层将上游 `base_resp.status_msg` 包成 `Error.message`，HTTP 仍返回 500（与 V2 一致），前端 `e.response.data.error` 能直接显示 |
| 5 | `query` 返回 `video_width` / `video_height` | V1 有，V2 无 | v1 模块可在历史记录或落盘日志里附带；前端播放器可忽略 |
| 6 | `S2V-01` 分辨率 / 时长 | `s2v.md` 未列具体值 | 阶段 2 实现前**实测**一次确认；前端先用 V1 默认 `720P / 6s` 占位 |
| 7 | `I2V-01-live` 真人风格 | V1 文档提了一句，但无额外约束 | 阶段 2 前端可以做个「真人 / 卡通」风格提示，但**不影响入参**，暂不阻塞 |
| 8 | `callback_url` | V1 支持服务端回调，但本项目无公网接收端 | 阶段 2 决定是否：<br>(a) 完全不暴露 `callback_url` 入参<br>(b) 暴露但填了也没用（透传给上游失败） |
| 9 | 文档冲突 | README 与各场景 md 在 `resolution` 表里 `Hailuo-02` 描述略有差异（t2v/i2v 写「`512P` 可选」，fl2v 写「不支持 512P」） | 以 README + fl2v.md 为准（fl2v 不支持 512P） |
| 10 | Base64 Data URL 体积 | V1 限制 `<= 20MB`，Base64 编码后会膨胀约 33%，JSON 体里 `<= ~15MB` 可接受 | 路由层 `express.json({ limit: '30mb' })` 给一定缓冲（V2 当前路由层继承默认 100kb，需要**显式调大**） |
| 11 | 限流处理 | V1 与 V2 都有 `1002` / `1039` 限流 | v1 `pollUntilDone` 沿用 V2 的「指数退避 / 上限重试」策略即可 |
| 12 | 上游 6 个原始 URL 列表 | `docs/doc_raw/api_video_old.md` 仅给 6 个 URL，未提供原始 JSON 字段 | 阶段 2 之前若发现 V1 文档未提及的字段（例如 `seed`、`negative_prompt`），需要从 `platform.minimaxi.com` 抓页确认。当前 `docs/video_old/*.md` 已覆盖全部字段，**未发现遗漏** |

---

## 11. 阶段 1 关键差异总结（Top 3，供主 agent 决策是否进入阶段 2）

1. **流程多一步 `/v1/files/retrieve`** —— V2 一轮 `query` 拿到 `content.url`；V1 必须「`query` 拿 `file_id` → `files/retrieve` 拿 `download_url` → 下载」。这意味着 v1 服务层必须把 V2 的 `finalizeTask` 改造为「带 file_id 中转的两步 finalize」，否则前端落盘会失败。**这是 v1 模块实现的最大工作量差异点**。

2. **模型清单与枚举按场景分支** —— V2 一个 `MiniMax-H3` 通吃所有分辨率 / 时长；V1 共 9 个模型 × 4 种分辨率 × 2 种时长 × 4 种场景，组合约束需在前端 + 路由层双重校验。`options` 接口需从 V2 的「统一枚举」改为「按场景返回不同 `MODEL_LIST` / `RESOLUTION_LIST` / `DURATION_LIST`」。

3. **V1 独有的 `[指令]` 运镜 + V1 独有字段（`prompt_optimizer` / `fast_pretreatment` / `subject_reference[]`）** —— V2 完全不支持，v1 模块前端需要：① 增加运镜快捷按钮面板（仅白名单模型显示）；② 在创建表单里透传 `prompt_optimizer` / `fast_pretreatment`；③ 把 `referenceImages` 改写为 `subject_reference[]`（仅 s2v）。这部分是 v1 模块「多出来的 UI 工作量」。

> 其他次要差异（状态名映射、无 callback 服务端接收、无取消 / 删除、无 H3 / 再生成）已在第 9、10 节明确标注，整体可控。

---

## 12. 是否需要补读 `docs/guide.md` / `docs/architecture.md`

- 已快速浏览 `docs/guide.md` 的「目录」与快速开始 / 环境要求部分，**与本笔记无直接冲突**；架构 / 启动 / 鉴权约定已通过 `docs/video_old/README.md` 「鉴权」一节覆盖。无需再深度阅读。
- 已快速浏览 `docs/architecture.md` 系统架构图与目录结构，**确认 v1 模块应沿用 V2 的目录与命名规范**（`server/services/videoOldService.js` / `server/routes/videoOld.js` / `client/src/views/VideoOldView.vue`），但**路径 / 文件名需主 agent 在阶段 2 决定**（建议放在 `docs/video_old/checklist/旧版视频生成功能_checklist.md` 由主 agent 维护的命名约定下保持一致）。
- 不需要补读其他文件，避免堆工作量。
