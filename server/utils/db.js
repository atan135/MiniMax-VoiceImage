import mysql from "mysql2/promise";
import { appLogger } from "./logger.js";
import { initVoiceTable } from "../services/voiceInventoryService.js";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// ============================================================
// generation_history.type 枚举值（单一来源）
// 历史模块：voice / image / music / lyrics / video
// 旧版视频生成模块：video_old（阶段 2 新增）
// 后续 historyService / 视频旧版路由校验建议从这里导入，保持一致
// ============================================================
const GENERATION_TYPES = ["voice", "image", "music", "lyrics", "video", "video_old"];

function buildEnumSQL() {
  return GENERATION_TYPES.map((t) => `'${t}'`).join(", ");
}

let pool = null;

// 初始化数据库连接池
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...dbConfig,
      database: process.env.DB_NAME || "minimax",
      charset: "utf8",
    });
  }
  return pool;
}

// 初始化数据库表
async function initDatabase() {
  // 先连接不带数据库创建连接池
  const initPool = mysql.createPool(dbConfig);

  const dbName = process.env.DB_NAME || "minimax";
  const createDbSQL = `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8 COLLATE utf8_unicode_ci;`;

  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.generation_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM(${buildEnumSQL()}) NOT NULL,
      prompt TEXT NOT NULL,
      params JSON,
      file_path MEDIUMTEXT,
      file_size INT DEFAULT 0,
      status ENUM('success', 'failed') NOT NULL DEFAULT 'success',
      error_msg TEXT,
      subtitle MEDIUMTEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_type (type),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
  `;

  // 修改 type 列以支持新增枚举值（如 video_old），并扩大 file_path 字段
  const alterTableSQL = `
    ALTER TABLE \`${dbName}\`.generation_history
    MODIFY COLUMN type ENUM(${buildEnumSQL()}) NOT NULL,
    MODIFY COLUMN file_path MEDIUMTEXT
  `;

  // 阶段 4：单独 ALTER 添加 subtitle 列（避免与已有列冲突，独立 try/catch）
  const alterSubtitleSQL = `ALTER TABLE \`${dbName}\`.generation_history ADD COLUMN subtitle MEDIUMTEXT NULL`;

  try {
    // 创建数据库
    const initConn = await initPool.getConnection();
    await initConn.query(createDbSQL);
    initConn.release();
    appLogger.info(`数据库 ${dbName} 已就绪`);

    // 关闭临时连接池
    await initPool.end();

    // 创建表
    const mainPool = getPool();
    const conn = await mainPool.getConnection();
    await conn.query(createTableSQL);
    appLogger.info("数据库表 generation_history 已就绪");

    // 修改已存在表的 type 列以支持新枚举值（如 video_old）
    try {
      await conn.query(alterTableSQL);
      appLogger.info("数据库表 generation_history.type 列已更新（含 video_old）");
    } catch (error) {
      // 如果列已经是最新或出错，忽略（表可能不存在或已是最新）
      appLogger.info("表 type 列更新检查完成");
    }

    // 阶段 4：为已存在的 generation_history 表添加 subtitle 列（重复添加会被吞掉）
    try {
      await conn.query(alterSubtitleSQL);
      appLogger.info("数据库表 generation_history.subtitle 列已添加");
    } catch (error) {
      appLogger.info("表 subtitle 列更新检查完成");
    }
    conn.release();

    // 初始化音色库表
    await initVoiceTable();
  } catch (error) {
    appLogger.error(`数据库初始化失败: ${error.message}`);
    throw error;
  }
}

export { getPool, initDatabase, GENERATION_TYPES };
