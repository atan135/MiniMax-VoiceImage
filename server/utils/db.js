import mysql from "mysql2/promise";
import { appLogger } from "./logger.js";

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

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
      type ENUM('voice', 'image') NOT NULL,
      prompt TEXT NOT NULL,
      params JSON,
      file_path VARCHAR(500),
      file_size INT DEFAULT 0,
      status ENUM('success', 'failed') NOT NULL DEFAULT 'success',
      error_msg TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_type (type),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
  `;

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
    conn.release();
    appLogger.info("数据库表 generation_history 已就绪");
  } catch (error) {
    appLogger.error(`数据库初始化失败: ${error.message}`);
    throw error;
  }
}

export { getPool, initDatabase };
