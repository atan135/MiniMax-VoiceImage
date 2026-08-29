import axios from "axios";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import "dotenv/config";
import { maskSensitiveData } from "../utils/logger.js";

const API_KEY = process.env.API_KEY;
const VIDEO_OUTPUT_PATH = process.env.VIDEO_OUTPUT_PATH || "output/video";

// ============================================================
// 常量定义
// ============================================================
const MODEL = "MiniMax-H3";
const RESOLUTION_LIST = ["768P", "2K"];
const DURATION_LIST = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const RATIO_LIST = ["adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];
const TASK_TYPE = {
  GENERATION: "generation",
  H3_CONTEXT_IR: "h3_context_ir",
  REGENERATION: "regeneration",
};
const STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELLED: "cancelled",
};
const MAX_REFERENCE_IMAGE = 9;
const MAX_REFERENCE_VIDEO = 3;
const MAX_REFERENCE_AUDIO = 3;

// ============================================================
// 组装 content 数组
// ============================================================
// 输入项统一约定：
//   - 字符串：直接作为 URL 写入对应 *_url.url（调用方需自行保证已是公网 URL 或 file_id）
//   - 本函数不做文件上传，需要时调用方先调 uploadFileToMiniMax
// firstFrame/lastFrame：可选，标量（字符串）
// referenceImages/Videos/Audios：可选，数组（最多 9/3/3 个）
function buildContent(params = {}) {
  const {
    prompt,
    firstFrame,
    lastFrame,
    referenceImages,
    referenceVideos,
    referenceAudios,
    ratio = "adaptive",
  } = params;

  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("prompt 不能为空");
  }

  const images = Array.isArray(referenceImages) ? referenceImages : [];
  const videos = Array.isArray(referenceVideos) ? referenceVideos : [];
  const audios = Array.isArray(referenceAudios) ? referenceAudios : [];

  if (firstFrame !== undefined && firstFrame !== null && firstFrame !== "") {
    if (typeof firstFrame !== "string") {
      throw new Error("firstFrame 必须是字符串 URL");
    }
  }
  if (lastFrame !== undefined && lastFrame !== null && lastFrame !== "") {
    if (typeof lastFrame !== "string") {
      throw new Error("lastFrame 必须是字符串 URL");
    }
  }

  if (images.length > MAX_REFERENCE_IMAGE) {
    throw new Error(`referenceImages 最多 ${MAX_REFERENCE_IMAGE} 个，实际 ${images.length} 个`);
  }
  if (videos.length > MAX_REFERENCE_VIDEO) {
    throw new Error(`referenceVideos 最多 ${MAX_REFERENCE_VIDEO} 个，实际 ${videos.length} 个`);
  }
  if (audios.length > MAX_REFERENCE_AUDIO) {
    throw new Error(`referenceAudios 最多 ${MAX_REFERENCE_AUDIO} 个，实际 ${audios.length} 个`);
  }

  const hasFirstFrame = Boolean(firstFrame);
  const hasLastFrame = Boolean(lastFrame);
  const hasReference = images.length + videos.length + audios.length > 0;

  // 互斥校验：first_frame/last_frame 与 reference_* 不可混用
  if ((hasFirstFrame || hasLastFrame) && hasReference) {
    throw new Error(
      "first_frame/last_frame 与 reference_image/reference_video/reference_audio 互斥，不能混用",
    );
  }

  // ratio 强制规则：
  // - 含 firstFrame/lastFrame（图生视频）→ adaptive
  // - 纯文本（文生视频）→ 不能为 adaptive
  // - 仅 reference（多模态参考）→ 保留调用方传入的值（默认 adaptive）
  let resolvedRatio = ratio;
  if (hasFirstFrame || hasLastFrame) {
    resolvedRatio = "adaptive";
  } else if (!hasReference) {
    if (!ratio || ratio === "adaptive") {
      throw new Error("文生视频必须显式指定 ratio（不能为 adaptive）");
    }
  }

  const content = [];
  content.push({ type: "text", text: prompt.trim() });

  if (hasFirstFrame) {
    content.push({
      type: "image_url",
      image_url: { url: firstFrame },
      role: "first_frame",
    });
  }
  if (hasLastFrame) {
    content.push({
      type: "image_url",
      image_url: { url: lastFrame },
      role: "last_frame",
    });
  }

  for (const url of images) {
    content.push({
      type: "image_url",
      image_url: { url },
      role: "reference_image",
    });
  }
  for (const url of videos) {
    content.push({
      type: "video_url",
      video_url: { url },
      role: "reference_video",
    });
  }
  for (const url of audios) {
    content.push({
      type: "audio_url",
      audio_url: { url },
      role: "reference_audio",
    });
  }

  return {
    content,
    ratio: resolvedRatio,
    hasFirstFrame,
    hasLastFrame,
    hasReference,
  };
}

