import axios from "axios";
import "dotenv/config";

const API_KEY = process.env.API_KEY;
const DEFAULT_MODEL = "image-01";

// ============================================================
// 参数选项
// ============================================================
const MODEL_LIST = ["image-01", "image-01-live"];
const ASPECT_RATIO_LIST = ["1:1", "16:9", "4:3", "3:2", "2:3", "3:4", "9:16", "21:9"];
const RESPONSE_FORMAT_LIST = ["url", "base64"];
const STYLE_LIST = ["realness", "hd", "anime", "illustration", "3d"];

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
  };

  if (response_format === "url") {
    result.image_urls = resp.data?.image_urls || [];
  } else {
    result.image_base64 = resp.data?.image_base64 || [];
  }

  return result;
}

export { MODEL_LIST, ASPECT_RATIO_LIST, RESPONSE_FORMAT_LIST, STYLE_LIST, DEFAULT_MODEL };
