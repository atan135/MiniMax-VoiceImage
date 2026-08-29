# 旧版视频生成功能 Checklist

## 目标

为 MiniMax-VoiceImage 平台补齐 MiniMax **视频生成 V1（旧版）** 接口的全链路能力，与现有 H3/V2 模块并存。

**V1 模块与 V2 模块的关键差异**（详见 `docs/video_old/README.md`）：

- 模型系列不同：V1 使用 `MiniMax-Hailuo-*`、`T2V-01*`、`I2V-01*`、`S2V-01`；V2 使用 `MiniMax-H3`
- 入参格式不同：V1 单字段（`prompt` / `first_frame_image` / `subject_reference[]` 等）；V2 统一 `content[]` 多模态数组
- 任务状态枚举不同：V1 为 `Preparing` / `Queueing` / `Processing` / `Success` / `Fail`；V2 为 `queued` / `running` / `succeeded` / `failed` / `cancelled`
- 结果获取流程不同：V1 需要 `task_id` -> 轮询 -> `file_id` -> `/v1/files/retrieve` -> `download_url`；V2 直接返回 `task.content.url`
- V1 不支持：H3-Context-IR 提示词增强、视频再生成（768P -> 2K）、取消/删除接口

**交付内容**：

- 后端：`server/services/videoOldService.js`（V1 API 封装）、`server/routes/videoOld.js`（路由），与现有 `videoService.js` / `routes/video.js` 同级挂载但不互相依赖
- 数据库：`generation_history.type` 枚举扩展支持 `video_old`，失败/成功记录与其他类型共用同一张表
- 前端：`client/src/views/VideoOldView.vue` 新页面，含 4 个 Tab（文生视频 / 图生视频 / 首尾帧生视频 / 主体参考视频）；`client/src/api/index.js` 补齐接口调用；`client/src/router.js` 和 `client/src/App.vue` 加入口
- 历史记录：`HistoryView` 增加 `video_old` 类型过滤和详情展示
- 输出文件：生成的 MP4 落到 `output/video_old/` 目录，与 `output/voice|image|music|video/` 风格一致
- 文档：`docs/guide.md` 增补旧版视频生成章节

**边界和不做什么**：

- 不做：H3-Context-IR 提示词增强（V1 不支持）
- 不做：视频再生成（V1 不支持）
- 不做：取消/删除任务接口（V1 无对应端点）
- 不做：服务端 `callback_url` 接收（仅前端轮询 `query`）
- 不做：视频实时预览流、剪辑、合并、转码
- 不做：自建 CDN 上传/分发（使用上游返回的 URL 与本地落盘）
- 不做：多用户、权限、配额、计费
- 不做：服务端内存任务队列（V1 API 自身保留任务，前端直接轮询即可）

## 基础原则

- [ ] 明确实现范围和非目标，并在每个阶段开始前与原始需求对齐。
- [ ] 保持与现有架构一致：service 顶部 import + 错误处理 + `maskSensitiveData` 包裹入参；路由风格与 `routes/video.js` 对齐。
- [ ] V1 模块与 V2 模块文件命名空间严格隔离（`videoOld*` vs `video*`），避免互相覆盖。
- [ ] V1 任务状态、模型、分辨率、时长等枚举值严格按 V1 文档执行，不得沿用 V2 值。
- [ ] V1 两段式结果获取（task_id -> file_id -> download_url）必须完整实现，不允许跳过 `/v1/files/retrieve` 步骤。
- [ ] 每次提交前运行启动检查：`npm run dev` 启动后端、`cd client && npm run build` 通过。
- [ ] 文件路径变更/新建/删除均已在 commit message 中标注。
- [ ] 凭据不入仓、日志脱敏（`API_KEY` 不入参、不入库、log 中 `grep` 命中 0 次）。

## 援引文档

以下文档用于说明 checklist 的需求来源和编制依据：

