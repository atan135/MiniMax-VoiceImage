<template>
  <div class="music-view">
    <h2>音乐生成</h2>

    <el-tabs v-model="activeTab" class="music-tabs">
      <!-- 歌词生成 -->
      <el-tab-pane label="歌词生成" name="lyrics">
        <el-form :model="lyricsForm" label-width="120px" class="music-form">
          <el-form-item label="生成模式">
            <el-radio-group v-model="lyricsForm.mode">
              <el-radio label="write_full_song">完整歌曲</el-radio>
              <el-radio label="edit">编辑/续写</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="歌曲主题">
            <el-input
              v-model="lyricsForm.prompt"
              type="textarea"
              :rows="3"
              placeholder="描述歌曲主题、风格或情感，如：一首关于爱情的流行歌曲"
            />
            <span class="char-count">{{ lyricsForm.prompt.length }}/2000</span>
          </el-form-item>

          <el-form-item v-if="lyricsForm.mode === 'edit'" label="现有歌词">
            <el-input
              v-model="lyricsForm.lyrics"
              type="textarea"
              :rows="6"
              placeholder="输入需要编辑或续写的歌词"
            />
            <span class="char-count">{{ lyricsForm.lyrics.length }}/3500</span>
          </el-form-item>

          <el-form-item label="歌曲标题">
            <el-input v-model="lyricsForm.title" placeholder="指定歌曲标题（可选）" />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleGenerateLyrics" :loading="lyricsLoading">生成歌词</el-button>
            <el-button v-if="lyricsResult" type="success" @click="useLyrics" class="use-lyrics-btn">使用此歌词生成音乐</el-button>
          </el-form-item>
        </el-form>

        <div v-if="lyricsResult" class="result">
          <h3>歌词结果</h3>
          <p><strong>歌名：</strong>{{ lyricsResult.songTitle }}</p>
          <p><strong>风格标签：</strong>{{ lyricsResult.styleTags }}</p>
          <div class="lyrics-content">
            <pre>{{ lyricsResult.lyrics }}</pre>
          </div>
        </div>
      </el-tab-pane>

      <!-- 音乐生成 -->
      <el-tab-pane label="音乐生成" name="music">
        <div class="music-tips">
          <el-alert
            title="音乐生成时间较长，预计需要3-5分钟完成，请耐心等待"
            type="info"
            :closable="false"
            show-icon
          />
        </div>

        <el-form :model="musicForm" label-width="120px" class="music-form">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="模型">
                <el-select v-model="musicForm.model" style="width: 100%">
                  <el-option v-for="m in options.modelList" :key="m" :label="m" :value="m" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="输出格式">
                <el-select v-model="musicForm.output_format" style="width: 100%">
                  <el-option label="URL" value="url" />
                  <el-option label="Hex" value="hex" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="音乐描述">
            <el-input
              v-model="musicForm.prompt"
              type="textarea"
              :rows="3"
              placeholder="描述音乐风格、情绪和场景，如：流行音乐, 欢快, 适合派对"
            />
            <span class="char-count">{{ musicForm.prompt.length }}/2000</span>
          </el-form-item>

          <el-form-item label="歌词">
            <el-input
              v-model="musicForm.lyrics"
              type="textarea"
              :rows="8"
              placeholder="输入歌词，使用 \\n 分隔每行。支持结构标签：[Verse], [Chorus], [Bridge], [Outro] 等"
            />
            <span class="char-count">{{ musicForm.lyrics.length }}/3500</span>
          </el-form-item>

          <el-form-item>
            <el-checkbox v-model="musicForm.is_instrumental">纯音乐（无人声）</el-checkbox>
            <el-checkbox v-model="musicForm.lyrics_optimizer">自动优化歌词</el-checkbox>
            <el-checkbox v-model="musicForm.aigc_watermark">添加水印</el-checkbox>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              @click="handleGenerateMusic"
              :loading="musicLoading"
              :disabled="musicLoading"
            >
              {{ musicLoading ? '音乐生成中...' : '生成音乐' }}
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 生成进度 -->
        <div v-if="musicLoading" class="progress-section">
          <el-progress :percentage="jobProgress" :status="jobProgress === 100 ? 'success' : undefined" />
          <p class="progress-text">正在生成音乐，请稍候...</p>
        </div>

        <div v-if="musicResult" class="result">
          <h3>生成结果</h3>
          <p>音频大小: {{ (musicResult.audioSize / 1024).toFixed(1) }} KB</p>
          <audio v-if="audioUrl" :src="audioUrl" controls />
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-alert v-if="error" :title="error" type="error" show-icon />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { getMusicOptions, generateLyrics, generateMusic, getMusicJobStatus } from '../api'
import { ElMessage } from 'element-plus'

const activeTab = ref('lyrics')

const lyricsForm = reactive({
  mode: 'write_full_song',
  prompt: '',
  lyrics: '',
  title: ''
})

const musicForm = reactive({
  model: 'music-2.6',
  prompt: '',
  lyrics: '',
  output_format: 'hex',
  is_instrumental: false,
  lyrics_optimizer: false,
  aigc_watermark: false
})

