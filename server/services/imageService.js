import axios from "axios";
import fs from "fs";
import path from "path";
import "dotenv/config";

const API_KEY = process.env.API_KEY;
const DEFAULT_MODEL = "image-01";
const IMAGE_OUTPUT_PATH = process.env.IMAGE_OUTPUT_PATH || "output/image";

// ============================================================
// 参数选项
// ============================================================
const MODEL_LIST = ["image-01", "image-01-live"];
const ASPECT_RATIO_LIST = ["1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9"];
const RESPONSE_FORMAT_LIST = ["url", "base64"];
const STYLE_LIST = ["realness", "hd", "anime", "illustration", "3d"];

// ============================================================
// 下载并保存图片
// ============================================================
async function downloadAndSaveImage(url, index) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 60000,
  });

  // 从URL中提取扩展名
  let ext = "png";
  try {
    const urlPath = new URL(url).pathname;
    const match = urlPath.match(/\.([^.]+)$/);
    if (match) ext = match[1];
  } catch {}

  const filename = `image_${Date.now()}_${index}.${ext}`;
  const savePath = path.join(IMAGE_OUTPUT_PATH, filename);
  const dir = path.dirname(savePath);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(savePath, Buffer.from(response.data));
  console.log(`图片已保存: ${savePath}`);

  return { filePath: savePath, fileSize: fs.statSync(savePath).size };
}

function saveBase64Image(base64Data, index) {
  // base64 可能包含 data:image/png;base64, 前缀
  const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  let ext = "png";
  let data = base64Data;

  if (matches) {
    const mimeType = matches[1];
    ext = mimeType.split("/")[1] || "png";
    data = matches[2];
  }

  const filename = `image_${Date.now()}_${index}.${ext}`;
  const savePath = path.join(IMAGE_OUTPUT_PATH, filename);
  const dir = path.dirname(savePath);

  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const buffer = Buffer.from(data, "base64");
  fs.writeFileSync(savePath, buffer);
  console.log(`图片已保存: ${savePath}`);

  return { filePath: savePath, fileSize: buffer.length };
}

// ============================================================
// 图片生成主函数
// ============================================================
export async function textToImage(params) {
  const {
    model = DEFAULT_MODEL,
    prompt,
    n = 1,
    aspect_ratio = "1:1",
    width,
    height,
    response_format = "url",
    seed,
    prompt_optimizer = false,
    aigc_watermark = false,
    style,
  } = params;

  if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");
  if (!prompt) throw new Error("图片描述不能为空");
  if (prompt.length > 1500) throw new Error("图片描述不能超过 1500 字符");
  if (n < 1 || n > 9) throw new Error("生成数量 n 取值范围 1-9");

  const payload = {
    model,
    prompt,
    n,
    aspect_ratio,
    response_format,
    prompt_optimizer,
    aigc_watermark,
  };

  if (width && height) {
    if (width < 512 || width > 2048 || height < 512 || height > 2048) {
      throw new Error("宽度和高度取值范围为 512-2048");
    }
    if (width % 8 !== 0 || height % 8 !== 0) {
      throw new Error("宽度和高度必须是 8 的倍数");
    }
    payload.width = width;
    payload.height = height;
  }

  if (seed !== undefined) payload.seed = seed;
  if (style && model === "image-01-live") payload.style = style;

  const response = await axios.post(
    "https://api.minimaxi.com/v1/image_generation",
    payload,
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 120000,
    },
  );

  const resp = response.data;

  if (resp.base_resp && resp.base_resp.status_code !== 0) {
    throw new Error(
      `API 错误: ${resp.base_resp.status_msg} (code: ${resp.base_resp.status_code})`,
    );
  }

  const result = {
    id: resp.id,
    success_count: resp.metadata?.success_count || 0,
    failed_count: resp.metadata?.failed_count || 0,
    images: [],
  };

  // 下载并保存图片
  if (response_format === "url") {
    const urls = resp.data?.image_urls || [];
    for (let i = 0; i < urls.length; i++) {
      try {
        const saved = await downloadAndSaveImage(urls[i], i);
        result.images.push(saved);
      } catch (err) {
        console.error(`下载图片失败: ${urls[i]}, 错误: ${err.message}`);
      }
    }
  } else {
    const base64List = resp.data?.image_base64 || [];
    for (let i = 0; i < base64List.length; i++) {
      try {
        const saved = saveBase64Image(base64List[i], i);
        result.images.push(saved);
      } catch (err) {
        console.error(`保存base64图片失败: ${err.message}`);
      }
    }
  }

  return result;
}

export { MODEL_LIST, ASPECT_RATIO_LIST, RESPONSE_FORMAT_LIST, STYLE_LIST, DEFAULT_MODEL };
