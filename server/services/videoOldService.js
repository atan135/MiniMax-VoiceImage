import axios from "axios";
import fs from "fs";
import path from "path";
import "dotenv/config";
import { appLogger, apiLogger, maskSensitiveData } from "../utils/logger.js";

const API_KEY = process.env.API_KEY;
const V1_BASE_URL = "https://api.minimaxi.com";
const VIDEO_OLD_OUTPUT_PATH = process.env.VIDEO_OLD_OUTPUT_PATH || "output/video_old";

// ============================================================
// 常量定义
// ============================================================
// V1 任务状态枚举（PascalCase，原样透传给上层，由前端/路由层决定是否做语义映射）
const STATUS = {
  PREPARING: "Preparing",
  QUEUEING: "Queueing",
  PROCESSING: "Processing",
  SUCCESS: "Success",
  FAIL: "Fail",
};

const TERMINAL_STATUSES = new Set([STATUS.SUCCESS, STATUS.FAIL]);

// V1 总分辨率枚举（按场景 + 模型再二次过滤）
const RESOLUTION_LIST = ["512P", "720P", "768P", "1080P"];

// V1 时长枚举（按场景 + 模型再二次过滤）
const DURATION_LIST = [6, 10];

// 支持运镜 `[指令]` 的模型白名单（fast_pretreatment 也按此白名单控制）
const FAST_PRETREATMENT_MODELS = new Set([
  "MiniMax-Hailuo-2.3",
  "MiniMax-Hailuo-2.3-Fast",
  "MiniMax-Hailuo-02",
]);

// 15 种运镜指令常量（仅前端用，放在 service 导出方便 options 接口一并下发）
const CAMERA_COMMANDS = [
  "左移",
  "右移",
  "左摇",
  "右摇",
  "推进",
  "拉远",
  "上升",
  "下降",
  "上摇",
  "下摇",
  "变焦推近",
  "变焦拉远",
  "晃动",
  "跟随",
  "固定",
];

// ============================================================
// 模型清单（按场景分支）
// ============================================================
// 每条记录：value=模型名 / label=前端展示名 / resolution=可选分辨率 / duration=可选时长 / supportsCamera=是否支持 [指令]
const MODEL_LIST_T2V = [
  { value: "MiniMax-Hailuo-2.3", label: "Hailuo-2.3（默认）", resolution: ["768P", "1080P"], duration: [6, 10], supportsCamera: true },
  { value: "MiniMax-Hailuo-02", label: "Hailuo-02", resolution: ["512P", "768P", "1080P"], duration: [6, 10], supportsCamera: true },
  { value: "T2V-01-Director", label: "T2V-01-Director（导演版）", resolution: ["720P", "1080P"], duration: [6], supportsCamera: true },
  { value: "T2V-01", label: "T2V-01", resolution: ["720P", "1080P"], duration: [6], supportsCamera: false },
];

const MODEL_LIST_I2V = [
  { value: "MiniMax-Hailuo-2.3", label: "Hailuo-2.3", resolution: ["768P", "1080P"], duration: [6, 10], supportsCamera: true },
  { value: "MiniMax-Hailuo-2.3-Fast", label: "Hailuo-2.3-Fast（速度优化）", resolution: ["768P", "1080P"], duration: [6, 10], supportsCamera: false },
  { value: "MiniMax-Hailuo-02", label: "Hailuo-02", resolution: ["512P", "768P", "1080P"], duration: [6, 10], supportsCamera: true },
  { value: "I2V-01-Director", label: "I2V-01-Director（导演版）", resolution: ["720P", "1080P"], duration: [6], supportsCamera: true },
  { value: "I2V-01-live", label: "I2V-01-live（真人风格）", resolution: ["720P", "1080P"], duration: [6], supportsCamera: false },
  { value: "I2V-01", label: "I2V-01", resolution: ["720P", "1080P"], duration: [6], supportsCamera: false },
];

const MODEL_LIST_FL2V = [
  // 首尾帧仅 MiniMax-Hailuo-02 支持；不支持 512P（V1 fl2v.md 明确说明）
  { value: "MiniMax-Hailuo-02", label: "Hailuo-02（首尾帧）", resolution: ["768P", "1080P"], duration: [6, 10], supportsCamera: false },
];

