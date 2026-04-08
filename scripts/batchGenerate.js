/**
 * 批量生成脚本 - 命令行调用语音和图片生成
 * 用法: node scripts/batchGenerate.js --input batch_tasks.json
 *       node scripts/batchGenerate.js --voice "要转换的文本" --voice-id "音色ID"
 *       node scripts/batchGenerate.js --image "图片描述" --image-n 2
 */

import { textToSpeech } from "../server/services/voiceService.js";
import { textToImage } from "../server/services/imageService.js";
import { addRecord } from "../server/services/historyService.js";
import { maskSensitiveData } from "../server/utils/logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) {
      result.inputFile = args[++i];
    } else if (args[i] === "--voice" && args[i + 1]) {
      result.voiceText = args[++i];
    } else if (args[i] === "--voice-id" && args[i + 1]) {
      result.voiceId = args[++i];
    } else if (args[i] === "--image" && args[i + 1]) {
      result.imagePrompt = args[++i];
    } else if (args[i] === "--image-n" && args[i + 1]) {
      result.imageN = parseInt(args[++i]);
    } else if (args[i] === "--aspect-ratio" && args[i + 1]) {
      result.aspectRatio = args[++i];
    } else if (args[i] === "--model" && args[i + 1]) {
      result.model = args[++i];
    }
  }

  return result;
}

// 从文件读取任务列表
function loadTasksFromFile(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    throw new Error(`任务文件不存在: ${fullPath}`);
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  const data = JSON.parse(content);

  if (!Array.isArray(data.tasks)) {
    throw new Error("任务文件格式错误: 需要包含 tasks 数组");
  }

  return data.tasks;
}

// 生成语音
async function generateVoice(task) {
  const startTime = Date.now();
  console.log(`\n[Voice] 开始生成 | 文本: ${task.text.substring(0, 50)}${task.text.length > 50 ? "..." : ""}`);

  const params = {
    text: task.text,
    voiceId: task.voiceId,
    model: task.model || "speech-2.8-hd",
    bitrate: task.bitrate || 128000,
    sampleRate: task.sampleRate || 32000,
    audioFormat: task.audioFormat || "mp3",
    speed: task.speed || 1,
    vol: task.vol || 1,
    pitch: task.pitch || 0,
    emotion: task.emotion || "fluent",
    aigcWatermark: task.aigcWatermark || false,
  };

  const result = await textToSpeech(params);
  const duration = Date.now() - startTime;

  // 保存到数据库
  await addRecord(
    "voice",
    task.text,
    maskSensitiveData(params),
    result.filePath,
    result.audioSize,
    "success"
  );

  console.log(`[Voice] 成功 | 耗时: ${duration}ms | 文件: ${result.filePath}`);
  return result;
}

// 生成图片
async function generateImage(task) {
  const startTime = Date.now();
  console.log(`\n[Image] 开始生成 | 描述: ${task.prompt.substring(0, 50)}${task.prompt.length > 50 ? "..." : ""}`);

  const params = {
    model: task.model || "image-01",
    prompt: task.prompt,
    n: task.n || 1,
    aspect_ratio: task.aspectRatio || "1:1",
    response_format: task.responseFormat || "url",
    prompt_optimizer: task.promptOptimizer || false,
    aigc_watermark: task.aigcWatermark || false,
    style: task.style,
  };

  const result = await textToImage(params);
  const duration = Date.now() - startTime;

  // 保存到数据库 (取所有图片)
  const filePaths = result.images?.map(i => i.filePath) || [];
  const filePath = JSON.stringify(filePaths);
  const fileSize = result.images?.reduce((sum, i) => sum + (i.fileSize || 0), 0) || 0;

  await addRecord(
    "image",
    task.prompt,
    maskSensitiveData(params),
    filePath,
    fileSize,
    "success"
  );

  console.log(`[Image] 成功 | 耗时: ${duration}ms | ID: ${result.id} | 成功: ${result.success_count} | 失败: ${result.failed_count}`);
  console.log(`[Image] 文件: ${JSON.stringify(result.images?.map(i => i.filePath))}`);
  return result;
}

// 处理单个任务
async function processTask(task) {
  try {
    if (task.type === "voice") {
      return await generateVoice(task);
    } else if (task.type === "image") {
      return await generateImage(task);
    } else {
      throw new Error(`未知任务类型: ${task.type}`);
    }
  } catch (error) {
    // 任务失败时也记录到数据库
    try {
      await addRecord(
        task.type,
        task.text || task.prompt,
        maskSensitiveData(task),
        null,
        0,
        "failed",
        error.message
      );
    } catch (dbError) {
      console.error(`[Error] 记录失败任务到数据库出错: ${dbError.message}`);
    }
    throw error;
  }
}

// 处理任务列表
async function processTasks(tasks) {
  console.log(`\n========== 开始批量生成 ==========`);
  console.log(`任务数量: ${tasks.length}`);
  console.log(`================================\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    console.log(`\n[${i + 1}/${tasks.length}]`);

    try {
      await processTask(task);
      successCount++;
    } catch (error) {
      failCount++;
      console.error(`[Error] 任务失败: ${error.message}`);
    }
  }

  console.log(`\n========== 批量生成完成 ==========`);
  console.log(`成功: ${successCount} | 失败: ${failCount}`);
  console.log(`================================\n`);
}

// 主函数
async function main() {
  const args = parseArgs();

  try {
    // 情况1: 从文件加载任务
    if (args.inputFile) {
      const tasks = loadTasksFromFile(args.inputFile);
      await processTasks(tasks);
    }
    // 情况2: 单条语音生成
    else if (args.voiceText) {
      const task = {
        type: "voice",
        text: args.voiceText,
        voiceId: args.voiceId,
        model: args.model,
      };
      await processTasks([task]);
    }
    // 情况3: 单条图片生成
    else if (args.imagePrompt) {
      const task = {
        type: "image",
        prompt: args.imagePrompt,
        n: args.imageN || 1,
        aspectRatio: args.aspectRatio,
        model: args.model,
      };
      await processTasks([task]);
    }
    // 情况4: 显示帮助
    else {
      console.log(`
========== 批量生成工具 ==========

用法:
  node scripts/batchGenerate.js --input tasks.json
    从 JSON 文件加载任务列表进行批量生成

  node scripts/batchGenerate.js --voice "文本内容" --voice-id "音色ID"
    生成单条语音

  node scripts/batchGenerate.js --image "图片描述"
    生成单张图片

  node scripts/batchGenerate.js --image "图片描述" --image-n 3 --aspect-ratio "16:9"
    生成多张图片并指定比例

参数说明:
  --voice        语音生成的文本内容
  --voice-id     音色ID (必填, --voice 模式)
  --image        图片生成的描述文本
  --image-n      生成数量 (默认 1, 取值 1-9)
  --aspect-ratio 图片比例 (默认 1:1, 可选 16:9, 4:3, 3:2, 2:3, 3:4, 9:16, 21:9)
  --model        模型 (语音默认 speech-2.8-hd, 图片默认 image-01)

示例任务文件 (tasks.json):
{
  "tasks": [
    {
      "type": "voice",
      "text": "你好,这是语音生成测试",
      "voiceId": "your_voice_id_here"
    },
    {
      "type": "image",
      "prompt": "一只可爱的猫咪在草地上玩耍",
      "n": 2,
      "aspectRatio": "16:9"
    }
  ]
}

================================
      `);
    }
  } catch (error) {
    console.error(`\n[Error] ${error.message}`);
    process.exit(1);
  }
}

main();