// ============================================================
// 校验 content 数组
// ============================================================
function validateContent(content) {
  if (!Array.isArray(content) || content.length === 0) {
    throw new Error("content 必须是非空数组");
  }

  let textCount = 0;
  let firstFrameCount = 0;
  let lastFrameCount = 0;
  let refImageCount = 0;
  let refVideoCount = 0;
  let refAudioCount = 0;
  let hasFrame = false;
  let hasReference = false;

  for (const item of content) {
    if (!item || typeof item !== "object") {
      throw new Error("content 元素必须是对象");
    }

    switch (item.type) {
      case "text": {
        if (typeof item.text !== "string" || !item.text.trim()) {
          throw new Error("content.text 必须是非空字符串");
        }
        textCount += 1;
        break;
      }
      case "image_url": {
        if (!item.image_url || typeof item.image_url.url !== "string" || !item.image_url.url) {
          throw new Error("content.image_url.url 不能为空");
        }
        if (item.role === "first_frame") {
          firstFrameCount += 1;
          hasFrame = true;
        } else if (item.role === "last_frame") {
          lastFrameCount += 1;
          hasFrame = true;
        } else if (item.role === "reference_image" || item.role === undefined) {
          refImageCount += 1;
          hasReference = true;
        } else {
          throw new Error(`image_url 不支持的 role: ${item.role}`);
        }
        break;
      }
      case "video_url": {
        if (!item.video_url || typeof item.video_url.url !== "string" || !item.video_url.url) {
          throw new Error("content.video_url.url 不能为空");
        }
        if (item.role === "reference_video" || item.role === undefined) {
          refVideoCount += 1;
          hasReference = true;
        } else {
          throw new Error(`video_url 不支持的 role: ${item.role}`);
        }
        break;
      }
      case "audio_url": {
        if (!item.audio_url || typeof item.audio_url.url !== "string" || !item.audio_url.url) {
          throw new Error("content.audio_url.url 不能为空");
        }
        if (item.role === "reference_audio" || item.role === undefined) {
          refAudioCount += 1;
          hasReference = true;
        } else {
          throw new Error(`audio_url 不支持的 role: ${item.role}`);
        }
        break;
      }
      default:
        throw new Error(`content 不支持的 type: ${item.type}`);
    }
  }

  if (textCount !== 1) {
    throw new Error(`content 必须且只能包含 1 个非空 text，实际 ${textCount} 个`);
  }
  if (firstFrameCount > 1) {
    throw new Error(`first_frame 最多 1 个，实际 ${firstFrameCount} 个`);
  }
  if (lastFrameCount > 1) {
    throw new Error(`last_frame 最多 1 个，实际 ${lastFrameCount} 个`);
  }
  if (refImageCount > MAX_REFERENCE_IMAGE) {
    throw new Error(`reference_image 最多 ${MAX_REFERENCE_IMAGE} 个，实际 ${refImageCount} 个`);
  }
  if (refVideoCount > MAX_REFERENCE_VIDEO) {
    throw new Error(`reference_video 最多 ${MAX_REFERENCE_VIDEO} 个，实际 ${refVideoCount} 个`);
  }
  if (refAudioCount > MAX_REFERENCE_AUDIO) {
    throw new Error(`reference_audio 最多 ${MAX_REFERENCE_AUDIO} 个，实际 ${refAudioCount} 个`);
  }
  if (hasFrame && hasReference) {
    throw new Error("first_frame/last_frame 与 reference_image/reference_video/reference_audio 互斥");
  }
}

