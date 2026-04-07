import { getPool } from "../utils/db.js";
import { apiLogger } from "../utils/logger.js";
import { getAllVoices as fetchVoicesFromAPI } from "./voiceService.js";
import { deleteVoice as deleteVoiceFromAPI } from "./voiceService.js";

/**
 * 初始化音色库表
 */
export async function initVoiceTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS voice_inventory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      voice_id VARCHAR(255) NOT NULL UNIQUE,
      voice_name VARCHAR(255),
      description TEXT,
      source ENUM('system', 'voice_cloning', 'voice_generation') NOT NULL,
      created_time VARCHAR(50),
      synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_source (source)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
  `;

  try {
    const pool = getPool();
    const conn = await pool.getConnection();
    await conn.query(createTableSQL);
    conn.release();
    apiLogger.info("音色库表 voice_inventory 已就绪");
  } catch (error) {
    apiLogger.error(`音色库表初始化失败: ${error.message}`);
    throw error;
  }
}

/**
 * 从API刷新音色列表到数据库
 */
export async function refreshVoicesFromAPI() {
  try {
    const apiData = await fetchVoicesFromAPI();
    const pool = getPool();
    const conn = await pool.getConnection();

    // 清空现有音色（只清空克隆和生成的，系统音色保留）
    await conn.query("DELETE FROM voice_inventory WHERE source IN ('voice_cloning', 'voice_generation')");

    let inserted = 0;

    // 插入系统音色
    for (const v of apiData.systemVoices || []) {
      await conn.execute(
        `INSERT IGNORE INTO voice_inventory (voice_id, voice_name, description, source) VALUES (?, ?, ?, 'system')`,
        [v.voiceId, v.voiceName, JSON.stringify(v.description || [])]
      );
      inserted++;
    }

    // 插入克隆音色
    for (const v of apiData.cloningVoices || []) {
      await conn.execute(
        `INSERT IGNORE INTO voice_inventory (voice_id, voice_name, description, source, created_time) VALUES (?, ?, ?, 'voice_cloning', ?)`,
        [v.voiceId, v.voiceName, JSON.stringify(v.description || []), v.createdTime]
      );
      inserted++;
    }

    // 插入生成音色
    for (const v of apiData.generationVoices || []) {
      await conn.execute(
        `INSERT IGNORE INTO voice_inventory (voice_id, voice_name, description, source, created_time) VALUES (?, ?, ?, 'voice_generation', ?)`,
        [v.voiceId, v.voiceName, JSON.stringify(v.description || []), v.createdTime]
      );
      inserted++;
    }

    conn.release();
    apiLogger.info(`[VoiceInventory] 刷新音色库成功，共插入 ${inserted} 条`);

    return { success: true, count: inserted };
  } catch (error) {
    apiLogger.error(`[VoiceInventory] 刷新音色库失败: ${error.message}`);
    throw error;
  }
}

/**
 * 获取所有音色（从数据库）
 */
export async function getVoicesFromDB() {
  try {
    const [rows] = await getPool().execute(
      "SELECT voice_id, voice_name, description, source, created_time FROM voice_inventory ORDER BY source, voice_id"
    );
    return rows.map(row => ({
      voiceId: row.voice_id,
      voiceName: row.voice_name,
      description: JSON.parse(row.description || '[]'),
      source: row.source,
      createdTime: row.created_time
    }));
  } catch (error) {
    apiLogger.error(`[VoiceInventory] 获取音色库失败: ${error.message}`);
    throw error;
  }
}

/**
 * 删除音色（从数据库和API）
 */
export async function removeVoice(voiceId, source) {
  // 如果是克隆或生成音色，先调用API删除
  if (source === 'voice_cloning' || source === 'voice_generation') {
    try {
      await deleteVoiceFromAPI(voiceId, source);
      apiLogger.info(`[VoiceInventory] API删除音色成功: ${voiceId}`);
    } catch (error) {
      // API删除失败不影响本地删除
      apiLogger.warn(`[VoiceInventory] API删除音色失败（已从本地删除）: ${voiceId}, ${error.message}`);
    }
  }

  // 从本地数据库删除
  try {
    await getPool().execute("DELETE FROM voice_inventory WHERE voice_id = ?", [voiceId]);
    apiLogger.info(`[VoiceInventory] 本地删除音色成功: ${voiceId}`);
    return { success: true };
  } catch (error) {
    apiLogger.error(`[VoiceInventory] 本地删除音色失败: ${error.message}`);
    throw error;
  }
}
