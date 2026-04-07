<template>
  <div class="voice-view">
    <h2>语音生成</h2>
    <el-form :model="form" label-width="120px" class="voice-form">
      <el-form-item label="文本内容">
        <el-input
          v-model="form.text"
          type="textarea"
          :rows="4"
          placeholder="请输入要合成语音的文本"
        />
      </el-form-item>

      <el-form-item label="音色">
        <el-tabs v-model="voiceTab" class="voice-tabs">
          <el-tab-pane label="内置音色" name="built-in">
            <div class="voice-selector">
              <el-select v-model="form.selectedLanguage" placeholder="选择语言" clearable style="margin-bottom: 10px; width: 100%">
                <el-option v-for="lang in languages" :key="lang" :label="lang" :value="lang" />
              </el-select>
              <el-select v-model="form.voiceId" placeholder="选择音色" style="width: 100%">
                <el-option
                  v-for="voice in filteredBuiltInVoices"
                  :key="voice.id"
                  :label="voice.name"
                  :value="voice.id"
                />
              </el-select>
            </div>
          </el-tab-pane>
          <el-tab-pane label="自定义音色" name="custom">
            <div class="voice-selector">
              <el-select v-model="form.voiceId" placeholder="选择自定义音色" style="width: 100%">
                <el-option
                  v-for="voice in customVoices"
                  :key="voice.id"
                  :label="voice.name"
                  :value="voice.id"
                />
              </el-select>
              <div v-if="customVoices.length === 0" class="custom-empty">
                暂无自定义音色
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="语速">
            <el-slider v-model="form.speed" :min="0.5" :max="2" :step="0.1" show-input />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="音量">
            <el-slider v-model="form.vol" :min="0.1" :max="10" :step="0.1" show-input />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="语调">
            <el-slider v-model="form.pitch" :min="-12" :max="12" :step="1" show-input />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="比特率">
            <el-select v-model="form.bitrate">
              <el-option v-for="b in options.bitrateList" :key="b" :label="b" :value="b" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="采样率">
            <el-select v-model="form.sampleRate">
              <el-option v-for="s in options.sampleRateList" :key="s" :label="s" :value="s" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="音频格式">
            <el-select v-model="form.audioFormat">
              <el-option v-for="f in options.audioFormatList" :key="f" :label="f" :value="f" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="情绪">
        <el-select v-model="form.emotion">
          <el-option v-for="e in options.emotionList" :key="e" :label="e" :value="e" />
        </el-select>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="handleGenerate" :loading="loading">生成语音</el-button>
      </el-form-item>
    </el-form>

    <div v-if="result" class="result">
      <h3>生成结果</h3>
      <p>音频大小: {{ (result.audioSize / 1024).toFixed(1) }} KB</p>
      <audio v-if="audioUrl" :src="audioUrl" controls />
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { getVoiceOptions, generateVoice } from '../api'
import { ElMessage } from 'element-plus'

const form = reactive({
  text: '',
  voiceId: '',
  selectedLanguage: '',
  speed: 1,
  vol: 1,
  pitch: 0,
  bitrate: 128000,
  sampleRate: 32000,
  audioFormat: 'mp3',
  emotion: 'fluent'
})

const voiceTab = ref('built-in')

const options = reactive({
  bitrateList: [64000, 128000, 192000, 256000, 320000],
  emotionList: ['happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'calm', 'fluent', 'whisper'],
  sampleRateList: [16000, 24000, 32000, 48000],
  audioFormatList: ['mp3', 'wav', 'flac']
})

const builtInVoices = ref([])
const customVoices = ref([])
const languages = ref([])
const loading = ref(false)
const result = ref(null)
const audioUrl = ref('')
const error = ref('')

const filteredBuiltInVoices = computed(() => {
  if (!form.selectedLanguage) {
    return builtInVoices.value
  }
  return builtInVoices.value.filter(v => v.language === form.selectedLanguage)
})

// 切换语言时清空音色选择
watch(() => form.selectedLanguage, () => {
  form.voiceId = ''
})

onMounted(async () => {
  try {
    const res = await getVoiceOptions()
    const data = res.data.data || {}

    // 转换系统音色为前端格式
    const allBuiltIn = (data.systemVoices || []).map(v => ({
      id: v.voiceId,
      name: v.voiceName,
      language: v.language || '其他'
    }))

    // 提取语言列表
    const langSet = new Set()
    allBuiltIn.forEach(v => {
      if (v.language) langSet.add(v.language)
    })
    languages.value = Array.from(langSet).sort()

    // 自定义音色 = 克隆音色 + 生成音色
    const allCustom = [
      ...(data.cloningVoices || []).map(v => ({ id: v.voiceId, name: v.voiceName })),
      ...(data.generationVoices || []).map(v => ({ id: v.voiceId, name: v.voiceName }))
    ]

    builtInVoices.value = allBuiltIn
    customVoices.value = allCustom

    options.bitrateList = data.bitrateList || options.bitrateList
    options.emotionList = data.emotionList || options.emotionList
    options.sampleRateList = data.sampleRateList || options.sampleRateList
    options.audioFormatList = data.audioFormatList || options.audioFormatList

    // 默认选择第一个音色
    if (builtInVoices.value.length > 0) {
      form.voiceId = builtInVoices.value[0].id
      form.selectedLanguage = builtInVoices.value[0].language
    }
  } catch (e) {
    ElMessage.error('获取选项失败')
  }
})

// 组件卸载时释放ObjectURL
onUnmounted(() => {
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
})

const handleGenerate = async () => {
  if (!form.text) {
    ElMessage.warning('请输入文本内容')
    return
  }
  if (!form.voiceId) {
    ElMessage.warning('请选择音色')
    return
  }
  loading.value = true
  error.value = ''
  result.value = null
  try {
    const res = await generateVoice({
      text: form.text,
      voiceId: form.voiceId,
      speed: form.speed,
      vol: form.vol,
      pitch: form.pitch,
      bitrate: form.bitrate,
      sampleRate: form.sampleRate,
      audioFormat: form.audioFormat,
      emotion: form.emotion,
      outputFormat: 'hex'
    })
    if (res.data.success) {
      result.value = res.data.data
      // 将hex转换为可播放的audio URL
      const hexToBuffer = (hex) => {
        const bytes = new Uint8Array(hex.length / 2)
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
        }
        return bytes
      }
      const buffer = hexToBuffer(result.value.audioHex)
      const blob = new Blob([buffer], { type: 'audio/mpeg' })
      audioUrl.value = URL.createObjectURL(blob)
      ElMessage.success('生成成功')
    } else {
      error.value = res.data.error
    }
  } catch (e) {
    error.value = e.message || '生成失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.voice-view {
  max-width: 800px;
}
.voice-form {
  margin-top: 20px;
}
.voice-tabs {
  width: 100%;
}
.voice-selector {
  padding: 10px 0;
}
.custom-empty {
  color: #999;
  text-align: center;
  padding: 20px;
}
.result {
  margin-top: 24px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
}
.result h3 {
  margin-top: 0;
}
.result audio {
  width: 100%;
  margin-top: 12px;
}
</style>
