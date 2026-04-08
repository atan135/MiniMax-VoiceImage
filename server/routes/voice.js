import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { textToSpeech, getAllVoices, deleteVoice, designVoice, uploadAudioFile, voiceClone, BITRATE_LIST, EMOTION_LIST, LANGUAGE_BOOST_LIST, SAMPLE_RATE_LIST, AUDIO_FORMAT_LIST } from "../services/voiceService.js";
import { refreshVoicesFromAPI, getVoicesFromDB, removeVoice } from "../services/voiceInventoryService.js";
import { addRecord } from "../services/historyService.js";
import { apiLogger, maskSensitiveData } from "../utils/logger.js";

// Configure multer for file uploads
const uploadDir = "output/uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

const router = express.Router();

// 获取音色列表（从数据库）
router.get("/options", async (req, res) => {
  apiLogger.info("获取音色列表");
  try {
    const voices = await getVoicesFromDB();

    const systemVoices = voices.filter(v => v.source === 'system');
    const cloningVoices = voices.filter(v => v.source === 'voice_cloning');
    const generationVoices = voices.filter(v => v.source === 'voice_generation');

    res.json({
      success: true,
      data: {
        systemVoices,
        cloningVoices,
        generationVoices,
        bitrateList: BITRATE_LIST,
        emotionList: EMOTION_LIST,
        languageBoostList: LANGUAGE_BOOST_LIST,
        sampleRateList: SAMPLE_RATE_LIST,
        audioFormatList: AUDIO_FORMAT_LIST,
      }
    });
  } catch (error) {
    apiLogger.error(`获取音色列表失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 刷新音色列表（从API获取并存入数据库）
router.post("/refresh", async (req, res) => {
  apiLogger.info("刷新音色列表");
  try {
    const result = await refreshVoicesFromAPI();
    res.json({ success: true, data: result });
  } catch (error) {
    apiLogger.error(`刷新音色列表失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 音色设计
router.post("/design", async (req, res) => {
  const startTime = Date.now();
  apiLogger.info(`[Voice Design] 请求参数: ${JSON.stringify(maskSensitiveData(req.body))}`);

  try {
    const result = await designVoice(req.body);
    const duration = Date.now() - startTime;
    apiLogger.info(`[Voice Design] 成功 | 耗时: ${duration}ms | voiceId: ${result.voiceId}`);
    res.json({ success: true, data: result });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(`[Voice Design] 失败 | 耗时: ${duration}ms | 错误: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 上传复刻音频
router.post("/upload", upload.single("file"), async (req, res) => {
  const startTime = Date.now();
  const file = req.file;
  const body = req.body;
  apiLogger.info(`[Voice Upload] 请求参数: file=${file?.originalname}, size=${file?.size}, mimetype=${file?.mimetype}, purpose=${body.purpose || 'voice_clone'}`);

  try {
    if (!file) {
      return res.status(400).json({ success: false, error: "请上传音频文件" });
    }

    const purpose = body.purpose || "voice_clone";
    const result = await uploadAudioFile(file.path, purpose);

    // 上传完成后删除临时文件
    fs.unlinkSync(file.path);

    const duration = Date.now() - startTime;
    apiLogger.info(`[Voice Upload] 成功 | 耗时: ${duration}ms | 返回: fileId=${result.fileId}, bytes=${result.bytes}, filename=${result.filename}`);
    res.json({ success: true, data: result });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(`[Voice Upload] 失败 | 耗时: ${duration}ms | 错误: ${error.message}`);
    // 清理临时文件
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// 音色快速复刻
router.post("/clone", async (req, res) => {
  const startTime = Date.now();
  apiLogger.info(`[Voice Clone] 请求参数: ${JSON.stringify(maskSensitiveData(req.body))}`);

  try {
    const result = await voiceClone(req.body);
    const duration = Date.now() - startTime;
    apiLogger.info(`[Voice Clone] 成功 | 耗时: ${duration}ms | voiceId: ${result.voiceId}`);
    res.json({ success: true, data: result });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(`[Voice Clone] 失败 | 耗时: ${duration}ms | 错误: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除音色
router.delete("/:voiceId", async (req, res) => {
  const { voiceId } = req.params;
  const { source } = req.body;

  apiLogger.info(`删除音色: ${voiceId}, 来源: ${source}`);

  try {
    const result = await removeVoice(voiceId, source);
    res.json({ success: true, data: result });
  } catch (error) {
    apiLogger.error(`删除音色失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 生成语音
router.post("/", async (req, res) => {
  const startTime = Date.now();
  const maskedBody = maskSensitiveData(req.body);

  apiLogger.info(`[Voice] 请求参数: ${JSON.stringify(maskedBody)}`);

  try {
    const result = await textToSpeech(req.body);
    const duration = Date.now() - startTime;

    // 记录到数据库
    await addRecord(
      "voice",
      req.body.text,
      maskedBody,
      result.filePath,
      result.audioSize,
      "success"
    );

    // 返回结果脱敏（去掉hex数据）
    const logResult = {
      audioSize: result.audioSize,
      filePath: result.filePath,
      hasAudioHex: !!result.audioHex
    };
    apiLogger.info(`[Voice] 成功 | 耗时: ${duration}ms | 返回: ${JSON.stringify(logResult)}`);

    res.json({ success: true, data: result });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(`[Voice] 失败 | 耗时: ${duration}ms | 错误: ${error.message}`);

    // 记录失败到数据库
    try {
      await addRecord(
        "voice",
        req.body.text,
        maskedBody,
        null,
        0,
        "failed",
        error.message
      );
    } catch (dbError) {
      apiLogger.error(`[Voice] 记录失败到数据库时出错: ${dbError.message}`);
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
