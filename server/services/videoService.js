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
};
