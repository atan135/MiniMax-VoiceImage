import express from "express";
import {
  MODEL_LIST_T2V,
  MODEL_LIST_I2V,
  MODEL_LIST_FL2V,
  MODEL_LIST_S2V,
  RESOLUTION_LIST,
  DURATION_LIST,
  STATUS,
  CAMERA_COMMANDS,
  createVideoOldTaskT2V,
  createVideoOldTaskI2V,
  createVideoOldTaskFL2V,
  createVideoOldTaskS2V,
  queryVideoOldTask,
  retrieveVideoOldFile,
  downloadVideo,
  extractUpstreamErrorMessage,
} from "../services/videoOldService.js";
import { addRecord } from "../services/historyService.js";
import { apiLogger, appLogger } from "../utils/logger.js";

appLogger.info("video_old routes registered");

const router = express.Router();

// ===== 工具函数 =====
const TASK_ID_REGEX = /^[A-Za-z0-9_-]+$/;

function isValidTaskId(id) {
  return typeof id === "string" && id.length > 0 && id.length <= 64 && TASK_ID_REGEX.test(id);
}

// V1 file_id 是 int64；这里放宽到 MAX_SAFE_INTEGER 以兼容上游可能的字符串返回
function isValidFileId(id) {
  const n = typeof id === "string" ? parseInt(id, 10) : id;
  return Number.isFinite(n) && n > 0 && n < Number.MAX_SAFE_INTEGER;
}

// 入参白名单：只透传 service 真正消费的字段 + scene（用于历史 params 标识场景）
// 注意：task_id / file_id / status / base_resp / callback_url 等服务端字段一律丢弃，防止客户端伪造
function sanitizeVideoOldCreateBody(body) {
  const safe = {};
  const allowed = [
    "model",
    "scene",
    "prompt",
    "first_frame_image",
    "last_frame_image",
    "subject_reference",
    "prompt_optimizer",
    "fast_pretreatment",
    "duration",
    "resolution",
    "aigc_watermark",
  ];
  if (!body || typeof body !== "object") return safe;
  for (const key of allowed) {
    if (body[key] !== undefined) safe[key] = body[key];
  }
  return safe;
}

// status 路由写入历史时的 prompt 占位（DB schema 要求 prompt NOT NULL，且 status 路由不持有原始 prompt）
function buildHistoryPromptPlaceholder(taskId, status) {
  return `[task ${taskId}] (${status})`;
}

// ===== GET /options =====
// 返回前端需要的全部选项：模型清单（按场景）、分辨率、时长、状态枚举、运镜指令、场景列表
router.get("/options", (req, res) => {
  apiLogger.info("[VideoOld Options] 获取旧版视频配置选项");
  res.json({
    models: {
      t2v: MODEL_LIST_T2V,
      i2v: MODEL_LIST_I2V,
      fl2v: MODEL_LIST_FL2V,
      s2v: MODEL_LIST_S2V,
    },
    resolutions: RESOLUTION_LIST,
    durations: DURATION_LIST,
    status: STATUS,
    cameraCommands: CAMERA_COMMANDS,
    scenes: ["t2v", "i2v", "fl2v", "s2v"],
  });
});

// ===== POST /t2v =====
router.post("/t2v", async (req, res) => {
  const sanitized = sanitizeVideoOldCreateBody(req.body);
  apiLogger.info(`[VideoOld t2v] 请求参数: ${JSON.stringify(sanitized)}`);
  try {
    const result = await createVideoOldTaskT2V(sanitized);
    apiLogger.info(`[VideoOld t2v] 任务已创建 | taskId: ${result.taskId}`);
    res.json({ success: true, data: { taskId: result.taskId } });
  } catch (error) {
    const msg = extractUpstreamErrorMessage(error);
    apiLogger.error(`[VideoOld t2v] 失败 | 错误: ${msg}`);
    try {
      await addRecord(
        "video_old",
        sanitized.prompt || "t2v generation",
        { ...sanitized, error_stage: "create" },
        null,
        0,
        "failed",
        msg,
      );
    } catch (dbError) {
      apiLogger.error(`[VideoOld t2v] 记录失败到数据库时出错: ${dbError.message}`);
    }
    res.status(500).json({ success: false, error: msg });
  }
});