const MODEL_LIST_S2V = [
  // S2V-01 文档未列分辨率 / 时长枚举，按主 agent 阶段 2 决策用 720P / 6s 占位；若实测不符再调整
  { value: "S2V-01", label: "S2V-01（主体参考）", resolution: ["720P"], duration: [6], supportsCamera: false },
];

// ============================================================
// 工具函数
// ============================================================

// 从各场景的 MODEL_LIST 中根据 model value 找到定义；找不到返回 null
function findModelDef(scene, modelValue) {
  const list = getModelListByScene(scene);
  if (!list) return null;
  return list.find((m) => m.value === modelValue) || null;
}

function getModelListByScene(scene) {
  switch (scene) {
    case "t2v":
      return MODEL_LIST_T2V;
    case "i2v":
      return MODEL_LIST_I2V;
    case "fl2v":
      return MODEL_LIST_FL2V;
    case "s2v":
      return MODEL_LIST_S2V;
    default:
      return null;
  }
}

// 判断字符串是否为非空
function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

// URL 或 Base64 Data URL 校验
function isImageSource(v) {
  if (!isNonEmptyString(v)) return false;
  return /^https?:\/\//i.test(v) || /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(v);
}

// ============================================================
// 提取上游错误信息
// ============================================================
// 复用 videoService.js 同款提取逻辑，优先抓 V1 的 base_resp.status_msg / status_code
export function extractUpstreamErrorMessage(error) {
  if (!error) return "未知错误";

  // axios 响应错误：error.response.data.base_resp
  if (error.response && error.response.data) {
    const data = error.response.data;
    if (data.base_resp && typeof data.base_resp.status_msg === "string" && data.base_resp.status_msg) {
      const code = data.base_resp.status_code;
      return code !== undefined ? `${data.base_resp.status_msg} (${code})` : data.base_resp.status_msg;
    }
    // 兜底：HTTP 200 但上游给了非零 base_resp（已由 v1Request 提前抛错，到这里通常不会）
    if (data.message) return String(data.message);
  }

  // axios 错误信息
  if (typeof error.message === "string" && error.message) {
    // 过滤掉 axios 自带的 "Request failed with status code xxx"
    if (/Request failed with status code \d+/.test(error.message)) {
      return "上游请求失败";
    }
    return error.message;
  }

  return "未知错误";
}

// ============================================================
// 统一 HTTP 请求封装
// ============================================================
async function v1Request({ method = "GET", url, params, data, timeout = 120000 }) {
  if (!API_KEY) {
    throw new Error("API_KEY 未配置，请检查 .env 文件");
  }

  const config = {
    method,
    url: `${V1_BASE_URL}${url}`,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout,
  };
  if (params !== undefined) config.params = params;
  if (data !== undefined) config.data = data;

  const startTime = Date.now();
  apiLogger.info(`[VideoOld ${method}] ${url} | request: ${JSON.stringify(maskSensitiveData(data || params || {}))}`);

  try {
    const response = await axios(config);
    const duration = Date.now() - startTime;
    apiLogger.info(`[VideoOld ${method}] ${url} | 耗时: ${duration}ms | 状态: ${response.status}`);
    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(`[VideoOld ${method}] ${url} | 耗时: ${duration}ms | 错误: ${extractUpstreamErrorMessage(error)}`);
    throw error;
  }
}

