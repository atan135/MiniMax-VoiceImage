import express from "express";
import { getRecords, getRecordById } from "../services/historyService.js";
import { apiLogger } from "../utils/logger.js";

const router = express.Router();

// 获取历史记录列表
router.get("/", async (req, res) => {
  try {
    const { type, page = 1, pageSize = 20 } = req.query;
    const result = await getRecords(type, parseInt(page), parseInt(pageSize));
    apiLogger.info(`[History] 查询列表 | Type: ${type || 'all'} | Page: ${page}`);
    res.json({ success: true, data: result });
  } catch (error) {
    apiLogger.error(`[History] 查询失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取单条记录详情
router.get("/:id", async (req, res) => {
  try {
    const record = await getRecordById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: "记录不存在" });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    apiLogger.error(`[History] 查询详情失败: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
