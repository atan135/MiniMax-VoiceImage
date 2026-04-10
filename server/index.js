import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import voiceRouter from "./routes/voice.js";
import imageRouter from "./routes/image.js";
import musicRouter from "./routes/music.js";
import historyRouter from "./routes/history.js";
import { appLogger, maskSensitiveData } from "./utils/logger.js";
import { initDatabase } from "./utils/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function(body) {
    const duration = Date.now() - start;
    const maskedBody = body ? maskSensitiveData(JSON.parse(body)) : null;

    if (req.originalUrl.includes("/api/")) {
      appLogger.info(`[${req.method}] ${req.originalUrl} | ${res.statusCode} | ${duration}ms`);
    }

    return originalSend.call(this, body);
  };

  next();
});

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// 静态文件服务 - 用于播放音频
app.use("/output", express.static(path.join(__dirname, "../output")));

// Routes
app.use("/api/voice", voiceRouter);
app.use("/api/image", imageRouter);
app.use("/api/music", musicRouter);
app.use("/api/history", historyRouter);

// Health check
app.get("/api/health", (req, res) => {
  appLogger.info("[Health] 健康检查");
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  appLogger.warn(`[404] ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, error: "Not found" });
});

// Error handling
app.use((err, req, res, next) => {
  appLogger.error(`[Error] ${err.message}\n${err.stack}`);
  res.status(500).json({ success: false, error: err.message });
});

// 初始化数据库并启动服务器
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      appLogger.info(`Server running on http://localhost:${PORT}`);
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    appLogger.error(`启动服务器失败: ${error.message}`);
    console.error(`启动服务器失败: ${error.message}`);
    process.exit(1);
  }
}

startServer();
