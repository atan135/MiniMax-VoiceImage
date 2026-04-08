import { getPool } from "../utils/db.js";
import { apiLogger } from "../utils/logger.js";

/**
 * 添加生成记录
 */
export async function addRecord(type, prompt, params, filePath, fileSize, status, errorMsg = null) {
  const sql = `
    INSERT INTO generation_history (type, prompt, params, file_path, file_size, status, error_msg)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const paramsJson = JSON.stringify(params);

  try {
    const [result] = await getPool().execute(sql, [
      String(type),
      String(prompt || ''),
      paramsJson,
      filePath || null,
      Number(fileSize) || 0,
      String(status),
      errorMsg || null
    ]);
    apiLogger.info(`[History] 添加记录成功 | ID: ${result.insertId} | Type: ${type}`);
    return result.insertId;
  } catch (error) {
    apiLogger.error(`[History] 添加记录失败: ${error.message}`);
    throw error;
  }
}

/**
 * 分页查询记录
 */
export async function getRecords(type = null, page = 1, pageSize = 20) {
  let sql = "SELECT * FROM generation_history";
  let countSql = "SELECT COUNT(*) as total FROM generation_history";
  const params = [];
  const countParams = [];

  if (type) {
    sql += " WHERE type = ?";
    countSql += " WHERE type = ?";
    params.push(type);
    countParams.push(type);
  }

  sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(pageSize, (page - 1) * pageSize);

  try {
    const [rows] = await getPool().execute(sql, params);
    const [countResult] = await getPool().execute(countSql, countParams);
    const total = countResult[0].total;

    return {
      records: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  } catch (error) {
    apiLogger.error(`[History] 查询记录失败: ${error.message}`);
    throw error;
  }
}

/**
 * 根据ID获取单条记录
 */
export async function getRecordById(id) {
  const sql = "SELECT * FROM generation_history WHERE id = ?";

  try {
    const [rows] = await getPool().execute(sql, [id]);
    return rows[0] || null;
  } catch (error) {
    apiLogger.error(`[History] 查询记录详情失败: ${error.message}`);
    throw error;
  }
}