// ===== POST /i2v =====
router.post("/i2v", async (req, res) => {
  const sanitized = sanitizeVideoOldCreateBody(req.body);
  apiLogger.info(`[VideoOld i2v] 请求参数: ${JSON.stringify(sanitized)}`);
  try {
    const result = await createVideoOldTaskI2V(sanitized);
    apiLogger.info(`[VideoOld i2v] 任务已创建 | taskId: ${result.taskId}`);
    res.json({ success: true, data: { taskId: result.taskId } });
  } catch (error) {
    const msg = extractUpstreamErrorMessage(error);
    apiLogger.error(`[VideoOld i2v] 失败 | 错误: ${msg}`);
    try {
      await addRecord(
        "video_old",
        sanitized.prompt || "i2v generation",
        { ...sanitized, error_stage: "create" },
        null,
        0,
        "failed",
        msg,
      );
    } catch (dbError) {
      apiLogger.error(`[VideoOld i2v] 记录失败到数据库时出错: ${dbError.message}`);
    }
    res.status(500).json({ success: false, error: msg });
  }
});

// ===== POST /fl2v =====
router.post("/fl2v", async (req, res) => {
  const sanitized = sanitizeVideoOldCreateBody(req.body);
  apiLogger.info(`[VideoOld fl2v] 请求参数: ${JSON.stringify(sanitized)}`);
  try {
    const result = await createVideoOldTaskFL2V(sanitized);
    apiLogger.info(`[VideoOld fl2v] 任务已创建 | taskId: ${result.taskId}`);
    res.json({ success: true, data: { taskId: result.taskId } });
  } catch (error) {
    const msg = extractUpstreamErrorMessage(error);
    apiLogger.error(`[VideoOld fl2v] 失败 | 错误: ${msg}`);
    try {
      await addRecord(
        "video_old",
        sanitized.prompt || "fl2v generation",
        { ...sanitized, error_stage: "create" },
        null,
        0,
        "failed",
        msg,
      );
    } catch (dbError) {
      apiLogger.error(`[VideoOld fl2v] 记录失败到数据库时出错: ${dbError.message}`);
    }
    res.status(500).json({ success: false, error: msg });
  }
});

// ===== POST /s2v =====
router.post("/s2v", async (req, res) => {
  const sanitized = sanitizeVideoOldCreateBody(req.body);
  apiLogger.info(`[VideoOld s2v] 请求参数: ${JSON.stringify(sanitized)}`);
  try {
    const result = await createVideoOldTaskS2V(sanitized);
    apiLogger.info(`[VideoOld s2v] 任务已创建 | taskId: ${result.taskId}`);
    res.json({ success: true, data: { taskId: result.taskId } });
  } catch (error) {
    const msg = extractUpstreamErrorMessage(error);
    apiLogger.error(`[VideoOld s2v] 失败 | 错误: ${msg}`);
    try {
      await addRecord(
        "video_old",
        sanitized.prompt || "s2v generation",
        { ...sanitized, error_stage: "create" },
        null,
        0,
        "failed",
        msg,
      );
    } catch (dbError) {
      apiLogger.error(`[VideoOld s2v] 记录失败到数据库时出错: ${dbError.message}`);
    }
    res.status(500).json({ success: false, error: msg });
  }
});

