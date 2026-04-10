import axios from "axios";
import fs from "fs";
import path from "path";
import "dotenv/config";
import { addRecord } from "./historyService.js";

const API_KEY = process.env.API_KEY;
const MUSIC_OUTPUT_PATH = process.env.MUSIC_OUTPUT_PATH || "output/music";

// ============================================================
// 常量定义
// ============================================================
const MODEL_LIST = ["music-2.6", "music-2.5+", "music-2.5"];
const OUTPUT_FORMAT_LIST = ["url", "hex"];
const LYRICS_MODE_LIST = ["write_full_song", "edit"];

// ============================================================
// 任务存储（内存中）
// ============================================================
const musicJobs = new Map();

// ============================================================
// 歌词生成
// ============================================================
export async function generateLyrics(params) {
  const { mode, prompt, lyrics, title } = params;

  if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");
  if (!mode) throw new Error("生成模式不能为空");
  if (mode === "edit" && !lyrics) throw new Error("编辑模式需要提供歌词内容");
  if (prompt && prompt.length > 2000) throw new Error("提示词不能超过 2000 字符");
  if (lyrics && lyrics.length > 3500) throw new Error("歌词不能超过 3500 字符");

  const payload = { mode };
  if (prompt) payload.prompt = prompt;
  if (lyrics) payload.lyrics = lyrics;
  if (title) payload.title = title;

  try {
    const response = await axios.post(
      "https://api.minimaxi.com/v1/lyrics_generation",
      payload,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 120000,
      }
    );

    const resp = response.data;

    if (resp.base_resp && resp.base_resp.status_code !== 0) {
      throw new Error(
        `API 错误: ${resp.base_resp.status_msg} (code: ${resp.base_resp.status_code})`
      );
    }

    return {
      songTitle: resp.song_title,
      styleTags: resp.style_tags,
      lyrics: resp.lyrics,
    };
  } catch (error) {
    throw new Error(`歌词生成失败: ${error.message}`);
  }
}