// ============================================================
// 上传本地文件到 MiniMax
// ============================================================
async function uploadFileToMiniMax(localPath, purpose = "video_reference") {
  if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");
  if (!localPath) throw new Error("文件路径不能为空");
  if (!fs.existsSync(localPath)) throw new Error(`本地文件不存在: ${localPath}`);

  const form = new FormData();
  form.append("purpose", purpose);
  form.append("file", fs.createReadStream(localPath));

  try {
    const response = await axios.post(
      "https://api.minimaxi.com/v1/files/upload",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${API_KEY}`,
        },
        timeout: 120000,
      }
    );

    const resp = response.data;

    if (resp && resp.base_resp && resp.base_resp.status_code !== 0) {
      throw new Error(`API 错误: ${resp.base_resp.status_msg}`);
    }

    const file = resp?.file || {};
    if (!file.file_id) {
      throw new Error(`上传响应缺少 file_id: ${JSON.stringify(maskSensitiveData(resp))}`);
    }

    return {
      fileId: file.file_id,
      bytes: file.bytes,
      filename: file.filename,
    };
  } catch (error) {
    throw new Error(`上传视频参考文件失败: ${error.message}`);
  }
}

// ============================================================
// 下载并保存视频
// ============================================================
async function downloadVideo(url, saveName) {
  if (!url) throw new Error("视频 URL 不能为空");
  if (!saveName) throw new Error("保存文件名不能为空");

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 60000,
  });

  if (!fs.existsSync(VIDEO_OUTPUT_PATH)) {
    fs.mkdirSync(VIDEO_OUTPUT_PATH, { recursive: true });
  }

  const savePath = path.join(VIDEO_OUTPUT_PATH, saveName);
  const buffer = Buffer.from(response.data);
  fs.writeFileSync(savePath, buffer);

  return {
    filePath: savePath,
    fileSize: buffer.length,
  };
}

// ============================================================
// 提取上游错误信息（兼容 V1 base_resp 与 V2 OAI 错误信封）
// ============================================================
function extractUpstreamErrorMessage(err) {
  const data = err && err.response && err.response.data;
  if (data) {
    if (data.error && typeof data.error.message === "string" && data.error.message) {
      return data.error.message;
    }
    if (data.base_resp && data.base_resp.status_msg) {
      return data.base_resp.status_msg;
    }
  }
  return (err && err.message) || String(err);
}

// 校验公共字段：model/resolution/duration/ratio/aigc_watermark
function assertCommonParams(params, { requireResolution }) {
  if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");
  if (!params || typeof params !== "object") throw new Error("params 不能为空");
  if (params.model !== undefined && params.model !== MODEL) {
    throw new Error(`model 必须为 "${MODEL}"`);
  }
  if (requireResolution && !RESOLUTION_LIST.includes(params.resolution)) {
    throw new Error(`resolution 必须是 ${RESOLUTION_LIST.join("/")} 之一`);
  }
  if (params.duration !== undefined && !DURATION_LIST.includes(params.duration)) {
    throw new Error(`duration 必须是 ${DURATION_LIST[0]}-${DURATION_LIST[DURATION_LIST.length - 1]} 之间的整数`);
  }
  if (params.ratio !== undefined && !RATIO_LIST.includes(params.ratio)) {
    throw new Error(`ratio 必须是 ${RATIO_LIST.join("/")} 之一`);
  }
  if (params.aigc_watermark !== undefined && typeof params.aigc_watermark !== "boolean") {
    throw new Error("aigc_watermark 必须是 boolean");
  }
}

// ============================================================
// 创建视频生成任务
// ============================================================
async function createVideoTask(params = {}) {
  if (typeof params.prompt !== "string" || !params.prompt.trim()) {
    throw new Error("prompt 不能为空");
  }
  assertCommonParams(params, { requireResolution: true });

  if (!params.resolution) throw new Error("resolution 不能为空");
  if (!DURATION_LIST.includes(params.duration)) {
    throw new Error("duration 不能为空，且必须是 4-15 之间的整数");
  }
  if (!RATIO_LIST.includes(params.ratio)) {
    throw new Error("ratio 不能为空，且必须在枚举内");
  }

  let content;
  if (Array.isArray(params.content)) {
    content = params.content;
  } else if (
    params.prompt !== undefined ||
    params.firstFrame !== undefined ||
    params.lastFrame !== undefined ||
    params.referenceImages !== undefined ||
    params.referenceVideos !== undefined ||
    params.referenceAudios !== undefined
  ) {
    const built = buildContent({
      prompt: params.prompt,
      firstFrame: params.firstFrame,
      lastFrame: params.lastFrame,
      referenceImages: params.referenceImages,
      referenceVideos: params.referenceVideos,
      referenceAudios: params.referenceAudios,
      ratio: params.ratio,
    });
    content = built.content;
    if (params.ratio === undefined) params.ratio = built.ratio;
  } else {
    throw new Error("必须提供 prompt 与结构化字段，或直接提供 content 数组");
  }
  validateContent(content);

  const payload = {
    model: MODEL,
    content,
    resolution: params.resolution,
    duration: params.duration,
    ratio: params.ratio,
  };
  if (params.callback_url) payload.callback_url = params.callback_url;
  if (typeof params.aigc_watermark === "boolean") payload.aigc_watermark = params.aigc_watermark;

  try {
    const response = await axios.post(
      "https://api.minimaxi.com/v2/video_generation",
      payload,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const resp = response.data;
    if (resp && resp.type === "error" && resp.error) {
      throw new Error(resp.error.message);
    }
    if (!resp || !resp.task_id) {
      throw new Error("响应缺少 task_id");
    }
    return { taskId: resp.task_id };
  } catch (err) {
    throw new Error(`视频任务创建失败: ${extractUpstreamErrorMessage(err)}`);
  }
}

// ============================================================
// 创建 H3-Context-IR 提示词增强任务
// ============================================================
async function createH3ContextIRTask(params = {}) {
  if (typeof params.prompt !== "string" || !params.prompt.trim()) {
    throw new Error("prompt 不能为空");
  }
  assertCommonParams(params, { requireResolution: false });

  if (!DURATION_LIST.includes(params.duration)) {
    throw new Error("duration 不能为空，且必须是 4-15 之间的整数");
  }
  if (!RATIO_LIST.includes(params.ratio)) {
    throw new Error("ratio 不能为空，且必须在枚举内");
  }

  let content;
  if (Array.isArray(params.content)) {
    content = params.content;
  } else if (
    params.prompt !== undefined ||
    params.firstFrame !== undefined ||
    params.lastFrame !== undefined ||
    params.referenceImages !== undefined ||
    params.referenceVideos !== undefined ||
    params.referenceAudios !== undefined
  ) {
    const built = buildContent({
      prompt: params.prompt,
      firstFrame: params.firstFrame,
      lastFrame: params.lastFrame,
      referenceImages: params.referenceImages,
      referenceVideos: params.referenceVideos,
      referenceAudios: params.referenceAudios,
      ratio: params.ratio,
    });
    content = built.content;
    if (params.ratio === undefined) params.ratio = built.ratio;
  } else {
    throw new Error("必须提供 prompt 与结构化字段，或直接提供 content 数组");
  }
  validateContent(content);

  const payload = {
    model: MODEL,
    content,
    duration: params.duration,
    ratio: params.ratio,
  };
  if (params.callback_url) payload.callback_url = params.callback_url;

  try {
    const response = await axios.post(
      "https://api.minimaxi.com/v2/h3_context_ir",
      payload,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const resp = response.data;
    if (resp && resp.type === "error" && resp.error) {
      throw new Error(resp.error.message);
    }
    if (!resp || !resp.task_id) {
      throw new Error("响应缺少 task_id");
    }
    return { taskId: resp.task_id };
  } catch (err) {
    throw new Error(`H3-Context-IR 任务创建失败: ${extractUpstreamErrorMessage(err)}`);
  }
}

// ============================================================
// 创建视频再生成任务（768P -> 2K）
// ============================================================
async function createRegenerationTask(params = {}) {
  assertCommonParams(params, { requireResolution: true });

  if (!params.resolution) throw new Error("resolution 不能为空");

  const hasSourceTaskId = typeof params.source_task_id === "string" && params.source_task_id.length > 0;
  const content = Array.isArray(params.content) ? params.content : null;

  if (!hasSourceTaskId && !content) {
    throw new Error("必须提供 source_task_id，或包含 base_video 的 content 数组");
  }
  if (hasSourceTaskId && content) {
    throw new Error("source_task_id 与 content 只能二选一");
  }

  if (content) {
    let hasBaseVideo = false;
    for (const item of content) {
      if (item && item.type === "video_url" && item.role === "base_video") {
        hasBaseVideo = true;
        break;
      }
    }
    if (!hasBaseVideo) {
      throw new Error("按源视频模式时，content 必须包含 role=base_video 的 video_url 元素");
    }
  }

  const payload = {
    model: MODEL,
    resolution: params.resolution,
  };
  if (hasSourceTaskId) payload.source_task_id = params.source_task_id;
  if (content) payload.content = content;
  if (params.callback_url) payload.callback_url = params.callback_url;
  if (typeof params.aigc_watermark === "boolean") payload.aigc_watermark = params.aigc_watermark;

  try {
    const response = await axios.post(
      "https://api.minimaxi.com/v2/video_regeneration",
      payload,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const resp = response.data;
    if (resp && resp.type === "error" && resp.error) {
      throw new Error(resp.error.message);
    }
    if (!resp || !resp.task_id) {
      throw new Error("响应缺少 task_id");
    }
    return { taskId: resp.task_id };
  } catch (err) {
    throw new Error(`视频再生成任务创建失败: ${extractUpstreamErrorMessage(err)}`);
  }
}



// ============================================================
// 查询任务
// ============================================================
async function queryVideoTask(taskId) {
  if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");
  if (!taskId) throw new Error("taskId 不能为空");

  try {
    const response = await axios.get(
      `https://api.minimaxi.com/v2/query/video_generation/${encodeURIComponent(taskId)}`,
      {
        headers: { Authorization: `Bearer ${API_KEY}` },
        timeout: 30000,
      }
    );

    const resp = response.data;
    if (resp && resp.type === "error" && resp.error) {
      throw new Error(resp.error.message);
    }
    if (!resp || !resp.task) {
      throw new Error("响应缺少 task 对象");
    }
    return resp.task;
  } catch (err) {
    throw new Error(`视频任务查询失败: ${extractUpstreamErrorMessage(err)}`);
  }
}

