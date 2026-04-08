import axios from "axios";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import "dotenv/config";

const API_KEY = process.env.API_KEY;
const DEFAULT_MODEL = "speech-2.8-hd";

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
// 获取所有音色（从API）
// ============================================================
export async function getAllVoices() {
  if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");

  try {
    const response = await axios.post(
      "https://api.minimaxi.com/v1/get_voice",
      { voice_type: "all" },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const resp = response.data;

    if (resp.base_resp && resp.base_resp.status_code !== 0) {
      throw new Error(`API 错误: ${resp.base_resp.status_msg}`);
    }

    const result = {
      systemVoices: [],
      cloningVoices: [],
      generationVoices: []
    };

    // 处理系统音色
    if (resp.system_voice && Array.isArray(resp.system_voice)) {
      result.systemVoices = resp.system_voice.map(v => ({
        voiceId: v.voice_id,
        voiceName: v.voice_name,
        description: v.description || [],
        source: 'system'
      }));
    }

    // 处理克隆音色
    if (resp.voice_cloning && Array.isArray(resp.voice_cloning)) {
      result.cloningVoices = resp.voice_cloning.map(v => ({
        voiceId: v.voice_id,
        voiceName: v.description || v.voice_id,
        description: [v.description],
        createdTime: v.created_time,
        source: 'voice_cloning'
      }));
    }

    // 处理生成的音色
    if (resp.voice_generation && Array.isArray(resp.voice_generation)) {
      result.generationVoices = resp.voice_generation.map(v => ({
        voiceId: v.voice_id,
        voiceName: v.description || v.voice_id,
        description: [v.description],
        createdTime: v.created_time,
        source: 'voice_generation'
      }));
    }

    return result;
  } catch (error) {
    throw new Error(`获取音色列表失败: ${error.message}`);
  }
}

// ============================================================
// 音色设计
// ============================================================
export async function designVoice(params) {
  const { prompt, preview_text, voice_id, aigc_watermark } = params;

  if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");
  if (!prompt) throw new Error("音色描述不能为空");
  if (!preview_text) throw new Error("试听文本不能为空");

  const payload = {
    prompt,
    preview_text,
  };
  if (voice_id) payload.voice_id = voice_id;
  if (aigc_watermark) payload.aigc_watermark = aigc_watermark;

  try {
    const response = await axios.post(
      "https://api.minimaxi.com/v1/voice_design",
      payload,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 120000,
      }
    );

    const resp = response.data;

    if (resp.base_resp && resp.base_resp.status_code !== 0) {
      throw new Error(`API 错误: ${resp.base_resp.status_msg}`);
    }

    return {
      voiceId: resp.voice_id,
      trialAudio: resp.trial_audio,
    };
  } catch (error) {
    throw new Error(`音色设计失败: ${error.message}`);
  }
}

// ============================================================
// 删除音色
// ============================================================
export async function deleteVoice(voiceId, voiceType) {
  if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");
  if (!voiceId) throw new Error("请指定 voice_id");
  if (!voiceType || !['voice_cloning', 'voice_generation'].includes(voiceType)) {
    throw new Error("voice_type 必须是 voice_cloning 或 voice_generation");
  }

  try {
    const response = await axios.post(
      "https://api.minimaxi.com/v1/delete_voice",
      { voice_id: voiceId, voice_type: voiceType },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const resp = response.data;

    if (resp.base_resp && resp.base_resp.status_code !== 0) {
      throw new Error(`API 错误: ${resp.base_resp.status_msg}`);
    }

    return {
      voiceId: resp.voice_id,
      createdTime: resp.created_time
    };
  } catch (error) {
    throw new Error(`删除音色失败: ${error.message}`);
  }
}

// ============================================================
// 上传音频文件（用于复刻）
// ============================================================
export async function uploadAudioFile(filePath, purpose = "voice_clone") {
  if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");
  if (!filePath) throw new Error("文件路径不能为空");

  const form = new FormData();
  form.append("purpose", purpose);
  form.append("file", fs.createReadStream(filePath));

  try {
    const response = await axios.post(
      "https://api.minimaxi.com/v1/files/upload",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${API_KEY}`,
        },
        timeout: 120000,
      }
    );

    const resp = response.data;

    if (resp.base_resp && resp.base_resp.status_code !== 0) {
      throw new Error(`API 错误: ${resp.base_resp.status_msg}`);
    }

    return {
      fileId: resp.file?.file_id,
      bytes: resp.file?.bytes,
      filename: resp.file?.filename,
    };
  } catch (error) {
    throw new Error(`上传音频文件失败: ${error.message}`);
  }
}

// ============================================================
// 音色快速复刻
// ============================================================
export async function voiceClone(params) {
  const { file_id, voice_id, clone_prompt, text, model, language_boost, need_noise_reduction, need_volume_normalization, aigc_watermark } = params;

  if (!API_KEY) throw new Error("请先在 .env 中配置 API_KEY");
  if (!file_id) throw new Error("file_id 不能为空");
  if (!voice_id) throw new Error("voice_id 不能为空");

  const payload = {
    file_id,
    voice_id,
  };

  if (clone_prompt) payload.clone_prompt = clone_prompt;
  if (text) payload.text = text;
  if (model) payload.model = model;
  if (language_boost) payload.language_boost = language_boost;
  if (need_noise_reduction) payload.need_noise_reduction = need_noise_reduction;
  if (need_volume_normalization) payload.need_volume_normalization = need_volume_normalization;
  if (aigc_watermark) payload.aigc_watermark = aigc_watermark;

  try {
    const response = await axios.post(
      "https://api.minimaxi.com/v1/voice_clone",
      payload,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 120000,
      }
    );

    const resp = response.data;

    if (resp.base_resp && resp.base_resp.status_code !== 0) {
      throw new Error(`API 错误: ${resp.base_resp.status_msg}`);
    }

    return {
      voiceId: voice_id,
      demoAudio: resp.demo_audio,
    };
  } catch (error) {
    throw new Error(`音色复刻失败: ${error.message}`);
  }
}

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
  BITRATE_LIST, EMOTION_LIST, LANGUAGE_BOOST_LIST,
  SAMPLE_RATE_LIST, AUDIO_FORMAT_LIST, DEFAULT_MODEL
};
