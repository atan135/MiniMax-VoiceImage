<template>
  <div class="image-view">
    <h2>图片生成</h2>
    <el-form :model="form" label-width="120px" class="image-form">
      <el-form-item label="图片描述">
        <el-input
          v-model="form.prompt"
          type="textarea"
          :rows="4"
          placeholder="请输入图片描述"
        />
        <span class="char-count">{{ form.prompt.length }}/1500</span>
      </el-form-item>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="模型">
            <el-select v-model="form.model">
              <el-option v-for="m in options.modelList" :key="m" :label="m" :value="m" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="宽高比">
            <el-select v-model="form.aspect_ratio">
              <el-option v-for="r in options.aspectRatioList" :key="r" :label="r" :value="r" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="生成数量">
            <el-input-number v-model="form.n" :min="1" :max="9" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="返回格式">
            <el-select v-model="form.response_format">
              <el-option label="URL" value="url" />
              <el-option label="Base64" value="base64" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item>
        <el-checkbox v-model="form.prompt_optimizer">Prompt自动优化</el-checkbox>
        <el-checkbox v-model="form.aigc_watermark">添加水印</el-checkbox>
        <el-checkbox v-model="enableI2i">图生图（主体参考）</el-checkbox>
      </el-form-item>

      <div v-if="enableI2i" class="i2i-panel">
        <el-form-item label="主体参考">
          <div class="ref-list">
            <div v-for="(ref, idx) in subjectReference" :key="idx" class="ref-row">
              <el-select v-model="ref.type" placeholder="类型" class="ref-type">
                <el-option
                  v-for="t in (options.subjectReferenceTypeList || [])"
                  :key="t"
                  :label="t"
                  :value="t"
                />
              </el-select>
              <el-input
                v-model="ref.image_file"
                placeholder="参考图片 URL（公网可访问）"
                class="ref-url"
              />
              <el-button
                type="danger"
                :icon="Delete"
                circle
                size="small"
                @click="removeReference(idx)"
              />
            </div>
            <el-button :icon="Plus" size="small" @click="addReference">添加参考</el-button>
          </div>
        </el-form-item>
      </div>

      <el-form-item>
        <el-button type="primary" @click="handleGenerate" :loading="loading">生成图片</el-button>
      </el-form-item>
    </el-form>

    <div v-if="result" class="result">
      <h3>生成结果</h3>
      <p>成功: {{ result.success_count }} | 失败: {{ result.failed_count }}</p>
      <p v-if="result.id">任务ID: {{ result.id }}</p>
      <div class="image-grid">
        <div v-for="(img, index) in result.images" :key="index" class="image-item">
          <img :src="getImageUrl(img.filePath)" :alt="`Generated image ${index}`" @click="openLightbox(getImageUrl(img.filePath))" />
          <div class="image-id">
            <el-input :model-value="img.filePath" readonly size="small" class="id-input">
              <template #append>
                <el-button size="small" @click="copyPath(img.filePath, index)">复制</el-button>
              </template>
            </el-input>
          </div>
        </div>
      </div>
      <p class="image-id-hint">复制图片标识后，到「视频生成 → 图生视频」或「多模态参考」的图片标识输入框粘贴即可使用，无需下载再上传</p>
    </div>

    <el-alert v-if="error" :title="error" type="error" show-icon />

    <!-- 图片放大弹窗 -->
    <el-dialog v-model="lightboxVisible" width="90%" top="5vh" :show-close="true" class="lightbox-dialog" :modal-append-to-body="true">
      <div class="lightbox-content">
        <img :src="lightboxSrc" alt="full size" class="lightbox-image" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { Delete, Plus } from '@element-plus/icons-vue'
import { getImageOptions, generateImage } from '../api'
import { ElMessage } from 'element-plus'

const form = reactive({
  prompt: '',
  model: 'image-01',
  aspect_ratio: '1:1',
  n: 1,
  response_format: 'url',
  prompt_optimizer: false,
  aigc_watermark: false
})

const options = reactive({
  modelList: ['image-01', 'image-01-live'],
  aspectRatioList: ['1:1', '16:9', '4:3', '3:2', '2:3', '3:4', '9:16', '21:9'],
  subjectReferenceTypeList: ['character']
})