- 文档：MiniMax V1 视频生成 API 文档集
  - 路径：`docs/video_old/README.md`、`docs/video_old/t2v.md`、`docs/video_old/i2v.md`、`docs/video_old/fl2v.md`、`docs/video_old/s2v.md`、`docs/video_old/query.md`、`docs/video_old/download.md`
  - 用途：所有接口的 URL、请求体、响应体、参数取值、错误码、模型清单、运镜指令、图片要求均以这套文档为准，checklist 不再重复 API 字段定义。

- 文档：原始 API 抓取记录
  - 路径：`docs/doc_raw/api_video_old.md`
  - 用途：作为上游文档的对照源，遇到 `docs/video_old/` 描述不清时回看原始 URL 列表。

- 文档：现有 V2 视频模块作为实现参考
  - 路径：`server/services/videoService.js`、`server/routes/video.js`、`client/src/views/VideoView.vue`、`docs/video/checklist/视频生成功能_checklist.md`
  - 用途：决定新功能在分层、目录命名、菜单位置、文档风格上如何融入现有项目；本模块与 V2 模块并存不重复。

- 文档：项目架构与使用指南
  - 路径：`docs/architecture.md`、`docs/guide.md`
  - 用途：决定新功能在分层、目录命名、菜单位置、文档风格上如何融入现有项目。

- 文档：协作规范
  - 路径：`AGENTS.md`（仓库根）
  - 用途：约束前端错误处理（`e.response?.data?.error` 优先）、日志脱敏、敏感数据不入库等行为。

## 阶段 1：需求和边界确认

- 开始时间：
- 结束时间：
- 开发总结：
- 验证记录：

- [ ] 通读 `docs/video_old/` 全部 7 份文档，列出 V1 与 V2 在端点、入参、状态、模型、流程上的全部差异点。
- [ ] 固化本模块 v1 暴露范围：(1) 4 个创建场景（t2v / i2v / fl2v / s2v）；(2) 任务状态轮询（`/v1/query/video_generation`）；(3) 文件检索下载（`/v1/files/retrieve`）；(4) 历史记录与 `type=video_old` 过滤；(5) 输出文件落盘到 `output/video_old/`。
- [ ] 固化本模块 v1 不暴露范围：H3-Context-IR、视频再生成、取消/删除、callback_url 服务端接收。
- [ ] 确认模型清单、状态枚举、分辨率/时长取值集合（与 V2 不同），写入开发笔记。

## 阶段 2：数据库扩展

- 开始时间：
- 结束时间：
- 开发总结：
- 验证记录：

- [ ] 在 `server/utils/db.js` 的 `generation_history.type` 枚举或等价检查逻辑中扩展支持 `video_old`。
- [ ] 评估是否需要新增字段（如 `file_id`、`raw_status`），如需则在 `initDatabase()` 中加 ALTER TABLE 或建表时一次性纳入。
- [ ] 启动后端跑一遍 `npm run dev`，确认 `initDatabase` 日志无报错、`generation_history` 表结构正确。
- [ ] 用 SQL 客户端或后端日志确认 `type='video_old'` 的 INSERT / SELECT 行为正常。

## 阶段 3：service 层封装（videoOldService.js）

- 开始时间：
- 结束时间：
- 开发总结：
- 验证记录：

