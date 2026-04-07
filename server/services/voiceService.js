import axios from "axios";
import fs from "fs";
import path from "path";
import "dotenv/config";

const API_KEY = process.env.API_KEY;
const DEFAULT_MODEL = "speech-2.8-hd";

// ============================================================
// 音色列表
// ============================================================
const VOICE_LIST = [
  { id: "moss_audio_ce44fc67-7ce3-11f0-8de5-96e35d26fb85", name: "中文-女声A", desc: "中文系统音色" },
  { id: "moss_audio_aaa1346a-7ce7-11f0-8e61-2e6e3c7ee85d", name: "中文-女声B", desc: "中文系统音色" },
  { id: "English_Graceful_Lady",     name: "英文-优雅女声",   desc: "英文优雅女声" },
  { id: "English_Insightful_Speaker",name:"英文-睿智男声",   desc: "英文睿智男声" },
  { id: "English_radiant_girl",     name: "英文-活力女孩",   desc: "英文活力女孩" },
  { id: "English_Persuasive_Man",   name: "英文-说服力男声", desc: "英文说服力男声" },
  { id: "moss_audio_6dc281eb-713c-11f0-a447-9613c873494c", name: "英文-男声C",  desc: "英文系统音色" },
  { id: "moss_audio_570551b1-735c-11f0-b236-0adeeecad052", name: "英文-女声D",  desc: "英文系统音色" },
  { id: "moss_audio_ad5baf92-735f-11f0-8263-fe5a2fe98ec8", name: "英文-男声E",  desc: "英文系统音色" },
  { id: "English_Lucky_Robot",       name: "英文-幸运机器人", desc: "英文机器人声" },
  { id: "Japanese_Whisper_Belle",     name: "日文-耳语少女",  desc: "日文耳语女声" },
  { id: "moss_audio_24875c4a-7be4-11f0-9359-4e72c55db738", name: "日文-女声B",  desc: "日文系统音色" },
  { id: "moss_audio_7f4ee608-78ea-11f0-bb73-1e2a4cfcd245", name: "日文-女声C",  desc: "日文系统音色" },
  { id: "moss_audio_c1a6a3ac-7be6-11f0-8e8e-36b92fbb4f95", name: "日文-女声D",  desc: "日文系统音色" },
];

const BITRATE_LIST  = [64000, 128000, 192000, 256000, 320000];
const EMOTION_LIST  = ["happy","sad","angry","fearful","disgusted","surprised","calm","fluent","whisper"];
const LANGUAGE_BOOST_LIST = [
  "auto","Chinese","Chinese,Yue","English","Arabic","Russian","Spanish","French",
  "Portuguese","German","Turkish","Dutch","Ukrainian","Vietnamese","Indonesian",
  "Japanese","Italian","Korean","Thai","Polish","Romanian","Greek","Czech","Finnish",
  "Hindi","Bulgarian","Danish","Hebrew","Malay","Persian","Slovak","Swedish",
  "Croatian","Filipino","Hungarian","Norwegian","Slovenian","Catalan","Nynorsk","Tamil","Afrikaans",
];
const SAMPLE_RATE_LIST = [16000, 24000, 32000, 48000];
const AUDIO_FORMAT_LIST = ["mp3", "wav", "flac"];

// ============================================================
// 语音生成主函数
// ============================================================
export async function textToSpeech(params) {
  const {
    text,
    voiceId,
    model         = DEFAULT_MODEL,
    bitrate       = 128000,
    sampleRate    = 32000,
    audioFormat   = "mp3",
    speed         = 1,
    vol           = 1,
    pitch         = 0,
    emotion       = "fluent",
    textNormalization = false,
    latexRead     = false,
    subtitleEnable = false,
    outputFormat  = "hex",
    aigcWatermark = false,
    languageBoost = null,
    pronunciationDict,
    timbreWeights,
    voiceModify,
    outputPath,
  } = params;

  if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");
  if (!text)    throw new Error("文本内容不能为空");
  if (!voiceId) throw new Error("请指定 voice_id");

  const payload = {
    model,
    text,
    stream: false,
    audio_setting: {
      bitrate,
      sample_rate: sampleRate,
      format: audioFormat,
      channel: 1,
    },
    voice_setting: {
      voice_id: voiceId,
      speed,
      vol,
      pitch,
      emotion,
      text_normalization: textNormalization,
      latex_read: latexRead,
    },
    subtitle_enable: subtitleEnable,
    output_format: outputFormat,
    aigc_watermark: aigcWatermark,
  };

  if (languageBoost)  payload.language_boost   = languageBoost;
  if (pronunciationDict) payload.pronunciation_dict = pronunciationDict;
  if (timbreWeights)   payload.timbre_weights   = timbreWeights;
  if (voiceModify)     payload.voice_modify     = voiceModify;

  const response = await axios.post(
    "https://api.minimaxi.com/v1/t2a_v2",
    payload,
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    },
  );

  const resp = response.data;

  if (resp.base_resp && resp.base_resp.status_code !== 0) {
    throw new Error(
      `API 错误: ${resp.base_resp.status_msg} (code: ${resp.base_resp.status_code})`,
    );
  }

  const outputDir = "output/voice";

  if (outputFormat === "url") {
    const audioUrl = resp.data.audio_url || resp.data;
    if (outputPath) {
      fs.writeFileSync(outputPath, audioUrl);
    }
    return { audioUrl };
  } else {
    if (!resp.data || !resp.data.audio) {
      throw new Error(`API 返回格式异常: ${JSON.stringify(resp)}`);
    }
    const audioHex = resp.data.audio;
    const audioBuffer = Buffer.from(audioHex, "hex");

    // 默认保存路径
    const savePath = outputPath || `${outputDir}/output_${Date.now()}.${audioFormat}`;
    const dir = path.dirname(savePath);
    if (dir && dir !== "." && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(savePath, audioBuffer);
    console.log(`音频已保存: ${savePath} (${(audioBuffer.length / 1024).toFixed(1)} KB)`);

    return { audioHex, audioSize: audioBuffer.length, filePath: savePath };
  }
}

export {
  VOICE_LIST, BITRATE_LIST, EMOTION_LIST, LANGUAGE_BOOST_LIST,
  SAMPLE_RATE_LIST, AUDIO_FORMAT_LIST, DEFAULT_MODEL
};