// ============================================================
// 查询任务列表
// ============================================================
const STATUS_VALUES = Object.values(STATUS);
const TASK_TYPE_VALUES = Object.values(TASK_TYPE);

async function listVideoTasks(params = {}) {
  if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");

  const pageNum = params.pageNum !== undefined ? params.pageNum : (params.page_num !== undefined ? params.page_num : 1);
  const pageSize = params.pageSize !== undefined ? params.pageSize : (params.page_size !== undefined ? params.page_size : 20);
  const { status, taskIds, model, taskType } = params;

  if (!Number.isInteger(pageNum) || pageNum < 1) {
    throw new Error("pageNum 必须是 >= 1 的整数");
  }
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new Error("pageSize 必须是 1-100 之间的整数");
  }
  if (status !== undefined && status !== null && status !== "") {
    if (!STATUS_VALUES.includes(status)) {
      throw new Error(`status 必须是 ${STATUS_VALUES.join("/")} 之一`);
    }
  }
  if (taskType !== undefined && taskType !== null && taskType !== "") {
    if (!TASK_TYPE_VALUES.includes(taskType)) {
      throw new Error(`taskType 必须是 ${TASK_TYPE_VALUES.join("/")} 之一`);
    }
  }
  if (taskIds !== undefined && taskIds !== null) {
    if (!Array.isArray(taskIds)) {
      throw new Error("taskIds 必须是字符串数组");
    }
    if (taskIds.length === 0) {
      throw new Error("taskIds 不能为空数组");
    }
    for (const id of taskIds) {
      if (typeof id !== "string" || !id) {
        throw new Error("taskIds 元素必须是非空字符串");
      }
    }
  }
  if (model !== undefined && model !== null && model !== "" && model !== MODEL) {
    throw new Error(`model 必须是 ${MODEL}`);
  }

  const queryParams = { page_num: pageNum, page_size: pageSize };
  const filter = {};
  if (status) filter.status = status;
  if (taskType) filter.task_type = taskType;
  if (model) filter.model = model;
  if (taskIds) filter.task_ids = taskIds;
  if (Object.keys(filter).length > 0) queryParams.filter = filter;

  try {
    const response = await axios.get(
      "https://api.minimaxi.com/v2/query/video_generation",
      {
        headers: { Authorization: `Bearer ${API_KEY}` },
        params: queryParams,
        timeout: 30000,
        paramsSerializer: {
          indexes: null,
        },
      }
    );

    const resp = response.data;
    if (resp && resp.type === "error" && resp.error) {
      throw new Error(resp.error.message);
    }
    return {
      items: Array.isArray(resp && resp.items) ? resp.items : [],
      total: typeof (resp && resp.total) === "number" ? resp.total : 0,
    };
  } catch (err) {
    throw new Error(`视频任务列表查询失败: ${extractUpstreamErrorMessage(err)}`);
  }
}

