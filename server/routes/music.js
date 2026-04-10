import express from "express";
import { generateLyrics, createMusicJob, getMusicJobStatus, MODEL_LIST, OUTPUT_FORMAT_LIST, LYRICS_MODE_LIST } from "../services/musicService.js";
import { addRecord } from "../services/historyService.js";
import { apiLogger, maskSensitiveData } from "../utils/logger.js";

const router = express.Router();

// 获取音乐配置选项
router.get("/options", (req, res) => {
  apiLogger.info("[Music] 获取音乐配置选项");
  res.json({
    modelList: MODEL_LIST,
    outputFormatList: OUTPUT_FORMAT_LIST,
    lyricsModeList: LYRICS_MODE_LIST,
  });
});

// 生成歌词
router.post("/lyrics", async (req, res) => {
  const startTime = Date.now();
  const maskedBody = maskSensitiveData(req.body);

  apiLogger.info(`[Music Lyrics] 请求参数: ${JSON.stringify(maskedBody)}`);

  try {
    const result = await generateLyrics(req.body);
    const duration = Date.now() - startTime;

    // 记录到数据库
    await addRecord(
      "lyrics",
      req.body.prompt || req.body.title || "歌词生成",
      maskedBody,
      result.lyrics, // 歌词内容存储在 file_path 字段
      0,
      "success"
    );

    apiLogger.info(`[Music Lyrics] 成功 | 耗时: ${duration}ms | 歌名: ${result.songTitle}`);
    res.json({ success: true, data: result });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(`[Music Lyrics] 失败 | 耗时: ${duration}ms | 错误: ${error.message}`);

    // 记录失败到数据库
    try {
      await addRecord(
        "lyrics",
        req.body.prompt || "歌词生成",
        maskedBody,
        null,
        0,
        "failed",
        error.message
      );
    } catch (dbError) {
      apiLogger.error(`[Music Lyrics] 记录失败到数据库时出错: ${dbError.message}`);
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

// 创建音乐生成任务（异步）
router.post("/", async (req, res) => {
  const startTime = Date.now();
  const maskedBody = maskSensitiveData(req.body);

  apiLogger.info(`[Music] 请求参数: ${JSON.stringify(maskedBody)}`);

  try {
    // 创建异步任务
    const jobId = createMusicJob(req.body, maskedBody);

    apiLogger.info(`[Music] 任务已创建 | jobId: ${jobId}`);

    res.json({
      success: true,
      data: {
        jobId,
        message: "音乐生成任务已创建，请通过jobId轮询获取结果"
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(`[Music] 创建任务失败 | 耗时: ${duration}ms | 错误: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 轮询任务状态
router.get("/status/:jobId", async (req, res) => {
  const { jobId } = req.params;

  try {
    const status = getMusicJobStatus(jobId);

    if (!status) {
      return res.status(404).json({ success: false, error: "任务不存在" });
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    apiLogger.error(`[Music Status] 查询失败 | jobId: ${jobId} | 错误: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
