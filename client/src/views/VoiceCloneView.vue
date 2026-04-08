<template>
  <div class="voice-clone-view">
    <h2>音色复刻</h2>
    <el-alert type="info" :closable="false" show-icon class="permission-hint">
      <template #title>
        <span>该功能需要解锁 MiniMax 音色复刻权限，如无权限请在MiniMax控制台检查修改</span>
      </template>
    </el-alert>

    <el-card class="upload-card">
      <template #header>
        <div class="card-header">
          <span>1. 上传复刻音频</span>
          <span class="hint">支持 mp3、m4a、wav 格式，时长 10秒-5分钟，大小不超过 20MB</span>
        </div>
      </template>

      <div class="drop-zone" :class="{ 'drag-over': isDragOver, 'has-file': audioFile }"
        @dragover.prevent="isDragOver = true" @dragleave.prevent="isDragOver = false" @drop.prevent="handleDrop"
        @click="triggerFileInput">
        <input ref="fileInput" type="file" accept=".mp3,.m4a,.wav,audio/*" style="display: none"
          @change="handleFileSelect" />
        <div v-if="!audioFile" class="drop-content">
          <el-icon class="upload-icon"><upload-filled /></el-icon>
          <p>拖拽音频文件到此处，或 <span class="link">点击上传</span></p>
        </div>
        <div v-else class="file-info">
          <el-icon class="file-icon">
            <document />
          </el-icon>
          <div class="file-details">
            <span class="file-name">{{ audioFile.name }}</span>
            <span class="file-size">{{ formatFileSize(audioFile.size) }}</span>
          </div>
          <el-button type="danger" size="small" circle @click.stop="removeFile">
            <el-icon>
              <delete />
            </el-icon>
          </el-button>
        </div>
      </div>

      <div class="upload-action">
        <el-button type="primary" @click="uploadAudio" :loading="uploading" :disabled="!audioFile">
          上传音频
        </el-button>
        <span v-if="uploadedFileId" class="upload-success">
          <el-icon>
            <check />
          </el-icon> 上传成功，file_id: {{ uploadedFileId }}
        </span>
      </div>
    </el-card>

    <el-card class="clone-card" :disabled="!uploadedFileId">
      <template #header>
        <div class="card-header">
          <span>2. 复刻设置</span>
        </div>
      </template>

      <el-form :model="cloneForm" label-width="120px">
        <el-form-item label="复刻音色ID" required>
          <el-input v-model="cloneForm.voice_id" placeholder="自定义音色ID，8-256字符，首字符为英文字母" />
        </el-form-item>

        <el-form-item label="语言增强">
          <el-select v-model="cloneForm.language_boost" placeholder="选择语言（可选）" clearable>
            <el-option v-for="lang in languageList" :key="lang" :label="lang" :value="lang" />
          </el-select>
        </el-form-item>

        <el-form-item label="降噪">
          <el-switch v-model="cloneForm.need_noise_reduction" />
        </el-form-item>

        <el-form-item label="音量归一化">
          <el-switch v-model="cloneForm.need_volume_normalization" />
        </el-form-item>

        <el-form-item label="添加水印">
          <el-switch v-model="cloneForm.aigc_watermark" />
        </el-form-item>

        <el-divider />

        <el-form-item label="试听文本(可选)">
          <el-input v-model="cloneForm.text" type="textarea" :rows="3" placeholder="输入试听文本，将使用复刻后的音色朗读（将收取语音合成费用）" />
        </el-form-item>

        <el-form-item v-if="cloneForm.text" label="试听模型">
          <el-select v-model="cloneForm.model" placeholder="选择模型">
            <el-option value="speech-2.8-hd" label="speech-2.8-hd" />
            <el-option value="speech-2.8-turbo" label="speech-2.8-turbo" />
            <el-option value="speech-2.6-hd" label="speech-2.6-hd" />
            <el-option value="speech-2.6-turbo" label="speech-2.6-turbo" />
            <el-option value="speech-02-hd" label="speech-02-hd" />
            <el-option value="speech-02-turbo" label="speech-02-turbo" />
            <el-option value="speech-01-hd" label="speech-01-hd" />
            <el-option value="speech-01-turbo" label="speech-01-turbo" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="success" @click="handleClone" :loading="cloning" :disabled="!uploadedFileId">
            开始复刻
          </el-button>
        </el-form-item>
      </el-form>

      <div v-if="cloneResult" class="clone-result">
        <el-divider />
        <h4>复刻成功</h4>
        <p><strong>音色ID:</strong> {{ cloneResult.voiceId }}</p>
        <div v-if="cloneResult.demoAudio" class="audio-preview">
          <p><strong>试听音频:</strong></p>
          <audio :src="cloneResult.demoAudio" controls />
        </div>
      </div>
    </el-card>

    <el-alert v-if="error" :title="error" type="error" show-icon class="mt-20" />
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { uploadVoiceFile, cloneVoice } from '../api'
import { ElMessage } from 'element-plus'
import { UploadFilled, Document, Delete, Check } from '@element-plus/icons-vue'

