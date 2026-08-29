import express from "express";
import multer from "multer";
import fs from "fs";
import {
  MODEL,
  RESOLUTION_LIST,
  DURATION_LIST,
  RATIO_LIST,
  TASK_TYPE,
  STATUS,
  createVideoTask,
  queryVideoTask,
  finalizeTask,
  listVideoTasks,
  cancelOrDeleteVideoTask,
  enhancePrompt,
  regenerateVideo,
  uploadFileToMiniMax,
} from "../services/videoService.js";
import { addRecord } from "../services/historyService.js";
import { apiLogger, maskSensitiveData } from "../utils/logger.js";

// ===== multer 配置（参考 server/routes/voice.js） =====
const uploadDir = "output/uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

const router = express.Router();

// ===== 工具函数 =====
const TASK_ID_REGEX = /^[A-Za-z0-9_-]+$/;

function isValidTaskId(id) {
  return typeof id === "string" && id.length > 0 && id.length <= 64 && TASK_ID_REGEX.test(id);
}

function isLocalPath(s) {
  return typeof s === "string" && s.length > 0 && !/^https?:\/\//i.test(s);
}

// POST / 与 POST /enhance-prompt 共用：本地路径媒体先上传到 MiniMax 拿 file_id
async function resolveMediaParams(params) {
  const out = { ...params };

  for (const key of ["firstFrame", "lastFrame"]) {
    if (isLocalPath(out[key])) {
      const uploaded = await uploadFileToMiniMax(out[key], "video_reference");
      out[key] = uploaded.fileId;
    }
  }

  for (const key of ["referenceImages", "referenceVideos", "referenceAudios"]) {
    if (Array.isArray(out[key])) {
      out[key] = await Promise.all(
        out[key].map(async (item) => {
          if (isLocalPath(item)) {
            const uploaded = await uploadFileToMiniMax(item, "video_reference");
            return uploaded.fileId;
          }
          return item;
        }),
      );
    }
  }

  return out;
}

// 入参白名单：丢弃 status / type / taskId 等服务端字段，避免客户端伪造
function sanitizeVideoCreateBody(body) {
  const safe = {};
  const allowed = [
    "prompt",
    "firstFrame",
    "lastFrame",
    "referenceImages",
    "referenceVideos",
    "referenceAudios",
    "content",
    "resolution",
    "duration",
    "ratio",
    "aigcWatermark",
    "aigc_watermark",
    "callbackUrl",
    "callback_url",
  ];
  if (!body || typeof body !== "object") return safe;
  for (const key of allowed) {
    if (body[key] !== undefined) safe[key] = body[key];
  }
  return safe;
}

// ===== GET /options =====
router.get("/options", (req, res) => {
  apiLogger.info("[Video Options] 获取视频配置选项");
  res.json({
    model: MODEL,
    resolutionList: RESOLUTION_LIST,
    durationList: DURATION_LIST,
    ratioList: RATIO_LIST,
    taskType: TASK_TYPE,
    status: STATUS,
  });
});