- [ ] 新建 `server/services/videoOldService.js`，按 V1 文档封装以下能力：常量定义（模型清单、分辨率枚举、时长集合、状态枚举）、HTTP 请求封装（`POST /v1/video_generation`、`GET /v1/query/video_generation`、`GET /v1/files/retrieve`）。
- [ ] 实现 4 个创建场景函数：`createVideoOldTaskT2V / I2V / FL2V / S2V`，分别对应不同的请求体（`prompt` / `first_frame_image` / `first_frame_image + last_frame_image` / `subject_reference[]`）。
- [ ] 实现通用创建入口 `createVideoOldTask(params)`，按 `params.mode` 路由到对应函数，避免散落多个 POST。
- [ ] 实现 `queryVideoOldTask(taskId)`：返回 `task_id` / `status` / `file_id` / `video_width` / `video_height` / `base_resp`，把 V1 状态枚举（`Preparing` / `Queueing` / `Processing` / `Success` / `Fail`）原样透传。
- [ ] 实现 `retrieveVideoOldFile(fileId)`：调用 `/v1/files/retrieve`，返回 `file.download_url`（有效期 1 小时）。
- [ ] 实现 `downloadVideo(url, savePath)`：流式下载视频到 `output/video_old/<taskId>.mp4`，含目录自动创建、文件大小校验、失败回滚。
- [ ] 实现 `extractUpstreamErrorMessage(error)`：从 axios 错误中提取 `base_resp.status_msg` 或 `status_code` 文本，供路由层复用。
- [ ] 顶部 import 风格、`maskSensitiveData` 使用、`API_KEY` 处理方式与 `videoService.js` 保持一致。
- [ ] `node -e "import('./server/services/videoOldService.js').then(m => console.log(Object.keys(m)))` 验证所有 export 名称可解析。

## 阶段 4：路由层（videoOld.js）

- 开始时间：
- 结束时间：
- 开发总结：
- 验证记录：

- [ ] 新建 `server/routes/videoOld.js`，按以下端点挂载（路径前缀 `/api/video_old`）：
  - `GET /options`：返回模型清单、分辨率枚举、时长集合、状态枚举、4 个场景名
  - `POST /t2v`：文生视频
  - `POST /i2v`：图生视频
  - `POST /fl2v`：首尾帧生视频
  - `POST /s2v`：主体参考视频
  - `GET /status/:taskId`：轮询任务状态，成功时触发「拉 `file_id` -> 调 `/v1/files/retrieve` -> 下载视频到本地」三段式 finalize
  - `GET /files/:fileId`：单独检索文件下载链接（前端在断点续传等场景可复用）
- [ ] 入参白名单 `sanitizeVideoOldCreateBody` 仅透传允许字段（`prompt` / `first_frame_image` / `last_frame_image` / `subject_reference` / `prompt_optimizer` / `fast_pretreatment` / `duration` / `resolution` / `aigc_watermark`），丢弃客户端伪造的服务端字段。
- [ ] 4 个创建端点的 catch 块统一调用 `extractUpstreamErrorMessage` + `addRecord('video_old', ..., 'failed')`，与 `routes/video.js` 风格一致。
- [ ] `/status/:taskId` 在 `status='Success'` 时写 `addRecord('video_old', ..., 'success')` + 文件路径 + 文件大小；在 `status='Fail'` 时写 `failed`；`Preparing` / `Queueing` / `Processing` 时不落库（仅返回上游数据）。
- [ ] `taskId` / `fileId` 校验：长度 <= 64、正则 `^[A-Za-z0-9_-]+$`，非法返回 400。
- [ ] 在 `server/index.js` 注册路由：`app.use('/api/video_old', videoOldRouter)`，与 `/api/video` 并列。
- [ ] 重启后端，确保日志中能看到 7 个端点的路由挂载。

## 阶段 5：后端 curl 端到端验证

- 开始时间：
- 结束时间：
- 开发总结：
- 验证记录：

- [ ] `curl http://localhost:3000/api/video_old/options` 返回 200，含模型清单、状态枚举、4 个场景名。
- [ ] `curl -X POST /api/video_old/t2v` 收到上游 2013 / 1004 等错误时，前端能透出 `base_resp.status_msg`（服务不抛 500，而是返回 4xx / 500 + `error` 字段）。
- [ ] `curl -X POST /api/video_old/i2v` 不传 `first_frame_image` 时返回 4xx + 明确的「缺少 first_frame_image」错误。
- [ ] `curl -X POST /api/video_old/fl2v` 不传 `last_frame_image` 时返回 4xx + 明确的「缺少 last_frame_image」错误。
- [ ] `curl -X POST /api/video_old/s2v` 不传 `subject_reference` 时返回 4xx + 明确的「缺少 subject_reference」错误。
- [ ] `curl /api/video_old/status/<taskId>` 对不存在的 taskId 返回 4xx 且不写入历史。
- [ ] `curl /api/video_old/files/<fileId>` 对非整数 fileId 返回 4xx（V1 file_id 是 int64）。
- [ ] 日志检查：`grep -E 'JWT|API_KEY|Bearer' logs/api.log` 命中 0 次，所有日志含 `taskId` / `fileId` 上下文。