// ============================================================
// 入参白名单校验（按场景）
// ============================================================
function assertVideoOldParams(params, scene) {
  if (!params || typeof params !== "object") {
    throw new Error("参数不能为空");
  }

  const modelList = getModelListByScene(scene);
  if (!modelList) {
    throw new Error(`不支持的场景: ${scene}`);
  }

  const { model, prompt, resolution, duration } = params;
  const def = findModelDef(scene, model);

  if (!def) {
    throw new Error(`模型 ${model} 不在 ${scene} 场景白名单内`);
  }

  // resolution / duration 必须在该模型允许范围内
  if (resolution !== undefined && resolution !== null && resolution !== "") {
    if (!def.resolution.includes(resolution)) {
      throw new Error(`模型 ${model} 不支持分辨率 ${resolution}，仅支持 ${def.resolution.join("/")}`);
    }
  }
  if (duration !== undefined && duration !== null && duration !== "") {
    if (!def.duration.includes(Number(duration))) {
      throw new Error(`模型 ${model} 不支持时长 ${duration}s，仅支持 ${def.duration.join("/")}s`);
    }
  }

  // 场景必填字段
  if (scene === "i2v") {
    if (!isImageSource(params.first_frame_image)) {
      throw new Error("i2v 场景必须提供 first_frame_image（URL 或 Base64 Data URL）");
    }
  } else if (scene === "fl2v") {
    if (!isImageSource(params.first_frame_image)) {
      throw new Error("fl2v 场景必须提供 first_frame_image");
    }
    if (!isImageSource(params.last_frame_image)) {
      throw new Error("fl2v 场景必须提供 last_frame_image");
    }
  } else if (scene === "s2v") {
    const refs = params.subject_reference;
    if (!Array.isArray(refs) || refs.length === 0) {
      throw new Error("s2v 场景必须提供 subject_reference[]（至少 1 项）");
    }
    const ref = refs[0];
    if (!ref || ref.type !== "character") {
      throw new Error("s2v 场景 subject_reference[0].type 仅支持 'character'");
    }
    if (!Array.isArray(ref.image) || ref.image.length === 0 || !isImageSource(ref.image[0])) {
      throw new Error("s2v 场景 subject_reference[0].image[0] 必须为 URL 或 Base64 Data URL");
    }
  }

  // t2v / i2v / fl2v / s2v 都允许 prompt 可选，但显式校验类型
  if (prompt !== undefined && prompt !== null && prompt !== "") {
    if (typeof prompt !== "string") {
      throw new Error("prompt 必须是字符串");
    }
    if (prompt.length > 2000) {
      throw new Error(`prompt 最大 2000 字符，实际 ${prompt.length}`);
    }
  }

  return def;
}

// ============================================================
// 请求体组装（白名单 + 模型约束）
// ============================================================
// 只透传上游文档允许的字段；丢弃 callback_url 等敏感 / 不支持的字段
function buildVideoOldRequestBody(params, scene) {
  const def = assertVideoOldParams(params, scene);
  const body = { model: def.value };

  if (isNonEmptyString(params.prompt)) {
    body.prompt = params.prompt.trim();
  }

  if (isImageSource(params.first_frame_image)) {
    body.first_frame_image = params.first_frame_image;
  }
  if (isImageSource(params.last_frame_image)) {
    body.last_frame_image = params.last_frame_image;
  }

  // subject_reference：s2v 专用
  if (scene === "s2v" && Array.isArray(params.subject_reference)) {
    body.subject_reference = params.subject_reference.map((ref) => ({
      type: ref.type,
      image: Array.isArray(ref.image) ? ref.image.filter(isImageSource) : [],
    })).filter((ref) => ref.image.length > 0);
  }

  // prompt_optimizer（V1 通用）
  if (typeof params.prompt_optimizer === "boolean") {
    body.prompt_optimizer = params.prompt_optimizer;
  }

  // fast_pretreatment（仅白名单模型生效；其他模型即使传入也丢弃）
  if (typeof params.fast_pretreatment === "boolean" && FAST_PRETREATMENT_MODELS.has(def.value)) {
    body.fast_pretreatment = params.fast_pretreatment;
  }

  // aigc_watermark
  if (typeof params.aigc_watermark === "boolean") {
    body.aigc_watermark = params.aigc_watermark;
  }

  // duration / resolution
  if (params.duration !== undefined && params.duration !== null && params.duration !== "") {
    body.duration = Number(params.duration);
  }
  if (params.resolution !== undefined && params.resolution !== null && params.resolution !== "") {
    body.resolution = String(params.resolution);
  }

  // 显式丢弃 callback_url（按主 agent 阶段 2 决策，不透传给上游）
  // 显式丢弃 task_id / status / file_id / base_resp 等服务端字段（防止客户端伪造）

  return body;
}