const enableI2i = ref(false)
const subjectReference = ref([
  { type: 'character', image_file: '' }
])

const loading = ref(false)
const result = ref(null)
const error = ref('')
const lightboxVisible = ref(false)
const lightboxSrc = ref('')

const validReferences = computed(() =>
  (enableI2i.value ? subjectReference.value : []).filter(
    (ref) => ref && ref.type && ref.image_file && ref.image_file.trim()
  )
)

onMounted(async () => {
  try {
    const res = await getImageOptions()
    options.modelList = res.data.modelList
    options.aspectRatioList = res.data.aspectRatioList
    if (res.data.subjectReferenceTypeList) {
      options.subjectReferenceTypeList = res.data.subjectReferenceTypeList
    }
  } catch (e) {
    ElMessage.error('获取选项失败')
  }
})

watch(enableI2i, (val) => {
  if (!val) {
    subjectReference.value = [{ type: 'character', image_file: '' }]
  }
})

const addReference = () => {
  subjectReference.value.push({
    type: options.subjectReferenceTypeList[0] || 'character',
    image_file: ''
  })
}

const removeReference = (idx) => {
  subjectReference.value.splice(idx, 1)
  if (subjectReference.value.length === 0) {
    subjectReference.value.push({
      type: options.subjectReferenceTypeList[0] || 'character',
      image_file: ''
    })
  }
}

const handleGenerate = async () => {
  if (!form.prompt) {
    ElMessage.warning('请输入图片描述')
    return
  }
  if (enableI2i.value && validReferences.value.length === 0) {
    ElMessage.warning('已开启图生图，请至少填写一个参考图片 URL')
    return
  }
  loading.value = true
  error.value = ''
  result.value = null
  try {
    const payload = { ...form }
    if (enableI2i.value && validReferences.value.length > 0) {
      payload.subject_reference = validReferences.value
    } else {
      delete payload.subject_reference
    }
    const res = await generateImage(payload)
    if (res.data.success) {
      result.value = res.data.data
      ElMessage.success('生成成功')
    } else {
      error.value = res.data.error
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || '生成失败'
  } finally {
    loading.value = false
  }
}

const openLightbox = (src) => {
  lightboxSrc.value = src
  lightboxVisible.value = true
}

const copyPath = async (filePath, index) => {
  if (!filePath) return
  const ok = await copyToClipboard(filePath)
  if (ok) {
    ElMessage.success(`已复制第 ${index + 1} 张图片标识`)
  } else {
    ElMessage.error(`复制失败，请手动复制`)
  }
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (_) { /* fallback */ }
  try {
    const ta = document.createElement(`textarea`)
    ta.value = text
    ta.style.position = `fixed`
    ta.style.left = `-9999px`
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand(`copy`)
    document.body.removeChild(ta)
    return ok
  } catch (_) {
    return false
  }
}

const getImageUrl = (filePath) => {
  if (!filePath) return ''
  if (filePath.startsWith('http')) return filePath
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.startsWith('/') ? normalized : '/' + normalized
}
</script>

<style scoped>
.image-view {
  max-width: 800px;
}
.image-form {
  margin-top: 20px;
}
.char-count {
  font-size: 12px;
  color: #999;
  float: right;
}
.i2i-panel {
  margin-bottom: 18px;
  padding: 12px;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  background: #fafafa;
}
.ref-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}
.ref-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ref-row .ref-type {
  width: 140px;
  flex-shrink: 0;
}
.ref-row .ref-url {
  flex: 1;
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
.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.image-item {
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;
}
.image-item img {
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.2s;
}
.image-item img:hover {
  transform: scale(1.02);
}
.lightbox-dialog {
  text-align: center;
}
.lightbox-dialog :deep(.el-dialog__body) {
  padding: 10px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
}
.lightbox-content {
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 85vh;
}
.lightbox-image {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
}
.image-id {
  margin-top: 6px;
}
.image-id .id-input :deep(.el-input__inner) {
  font-size: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: #606266;
}
.image-id-hint {
  margin-top: 12px;
  font-size: 12px;
  color: #909399;
}
</style>