## 阶段 6：前端 api 接入

- 开始时间：
- 结束时间：
- 开发总结：
- 验证记录：

- [ ] 在 `client/src/api/index.js` 新增以下调用：
  - `getVideoOldOptions()`
  - `createVideoOldTaskT2V / I2V / FL2V / S2V(data)`
  - `getVideoOldTaskStatus(taskId)`
  - `retrieveVideoOldFile(fileId)`
- [ ] 命名空间与 V2 模块严格分开（`VideoOld` 后缀），避免与现有 `video` 相关调用混淆。
- [ ] `createVideoOldTask*` 走 `multipart/form-data` 不需要（V1 入参均为 JSON），按普通 JSON POST 走即可。

## 阶段 7：前端 VideoOldView.vue（4 Tab UI）

- 开始时间：
- 结束时间：
- 开发总结：
- 验证记录：

- [ ] 新建 `client/src/views/VideoOldView.vue`，4 个 Tab：文生视频 / 图生视频 / 首尾帧生视频 / 主体参考视频。
- [ ] 文生视频 Tab：prompt 输入（最大 2000 字符、word-limit）、模型选择（V1 候选）、分辨率选择（按模型联动）、时长（6 / 10）、`prompt_optimizer` 开关、`fast_pretreatment` 开关（仅 Hailuo 模型可见）、`aigc_watermark` 开关。
- [ ] 图生视频 Tab：prompt 输入、`first_frame_image` 上传（< 20MB，短边 > 300px）、模型选择、分辨率、时长。
- [ ] 首尾帧生视频 Tab：prompt、`first_frame_image` + `last_frame_image` 上传、`MiniMax-Hailuo-02` 模型锁定、分辨率（768P / 1080P）、时长。
- [ ] 主体参考视频 Tab：prompt、`subject_reference[]` 输入（type=`character` 锁定、image URL 数组）、`S2V-01` 模型锁定。
- [ ] 4 个 Tab 共享相同的生成流程：`createVideoOldTaskXxx -> 拿到 taskId -> 轮询 getVideoOldTaskStatus -> status=Success 后展示视频播放器（src 为 `output/video_old/<taskId>.mp4`）`。
- [ ] 所有 6 个 catch 块统一走 `e.response?.data?.error || e.message || '操作失败'`，与 `VoiceView.vue` / `ImageView.vue` 风格一致。
- [ ] 文生视频运镜指令 `[指令]`：在 prompt 输入框下方加 15 种运镜指令的可视化提示（按钮或 hover tooltip），点击插入到 prompt 当前光标位置。

## 阶段 8：前端路由 / 菜单 / 历史集成

- 开始时间：
- 结束时间：
- 开发总结：
- 验证记录：

- [ ] 在 `client/src/router.js` 注册路由：`/video_old` -> `VideoOldView.vue`，与 `/video` 并列。
- [ ] 在 `client/src/App.vue` 菜单加入口：`视频生成（旧版）` 链接到 `/video_old`，与现有 `视频生成` 区分。
- [ ] 在 `client/src/views/HistoryView.vue` 增加 `type=video_old` 的过滤标签 / 下拉选项，详情展示中识别并展示 V1 字段（`file_id` / `status` / `video_width` / `video_height`）。
- [ ] 历史详情展示视频播放器时使用 `/output/video_old/<file>` 路径，与 V2 模块的 `/output/video/<file>` 不冲突。