// ============================================================
// 保存音乐文件
// ============================================================
function saveMusicFile(audioData, format) {
  if (!fs.existsSync(MUSIC_OUTPUT_PATH)) {
    fs.mkdirSync(MUSIC_OUTPUT_PATH, { recursive: true });
  }

  const filename = `music_${Date.now()}.mp3`;
  const savePath = path.join(MUSIC_OUTPUT_PATH, filename);

  let buffer;
  if (format === "url") {
    // url 格式直接保存文本内容
    fs.writeFileSync(savePath, audioData);
    return { filePath: savePath, fileSize: fs.statSync(savePath).size };
  } else {
    // hex 格式转换为二进制
    buffer = Buffer.from(audioData, "hex");
    fs.writeFileSync(savePath, buffer);
    console.log(`音乐已保存: ${savePath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return { filePath: savePath, fileSize: buffer.length };
  }
}

// ============================================================
// 音乐生成（内部异步执行）
// ============================================================
async function executeMusicGeneration(jobId) {
  const job = musicJobs.get(jobId);
  if (!job) return;

  const {
    model = "music-2.6",
    prompt,
    lyrics,
    stream = false,
    output_format = "hex",
    audio_setting,
    aigc_watermark = false,
    lyrics_optimizer = false,
    is_instrumental = false,
  } = job.params;

  try {
    job.status = "processing";
    job.progress = 10;

    if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");
    if (!prompt && !lyrics_optimizer) throw new Error("音乐描述不能为空");
    if (!is_instrumental && !lyrics && !lyrics_optimizer) throw new Error("歌词不能为空（除非是纯音乐或开启歌词优化）");

    if (prompt && prompt.length > 2000) throw new Error("音乐描述不能超过 2000 字符");
    if (lyrics && lyrics.length > 3500) throw new Error("歌词不能超过 3500 字符");

    const payload = {
      model,
      prompt: prompt || "",
      stream,
      output_format,
      aigc_watermark,
      lyrics_optimizer,
      is_instrumental,
    };

    if (lyrics) payload.lyrics = lyrics;
    if (audio_setting) payload.audio_setting = audio_setting;

    job.progress = 30;

    const response = await axios.post(
      "https://api.minimaxi.com/v1/music_generation",
      payload,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 600000, // 10分钟超时
      }
    );

    job.progress = 80;

    const resp = response.data;

    if (resp.base_resp && resp.base_resp.status_code !== 0) {
      throw new Error(
        `API 错误: ${resp.base_resp.status_msg} (code: ${resp.base_resp.status_code})`
      );
    }

    // 保存文件
    const result = {
      audioUrl: null,
      filePath: null,
      audioSize: 0,
    };

    if (output_format === "url" && resp.data?.audio_url) {
      result.audioUrl = resp.data.audio_url;
    } else if (resp.data?.audio) {
      const saved = saveMusicFile(resp.data.audio, output_format);
      result.filePath = saved.filePath;
      result.audioSize = saved.fileSize;
    }

    job.status = "completed";
    job.progress = 100;
    job.result = result;

    // 记录到数据库
    await addRecord(
      "music",
      lyrics || prompt,
      job.maskedParams,
      result.filePath,
      result.audioSize,
      "success"
    );

  } catch (error) {
    job.status = "failed";
    job.error = error.message;

    // 记录失败到数据库
    try {
      await addRecord(
        "music",
        lyrics || prompt,
        job.maskedParams,
        null,
        0,
        "failed",
        error.message
      );
    } catch (dbError) {
      console.error(`[Music] 记录失败到数据库时出错: ${dbError.message}`);
    }
  }
}

// ============================================================
// 创建音乐生成任务（异步）
// ============================================================
export function createMusicJob(params, maskedParams) {
  const jobId = `music_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const job = {
    id: jobId,
    status: "pending",
    progress: 0,
    result: null,
    error: null,
    createdAt: new Date(),
    params: params,
    maskedParams: maskedParams
  };

  musicJobs.set(jobId, job);

  // 异步执行生成
  setImmediate(() => executeMusicGeneration(jobId));

  return jobId;
}

// ============================================================
// 获取任务状态
// ============================================================
export function getMusicJobStatus(jobId) {
  const job = musicJobs.get(jobId);
  if (!job) {
    return null;
  }
  return {
    status: job.status,
    progress: job.progress,
    result: job.result,
    error: job.error
  };
}

// ============================================================
// 同步音乐生成（保留，用于小文件或兼容）
// ============================================================
export async function generateMusic(params) {
  const {
    model = "music-2.6",
    prompt,
    lyrics,
    stream = false,
    output_format = "hex",
    audio_setting,
    aigc_watermark = false,
    lyrics_optimizer = false,
    is_instrumental = false,
  } = params;

  if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");
  if (!prompt && !lyrics_optimizer) throw new Error("音乐描述不能为空");
  if (!is_instrumental && !lyrics && !lyrics_optimizer) throw new Error("歌词不能为空（除非是纯音乐或开启歌词优化）");

  if (prompt && prompt.length > 2000) throw new Error("音乐描述不能超过 2000 字符");
  if (lyrics && lyrics.length > 3500) throw new Error("歌词不能超过 3500 字符");

  const payload = {
    model,
    prompt: prompt || "",
    stream,
    output_format,
    aigc_watermark,
    lyrics_optimizer,
    is_instrumental,
  };

  if (lyrics) payload.lyrics = lyrics;
  if (audio_setting) payload.audio_setting = audio_setting;

  try {
    const response = await axios.post(
      "https://api.minimaxi.com/v1/music_generation",
      payload,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 600000,
      }
    );

    const resp = response.data;

    if (resp.base_resp && resp.base_resp.status_code !== 0) {
      throw new Error(
        `API 错误: ${resp.base_resp.status_msg} (code: ${resp.base_resp.status_code})`
      );
    }

    const result = {
      audioUrl: null,
      filePath: null,
      audioSize: 0,
    };

    if (output_format === "url" && resp.data?.audio_url) {
      result.audioUrl = resp.data.audio_url;
    } else if (resp.data?.audio) {
      const saved = saveMusicFile(resp.data.audio, output_format);
      result.filePath = saved.filePath;
      result.audioSize = saved.fileSize;
    }

    return result;
  } catch (error) {
    throw new Error(`音乐生成失败: ${error.message}`);
  }
}

export { MODEL_LIST, OUTPUT_FORMAT_LIST, LYRICS_MODE_LIST };
