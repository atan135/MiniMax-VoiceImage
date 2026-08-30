<template>
  <div class="video-view">
    <h2>视频生成</h2>

    <el-tabs v-model="activeTab" class="video-tabs">
      <!-- ============ Tab 1: 文生视频 ============ -->
      <el-tab-pane label="文生视频" name="text2video">
        <el-form :model="t2vForm" label-width="120px" class="video-form">
          <el-form-item label="提示词">
            <el-input
              v-model="t2vForm.prompt"
              type="textarea"
              :rows="4"
              placeholder="请输入视频描述，如：史诗级太空歌剧院线预告，女舰长站在观景窗前，最后一支舰队跃迁离去"
              maxlength="1500"
              show-word-limit
            />
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="模型">
                <el-input v-model="options.model" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="分辨率">
                <el-select v-model="t2vForm.resolution" style="width: 100%">
                  <el-option v-for="r in options.resolutionList" :key="r" :label="r" :value="r" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item :label="`时长 (${t2vForm.duration}s)`">
                <el-slider v-model="t2vForm.duration" :min="4" :max="15" :step="1" show-stops />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="宽高比">
            <el-select v-model="t2vForm.ratio" style="width: 220px" placeholder="文生视频必须显式选择">
              <el-option
                v-for="r in text2videoRatioList"
                :key="r"
                :label="r"
                :value="r"
              />
            </el-select>
            <span class="field-hint">文生视频不能选择 adaptive</span>
          </el-form-item>

          <el-form-item>
            <el-checkbox v-model="t2vForm.aigcWatermark">添加 AIGC 水印</el-checkbox>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleText2Video" :loading="t2vLoading">
              {{ t2vLoading ? '生成中...' : '生成视频' }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- ============ Tab 2: 图生视频 ============ -->
      <el-tab-pane label="图生视频" name="image2video">
        <el-form :model="i2vForm" label-width="120px" class="video-form">
          <el-form-item label="提示词">
            <el-input
              v-model="i2vForm.prompt"
              type="textarea"
              :rows="4"
              placeholder="请输入视频描述，配合首帧/尾帧图片使用"
              maxlength="1500"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="首帧图片">
            <div class="path-input-block">
              <el-input
                v-model="i2vForm.firstFramePath"
                placeholder="粘贴图片标识（从图片生成结果复制），如 output/image/xxx.png"
                clearable
                size="small"
                @keyup.enter="applyFirstFramePath"
              >
                <template #append>
                  <el-button size="small" @click="applyFirstFramePath">使用</el-button>
                </template>
              </el-input>
              <div v-if="i2vForm.firstFramePath" class="path-preview">
                <img :src="getFileUrl(i2vForm.firstFramePath)" alt="首帧预览" class="preview-thumb" @error="onPreviewError($event)" />
                <span class="path-preview-label">{{ i2vForm.firstFramePath }}</span>
                <el-button size="small" type="danger" link @click="clearFirstFramePath">清除</el-button>
              </div>
            </div>
            <el-upload
              list-type="picture-card"
              :limit="1"
              accept="image/*"
              :auto-upload="false"
              :file-list="i2vForm.firstFrameFiles"
              :on-change="(file) => handleFirstFrameChange(file)"
              :on-remove="() => handleFirstFrameRemove()"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <span class="field-hint">或下方直接选择文件：支持 JPG / PNG / WEBP，单文件 ≤ 20MB</span>
          </el-form-item>

          <el-form-item label="尾帧图片（可选）">
            <div class="path-input-block">
              <el-input
                v-model="i2vForm.lastFramePath"
                placeholder="粘贴图片标识（可选），如 output/image/xxx.png"
                clearable
                size="small"
                @keyup.enter="applyLastFramePath"
              >
                <template #append>
                  <el-button size="small" @click="applyLastFramePath">使用</el-button>
                </template>
              </el-input>
              <div v-if="i2vForm.lastFramePath" class="path-preview">
                <img :src="getFileUrl(i2vForm.lastFramePath)" alt="尾帧预览" class="preview-thumb" @error="onPreviewError($event)" />
                <span class="path-preview-label">{{ i2vForm.lastFramePath }}</span>
                <el-button size="small" type="danger" link @click="clearLastFramePath">清除</el-button>
              </div>
            </div>
            <el-upload
              list-type="picture-card"
              :limit="1"
              accept="image/*"
              :auto-upload="false"
              :file-list="i2vForm.lastFrameFiles"
              :on-change="(file) => handleLastFrameChange(file)"
              :on-remove="() => handleLastFrameRemove()"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <span class="field-hint">或下方直接选择文件：不填则只使用首帧</span>
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="分辨率">
                <el-select v-model="i2vForm.resolution" style="width: 100%">
                  <el-option v-for="r in options.resolutionList" :key="r" :label="r" :value="r" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item :label="`时长 (${i2vForm.duration}s)`">
                <el-slider v-model="i2vForm.duration" :min="4" :max="15" :step="1" show-stops />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="宽高比">
                <el-input value="adaptive" disabled />
              </el-form-item>
            </el-col>
          </el-row>

          <el-alert
            title="图生视频的宽高比由输入图片决定（adaptive），无需也无法手动指定"
            type="info"
            :closable="false"
            show-icon
            class="i2v-ratio-hint"
          />

          <el-form-item>
            <el-checkbox v-model="i2vForm.aigcWatermark">添加 AIGC 水印</el-checkbox>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleImage2Video" :loading="i2vLoading">
              {{ i2vLoading ? '生成中...' : '生成视频' }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- ============ Tab 3: 多模态参考 ============ -->
      <el-tab-pane label="多模态参考" name="multimodal">
        <el-form :model="mmForm" label-width="120px" class="video-form">
          <el-form-item label="提示词">
            <el-input
              v-model="mmForm.prompt"
              type="textarea"
              :rows="4"
              placeholder="请输入视频描述，配合参考素材使用"
              maxlength="1500"
              show-word-limit
            />
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="分辨率">
                <el-select v-model="mmForm.resolution" style="width: 100%">
                  <el-option v-for="r in options.resolutionList" :key="r" :label="r" :value="r" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item :label="`时长 (${mmForm.duration}s)`">
                <el-slider v-model="mmForm.duration" :min="4" :max="15" :step="1" show-stops />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="宽高比">
                <el-select v-model="mmForm.ratio" style="width: 100%">
                  <el-option v-for="r in options.ratioList" :key="r" :label="r" :value="r" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="参考图（≤9）">
            <div class="path-input-block">
              <el-input
                v-model="mmImagePathInput"
                type="textarea"
                :rows="2"
                placeholder="粘贴图片标识（每行一个，最多 9 个），如 output/image/xxx.png"
                size="small"
              />
              <el-button size="small" type="primary" @click="applyMmImagePaths">加入列表</el-button>
              <el-button size="small" @click="mmImagePathInput = ''">清空输入</el-button>
              <div v-if="mmForm.referenceImagePaths.length > 0" class="path-preview-list">
                <div v-for="(p, idx) in mmForm.referenceImagePaths" :key="'mm-path-' + idx" class="path-preview">
                  <img :src="getFileUrl(p)" alt="参考图预览" class="preview-thumb" @error="onPreviewError($event)" />
                  <span class="path-preview-label">{{ p }}</span>
                  <el-button size="small" type="danger" link @click="removeMmImagePath(idx)">移除</el-button>
                </div>
              </div>
            </div>
            <el-upload
              list-type="picture-card"
              :limit="9"
              multiple
              accept="image/*"
              :auto-upload="false"
              :file-list="mmForm.referenceImageFiles"
              :on-change="(file, fileList) => (mmForm.referenceImageFiles = fileList)"
              :on-remove="(file, fileList) => (mmForm.referenceImageFiles = fileList)"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <span class="field-hint">或下方直接选择文件：单文件 ≤ 20MB，标识与上传文件可同时使用</span>
          </el-form-item>

          <el-form-item label="参考视频（≤3）">
            <el-upload
              list-type="text"
              :limit="3"
              multiple
              accept="video/*"
              :auto-upload="false"
              :file-list="mmForm.referenceVideoFiles"
              :on-change="(file, fileList) => (mmForm.referenceVideoFiles = fileList)"
              :on-remove="(file, fileList) => (mmForm.referenceVideoFiles = fileList)"
            >
              <el-button>选择视频文件</el-button>
            </el-upload>
            <span class="field-hint">参考视频用于动作/节奏参考，单文件 ≤ 20MB</span>
          </el-form-item>

          <el-form-item label="参考音频（≤3）">
            <el-upload
              list-type="text"
              :limit="3"
              multiple
              accept="audio/*"
              :auto-upload="false"
              :file-list="mmForm.referenceAudioFiles"
              :on-change="(file, fileList) => (mmForm.referenceAudioFiles = fileList)"
              :on-remove="(file, fileList) => (mmForm.referenceAudioFiles = fileList)"
            >
              <el-button>选择音频文件</el-button>
            </el-upload>
            <span class="field-hint">参考音频用于配乐/环境音参考，单文件 ≤ 20MB</span>
          </el-form-item>

          <el-form-item>
            <el-checkbox v-model="mmForm.aigcWatermark">添加 AIGC 水印</el-checkbox>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleMultimodal" :loading="mmLoading">
              {{ mmLoading ? '生成中...' : '生成视频' }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- ============ Tab 4: 提示词增强 ============ -->
      <el-tab-pane label="提示词增强" name="enhance">
        <el-form :model="enhanceForm" label-width="120px" class="video-form">
          <el-form-item label="原始提示词">
            <el-input
              v-model="enhanceForm.prompt"
              type="textarea"
              :rows="5"
              placeholder="输入需要增强的提示词，IR 任务会分析后返回结构化增强版本"
              maxlength="1500"
              show-word-limit
            />
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item :label="`目标时长 (${enhanceForm.duration}s)`">
                <el-slider v-model="enhanceForm.duration" :min="4" :max="15" :step="1" show-stops />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="目标宽高比">
                <el-select v-model="enhanceForm.ratio" style="width: 100%">
                  <el-option v-for="r in options.ratioList" :key="r" :label="r" :value="r" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item>
            <el-button type="primary" @click="handleEnhance" :loading="enhanceLoading">
              {{ enhanceLoading ? '增强中...' : '增强提示词' }}
            </el-button>
          </el-form-item>
        </el-form>

        <div v-if="enhanceResult" class="result">
          <h3>增强结果</h3>
          <p><strong>taskId：</strong>{{ enhanceResult.taskId }}</p>
          <p><strong>完成时间：</strong>{{ enhanceResult.enhancedAt }}</p>
          <div class="enhance-prompt-box">
            <pre>{{ enhanceResult.prompt }}</pre>
          </div>
          <el-button type="success" @click="useEnhancedPrompt">应用到文生视频</el-button>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 通用生成进度区 -->
    <div v-if="currentTaskId" class="progress-section">
      <el-alert :title="`当前任务：${currentStatusLabel}`" type="info" :closable="false" show-icon />
      <el-progress :percentage="progressPercent" :status="progressStatus" class="progress-bar" />
      <p class="progress-text">taskId: {{ currentTaskId }} · 每 3 秒轮询一次</p>
      <el-button v-if="currentTaskRunning" type="danger" @click="handleCancelTask" :loading="cancelLoading">
        取消任务
      </el-button>
    </div>

    <!-- 通用生成结果区 -->
    <div v-if="videoUrl" class="result">
      <h3>生成结果</h3>
      <video :src="videoUrl" controls class="result-video" />
      <p>
        <a :href="videoUrl" download target="_blank" class="download-link">下载视频</a>
      </p>
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon class="error-alert" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getVideoOptions,
  createVideoTask,
  getVideoTaskStatus,
  cancelVideoTask,
  enhanceVideoPrompt,
  uploadVideoReferenceFile,
} from '../api'

// ===== Tab 状态 =====
const activeTab = ref('text2video')

// ===== 选项（从后端 GET /video/options 加载） =====
const options = reactive({
  model: 'MiniMax-H3',
  resolutionList: ['768P', '2K'],
  durationList: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  ratioList: ['adaptive', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
  taskType: {},
  status: {},
})

// 文生视频专用的 ratio 列表（剔除 adaptive）
const text2videoRatioList = computed(() =>
  (options.ratioList || []).filter((r) => r !== 'adaptive'),
)

// ===== Tab 1 表单：文生视频 =====
const t2vForm = reactive({
  prompt: '',
  resolution: '2K',
  duration: 5,
  ratio: '16:9',
  aigcWatermark: false,
})
const t2vLoading = ref(false)

// ===== Tab 2 表单：图生视频 =====
const i2vForm = reactive({
  prompt: '',
  firstFrameFiles: [],
  lastFrameFiles: [],
  firstFramePath: '',
  lastFramePath: '',
  resolution: '2K',
  duration: 5,
  aigcWatermark: false,
})
const i2vLoading = ref(false)

// ===== Tab 3 表单：多模态参考 =====
const mmForm = reactive({
  prompt: '',
  resolution: '2K',
  duration: 5,
  ratio: 'adaptive',
  aigcWatermark: false,
  referenceImageFiles: [],
  referenceImagePaths: [],
  referenceVideoFiles: [],
  referenceAudioFiles: [],
})
const mmLoading = ref(false)
const mmImagePathInput = ref('')

// ===== Tab 4 表单：提示词增强 =====
const enhanceForm = reactive({
  prompt: '',
  duration: 5,
  ratio: 'adaptive',
})
const enhanceLoading = ref(false)
const enhanceResult = ref(null)

// ===== 全局状态：轮询 / 进度 / 结果 / 错误 =====
const currentTaskId = ref('')
const currentStatus = ref('') // queued / running / succeeded / failed / cancelled
const pollingTimer = ref(null)
const videoUrl = ref('')
const error = ref('')
const cancelLoading = ref(false)

const currentTaskRunning = computed(
  () => currentStatus.value === 'queued' || currentStatus.value === 'running',
)

const currentStatusLabel = computed(() => {
  switch (currentStatus.value) {
    case 'queued': return '排队中'
    case 'running': return '生成中'
    case 'succeeded': return '已成功'
    case 'failed': return '已失败'
    case 'cancelled': return '已取消'
    default: return '处理中'
  }
})

const progressPercent = computed(() => {
  if (currentStatus.value === 'queued') return 10
  if (currentStatus.value === 'running') return 60
  if (currentStatus.value === 'succeeded') return 100
  if (currentStatus.value === 'failed' || currentStatus.value === 'cancelled') return 100
  return 0
})

const progressStatus = computed(() => {
  if (currentStatus.value === 'succeeded') return 'success'
  if (currentStatus.value === 'failed' || currentStatus.value === 'cancelled') return 'exception'
  return ''
})

// ===== 工具函数 =====
function getFileUrl(filePath) {
  if (!filePath) return ''
  if (/^https?:\/\//i.test(filePath)) return filePath
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.startsWith('/') ? normalized : '/' + normalized
}

// ===== 图片标识处理 =====
// 把图片标识统一规范化为后端能识别的相对路径
function normalizeImagePath(raw) {
  if (!raw || typeof raw !== 'string') return ''
  let p = raw.trim().replace(/\\/g, '/')
  if (p.startsWith('/output/')) p = 'output/' + p.slice('/output/'.length)
  while (p.startsWith('/')) p = p.slice(1)
  return p
}

// 用 HEAD 请求探测 /output/<path> 是否可达
async function probeImagePath(p) {
  if (!p) return false
  const url = getFileUrl(p)
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.ok
  } catch (_) {
    return false
  }
}

function hasI2vMedia() {
  return Boolean(i2vForm.firstFramePath || i2vForm.lastFramePath) ||
    i2vForm.firstFrameFiles.length > 0 ||
    i2vForm.lastFrameFiles.length > 0
}

async function applyFirstFramePath() {
  const normalized = normalizeImagePath(i2vForm.firstFramePath)
  if (!normalized) {
    ElMessage.warning('请输入图片标识')
    return
  }
  if (!(await probeImagePath(normalized))) {
    ElMessage.error('图片标识无效或文件不存在：' + normalized)
    return
  }
  i2vForm.firstFramePath = normalized
  ElMessage.success('首帧图片标识已应用')
}

function clearFirstFramePath() {
  i2vForm.firstFramePath = ''
}

async function applyLastFramePath() {
  const normalized = normalizeImagePath(i2vForm.lastFramePath)
  if (!normalized) {
    ElMessage.warning('请输入图片标识')
    return
  }
  if (!(await probeImagePath(normalized))) {
    ElMessage.error('图片标识无效或文件不存在：' + normalized)
    return
  }
  i2vForm.lastFramePath = normalized
  ElMessage.success('尾帧图片标识已应用')
}

function clearLastFramePath() {
  i2vForm.lastFramePath = ''
}

async function applyMmImagePaths() {
  const lines = (mmImagePathInput.value || '')
    .split(/[\r\n]+/)
    .map((s) => normalizeImagePath(s))
    .filter(Boolean)
  if (lines.length === 0) {
    ElMessage.warning('请输入至少一个图片标识')
    return
  }
  const remain = 9 - mmForm.referenceImagePaths.length
  if (remain <= 0) {
    ElMessage.warning('参考图标识已达上限 9 个')
    return
  }
  const toAdd = []
  for (const p of lines) {
    if (toAdd.length >= remain) break
    if (mmForm.referenceImagePaths.includes(p) || toAdd.includes(p)) continue
    if (await probeImagePath(p)) toAdd.push(p)
    else ElMessage.warning('跳过无效标识：' + p)
  }
  if (toAdd.length === 0) {
    ElMessage.error('没有可用的图片标识')
    return
  }
  mmForm.referenceImagePaths.push(...toAdd)
  mmImagePathInput.value = ''
  ElMessage.success(`已添加 ${toAdd.length} 个参考图标识`)
}

function removeMmImagePath(idx) {
  mmForm.referenceImagePaths.splice(idx, 1)
}

function onPreviewError(e) {
  if (e && e.target) e.target.style.opacity = '0.3'
}

// 通用：上传一个或多个本地文件，返回 file_id 数组（用于后续作为 URL 入参）
async function uploadFiles(files, purpose = 'video_reference') {
  const results = []
  for (const f of files) {
    const raw = f.raw || f
    if (!raw) continue
    const formData = new FormData()
    formData.append('file', raw)
    formData.append('purpose', purpose)
    const res = await uploadVideoReferenceFile(formData)
    if (res.data && res.data.success) {
      results.push(res.data.data.fileId)
    } else {
      throw new Error(res.data?.error || '上传失败')
    }
  }
  return results
}

// 通用：从 el-upload fileList 中提取第一个文件的 raw File 对象
function pickFirstRaw(fileList) {
  if (!Array.isArray(fileList) || fileList.length === 0) return null
  return fileList[0].raw || fileList[0]
}

// ===== 轮询 =====
function stopPolling() {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

async function pollTaskStatus(taskId) {
  try {
    const res = await getVideoTaskStatus(taskId)
    const data = res.data && res.data.data
    if (!data) return

    currentStatus.value = data.status || ''
    if (data.filePath) {
      videoUrl.value = getFileUrl(data.filePath)
    }

    if (data.status === 'succeeded') {
      stopPolling()
      ElMessage.success('视频生成成功')
      // 三个 Tab 共享的 loading 标记统一关掉
      t2vLoading.value = i2vLoading.value = mmLoading.value = false
    } else if (data.status === 'failed') {
      stopPolling()
      ElMessage.error(data.error_msg || data.error?.message || '视频生成失败')
      t2vLoading.value = i2vLoading.value = mmLoading.value = false
    } else if (data.status === 'cancelled') {
      stopPolling()
      ElMessage.warning('任务已取消')
      t2vLoading.value = i2vLoading.value = mmLoading.value = false
    }
  } catch (e) {
    // 单次轮询错误不要打断主流程
    console.error('[Video] 轮询出错:', e)
  }
}

function startPolling(taskId) {
  stopPolling()
  currentTaskId.value = taskId
  currentStatus.value = 'queued'
  videoUrl.value = ''
  // 立即拉一次，然后每 3 秒拉一次
  pollTaskStatus(taskId)
  pollingTimer.value = setInterval(() => pollTaskStatus(taskId), 3000)
}

// onUnmounted 必须释放 timer，避免组件卸载后轮询还在跑
onUnmounted(() => {
  stopPolling()
})

// ===== 加载选项 =====
onMounted(async () => {
  try {
    const res = await getVideoOptions()
    const data = res.data || {}
    options.model = data.model || 'MiniMax-H3'
    options.resolutionList = data.resolutionList || ['768P', '2K']
    options.durationList = data.durationList || [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    options.ratioList = data.ratioList || ['adaptive', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']
    options.taskType = data.taskType || {}
    options.status = data.status || {}
  } catch (e) {
    ElMessage.error(e.response?.data?.error || e.message || '获取视频选项失败')
  }
})

// ===== Tab 2 单文件上传回调 =====
function handleFirstFrameChange(file) {
  i2vForm.firstFrameFiles = [file]
}
function handleFirstFrameRemove() {
  i2vForm.firstFrameFiles = []
}
function handleLastFrameChange(file) {
  i2vForm.lastFrameFiles = [file]
}
function handleLastFrameRemove() {
  i2vForm.lastFrameFiles = []
}

// ===== Tab 1 提交：文生视频 =====
async function handleText2Video() {
  if (!t2vForm.prompt.trim()) {
    ElMessage.warning('请输入视频描述')
    return
  }
  if (!t2vForm.ratio || t2vForm.ratio === 'adaptive') {
    ElMessage.warning('文生视频必须显式选择非 adaptive 的宽高比')
    return
  }

  t2vLoading.value = true
  error.value = ''
  videoUrl.value = ''
  try {
    const res = await createVideoTask({
      prompt: t2vForm.prompt,
      resolution: t2vForm.resolution,
      duration: t2vForm.duration,
      ratio: t2vForm.ratio,
      aigcWatermark: t2vForm.aigcWatermark,
    })
    if (res.data && res.data.success) {
      ElMessage.info('视频生成已启动，请耐心等待...')
      startPolling(res.data.data.taskId)
    } else {
      error.value = res.data?.error || '创建任务失败'
      t2vLoading.value = false
    }
  } catch (e) {
    // 遵循 AGENTS.md：优先使用后端返回的 error 字段
    error.value = e.response?.data?.error || e.message || '创建任务失败'
    ElMessage.error(error.value)
    t2vLoading.value = false
  }
}

// ===== Tab 2 提交：图生视频 =====
async function handleImage2Video() {
  if (!i2vForm.prompt.trim()) {
    ElMessage.warning('请输入视频描述')
    return
  }
  if (!hasI2vMedia()) {
    ElMessage.warning('图生视频至少需要提供首帧或尾帧图片（上传文件或粘贴图片标识）')
    return
  }

  t2vLoading.value = i2vLoading.value = true
  error.value = ''
  videoUrl.value = ''
  try {
    const payload = {
      prompt: i2vForm.prompt,
      resolution: i2vForm.resolution,
      duration: i2vForm.duration,
      aigcWatermark: i2vForm.aigcWatermark,
    }

    // 图片标识优先于上传文件
    if (i2vForm.firstFramePath) {
      payload.firstFrame = i2vForm.firstFramePath
    } else if (i2vForm.firstFrameFiles.length > 0) {
      const ids = await uploadFiles([pickFirstRaw(i2vForm.firstFrameFiles)])
      payload.firstFrame = ids[0]
    }
    if (i2vForm.lastFramePath) {
      payload.lastFrame = i2vForm.lastFramePath
    } else if (i2vForm.lastFrameFiles.length > 0) {
      const ids = await uploadFiles([pickFirstRaw(i2vForm.lastFrameFiles)])
      payload.lastFrame = ids[0]
    }

    const res = await createVideoTask(payload)
    if (res.data && res.data.success) {
      ElMessage.info('视频生成已启动，请耐心等待...')
      startPolling(res.data.data.taskId)
    } else {
      error.value = res.data?.error || '创建任务失败'
      t2vLoading.value = i2vLoading.value = false
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || '创建任务失败'
    ElMessage.error(error.value)
    t2vLoading.value = i2vLoading.value = false
  }
}

// ===== Tab 3 提交：多模态参考 =====
async function handleMultimodal() {
  if (!mmForm.prompt.trim()) {
    ElMessage.warning('请输入视频描述')
    return
  }
  const imgCount = mmForm.referenceImageFiles.length
  const pathCount = mmForm.referenceImagePaths.length
  const vidCount = mmForm.referenceVideoFiles.length
  const audCount = mmForm.referenceAudioFiles.length
  if (imgCount + pathCount + vidCount + audCount === 0) {
    ElMessage.warning('多模态参考至少需要一个参考素材（图/视频/音频，可直接粘贴图片标识）')
    return
  }

  t2vLoading.value = i2vLoading.value = mmLoading.value = true
  error.value = ''
  videoUrl.value = ''
  try {
    const payload = {
      prompt: mmForm.prompt,
      resolution: mmForm.resolution,
      duration: mmForm.duration,
      ratio: mmForm.ratio,
      aigcWatermark: mmForm.aigcWatermark,
    }

    // 图片标识与上传文件可同时使用：标识在前，上传文件在后
    const imgPaths = mmForm.referenceImagePaths.slice()
    if (imgCount > 0) {
      const ids = await uploadFiles(
        mmForm.referenceImageFiles.map((f) => f.raw || f),
      )
      imgPaths.push(...ids)
    }
    if (imgPaths.length > 0) payload.referenceImages = imgPaths
    if (vidCount > 0) {
      payload.referenceVideos = await uploadFiles(
        mmForm.referenceVideoFiles.map((f) => f.raw || f),
      )
    }
    if (audCount > 0) {
      payload.referenceAudios = await uploadFiles(
        mmForm.referenceAudioFiles.map((f) => f.raw || f),
      )
    }

    const res = await createVideoTask(payload)
    if (res.data && res.data.success) {
      ElMessage.info('视频生成已启动，请耐心等待...')
      startPolling(res.data.data.taskId)
    } else {
      error.value = res.data?.error || '创建任务失败'
      t2vLoading.value = i2vLoading.value = mmLoading.value = false
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || '创建任务失败'
    ElMessage.error(error.value)
    t2vLoading.value = i2vLoading.value = mmLoading.value = false
  }
}

// ===== Tab 4 提交：提示词增强 =====
async function handleEnhance() {
  if (!enhanceForm.prompt.trim()) {
    ElMessage.warning('请输入需要增强的提示词')
    return
  }
  enhanceLoading.value = true
  error.value = ''
  try {
    const res = await enhanceVideoPrompt({
      prompt: enhanceForm.prompt,
      duration: enhanceForm.duration,
      ratio: enhanceForm.ratio,
    })
    if (res.data && res.data.success) {
      enhanceResult.value = res.data.data
      ElMessage.success('提示词增强完成')
    } else {
      error.value = res.data?.error || '提示词增强失败'
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || '提示词增强失败'
    ElMessage.error(error.value)
  } finally {
    enhanceLoading.value = false
  }
}

function useEnhancedPrompt() {
  if (enhanceResult.value && enhanceResult.value.prompt) {
    t2vForm.prompt = enhanceResult.value.prompt
    activeTab.value = 'text2video'
    ElMessage.success('已应用到文生视频表单')
  }
}

// ===== 取消任务 =====
async function handleCancelTask() {
  if (!currentTaskId.value) return
  cancelLoading.value = true
  try {
    await cancelVideoTask(currentTaskId.value)
    // 轮询会在下一次 tick 拿到 cancelled 状态，无需手动 stopPolling
  } catch (e) {
    ElMessage.error(e.response?.data?.error || e.message || '取消任务失败')
  } finally {
    cancelLoading.value = false
  }
}
</script>

<style scoped>
.video-view {
  max-width: 1000px;
}
.video-tabs {
  margin-top: 20px;
}
.video-form {
  margin-top: 20px;
  max-width: 760px;
}
.char-count {
  font-size: 12px;
  color: #999;
  float: right;
}
.field-hint {
  font-size: 12px;
  color: #909399;
  margin-left: 12px;
}
.i2v-ratio-hint {
  margin-bottom: 16px;
}
.progress-section {
  margin-top: 24px;
  padding: 16px;
  background: #f0f9eb;
  border-radius: 8px;
}
.progress-bar {
  margin: 12px 0;
}
.progress-text {
  color: #67c23a;
  text-align: center;
  font-size: 13px;
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
.result-video {
  width: 100%;
  max-height: 540px;
  margin-top: 12px;
  background: #000;
  border-radius: 4px;
}
.download-link {
  display: inline-block;
  margin-top: 12px;
  color: #409eff;
  text-decoration: none;
}
.download-link:hover {
  text-decoration: underline;
}
.enhance-prompt-box {
  margin: 16px 0;
  padding: 12px;
  background: #fff;
  border-radius: 4px;
  max-height: 400px;
  overflow-y: auto;
}
.enhance-prompt-box pre {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
  font-family: inherit;
  line-height: 1.6;
}
.error-alert {
  margin-top: 16px;
}
.path-input-block {
  margin-top: 4px;
  margin-bottom: 12px;
  padding: 10px 12px;
  background: #f5f7fa;
  border: 1px dashed #c0c4cc;
  border-radius: 4px;
}
.path-input-block .el-button + .el-button {
  margin-left: 8px;
}
.path-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 6px 8px;
  background: #f0f9eb;
  border-radius: 4px;
}
.path-preview .preview-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #e4e7ed;
  flex-shrink: 0;
}
.path-preview .path-preview-label {
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.path-preview-list {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