## 阶段 9：前端构建与视觉验证

- 开始时间：
- 结束时间：
- 开发总结：
- 验证记录：

- [ ] `cd client && npm run build` 通过，无 Vite 报错、无 TypeScript / ESLint 阻塞。
- [ ] dev server 启动后，`http://localhost:5173/video_old` 返回 200 且 4 个 Tab 渲染正常。
- [ ] 在 1280x800 桌面分辨率下，4 个 Tab 的表单、图片上传、播放器、错误提示视觉无异常。
- [ ] 同一视频在浏览器中可直接播放（`output/video_old/` 静态文件可访问）。

## 阶段 10：文档与最终提交

- 开始时间：
- 结束时间：
- 开发总结：
- 验证记录：

- [ ] `docs/guide.md` 增补「旧版视频生成」章节，介绍 4 个场景、模型差异、与 V2 模块的并存关系。
- [ ] `docs/architecture.md` 架构图同步：`server/services/videoOldService.js` 与 `server/routes/videoOld.js` 加入目录结构与数据流。
- [ ] 本 checklist 文件本身在所有阶段完成后标 `[x]` 并补全元信息（开始时间 / 结束时间 / 开发总结 / 验证记录）。
- [ ] 按 `mygit-skill` 规范拆分 commit：
  - 1 个 `feat(db)`：数据库 type 扩展
  - 1 个 `feat(server)`：`videoOldService.js`
  - 1 个 `feat(server)`：`videoOld.js` 路由 + `index.js` 挂载
  - 1 个 `feat(client)`：`api/index.js` 接口调用
  - 1 个 `feat(client)`：`VideoOldView.vue` 4 Tab UI
  - 1 个 `feat(client)`：`router.js` / `App.vue` / `HistoryView.vue` 集成
  - 1 个 `docs(video_old)`：`docs/guide.md` + `docs/architecture.md` 同步
- [ ] 每个 commit 信息含文件路径变更标注，符合中文 `<type>(<scope>): <summary>` 规范。

## 最终完成定义

以下项目作为整体完成标准，不要求每个开发阶段都执行，由所有相关阶段完成后统一验收。

- 开始时间：
- 结束时间：
- 验收总结：

- [ ] 阶段 1-10 全部 `[x]`，且每个阶段都有填写完整的「开始时间 / 结束时间 / 开发总结 / 验证记录」。
- [ ] `npm run dev` 启动后无控制台错误，`/api/health` 返回 200，`/api/video_old/options` 返回 200。
- [ ] 端到端 5 个用例（t2v / i2v / fl2v / s2v / file retrieve）至少触达上游或完成 happy-path（依账号 TokenPlan / Credit 决定）。
- [ ] `docs/guide.md` / `docs/architecture.md` 已同步更新，与实际功能一致。
- [ ] 数据库 `generation_history` 中存在至少 1 条 `type='video_old'` 成功记录和 1 条失败记录。
- [ ] `output/video_old/` 目录有真实生成的 MP4，文件大小 > 0，可在浏览器播放（依赖账号权限）。
- [ ] 前端 `VideoOldView` 与 `HistoryView` 的 `video_old` 类型过滤在 1280x800 桌面分辨率下视觉无异常。
- [ ] `AGENTS.md` 的错误处理、日志脱敏、敏感数据规范在所有新增文件中均被遵守：`grep -E 'JWT|API_KEY|Bearer' logs/api.log` 命中 0 次；`VideoOldView.vue` 的 catch 块全部走 `e.response?.data?.error` 优先级。
- [ ] 与原始需求对比，确认目标「交付内容」清单全部达成，且「边界」清单未越界。
- [ ] 与现有 V2 视频模块命名空间严格隔离：`/api/video_old/*` 与 `/api/video/*` 不互相覆盖；前端 `/video_old` 与 `/video` 路由独立；输出目录 `output/video_old/` 与 `output/video/` 分开。