// ============================================================
// 取消或删除任务
// ============================================================
async function cancelOrDeleteVideoTask(taskId) {
  if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");
  if (!taskId) throw new Error("taskId 不能为空");

  try {
    const response = await axios.delete(
      `https://api.minimaxi.com/v2/video_generation/${encodeURIComponent(taskId)}`,
      {
        headers: { Authorization: `Bearer ${API_KEY}` },
        timeout: 30000,
      }
    );

    const resp = response.data;
    if (resp && resp.type === "error" && resp.error) {
      throw new Error(resp.error.message);
    }
    if (!resp || !resp.task_id) {
      throw new Error("响应缺少 task_id");
    }
    return {
      taskId: resp.task_id,
      action: resp.action,
      status: resp.status,
    };
  } catch (err) {
    throw new Error(`视频任务取消/删除失败: ${extractUpstreamErrorMessage(err)}`);
  }
}

// ============================================================
// 轮询工具
// ============================================================
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollUntilDone(taskId, options = {}) {
  const { intervalMs = 3000, timeoutMs = 600000, onUpdate, signal } = options;

  if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");
  if (!taskId) throw new Error("taskId 不能为空");

  const startTime = Date.now();
  let task = null;

  // 首次查询前也允许 abort
  if (signal && signal.aborted) {
    throw new DOMException("aborted", "AbortError");
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (signal && signal.aborted) {
      throw new DOMException("aborted", "AbortError");
    }
    if (Date.now() - startTime > timeoutMs) {
      throw new Error("视频任务轮询超时");
    }

    task = await queryVideoTask(taskId);

    if (task.status === STATUS.SUCCEEDED) {
      return task;
    }
    if (task.status === STATUS.FAILED) {
      const msg = (task.error && task.error.message) || task.status;
      throw new Error(`视频任务失败: ${msg}`);
    }
    if (task.status === STATUS.CANCELLED) {
      throw new Error("视频任务已取消");
    }

    // queued / running：触发 onUpdate 后等待下一轮
    if (typeof onUpdate === "function") {
      try { onUpdate(task); } catch (_) { /* 忽略回调异常，避免影响轮询 */ }
    }

    if (Date.now() - startTime > timeoutMs) {
      throw new Error("视频任务轮询超时");
    }
    if (signal && signal.aborted) {
      throw new DOMException("aborted", "AbortError");
    }
    await sleep(intervalMs);
  }
}

