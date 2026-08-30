<template>
  <div class="video-old-view">
    <h2>视频生成（旧版 / V1）</h2>
    <p class="subtitle">MiniMax-Hailuo / T2V-01 / I2V-01 / S2V-01 系列模型，与新版 H3 模型并存</p>

    <el-tabs v-model="activeTab" class="video-old-tabs">
      <!-- ============ Tab 1: 文生视频 ============ -->
      <el-tab-pane label="文生视频" name="t2v">
        <el-form :model="t2vForm" label-width="120px" class="video-old-form">
          <el-form-item label="提示词">
            <el-input
              ref="t2vPromptRef"
              v-model="t2vForm.prompt"
              type="textarea"
              :rows="4"
              placeholder="请输入视频描述，如：一只小猫在窗台上追逐阳光"
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="运镜指令">
            <div class="camera-commands">
              <el-button
                v-for="cmd in options.cameraCommands"
                :key="cmd"
                size="small"
                plain
                type="primary"
                :disabled="!currentModelDef.supportsCamera"
                @click="insertCameraCommand('t2v', cmd)"
              >
                [{{ cmd }}]
              </el-button>
            </div>
            <span class="field-hint">点击按钮在光标位置插入运镜指令；仅支持运镜的模型可用</span>
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="模型">
                <el-select v-model="t2vForm.model" style="width: 100%" @change="onModelChange('t2v')">
                  <el-option
                    v-for="m in options.models.t2v"
                    :key="m.value"
                    :label="`${m.value}（${m.label.replace(/^[^）]+（/, '').replace(/）$/, '')}）`"
                    :value="m.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="分辨率">
                <el-select v-model="t2vForm.resolution" style="width: 100%">
                  <el-option v-for="r in currentModelDef.resolution" :key="r" :label="r" :value="r" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item :label="`时长 (${t2vForm.duration}s)`">
                <el-radio-group v-model="t2vForm.duration">
                  <el-radio-button v-for="d in currentModelDef.duration" :key="d" :value="d">{{ d }}s</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item>
            <el-checkbox v-model="t2vForm.promptOptimizer">启用 prompt_optimizer</el-checkbox>
            <el-checkbox v-if="showFastPretreatment('t2v')" v-model="t2vForm.fastPretreatment" style="margin-left: 16px">
              启用 fast_pretreatment（Hailuo 系列）
            </el-checkbox>
            <el-checkbox v-model="t2vForm.aigcWatermark" style="margin-left: 16px">添加 AIGC 水印</el-checkbox>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleT2V" :loading="submitting">
              {{ submitting ? '生成中...' : '生成视频' }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- ============ Tab 2: 图生视频 ============ -->
      <el-tab-pane label="图生视频" name="i2v">
        <el-form :model="i2vForm" label-width="120px" class="video-old-form">
          <el-form-item label="提示词">
            <el-input
              v-model="i2vForm.prompt"
              type="textarea"
              :rows="4"
              placeholder="请输入视频描述，配合首帧图片使用"
              maxlength="2000"
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
                @keyup.enter="applyI2vFirstFramePath"
              >
                <template #append>
                  <el-button size="small" @click="applyI2vFirstFramePath">使用</el-button>
                </template>
              </el-input>
              <div v-if="i2vForm.firstFramePath" class="path-preview">
                <img :src="getFileUrl(i2vForm.firstFramePath)" alt="首帧预览" class="preview-thumb" @error="onPreviewError($event)" />
                <span class="path-preview-label">{{ i2vForm.firstFramePath }}</span>
                <el-button size="small" type="danger" link @click="clearI2vFirstFramePath">清除</el-button>
              </div>
            </div>
            <el-upload
              list-type="picture-card"
              :limit="1"
              accept="image/*"
              :auto-upload="false"
              :file-list="i2vForm.firstFrameFiles"
              :on-change="(file) => handleFirstFrameChange('i2v', file)"
              :on-remove="() => handleFirstFrameRemove('i2v')"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <span class="field-hint">或下方直接选择文件：支持 JPG / PNG / WEBP，单文件 ≤ 20MB</span>
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="模型">
                <el-select v-model="i2vForm.model" style="width: 100%" @change="onModelChange('i2v')">
                  <el-option
                    v-for="m in options.models.i2v"
                    :key="m.value"
                    :label="`${m.value}（${m.label.replace(/^[^）]+（/, '').replace(/）$/, '')}）`"
                    :value="m.value"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="分辨率">
                <el-select v-model="i2vForm.resolution" style="width: 100%">
                  <el-option v-for="r in currentModelDefForScene('i2v').resolution" :key="r" :label="r" :value="r" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item :label="`时长 (${i2vForm.duration}s)`">
                <el-radio-group v-model="i2vForm.duration">
                  <el-radio-button v-for="d in currentModelDefForScene('i2v').duration" :key="d" :value="d">{{ d }}s</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item>
            <el-checkbox v-model="i2vForm.promptOptimizer">启用 prompt_optimizer</el-checkbox>
            <el-checkbox v-model="i2vForm.aigcWatermark" style="margin-left: 16px">添加 AIGC 水印</el-checkbox>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleI2V" :loading="submitting">
              {{ submitting ? '生成中...' : '生成视频' }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- ============ Tab 3: 首尾帧生视频 ============ -->
      <el-tab-pane label="首尾帧生视频" name="fl2v">
        <el-form :model="fl2vForm" label-width="120px" class="video-old-form">
          <el-form-item label="提示词">
            <el-input
              v-model="fl2vForm.prompt"
              type="textarea"
              :rows="4"
              placeholder="请输入视频描述，配合首尾帧图片使用"
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="首帧图片">
            <div class="path-input-block">
              <el-input
                v-model="fl2vForm.firstFramePath"
                placeholder="粘贴图片标识（从图片生成结果复制），如 output/image/xxx.png"
                clearable
                size="small"
                @keyup.enter="applyFl2vFirstFramePath"
              >
                <template #append>
                  <el-button size="small" @click="applyFl2vFirstFramePath">使用</el-button>
                </template>
              </el-input>
              <div v-if="fl2vForm.firstFramePath" class="path-preview">
                <img :src="getFileUrl(fl2vForm.firstFramePath)" alt="首帧预览" class="preview-thumb" @error="onPreviewError($event)" />
                <span class="path-preview-label">{{ fl2vForm.firstFramePath }}</span>
                <el-button size="small" type="danger" link @click="clearFl2vFirstFramePath">清除</el-button>
              </div>
            </div>
            <el-upload
              list-type="picture-card"
              :limit="1"
              accept="image/*"
              :auto-upload="false"
              :file-list="fl2vForm.firstFrameFiles"
              :on-change="(file) => handleFirstFrameChange('fl2v', file)"
              :on-remove="() => handleFirstFrameRemove('fl2v')"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <span class="field-hint">或下方直接选择文件：首尾帧仅 MiniMax-Hailuo-02 支持，分辨率 768P / 1080P</span>
          </el-form-item>

          <el-form-item label="尾帧图片">
            <div class="path-input-block">
              <el-input
                v-model="fl2vForm.lastFramePath"
                placeholder="粘贴图片标识（可选），如 output/image/xxx.png"
                clearable
                size="small"
                @keyup.enter="applyFl2vLastFramePath"
              >
                <template #append>
                  <el-button size="small" @click="applyFl2vLastFramePath">使用</el-button>
                </template>
              </el-input>
              <div v-if="fl2vForm.lastFramePath" class="path-preview">
                <img :src="getFileUrl(fl2vForm.lastFramePath)" alt="尾帧预览" class="preview-thumb" @error="onPreviewError($event)" />
                <span class="path-preview-label">{{ fl2vForm.lastFramePath }}</span>
                <el-button size="small" type="danger" link @click="clearFl2vLastFramePath">清除</el-button>
              </div>
            </div>
            <el-upload
              list-type="picture-card"
              :limit="1"
              accept="image/*"
              :auto-upload="false"
              :file-list="fl2vForm.lastFrameFiles"
              :on-change="(file) => handleLastFrameChange('fl2v', file)"
              :on-remove="() => handleLastFrameRemove('fl2v')"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <span class="field-hint">或下方直接选择文件：首尾帧仅 MiniMax-Hailuo-02 支持</span>
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="模型">
                <el-input :model-value="'MiniMax-Hailuo-02（首尾帧）'" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="分辨率">
                <el-select v-model="fl2vForm.resolution" style="width: 100%">
                  <el-option label="768P" value="768P" />
                  <el-option label="1080P" value="1080P" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item :label="`时长 (${fl2vForm.duration}s)`">
                <el-radio-group v-model="fl2vForm.duration">
                  <el-radio-button :value="6">6s</el-radio-button>
                  <el-radio-button :value="10">10s</el-radio-button>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item>
            <el-checkbox v-model="fl2vForm.aigcWatermark">添加 AIGC 水印</el-checkbox>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleFL2V" :loading="submitting">
              {{ submitting ? '生成中...' : '生成视频' }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- ============ Tab 4: 主体参考视频 ============ -->
      <el-tab-pane label="主体参考视频" name="s2v">
        <el-form :model="s2vForm" label-width="120px" class="video-old-form">
          <el-form-item label="提示词">
            <el-input
              v-model="s2vForm.prompt"
              type="textarea"
              :rows="4"
              placeholder="请输入视频描述，配合人物主体参考使用"
              maxlength="2000"
              show-word-limit
            />
          </el-form-item>

          <el-form-item label="人物主体图">
            <div class="path-input-block">
              <el-input
                v-model="s2vForm.subjectPath"
                placeholder="粘贴图片标识（从图片生成结果复制），如 output/image/xxx.png"
                clearable
                size="small"
                @keyup.enter="applyS2vSubjectPath"
              >
                <template #append>
                  <el-button size="small" @click="applyS2vSubjectPath">使用</el-button>
                </template>
              </el-input>
              <div v-if="s2vForm.subjectPath" class="path-preview">
                <img :src="getFileUrl(s2vForm.subjectPath)" alt="主体预览" class="preview-thumb" @error="onPreviewError($event)" />
                <span class="path-preview-label">{{ s2vForm.subjectPath }}</span>
                <el-button size="small" type="danger" link @click="clearS2vSubjectPath">清除</el-button>
              </div>
            </div>
            <el-upload
              list-type="picture-card"
              :limit="1"
              accept="image/*"
              :auto-upload="false"
              :file-list="s2vForm.subjectFiles"
              :on-change="(file) => handleSubjectChange(file)"
              :on-remove="() => handleSubjectRemove()"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
            <span class="field-hint">或下方直接选择文件：S2V-01 仅支持单个人物主体（面部），单文件 ≤ 20MB</span>
          </el-form-item>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="模型">
                <el-input :model-value="'S2V-01（主体参考）'" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="分辨率">
                <el-input :model-value="'720P（占位）'" disabled />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="时长">
                <el-input :model-value="'6s（占位）'" disabled />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item>
            <el-checkbox v-model="s2vForm.aigcWatermark">添加 AIGC 水印</el-checkbox>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleS2V" :loading="submitting">
              {{ submitting ? '生成中...' : '生成视频' }}
            </el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>

    <!-- ============ 共用生成结果区域 ============ -->
    <div v-if="currentTaskId" class="result-section">
      <h3>生成结果</h3>
      <p>任务 ID：<code>{{ currentTaskId }}</code></p>
      <p>
        当前状态：
        <el-tag :type="statusTagType" size="small">{{ statusLabel }}</el-tag>
      </p>
      <el-progress
        v-if="statusRunning"
        :percentage="progressPercent"
        :status="progressStatus"
        :indeterminate="true"
        class="progress-bar"
      />
      <p v-if="currentFileMeta" class="meta">
        分辨率：{{ currentFileMeta.videoWidth }} × {{ currentFileMeta.videoHeight }} ｜
        大小：{{ (currentFileMeta.fileSize / 1024 / 1024).toFixed(2) }} MB
      </p>
      <video
        v-if="videoUrl"
        :src="videoUrl"
        controls
        class="result-video"
      />
      <el-button
        v-if="currentStatus === 'Fail'"
        type="warning"
        plain
        @click="retryCurrentTab"
        class="retry-btn"
      >重试（清空状态回到表单）</el-button>
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon class="error-alert" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import {
  getVideoOldOptions,
  createVideoOldTaskT2V,
  createVideoOldTaskI2V,
  createVideoOldTaskFL2V,
  createVideoOldTaskS2V,
  getVideoOldTaskStatus,
} from '../api'

// ===== 全局 options / 状态 =====
const activeTab = ref('t2v')
const submitting = ref(false)
const error = ref('')

// 后端拉取的 options；cameraCommands / status 用于前端展示
const options = reactive({
  models: { t2v: [], i2v: [], fl2v: [], s2v: [] },
  resolutions: [],
  durations: [],
  status: {},
  cameraCommands: [],
  scenes: [],
})

// fast_pretreatment 白名单（与服务端 FAST_PRETREATMENT_MODELS 保持一致）
const FAST_PRETREATMENT_MODELS = new Set([
  'MiniMax-Hailuo-2.3',
  'MiniMax-Hailuo-2.3-Fast',
  'MiniMax-Hailuo-02',
])

function showFastPretreatment(scene) {
  const m = currentModelValue(scene)
  return m && FAST_PRETREATMENT_MODELS.has(m)
}

function currentModelValue(scene) {
  if (scene === 't2v') return t2vForm.model
  if (scene === 'i2v') return i2vForm.model
  return null
}

function findModelDef(scene, modelValue) {
  const list = options.models[scene] || []
  return list.find((m) => m.value === modelValue) || null
}

// t2v 当前选中的模型 def（运镜按钮启用状态 + 分辨率/时长联动）
const currentModelDef = computed(() => {
  return findModelDef('t2v', t2vForm.model) || { resolution: options.resolutions, duration: options.durations, supportsCamera: false }
})

function currentModelDefForScene(scene) {
  if (scene === 't2v') return currentModelDef.value
  if (scene === 'i2v') return findModelDef('i2v', i2vForm.model) || { resolution: options.resolutions, duration: options.durations }
  if (scene === 'fl2v') return findModelDef('fl2v', fl2vForm.model) || { resolution: ['768P', '1080P'], duration: [6, 10] }
  if (scene === 's2v') return findModelDef('s2v', s2vForm.model) || { resolution: ['720P'], duration: [6] }
  return { resolution: [], duration: [] }
}

// ===== 4 个 Tab 的 form state =====
const t2vForm = reactive({
  prompt: '',
  model: 'MiniMax-Hailuo-2.3',
  resolution: '768P',
  duration: 6,
  promptOptimizer: true,
  fastPretreatment: false,
  aigcWatermark: false,
})

const i2vForm = reactive({
  prompt: '',
  model: 'MiniMax-Hailuo-2.3',
  resolution: '768P',
  duration: 6,
  firstFrameFiles: [],
  firstFrameImage: '', // Base64 DataURL（来自上传文件 或 图片标识）
  firstFramePath: '',
  promptOptimizer: true,
  aigcWatermark: false,
})

const fl2vForm = reactive({
  prompt: '',
  model: 'MiniMax-Hailuo-02',
  resolution: '768P',
  duration: 6,
  firstFrameFiles: [],
  lastFrameFiles: [],
  firstFrameImage: '',
  lastFrameImage: '',
  firstFramePath: '',
  lastFramePath: '',
  aigcWatermark: false,
})

const s2vForm = reactive({
  prompt: '',
  model: 'S2V-01',
  resolution: '720P',
  duration: 6,
  subjectFiles: [],
  subjectImage: '', // Base64 DataURL（来自上传文件 或 图片标识）
  subjectPath: '',
  aigcWatermark: false,
})

// 切模型时把分辨率 / 时长同步到该模型的第一项（保证合法）
function onModelChange(scene) {
  if (scene === 't2v') {
    const def = findModelDef('t2v', t2vForm.model)
    if (def) {
      if (!def.resolution.includes(t2vForm.resolution)) t2vForm.resolution = def.resolution[0]
      if (!def.duration.includes(t2vForm.duration)) t2vForm.duration = def.duration[0]
    }
  } else if (scene === 'i2v') {
    const def = findModelDef('i2v', i2vForm.model)
    if (def) {
      if (!def.resolution.includes(i2vForm.resolution)) i2vForm.resolution = def.resolution[0]
      if (!def.duration.includes(i2vForm.duration)) i2vForm.duration = def.duration[0]
    }
  }
}

// ===== 运镜指令插入到 textarea 当前光标位置 =====
const t2vPromptRef = ref(null)

function insertCameraCommand(scene, cmd) {
  if (scene !== 't2v') return
  const elInst = t2vPromptRef.value
  if (!elInst || !elInst.textarea) {
    // 兜底：直接 append 到末尾
    t2vForm.prompt = (t2vForm.prompt || '') + `[${cmd}]`
    return
  }
  const ta = elInst.textarea
  const start = ta.selectionStart || 0
  const end = ta.selectionEnd || 0
  const text = ta.value || ''
  const inserted = `[${cmd}]`
  ta.value = text.slice(0, start) + inserted + text.slice(end)
  t2vForm.prompt = ta.value
  // 重新聚焦 + 光标定位到插入内容之后
  ta.focus()
  const newPos = start + inserted.length
  ta.setSelectionRange(newPos, newPos)
}

// ===== 图片上传：转 Base64 DataURL =====
const MAX_IMAGE_BYTES = 20 * 1024 * 1024 // 20MB

// 把图片标识路径转成可访问的 URL（与新版的 getFileUrl 一致）
function getFileUrl(filePath) {
  if (!filePath) return ''
  if (/^https?:\/\//i.test(filePath)) return filePath
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.startsWith('/') ? normalized : '/' + normalized
}

// 规范化图片标识：trim、反斜杠转斜杠、剥 /output/、剥前导 /
function normalizeImagePath(raw) {
  if (!raw || typeof raw !== 'string') return ''
  let p = raw.trim().replace(/\\/g, '/')
  if (p.startsWith('/output/')) p = 'output/' + p.slice('/output/'.length)
  while (p.startsWith('/')) p = p.slice(1)
  return p
}

// HEAD 探测 /output/<path> 是否存在
async function probeImagePath(p) {
  if (!p) return false
  try {
    const res = await fetch(getFileUrl(p), { method: 'HEAD' })
    return res.ok
  } catch (_) {
    return false
  }
}

// 通过 URL fetch 图，转 Base64 DataURL（V1 后端只接受 URL 或 DataURL）
async function fetchImageAsDataURL(path) {
  const res = await fetch(getFileUrl(path))
  if (!res.ok) throw new Error('图片加载失败 (' + res.status + ')')
  const blob = await res.blob()
  if (blob.size > MAX_IMAGE_BYTES) {
    throw new Error('图片超过 20MB（实际 ' + (blob.size / 1024 / 1024).toFixed(2) + 'MB）')
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(blob)
  })
}

// 把图片标识转成 DataURL 并落到指定字段；通用方法
async function applyImagePathToField(path, form, fieldName, label) {
  const normalized = normalizeImagePath(path)
  if (!normalized) {
    ElMessage.warning('请输入图片标识')
    return
  }
  if (!(await probeImagePath(normalized))) {
    ElMessage.error('图片标识无效或文件不存在：' + normalized)
    return
  }
  try {
    const dataURL = await fetchImageAsDataURL(normalized)
    form[fieldName] = dataURL
    ElMessage.success(label + '图片标识已应用')
  } catch (e) {
    ElMessage.error(e.message || '图片加载失败')
  }
}

function clearImagePathField(form, fieldName) {
  form[fieldName] = ''
  ElMessage.info('图片标识已清除')
}

function onPreviewError(e) {
  if (e && e.target) e.target.style.opacity = '0.3'
}

// 4 个图片字段的 apply/clear 快捷方法（供模板 @click 调用）
async function applyI2vFirstFramePath() {
  await applyImagePathToField(i2vForm.firstFramePath, i2vForm, 'firstFrameImage', '首帧')
}
function clearI2vFirstFramePath() {
  clearImagePathField(i2vForm, 'firstFrameImage')
}
async function applyFl2vFirstFramePath() {
  await applyImagePathToField(fl2vForm.firstFramePath, fl2vForm, 'firstFrameImage', '首帧')
}
function clearFl2vFirstFramePath() {
  clearImagePathField(fl2vForm, 'firstFrameImage')
}
async function applyFl2vLastFramePath() {
  await applyImagePathToField(fl2vForm.lastFramePath, fl2vForm, 'lastFrameImage', '尾帧')
}
function clearFl2vLastFramePath() {
  clearImagePathField(fl2vForm, 'lastFrameImage')
}
async function applyS2vSubjectPath() {
  await applyImagePathToField(s2vForm.subjectPath, s2vForm, 'subjectImage', '主体')
}
function clearS2vSubjectPath() {
  clearImagePathField(s2vForm, 'subjectImage')
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('文件为空'))
    if (file.size > MAX_IMAGE_BYTES) {
      return reject(new Error(`图片 ${file.name} 超过 20MB 限制（实际 ${(file.size / 1024 / 1024).toFixed(2)}MB）`))
    }
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

async function handleFirstFrameChange(scene, file) {
  try {
    const dataURL = await fileToDataURL(file.raw || file)
    if (scene === 'i2v') {
      i2vForm.firstFrameFiles = [file]
      i2vForm.firstFrameImage = dataURL
    } else if (scene === 'fl2v') {
      fl2vForm.firstFrameFiles = [file]
      fl2vForm.firstFrameImage = dataURL
    }
  } catch (e) {
    error.value = e.message || '图片读取失败'
    ElMessage.error(error.value)
  }
}

function handleFirstFrameRemove(scene) {
  if (scene === 'i2v') {
    i2vForm.firstFrameFiles = []
    i2vForm.firstFrameImage = ''
  } else if (scene === 'fl2v') {
    fl2vForm.firstFrameFiles = []
    fl2vForm.firstFrameImage = ''
  }
}

async function handleLastFrameChange(scene, file) {
  try {
    const dataURL = await fileToDataURL(file.raw || file)
    if (scene === 'fl2v') {
      fl2vForm.lastFrameFiles = [file]
      fl2vForm.lastFrameImage = dataURL
    }
  } catch (e) {
    error.value = e.message || '图片读取失败'
    ElMessage.error(error.value)
  }
}

function handleLastFrameRemove(scene) {
  if (scene === 'fl2v') {
    fl2vForm.lastFrameFiles = []
    fl2vForm.lastFrameImage = ''
  }
}

async function handleSubjectChange(file) {
  try {
    const dataURL = await fileToDataURL(file.raw || file)
    s2vForm.subjectFiles = [file]
    s2vForm.subjectImage = dataURL
  } catch (e) {
    error.value = e.message || '图片读取失败'
    ElMessage.error(error.value)
  }
}

function handleSubjectRemove() {
  s2vForm.subjectFiles = []
  s2vForm.subjectImage = ''
}

// ===== 共用生成结果 / 轮询 =====
const currentTaskId = ref('')
const currentStatus = ref('')
const currentFileMeta = ref(null)
const videoUrl = ref('')
const pollingTimer = ref(null)

const TERMINAL_STATUSES = new Set(['Success', 'Fail'])

const statusRunning = computed(
  () => currentStatus.value === 'Preparing' || currentStatus.value === 'Queueing' || currentStatus.value === 'Processing'
)

const statusLabel = computed(() => {
  switch (currentStatus.value) {
    case 'Preparing': return '准备中'
    case 'Queueing': return '排队中'
    case 'Processing': return '生成中'
    case 'Success': return '已成功'
    case 'Fail': return '已失败'
    default: return currentStatus.value || '未启动'
  }
})

const statusTagType = computed(() => {
  switch (currentStatus.value) {
    case 'Success': return 'success'
    case 'Fail': return 'danger'
    case 'Processing': return 'warning'
    case 'Queueing':
    case 'Preparing': return 'info'
    default: return ''
  }
})

const progressPercent = computed(() => {
  if (currentStatus.value === 'Success') return 100
  if (currentStatus.value === 'Fail') return 100
  if (currentStatus.value === 'Processing') return 60
  if (currentStatus.value === 'Queueing') return 30
  if (currentStatus.value === 'Preparing') return 10
  return 0
})

const progressStatus = computed(() => {
  if (currentStatus.value === 'Success') return 'success'
  if (currentStatus.value === 'Fail') return 'exception'
  return ''
})

function getStaticFileUrl(taskId) {
  return `/output/video_old/${taskId}.mp4`
}

function stopPolling() {
  if (pollingTimer.value) {
    clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

async function pollTaskStatus(taskId) {
  try {
    const res = await getVideoOldTaskStatus(taskId)
    const data = res.data && res.data.data
    if (!data) return
    currentStatus.value = data.status || ''
    if (data.fileId) currentFileMeta.value = {
      videoWidth: data.videoWidth,
      videoHeight: data.videoHeight,
      fileSize: data.fileSize,
    }
    if (data.filePath) {
      // 后端 filePath 是相对路径如 "output/video_old/<id>.mp4"；前端展示走 /output 静态代理
      videoUrl.value = getStaticFileUrl(taskId)
    }
    if (data.status === 'Success') {
      stopPolling()
      ElMessage.success('视频生成成功')
      submitting.value = false
    } else if (data.status === 'Fail') {
      stopPolling()
      ElMessage.error(data.error_msg || data.error || '视频生成失败')
      submitting.value = false
    }
  } catch (e) {
    // 单次轮询错误不打断主流程，但要走 e.response?.data?.error 优先级记日志
    console.error('[VideoOld] 轮询出错:', e.response?.data?.error || e.message || '未知错误')
  }
}

function startPolling(taskId) {
  stopPolling()
  currentTaskId.value = taskId
  currentStatus.value = 'Preparing'
  currentFileMeta.value = null
  videoUrl.value = ''
  pollTaskStatus(taskId)
  pollingTimer.value = setInterval(() => pollTaskStatus(taskId), 3000)
}

onUnmounted(() => {
  stopPolling()
})

function retryCurrentTab() {
  stopPolling()
  currentTaskId.value = ''
  currentStatus.value = ''
  currentFileMeta.value = null
  videoUrl.value = ''
  error.value = ''
  submitting.value = false
}

// ===== 4 个 Tab 提交 =====
async function handleT2V() {
  if (!t2vForm.prompt.trim()) {
    ElMessage.warning('请输入视频描述')
    return
  }
  submitting.value = true
  error.value = ''
  currentFileMeta.value = null
  videoUrl.value = ''
  try {
    const payload = {
      model: t2vForm.model,
      prompt: t2vForm.prompt,
      resolution: t2vForm.resolution,
      duration: t2vForm.duration,
      prompt_optimizer: t2vForm.promptOptimizer,
      aigc_watermark: t2vForm.aigcWatermark,
    }
    if (showFastPretreatment('t2v')) {
      payload.fast_pretreatment = t2vForm.fastPretreatment
    }
    const res = await createVideoOldTaskT2V(payload)
    if (res.data && res.data.success) {
      ElMessage.info('视频生成已启动，请耐心等待...')
      startPolling(res.data.data.taskId)
    } else {
      error.value = res.data?.error || '创建任务失败'
      ElMessage.error(error.value)
      submitting.value = false
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || '创建任务失败'
    ElMessage.error(error.value)
    submitting.value = false
  }
}

async function handleI2V() {
  if (!i2vForm.prompt.trim()) {
    ElMessage.warning('请输入视频描述')
    return
  }
  if (!i2vForm.firstFrameImage) {
    ElMessage.warning('请上传首帧图片')
    return
  }
  submitting.value = true
  error.value = ''
  currentFileMeta.value = null
  videoUrl.value = ''
  try {
    const payload = {
      model: i2vForm.model,
      prompt: i2vForm.prompt,
      first_frame_image: i2vForm.firstFrameImage,
      resolution: i2vForm.resolution,
      duration: i2vForm.duration,
      prompt_optimizer: i2vForm.promptOptimizer,
      aigc_watermark: i2vForm.aigcWatermark,
    }
    const res = await createVideoOldTaskI2V(payload)
    if (res.data && res.data.success) {
      ElMessage.info('视频生成已启动，请耐心等待...')
      startPolling(res.data.data.taskId)
    } else {
      error.value = res.data?.error || '创建任务失败'
      ElMessage.error(error.value)
      submitting.value = false
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || '创建任务失败'
    ElMessage.error(error.value)
    submitting.value = false
  }
}

async function handleFL2V() {
  if (!fl2vForm.prompt.trim()) {
    ElMessage.warning('请输入视频描述')
    return
  }
  if (!fl2vForm.firstFrameImage || !fl2vForm.lastFrameImage) {
    ElMessage.warning('请上传首帧与尾帧图片')
    return
  }
  submitting.value = true
  error.value = ''
  currentFileMeta.value = null
  videoUrl.value = ''
  try {
    const payload = {
      model: 'MiniMax-Hailuo-02',
      prompt: fl2vForm.prompt,
      first_frame_image: fl2vForm.firstFrameImage,
      last_frame_image: fl2vForm.lastFrameImage,
      resolution: fl2vForm.resolution,
      duration: fl2vForm.duration,
      aigc_watermark: fl2vForm.aigcWatermark,
    }
    const res = await createVideoOldTaskFL2V(payload)
    if (res.data && res.data.success) {
      ElMessage.info('视频生成已启动，请耐心等待...')
      startPolling(res.data.data.taskId)
    } else {
      error.value = res.data?.error || '创建任务失败'
      ElMessage.error(error.value)
      submitting.value = false
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || '创建任务失败'
    ElMessage.error(error.value)
    submitting.value = false
  }
}

async function handleS2V() {
  if (!s2vForm.prompt.trim()) {
    ElMessage.warning('请输入视频描述')
    return
  }
  if (!s2vForm.subjectImage) {
    ElMessage.warning('请上传人物主体图')
    return
  }
  submitting.value = true
  error.value = ''
  currentFileMeta.value = null
  videoUrl.value = ''
  try {
    const payload = {
      model: 'S2V-01',
      prompt: s2vForm.prompt,
      subject_reference: [
        { type: 'character', image: [s2vForm.subjectImage] },
      ],
      resolution: '720P',
      duration: 6,
      aigc_watermark: s2vForm.aigcWatermark,
    }
    const res = await createVideoOldTaskS2V(payload)
    if (res.data && res.data.success) {
      ElMessage.info('视频生成已启动，请耐心等待...')
      startPolling(res.data.data.taskId)
    } else {
      error.value = res.data?.error || '创建任务失败'
      ElMessage.error(error.value)
      submitting.value = false
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || '创建任务失败'
    ElMessage.error(error.value)
    submitting.value = false
  }
}

// ===== 加载 options =====
onMounted(async () => {
  try {
    const res = await getVideoOldOptions()
    const data = res.data || {}
    options.models = data.models || { t2v: [], i2v: [], fl2v: [], s2v: [] }
    options.resolutions = data.resolutions || ['512P', '720P', '768P', '1080P']
    options.durations = data.durations || [6, 10]
    options.status = data.status || {}
    options.cameraCommands = data.cameraCommands || []
    options.scenes = data.scenes || []
    // 根据后端返回的 models 校准默认 model（如果默认不在白名单则取第一个）
    if (options.models.t2v.length && !options.models.t2v.find(m => m.value === t2vForm.model)) {
      t2vForm.model = options.models.t2v[0].value
    }
    if (options.models.i2v.length && !options.models.i2v.find(m => m.value === i2vForm.model)) {
      i2vForm.model = options.models.i2v[0].value
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || '获取选项失败'
    ElMessage.error(error.value)
  }
})
</script>

<style scoped>
.video-old-view {
  max-width: 1000px;
}
.subtitle {
  color: #909399;
  font-size: 13px;
  margin-top: -8px;
  margin-bottom: 16px;
}
.video-old-tabs {
  margin-top: 16px;
}
.video-old-form {
  margin-top: 16px;
  max-width: 760px;
}
.field-hint {
  font-size: 12px;
  color: #909399;
  margin-left: 12px;
}
.camera-commands {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.result-section {
  margin-top: 24px;
  padding: 16px;
  background: #f0f9eb;
  border-radius: 8px;
}
.result-section h3 {
  margin-top: 0;
}
.progress-bar {
  margin: 12px 0;
}
.meta {
  font-size: 13px;
  color: #606266;
}
.result-video {
  width: 100%;
  max-height: 540px;
  margin-top: 12px;
  background: #000;
  border-radius: 4px;
}
.retry-btn {
  margin-top: 12px;
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
</style>