// ===== GET /status/:taskId =====
// 状态轮询 + Success 时拉文件 + 本地落盘 + 入库
router.get("/status/:taskId", async (req, res) => {
  const { taskId } = req.params;
  if (!isValidTaskId(taskId)) {
    return res.status(400).json({ success: false, error: "taskId 非法" });
  }
  apiLogger.info(`[VideoOld Status] 查询任务 | taskId: ${taskId}`);
  try {
    const task = await queryVideoOldTask(taskId);

    // 仍在跑：不写历史
    if (
      task.status === STATUS.PREPARING ||
      task.status === STATUS.QUEUEING ||
      task.status === STATUS.PROCESSING
    ) {
      return res.json({
        success: true,
        data: {
          taskId: task.taskId,
          status: task.status,
          fileId: task.fileId,
          videoWidth: task.videoWidth,
          videoHeight: task.videoHeight,
        },
      });
    }

    // 失败：写历史 + 502
    if (task.status === STATUS.FAIL) {
      const upstreamError =
        (task.baseResp && task.baseResp.status_msg) ||
        "V1 任务失败，未返回具体错误描述";
      const code = task.baseResp && task.baseResp.status_code;
      const errMsg = code !== undefined ? `${upstreamError} (${code})` : upstreamError;
      apiLogger.error(`[VideoOld Status] 任务失败 | taskId: ${taskId} | ${errMsg}`);
      try {
        await addRecord(
          "video_old",
          buildHistoryPromptPlaceholder(taskId, STATUS.FAIL),
          { taskId, status: STATUS.FAIL, error_stage: "polling" },
          null,
          0,
          "failed",
          errMsg,
        );
      } catch (dbError) {
        apiLogger.error(`[VideoOld Status] 记录失败状态到数据库时出错: ${dbError.message}`);
      }
      return res.status(502).json({ success: false, error: errMsg });
    }

    // 成功：files/retrieve + 下载 + 入库
    if (task.status === STATUS.SUCCESS) {
      if (!task.fileId) {
        const errMsg = "V1 任务成功但未返回 file_id";
        apiLogger.error(`[VideoOld Status] ${errMsg} | taskId: ${taskId}`);
        try {
          await addRecord(
            "video_old",
            buildHistoryPromptPlaceholder(taskId, STATUS.SUCCESS),
            { taskId, status: STATUS.SUCCESS, error_stage: "missing_file_id" },
            null,
            0,
            "failed",
            errMsg,
          );
        } catch (dbError) {
          apiLogger.error(`[VideoOld Status] 记录成功状态到数据库时出错: ${dbError.message}`);
        }
        return res.status(502).json({ success: false, error: errMsg });
      }
      const file = await retrieveVideoOldFile(task.fileId);
      if (!file.downloadUrl) {
        const errMsg = "V1 files/retrieve 未返回 download_url";
        apiLogger.error(`[VideoOld Status] ${errMsg} | taskId: ${taskId} | fileId: ${task.fileId}`);
        try {
          await addRecord(
            "video_old",
            buildHistoryPromptPlaceholder(taskId, STATUS.SUCCESS),
            { taskId, status: STATUS.SUCCESS, error_stage: "missing_download_url" },
            null,
            0,
            "failed",
            errMsg,
          );
        } catch (dbError) {
          apiLogger.error(`[VideoOld Status] 记录成功状态到数据库时出错: ${dbError.message}`);
        }
        return res.status(502).json({ success: false, error: errMsg });
      }
      const dl = await downloadVideo(file.downloadUrl, taskId);
      apiLogger.info(
        `[VideoOld Status] 任务成功 | taskId: ${taskId} | filePath: ${dl.filePath} | size: ${dl.fileSize}`,
      );
      try {
        await addRecord(
          "video_old",
          buildHistoryPromptPlaceholder(taskId, STATUS.SUCCESS),
          {
            taskId,
            status: STATUS.SUCCESS,
            fileId: task.fileId,
            videoWidth: task.videoWidth,
            videoHeight: task.videoHeight,
          },
          dl.filePath,
          dl.fileSize,
          "success",
        );
      } catch (dbError) {
        apiLogger.error(`[VideoOld Status] 记录成功状态到数据库时出错: ${dbError.message}`);
      }
      return res.json({
        success: true,
        data: {
          taskId: task.taskId,
          status: task.status,
          fileId: task.fileId,
          filePath: dl.filePath,
          fileSize: dl.fileSize,
          videoWidth: task.videoWidth,
          videoHeight: task.videoHeight,
        },
      });
    }

    // 兜底：未知 status（理论上 V1 只有 5 种枚举值）
    return res.status(502).json({
      success: false,
      error: `未知的 V1 任务状态: ${task.status}`,
    });
  } catch (error) {
    const msg = extractUpstreamErrorMessage(error);
    apiLogger.error(`[VideoOld Status] 失败 | taskId: ${taskId} | 错误: ${msg}`);
    res.status(502).json({ success: false, error: msg });
  }
});

// ===== GET /files/:fileId =====
// 单独暴露文件检索端点，方便前端拿到 download_url（用于重下或单独 retry）
router.get("/files/:fileId", async (req, res) => {
  const { fileId } = req.params;
  if (!isValidFileId(fileId)) {
    return res.status(400).json({ success: false, error: "fileId 非法" });
  }
  apiLogger.info(`[VideoOld Files] 检索文件 | fileId: ${fileId}`);
  try {
    const file = await retrieveVideoOldFile(fileId);
    res.json({
      success: true,
      data: {
        downloadUrl: file.downloadUrl,
        fileId: file.fileId,
        expiresHint: "1 hour",
      },
    });
  } catch (error) {
    const msg = extractUpstreamErrorMessage(error);
    apiLogger.error(`[VideoOld Files] 失败 | fileId: ${fileId} | 错误: ${msg}`);
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;