// ============================================================
// 终态任务落盘
// ============================================================
function finalizeTask(task) {
  if (!task || typeof task !== "object") {
    throw new Error("task 不能为空");
  }

  // H3-Context-IR：仅返回增强后的 prompt，不下载文件
  if (task.task_type === TASK_TYPE.H3_CONTEXT_IR) {
    return {
      prompt: task.content && typeof task.content.prompt === "string" ? task.content.prompt : null,
      filePath: null,
      fileSize: 0,
    };
  }

  if (task.status === STATUS.SUCCEEDED) {
    const url = task.content && task.content.url;
    if (!url) throw new Error("视频任务 succeeded 但缺少 content.url");
    // saveName: video_<ts>_<task_id>.mp4，限制长度避免超 Windows 255
    const idPart = String(task.task_id || task.id || "unknown").slice(0, 64);
    const saveName = `video_${Date.now()}_${idPart}.mp4`;
    if (saveName.length > 240) {
      // 极少见：极端长 task_id 时截断
      const trimmed = saveName.slice(0, 236) + ".mp4";
      return downloadVideo(url, trimmed).then((saved) => ({ filePath: saved.filePath, fileSize: saved.fileSize, url }));
    }
    return downloadVideo(url, saveName).then((saved) => ({ filePath: saved.filePath, fileSize: saved.fileSize, url }));
  }

  if (task.status === STATUS.FAILED) {
    const msg = (task.error && task.error.message) || "未知错误";
    throw new Error(`视频生成失败: ${msg}`);
  }
  if (task.status === STATUS.CANCELLED) {
    throw new Error("视频生成已取消");
  }
  throw new Error(`视频任务尚未完成: ${task.status || "unknown"}`);
}



export {
  MODEL,
  RESOLUTION_LIST,
  DURATION_LIST,
  RATIO_LIST,
  TASK_TYPE,
  STATUS,
  MAX_REFERENCE_IMAGE,
  MAX_REFERENCE_VIDEO,
  MAX_REFERENCE_AUDIO,
  VIDEO_OUTPUT_PATH,
  buildContent,
  validateContent,
  uploadFileToMiniMax,
  downloadVideo,
  createVideoTask,
  createH3ContextIRTask,
  createRegenerationTask,
  queryVideoTask,
  listVideoTasks,
  cancelOrDeleteVideoTask,
  pollUntilDone,
  finalizeTask,
};