const options = reactive({
  modelList: ['music-2.6', 'music-2.5+', 'music-2.5']
})

const lyricsLoading = ref(false)
const musicLoading = ref(false)
const lyricsResult = ref(null)
const musicResult = ref(null)
const audioUrl = ref('')
const error = ref('')

// 轮询相关
let pollingTimer = null
const currentJobId = ref(null)
const jobProgress = ref(0)

onMounted(async () => {
  try {
    const res = await getMusicOptions()
    if (res.data.modelList) {
      options.modelList = res.data.modelList
    }
  } catch (e) {
    ElMessage.error('获取选项失败')
  }
})

onUnmounted(() => {
  stopPolling()
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
  }
})

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}

const handleGenerateLyrics = async () => {
  if (lyricsForm.mode === 'edit' && !lyricsForm.lyrics) {
    ElMessage.warning('编辑模式需要提供歌词内容')
    return
  }
  if (!lyricsForm.prompt && lyricsForm.mode === 'write_full_song') {
    ElMessage.warning('请输入歌曲主题')
    return
  }

  lyricsLoading.value = true
  error.value = ''
  lyricsResult.value = null

  try {
    const res = await generateLyrics({
      mode: lyricsForm.mode,
      prompt: lyricsForm.prompt,
      lyrics: lyricsForm.lyrics || undefined,
      title: lyricsForm.title || undefined
    })
    if (res.data.success) {
      lyricsResult.value = res.data.data
      ElMessage.success('歌词生成成功')
    } else {
      error.value = res.data.error
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || '生成失败'
  } finally {
    lyricsLoading.value = false
  }
}

const useLyrics = () => {
  if (lyricsResult.value && lyricsResult.value.lyrics) {
    musicForm.lyrics = lyricsResult.value.lyrics
    activeTab.value = 'music'
    ElMessage.success('歌词已填入音乐生成表单')
  }
}

const pollJobStatus = (jobId) => {
  pollingTimer = setInterval(async () => {
    try {
      const res = await getMusicJobStatus(jobId)
      const data = res.data

      if (data.success) {
        const status = data.data
        jobProgress.value = status.progress || 0

        if (status.status === 'completed') {
          stopPolling()
          musicLoading.value = false
          musicResult.value = status.result

          if (status.result.audioUrl) {
            audioUrl.value = status.result.audioUrl
          } else if (status.result.filePath) {
            audioUrl.value = getMusicUrl(status.result.filePath)
          }

          // 记录到历史
          ElMessage.success('音乐生成成功')
        } else if (status.status === 'failed') {
          stopPolling()
          musicLoading.value = false
          error.value = status.error || '音乐生成失败'
          ElMessage.error(status.error || '音乐生成失败')
        }
      }
    } catch (e) {
      console.error('轮询出错:', e)
    }
  }, 200) // 200ms轮询
}

const handleGenerateMusic = async () => {
  if (!musicForm.prompt && !musicForm.lyrics_optimizer) {
    ElMessage.warning('请输入音乐描述')
    return
  }
  if (!musicForm.is_instrumental && !musicForm.lyrics && !musicForm.lyrics_optimizer) {
    ElMessage.warning('请输入歌词（纯音乐除外）')
    return
  }

  musicLoading.value = true
  error.value = ''
  musicResult.value = null
  jobProgress.value = 0
  audioUrl.value = ''

  try {
    const res = await generateMusic({
      model: musicForm.model,
      prompt: musicForm.prompt,
      lyrics: musicForm.lyrics || undefined,
      output_format: musicForm.output_format,
      is_instrumental: musicForm.is_instrumental,
      lyrics_optimizer: musicForm.lyrics_optimizer,
      aigc_watermark: musicForm.aigc_watermark
    })

    if (res.data.success) {
      currentJobId.value = res.data.data.jobId
      ElMessage.info('音乐生成已启动，请耐心等待...')
      pollJobStatus(currentJobId.value)
    } else {
      error.value = res.data.error
      musicLoading.value = false
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || '生成失败'
    musicLoading.value = false
  }
}

const getMusicUrl = (filePath) => {
  if (!filePath) return ''
  if (filePath.startsWith('http')) return filePath
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.startsWith('/') ? normalized : '/' + normalized
}
</script>

<style scoped>
.music-view {
  max-width: 900px;
}
.music-tabs {
  margin-top: 20px;
}
.music-form {
  margin-top: 20px;
  max-width: 700px;
}
.use-lyrics-btn {
  margin-left: 10px;
}
.music-tips {
  margin-bottom: 20px;
}
.char-count {
  font-size: 12px;
  color: #999;
  float: right;
}
.progress-section {
  margin-top: 20px;
  padding: 16px;
  background: #f0f9eb;
  border-radius: 8px;
}
.progress-text {
  margin-top: 10px;
  color: #67c23a;
  text-align: center;
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
.lyrics-content {
  margin: 16px 0;
  padding: 12px;
  background: #fff;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
}
.lyrics-content pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  font-family: inherit;
}
</style>