// ============================================================
// 创建任务：4 个场景函数 + 通用入口
// ============================================================
export async function createVideoOldTaskT2V(params = {}) {
  try {
    const body = buildVideoOldRequestBody(params, "t2v");
    const resp = await v1Request({
      method: "POST",
      url: "/v1/video_generation",
      data: body,
      timeout: 120000,
    });
    if (resp.data && resp.data.base_resp && resp.data.base_resp.status_code !== 0) {
      throw new Error(`t2v 创建失败: ${resp.data.base_resp.status_msg || "未知错误"} (${resp.data.base_resp.status_code})`);
    }
    if (!resp.data || !resp.data.task_id) {
      throw new Error("t2v 创建失败: 响应缺少 task_id");
    }
    return { taskId: resp.data.task_id };
  } catch (err) {
    throw new Error(`t2v 创建失败: ${extractUpstreamErrorMessage(err)}`);
  }
}

export async function createVideoOldTaskI2V(params = {}) {
  try {
    const body = buildVideoOldRequestBody(params, "i2v");
    const resp = await v1Request({
      method: "POST",
      url: "/v1/video_generation",
      data: body,
      timeout: 120000,
    });
    if (resp.data && resp.data.base_resp && resp.data.base_resp.status_code !== 0) {
      throw new Error(`i2v 创建失败: ${resp.data.base_resp.status_msg || "未知错误"} (${resp.data.base_resp.status_code})`);
    }
    if (!resp.data || !resp.data.task_id) {
      throw new Error("i2v 创建失败: 响应缺少 task_id");
    }
    return { taskId: resp.data.task_id };
  } catch (err) {
    throw new Error(`i2v 创建失败: ${extractUpstreamErrorMessage(err)}`);
  }
}

export async function createVideoOldTaskFL2V(params = {}) {
  try {
    const body = buildVideoOldRequestBody(params, "fl2v");
    const resp = await v1Request({
      method: "POST",
      url: "/v1/video_generation",
      data: body,
      timeout: 120000,
    });
    if (resp.data && resp.data.base_resp && resp.data.base_resp.status_code !== 0) {
      throw new Error(`fl2v 创建失败: ${resp.data.base_resp.status_msg || "未知错误"} (${resp.data.base_resp.status_code})`);
    }
    if (!resp.data || !resp.data.task_id) {
      throw new Error("fl2v 创建失败: 响应缺少 task_id");
    }
    return { taskId: resp.data.task_id };
  } catch (err) {
    throw new Error(`fl2v 创建失败: ${extractUpstreamErrorMessage(err)}`);
  }
}

export async function createVideoOldTaskS2V(params = {}) {
  try {
    const body = buildVideoOldRequestBody(params, "s2v");
    const resp = await v1Request({
      method: "POST",
      url: "/v1/video_generation",
      data: body,
      timeout: 120000,
    });
    if (resp.data && resp.data.base_resp && resp.data.base_resp.status_code !== 0) {
      throw new Error(`s2v 创建失败: ${resp.data.base_resp.status_msg || "未知错误"} (${resp.data.base_resp.status_code})`);
    }
    if (!resp.data || !resp.data.task_id) {
      throw new Error("s2v 创建失败: 响应缺少 task_id");
    }
    return { taskId: resp.data.task_id };
  } catch (err) {
    throw new Error(`s2v 创建失败: ${extractUpstreamErrorMessage(err)}`);
  }
}

// 通用入口：按 mode 路由到对应创建函数
export async function createVideoOldTask({ mode, ...params } = {}) {
  switch (mode) {
    case "t2v":
      return createVideoOldTaskT2V(params);
    case "i2v":
      return createVideoOldTaskI2V(params);
    case "fl2v":
      return createVideoOldTaskFL2V(params);
    case "s2v":
      return createVideoOldTaskS2V(params);
    default:
      throw new Error(`createVideoOldTask 不支持的 mode: ${mode}`);
  }
}

// ============================================================
// 查询任务状态
// ============================================================
export async function queryVideoOldTask(taskId) {
  if (!isNonEmptyString(taskId)) {
    throw new Error("taskId 不能为空");
  }
  try {
    const resp = await v1Request({
      method: "GET",
      url: "/v1/query/video_generation",
      params: { task_id: taskId },
      timeout: 30000,
    });
    const data = resp.data || {};
    if (data.base_resp && data.base_resp.status_code !== undefined && data.base_resp.status_code !== 0) {
      throw new Error(`查询任务失败: ${data.base_resp.status_msg || "未知错误"} (${data.base_resp.status_code})`);
    }
    return {
      taskId: data.task_id || taskId,
      status: data.status || null,
      fileId: data.file_id != null ? String(data.file_id) : null,
      videoWidth: typeof data.video_width === "number" ? data.video_width : null,
      videoHeight: typeof data.video_height === "number" ? data.video_height : null,
      baseResp: data.base_resp || null,
    };
  } catch (err) {
    throw new Error(`查询任务失败: ${extractUpstreamErrorMessage(err)}`);
  }
}