const fileInput = ref(null)
const isDragOver = ref(false)
const audioFile = ref(null)
const uploading = ref(false)
const uploadedFileId = ref('')
const cloning = ref(false)
const cloneResult = ref(null)
const error = ref('')

const languageList = [
  'Chinese', 'Chinese,Yue', 'English', 'Arabic', 'Russian', 'Spanish',
  'French', 'Portuguese', 'German', 'Turkish', 'Dutch', 'Ukrainian',
  'Vietnamese', 'Indonesian', 'Japanese', 'Italian', 'Korean', 'Thai',
  'Polish', 'Romanian', 'Greek', 'Czech', 'Finnish', 'Hindi',
  'Bulgarian', 'Danish', 'Hebrew', 'Malay', 'Persian', 'Slovak',
  'Swedish', 'Croatian', 'Filipino', 'Hungarian', 'Norwegian',
  'Slovenian', 'Catalan', 'Nynorsk', 'Tamil', 'Afrikaans', 'auto'
]

const cloneForm = reactive({
  voice_id: '',
  language_boost: '',
  need_noise_reduction: false,
  need_volume_normalization: false,
  aigc_watermark: false,
  text: '',
  model: 'speech-2.8-hd'
})

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = (e) => {
  const file = e.target.files[0]
  if (file) {
    audioFile.value = file
    error.value = ''
  }
}

const handleDrop = (e) => {
  isDragOver.value = false
  const file = e.dataTransfer.files[0]
  if (file) {
    const ext = file.name.split('.').pop().toLowerCase()
    if (['mp3', 'm4a', 'wav'].includes(ext)) {
      audioFile.value = file
      error.value = ''
    } else {
      ElMessage.error('只支持 mp3、m4a、wav 格式')
    }
  }
}

const removeFile = () => {
  audioFile.value = null
  uploadedFileId.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const uploadAudio = async () => {
  if (!audioFile.value) {
    ElMessage.warning('请先选择音频文件')
    return
  }

  uploading.value = true
  error.value = ''
  uploadedFileId.value = ''

  try {
    const formData = new FormData()
    formData.append('file', audioFile.value)
    formData.append('purpose', 'voice_clone')

    const res = await uploadVoiceFile(formData)
    if (res.data.success) {
      uploadedFileId.value = res.data.data.fileId
      ElMessage.success('上传成功')
    } else {
      error.value = res.data.error
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || '上传失败'
  } finally {
    uploading.value = false
  }
}

const handleClone = async () => {
  if (!cloneForm.voice_id) {
    ElMessage.warning('请输入复刻音色ID')
    return
  }

  cloning.value = true
  error.value = ''
  cloneResult.value = null

  try {
    const params = {
      file_id: uploadedFileId.value,
      voice_id: cloneForm.voice_id
    }

    if (cloneForm.language_boost) params.language_boost = cloneForm.language_boost
    if (cloneForm.need_noise_reduction) params.need_noise_reduction = true
    if (cloneForm.need_volume_normalization) params.need_volume_normalization = true
    if (cloneForm.aigc_watermark) params.aigc_watermark = true
    if (cloneForm.text) {
      params.text = cloneForm.text
      params.model = cloneForm.model
    }

    const res = await cloneVoice(params)
    if (res.data.success) {
      cloneResult.value = res.data.data
      ElMessage.success('复刻成功')
    } else {
      error.value = res.data.error
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || '复刻失败'
  } finally {
    cloning.value = false
  }
}
</script>

<style scoped>
.voice-clone-view {
  max-width: 800px;
}

.upload-card,
.clone-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hint {
  font-size: 12px;
  color: #999;
  font-weight: normal;
}

.drop-zone {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.drop-zone:hover,
.drag-over {
  border-color: #409eff;
  background: #f5f7fa;
}

.drop-zone.has-file {
  padding: 20px;
}

.drop-content .upload-icon {
  font-size: 48px;
  color: #c0c4cc;
}

.drop-content p {
  color: #606266;
  margin-top: 10px;
}

.drop-content .link {
  color: #409eff;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  font-size: 32px;
  color: #409eff;
}

.file-details {
  flex: 1;
  text-align: left;
}

.file-name {
  display: block;
  font-weight: bold;
}

.file-size {
  font-size: 12px;
  color: #999;
}

.upload-action {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.upload-success {
  color: #67c23a;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.clone-result {
  margin-top: 16px;
}

.clone-result h4 {
  margin: 8px 0;
}

.audio-preview {
  margin-top: 12px;
}

.audio-preview audio {
  width: 100%;
  margin-top: 8px;
}

.mt-20 {
  margin-top: 20px;
}

.permission-hint {
  margin-top: 16px;
}
</style>
