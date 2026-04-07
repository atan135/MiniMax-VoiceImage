import log4js from "log4js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

log4js.configure({
  appenders: {
    console: { type: "console" },
    file: {
      type: "file",
      filename: path.join(__dirname, "../../logs/app.log"),
      maxLogSize: 10 * 1024 * 1024,
      backups: 5,
      compress: true,
    },
    apiFile: {
      type: "file",
      filename: path.join(__dirname, "../../logs/api.log"),
      maxLogSize: 10 * 1024 * 1024,
      backups: 5,
      compress: true,
    },
  },
  categories: {
    default: { appenders: ["console", "file"], level: "info" },
    api: { appenders: ["apiFile"], level: "info" },
  },
});

const apiLogger = log4js.getLogger("api");
const appLogger = log4js.getLogger("default");

// 脱敏函数 - 对API_KEY等敏感字段进行脱敏
function maskSensitiveData(obj, depth = 0) {
  if (depth > 5) return "[Max depth reached]";
  if (!obj || typeof obj !== "object") return obj;

  const sensitiveKeys = ["api_key", "API_KEY", "apiKey", "authorization", "Authorization", "token", "password", "secret"];
  const masked = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in masked) {
    if (masked.hasOwnProperty(key)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(k => lowerKey.includes(k.toLowerCase()))) {
        if (typeof masked[key] === "string" && masked[key].length > 8) {
          masked[key] = masked[key].substring(0, 8) + "..." + masked[key].substring(masked[key].length - 4);
        } else {
          masked[key] = "***";
        }
      } else if (typeof masked[key] === "object" && masked[key] !== null) {
        masked[key] = maskSensitiveData(masked[key], depth + 1);
      }
    }
  }
  return masked;
}

export { apiLogger, appLogger, maskSensitiveData };