// ============================================================
// 文件检索：file_id -> download_url
// ============================================================
export async function retrieveVideoOldFile(fileId) {
  if (fileId === undefined || fileId === null || fileId === "") {
    throw new Error("fileId 不能为空");
  }
  try {
    const resp = await v1Request({
      method: "GET",
      url: "/v1/files/retrieve",
      params: { file_id: fileId },
      timeout: 30000,
    });
    const data = resp.data || {};
    if (data.base_resp && data.base_resp.status_code !== undefined && data.base_resp.status_code !== 0) {
      throw new Error(`文件检索失败: ${data.base_resp.status_msg || "未知错误"} (${data.base_resp.status_code})`);
    }
    const file = data.file || {};
    // download_url 有效期 1 小时（V1 download.md 明示），本接口不返回 expiresAt 字段；
    // 路由层如需过期校验可基于 created_at + 3600s 自算，此处仅记录 created_at 备查。
    return {
      downloadUrl: file.download_url || null,
      fileId: file.file_id != null ? String(file.file_id) : String(fileId),
      filename: file.filename || null,
      bytes: typeof file.bytes === "number" ? file.bytes : 0,
      purpose: file.purpose || null,
      createdAt: typeof file.created_at === "number" ? file.created_at : null,
    };
  } catch (err) {
    throw new Error(`文件检索失败: ${extractUpstreamErrorMessage(err)}`);
  }
}

// ============================================================
// 下载视频二进制到本地
// ============================================================
export async function downloadVideo(url, taskId) {
  if (!isNonEmptyString(url)) {
    throw new Error("download url 不能为空");
  }
  if (!isNonEmptyString(taskId)) {
    throw new Error("taskId 不能为空");
  }

  // 自动创建目录
  try {
    if (!fs.existsSync(VIDEO_OLD_OUTPUT_PATH)) {
      fs.mkdirSync(VIDEO_OLD_OUTPUT_PATH, { recursive: true });
    }
  } catch (err) {
    throw new Error(`创建输出目录失败: ${err.message}`);
  }

  const filePath = path.join(VIDEO_OLD_OUTPUT_PATH, `${taskId}.mp4`);

  // pipe 流式下载；结束后校验大小；任一失败 unlink
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filePath);
    let settled = false;
    let streamError = null;

    const cleanup = (err) => {
      if (settled) return;
      settled = true;
      try {
        writer.destroy();
      } catch (_) { /* 忽略 */ }
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (_) { /* 忽略 */ }
      reject(err);
    };

    writer.on("error", (err) => cleanup(err));

    axios({
      method: "get",
      url,
      responseType: "stream",
      timeout: 300000,
    })
      .then((response) => {
        response.data.on("error", (err) => cleanup(err));
        response.data.pipe(writer);
        writer.on("finish", () => {
          if (settled) return;
          settled = true;
          try {
            const stat = fs.statSync(filePath);
            if (stat.size <= 0) {
              try { fs.unlinkSync(filePath); } catch (_) { /* 忽略 */ }
              return reject(new Error("下载失败: 文件大小为 0 字节"));
            }
            apiLogger.info(`[VideoOld Download] 成功 | taskId: ${taskId} | filePath: ${filePath} | size: ${stat.size}`);
            resolve({ filePath, fileSize: stat.size });
          } catch (err) {
            reject(new Error(`下载后校验失败: ${err.message}`));
          }
        });
      })
      .catch((err) => {
        if (!streamError) streamError = err;
        cleanup(new Error(`下载请求失败: ${extractUpstreamErrorMessage(err)}`));
      });
  });
}

export {
  MODEL_LIST_T2V,
  MODEL_LIST_I2V,
  MODEL_LIST_FL2V,
  MODEL_LIST_S2V,
  RESOLUTION_LIST,
  DURATION_LIST,
  STATUS,
  CAMERA_COMMANDS,
};