// ===== POST / 创建视频生成任务 =====
router.post("/", async (req, res) => {
  const startTime = Date.now();
  const sanitized = sanitizeVideoCreateBody(req.body);
  const maskedBody = maskSensitiveData(sanitized);

  apiLogger.info(`[Video Create] 请求参数: ${JSON.stringify(maskedBody)}`);

  try {
    const params = await resolveMediaParams(sanitized);
    const result = await createVideoTask(params);

    const duration = Date.now() - startTime;
    apiLogger.info(`[Video Create] 任务已创建 | 耗时: ${duration}ms | taskId: ${result.taskId}`);

    res.json({ success: true, data: { taskId: result.taskId } });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(`[Video Create] 失败 | 耗时: ${duration}ms | 错误: ${error.message}`);

    try {
      await addRecord(
        "video",
        sanitized.prompt || "video generation",
        maskedBody,
        null,
        0,
        "failed",
        error.message,
      );
    } catch (dbError) {
      apiLogger.error(`[Video Create] 记录失败到数据库时出错: ${dbError.message}`);
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== GET /status/:taskId 拉取上游状态并 finalize + 落库 =====
router.get("/status/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const startTime = Date.now();

  if (!isValidTaskId(taskId)) {
    return res.status(400).json({ success: false, error: "taskId 格式不合法" });
  }

  apiLogger.info(`[Video Status] 查询任务 | taskId: ${taskId}`);

  try {
    const task = await queryVideoTask(taskId);

    let result;
    try {
      result = finalizeTask(task);
    } catch (finalizeErr) {
      const duration = Date.now() - startTime;
      apiLogger.error(
        `[Video Status] finalize 失败 | taskId: ${taskId} | 耗时: ${duration}ms | 错误: ${finalizeErr.message}`,
      );

      try {
        const promptText = (task.content && (task.content.prompt || "")) || `taskId=${taskId}`;
        await addRecord(
          "video",
          promptText,
          {
            task_id: taskId,
            status: task.status,
            task_type: task.task_type,
          },
          null,
          0,
          "failed",
          finalizeErr.message,
        );
      } catch (dbError) {
        apiLogger.error(`[Video Status] 记录失败到数据库时出错: ${dbError.message}`);
      }

      return res.status(500).json({ success: false, error: finalizeErr.message });
    }

    // succeeded → 写成功记录
    const promptText = (task.content && task.content.prompt) || `taskId=${taskId}`;
    try {
      await addRecord(
        "video",
        promptText,
        {
          task_id: taskId,
          task_type: task.task_type,
          ratio: task.ratio,
          duration: task.duration,
          resolution: task.resolution,
        },
        result.filePath || null,
        result.fileSize || 0,
        "success",
      );
    } catch (dbError) {
      apiLogger.error(`[Video Status] 记录成功到数据库时出错: ${dbError.message}`);
    }

    const duration = Date.now() - startTime;
    apiLogger.info(
      `[Video Status] 成功 | taskId: ${taskId} | 耗时: ${duration}ms | filePath: ${result.filePath}`,
    );

    res.json({ success: true, data: { task, ...result } });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(
      `[Video Status] 查询失败 | taskId: ${taskId} | 耗时: ${duration}ms | 错误: ${error.message}`,
    );
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== DELETE /:taskId 取消或删除 =====
router.delete("/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const startTime = Date.now();

  if (!isValidTaskId(taskId)) {
    return res.status(400).json({ success: false, error: "taskId 格式不合法" });
  }

  apiLogger.info(`[Video Cancel/Delete] 请求 | taskId: ${taskId}`);

  try {
    const result = await cancelOrDeleteVideoTask(taskId);

    const duration = Date.now() - startTime;
    const errorMsg = result.action === "cancelled" ? "cancelled by user" : "deleted";
    apiLogger.info(
      `[Video Cancel/Delete] 成功 | taskId: ${taskId} | action: ${result.action} | 耗时: ${duration}ms`,
    );

    try {
      await addRecord(
        "video",
        `taskId=${taskId}`,
        { task_id: taskId, action: result.action, status: result.status },
        null,
        0,
        "failed",
        errorMsg,
      );
    } catch (dbError) {
      apiLogger.error(`[Video Cancel/Delete] 记录到数据库时出错: ${dbError.message}`);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(
      `[Video Cancel/Delete] 失败 | taskId: ${taskId} | 耗时: ${duration}ms | 错误: ${error.message}`,
    );
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== GET /list 分页查询视频任务 =====
router.get("/list", async (req, res) => {
  const startTime = Date.now();
  const { pageNum, pageSize, status, taskIds, model, taskType } = req.query || {};
  const params = {};
  if (pageNum !== undefined) params.pageNum = Number(pageNum);
  if (pageSize !== undefined) params.pageSize = Number(pageSize);
  if (status !== undefined && status !== "") params.status = String(status);
  if (model !== undefined && model !== "") params.model = String(model);
  if (taskType !== undefined && taskType !== "") params.taskType = String(taskType);
  if (taskIds !== undefined && taskIds !== "") {
    params.taskIds = String(taskIds).split(",").map((s) => s.trim()).filter(Boolean);
  }

  const maskedParams = maskSensitiveData(params);
  apiLogger.info(`[Video List] 请求参数: ${JSON.stringify(maskedParams)}`);

  try {
    const result = await listVideoTasks(params);
    const duration = Date.now() - startTime;
    apiLogger.info(`[Video List] 成功 | 耗时: ${duration}ms | items: ${result.items.length} | total: ${result.total}`);
    res.json({ success: true, data: result });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(`[Video List] 失败 | 耗时: ${duration}ms | 错误: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== POST /enhance-prompt H3-Context-IR 一站式提示词增强 =====
router.post("/enhance-prompt", async (req, res) => {
  const startTime = Date.now();
  const sanitized = sanitizeVideoCreateBody(req.body);
  const maskedBody = maskSensitiveData(sanitized);

  apiLogger.info(`[Video EnhancePrompt] 请求参数: ${JSON.stringify(maskedBody)}`);

  try {
    const params = await resolveMediaParams(sanitized);
    const result = await enhancePrompt(params);

    const duration = Date.now() - startTime;
    apiLogger.info(
      `[Video EnhancePrompt] 成功 | 耗时: ${duration}ms | taskId: ${result.taskId} | prompt长度: ${result.prompt.length}`,
    );

    try {
      await addRecord(
        "video",
        sanitized.prompt || "prompt enhancement",
        { ...maskedBody, task_type: TASK_TYPE.H3_CONTEXT_IR, enhanced_prompt: result.prompt },
        result.prompt, // 兼容 historyService.addRecord：增强后的 prompt 暂存 file_path
        0,
        "success",
      );
    } catch (dbError) {
      apiLogger.error(`[Video EnhancePrompt] 记录成功到数据库时出错: ${dbError.message}`);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(
      `[Video EnhancePrompt] 失败 | 耗时: ${duration}ms | 错误: ${error.message}`,
    );

    try {
      await addRecord(
        "video",
        sanitized.prompt || "prompt enhancement",
        { ...maskedBody, task_type: TASK_TYPE.H3_CONTEXT_IR },
        null,
        0,
        "failed",
        error.message,
      );
    } catch (dbError) {
      apiLogger.error(`[Video EnhancePrompt] 记录失败到数据库时出错: ${dbError.message}`);
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== POST /regenerate 视频再生成 768P -> 2K =====
router.post("/regenerate", async (req, res) => {
  const startTime = Date.now();
  const body = req.body || {};
  const maskedBody = maskSensitiveData(body);

  apiLogger.info(`[Video Regenerate] 请求参数: ${JSON.stringify(maskedBody)}`);

  try {
    const result = await regenerateVideo(body);

    const duration = Date.now() - startTime;
    apiLogger.info(
      `[Video Regenerate] 成功 | 耗时: ${duration}ms | taskId: ${result.taskId} | filePath: ${result.filePath}`,
    );

    try {
      await addRecord(
        "video",
        `regenerate from ${body.sourceTaskId || (body.baseVideo ? "<baseVideo>" : "unknown")}`,
        {
          ...maskedBody,
          task_type: TASK_TYPE.REGENERATION,
          source_task_id: body.sourceTaskId || null,
          base_video: body.baseVideo || null,
        },
        result.filePath || null,
        result.fileSize || 0,
        "success",
      );
    } catch (dbError) {
      apiLogger.error(`[Video Regenerate] 记录成功到数据库时出错: ${dbError.message}`);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(
      `[Video Regenerate] 失败 | 耗时: ${duration}ms | 错误: ${error.message}`,
    );

    try {
      await addRecord(
        "video",
        `regenerate from ${body.sourceTaskId || (body.baseVideo ? "<baseVideo>" : "unknown")}`,
        { ...maskedBody, task_type: TASK_TYPE.REGENERATION },
        null,
        0,
        "failed",
        error.message,
      );
    } catch (dbError) {
      apiLogger.error(`[Video Regenerate] 记录失败到数据库时出错: ${dbError.message}`);
    }

    res.status(500).json({
      success: false,
      error: error.message,
      originalMessage: error.originalMessage,
    });
  }
});

// ===== POST /upload multer 单文件上传到 MiniMax =====
router.post("/upload", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    const startTime = Date.now();
    const file = req.file;

    if (err) {
      const duration = Date.now() - startTime;
      if (err.code === "LIMIT_FILE_SIZE") {
        apiLogger.error(
          `[Video Upload] 失败 | 耗时: ${duration}ms | 错误: 文件大小超过 20MB`,
        );
        return res.status(400).json({ success: false, error: "文件大小不能超过 20MB" });
      }
      apiLogger.error(`[Video Upload] 失败 | 耗时: ${duration}ms | 错误: ${err.message}`);
      return res.status(500).json({ success: false, error: err.message });
    }

    if (!file) {
      return res.status(400).json({ success: false, error: "请上传文件" });
    }

    const body = req.body || {};
    const purpose = body.purpose || "video_reference";
    apiLogger.info(
      `[Video Upload] 请求参数: file=${file.originalname}, size=${file.size}, mimetype=${file.mimetype}, purpose=${purpose}`,
    );

    try {
      const result = await uploadFileToMiniMax(file.path, purpose);
      try {
        fs.unlinkSync(file.path);
      } catch (_) {
        /* 忽略删除失败 */
      }

      const duration = Date.now() - startTime;
      apiLogger.info(
        `[Video Upload] 成功 | 耗时: ${duration}ms | 返回: fileId=${result.fileId}, bytes=${result.bytes}, filename=${result.filename}`,
      );

      res.json({ success: true, data: result });
    } catch (error) {
      const duration = Date.now() - startTime;
      apiLogger.error(
        `[Video Upload] 失败 | 耗时: ${duration}ms | 错误: ${error.message}`,
      );
      try {
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch (_) {
        /* 忽略删除失败 */
      }

      res.status(500).json({ success: false, error: error.message });
    }
  });
});

export default router;
