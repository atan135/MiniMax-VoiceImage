import express from "express";
import { textToImage, MODEL_LIST, ASPECT_RATIO_LIST, RESPONSE_FORMAT_LIST, STYLE_LIST } from "../services/imageService.js";
import { addRecord } from "../services/historyService.js";
import { apiLogger, maskSensitiveData } from "../utils/logger.js";

const router = express.Router();

// 获取图片配置选项
router.get("/options", (req, res) => {
  apiLogger.info("[Image] 获取图片配置选项");
  res.json({
    modelList: MODEL_LIST,
    aspectRatioList: ASPECT_RATIO_LIST,
    responseFormatList: RESPONSE_FORMAT_LIST,
    styleList: STYLE_LIST,
  });
});

// 生成图片
router.post("/", async (req, res) => {
  const startTime = Date.now();
  const maskedBody = maskSensitiveData(req.body);

  apiLogger.info(`[Image] 请求参数: ${JSON.stringify(maskedBody)}`);

  try {
    const result = await textToImage(req.body);
    const duration = Date.now() - startTime;

    // 取第一个图片URL作为记录
    const filePath = result.image_urls?.[0] || null;

    // 记录到数据库
    await addRecord(
      "image",
      req.body.prompt,
      maskedBody,
      filePath,
      0,
      "success"
    );

    apiLogger.info(`[Image] 成功 | 耗时: ${duration}ms | ID: ${result.id} | 成功: ${result.success_count} | 失败: ${result.failed_count}`);
    apiLogger.info(`[Image] 图片URLs: ${JSON.stringify(result.image_urls || result.image_base64?.map(() => "[base64 data]"))}`);

    res.json({ success: true, data: result });
  } catch (error) {
    const duration = Date.now() - startTime;
    apiLogger.error(`[Image] 失败 | 耗时: ${duration}ms | 错误: ${error.message}`);

    // 记录失败到数据库
    try {
      await addRecord(
        "image",
        req.body.prompt,
        maskedBody,
        null,
        0,
        "failed",
        error.message
      );
    } catch (dbError) {
      apiLogger.error(`[Image] 记录失败到数据库时出错: ${dbError.message}`);
    }

    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
