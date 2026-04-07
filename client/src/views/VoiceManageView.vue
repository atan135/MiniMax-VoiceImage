<template>
  <div class="voice-manage-view">
    <div class="header">
      <h2>音色管理</h2>
      <div>
        <el-button type="primary" @click="handleRefresh" :loading="refreshing">
          刷新音色列表
        </el-button>
        <el-button type="success" @click="showDesignDialog">
          音色设计
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="voice-tabs">
      <!-- 系统音色 -->
      <el-tab-pane label="系统音色" name="system">
        <el-table :data="paginatedSystemVoices" v-loading="loading" stripe style="width: 100%">
          <el-table-column prop="voiceId" label="音色ID" min-width="200" />
          <el-table-column prop="voiceName" label="音色名称" min-width="150" />
          <el-table-column prop="language" label="语言" width="100" />
          <el-table-column label="操作" width="100" align="center">
            <template #default>
              <span class="text-muted">不可删除</span>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-if="systemVoices.length > 0"
          v-model:current-page="systemPage"
          :page-size="pageSize"
          :total="systemVoices.length"
          layout="prev, pager, next"
          class="voice-pagination"
        />
        <div class="voice-count">共 {{ systemVoices.length }} 个系统音色</div>
      </el-tab-pane>

      <!-- 克隆音色 -->
      <el-tab-pane label="克隆音色" name="cloning">
        <el-table :data="paginatedCloningVoices" v-loading="loading" stripe style="width: 100%">
          <el-table-column prop="voiceId" label="音色ID" min-width="200" />
          <el-table-column prop="voiceName" label="音色名称" min-width="150" />
          <el-table-column prop="createdTime" label="创建时间" width="120" />
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button type="danger" size="small" @click="handleDelete(row, 'voice_cloning')">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-if="cloningVoices.length > 0"
          v-model:current-page="cloningPage"
          :page-size="pageSize"
          :total="cloningVoices.length"
          layout="prev, pager, next"
          class="voice-pagination"
        />
        <div class="voice-count">共 {{ cloningVoices.length }} 个克隆音色</div>
      </el-tab-pane>

      <!-- 生成的音色 -->
      <el-tab-pane label="生成音色" name="generation">
        <el-table :data="paginatedGenerationVoices" v-loading="loading" stripe style="width: 100%">
          <el-table-column prop="voiceId" label="音色ID" min-width="200" />
          <el-table-column prop="voiceName" label="音色名称" min-width="150" />
          <el-table-column prop="createdTime" label="创建时间" width="120" />
          <el-table-column label="操作" width="100" align="center">
            <template #default="{ row }">
              <el-button type="danger" size="small" @click="handleDelete(row, 'voice_generation')">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-if="generationVoices.length > 0"
          v-model:current-page="generationPage"
          :page-size="pageSize"
          :total="generationVoices.length"
          layout="prev, pager, next"
          class="voice-pagination"
        />
        <div class="voice-count">共 {{ generationVoices.length }} 个生成音色</div>
      </el-tab-pane>
    </el-tabs>

    <el-alert v-if="error" :title="error" type="error" show-icon class="mt-20" />

    <!-- 音色设计弹窗 -->
    <el-dialog v-model="designDialogVisible" title="音色设计" width="600px">
      <el-form :model="designForm" label-width="100px">
        <el-form-item label="音色描述" required>
          <el-input
            v-model="designForm.prompt"
            type="textarea"
            :rows="3"
            placeholder="描述你想要的声音特点，如：温柔的女声，略带沙哑，适合讲述故事"
          />
        </el-form-item>
        <el-form-item label="试听文本" required>
          <el-input
            v-model="designForm.preview_text"
            type="textarea"
            :rows="3"
            placeholder="输入用于试听的文本，建议20-100字"
          />
          <span class="form-tip">试听音频将收取 2元/万字符 的费用</span>
        </el-form-item>
        <el-form-item label="自定义ID">
          <el-input
            v-model="designForm.voice_id"
            placeholder="留空则自动生成ID"
          />
        </el-form-item>
        <el-form-item label="添加水印">
          <el-switch v-model="designForm.aigc_watermark" />
        </el-form-item>
      </el-form>

      <div v-if="designResult" class="design-result">
        <el-divider />
        <h4>设计成功</h4>
        <p><strong>音色ID:</strong> {{ designResult.voiceId }}</p>
        <div v-if="designResult.trialAudio" class="audio-preview">
          <p><strong>试听音频:</strong></p>
          <audio v-if="trialAudioUrl" :src="trialAudioUrl" controls />
        </div>
      </div>

      <template #footer>
        <el-button @click="designDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleDesign" :loading="designing">
          开始设计
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getVoiceOptions, refreshVoiceOptions, deleteVoice, designVoice } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('system')
const systemVoices = ref([])
const cloningVoices = ref([])
const generationVoices = ref([])
const loading = ref(false)
const refreshing = ref(false)
const error = ref('')
const pageSize = ref(10)
const systemPage = ref(1)
const cloningPage = ref(1)
const generationPage = ref(1)

const paginatedSystemVoices = computed(() => {
  const start = (systemPage.value - 1) * pageSize.value
  return systemVoices.value.slice(start, start + pageSize.value)
})

const paginatedCloningVoices = computed(() => {
  const start = (cloningPage.value - 1) * pageSize.value
  return cloningVoices.value.slice(start, start + pageSize.value)
})

const paginatedGenerationVoices = computed(() => {
  const start = (generationPage.value - 1) * pageSize.value
  return generationVoices.value.slice(start, start + pageSize.value)
})

// 音色设计相关
const designDialogVisible = ref(false)
const designForm = ref({
  prompt: '',
  preview_text: '',
  voice_id: '',
  aigc_watermark: false
})
const designing = ref(false)
const designResult = ref(null)
const trialAudioUrl = ref('')

const showDesignDialog = () => {
  designForm.value = { prompt: '', preview_text: '', voice_id: '', aigc_watermark: false }
  designResult.value = null
  trialAudioUrl.value = ''
  designDialogVisible.value = true
}

// hex转audio URL
const hexToAudioUrl = (hex) => {
  if (!hex) return ''
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  const blob = new Blob([bytes], { type: 'audio/mpeg' })
  return URL.createObjectURL(blob)
}

const handleDesign = async () => {
  if (!designForm.value.prompt) {
    ElMessage.warning('请输入音色描述')
    return
  }
  if (!designForm.value.preview_text) {
    ElMessage.warning('请输入试听文本')
    return
  }
  designing.value = true
  designResult.value = null
  trialAudioUrl.value = ''
  try {
    const res = await designVoice(designForm.value)
    if (res.data.success) {
      designResult.value = res.data.data
      if (designResult.value.trialAudio) {
        trialAudioUrl.value = hexToAudioUrl(designResult.value.trialAudio)
      }
      ElMessage.success('音色设计成功')
      // 刷新列表
      await loadVoices()
    } else {
      ElMessage.error(res.data.error || '设计失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '设计失败')
  } finally {
    designing.value = false
  }
}

const loadVoices = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await getVoiceOptions()
    const result = res.data.data || {}
    if (res.data.success) {
      systemVoices.value = result.systemVoices || []
      cloningVoices.value = result.cloningVoices || []
      generationVoices.value = result.generationVoices || []
      // 重置分页
      systemPage.value = 1
      cloningPage.value = 1
      generationPage.value = 1
    } else {
      error.value = res.data.error
    }
  } catch (e) {
    error.value = e.message || '加载音色列表失败'
  } finally {
    loading.value = false
  }
}

const handleRefresh = async () => {
  refreshing.value = true
  error.value = ''
  try {
    const res = await refreshVoiceOptions()
    if (res.data.success) {
      ElMessage.success(`刷新成功，共 ${res.data.data.count} 条音色`)
      await loadVoices()
    } else {
      error.value = res.data.error
    }
  } catch (e) {
    error.value = e.message || '刷新音色列表失败'
  } finally {
    refreshing.value = false
  }
}

const handleDelete = async (row, voiceType) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除音色 "${row.voiceName}" 吗？删除后该音色将无法再次使用。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const res = await deleteVoice(row.voiceId, voiceType)
    if (res.data.success) {
      ElMessage.success('删除成功')
      await loadVoices()
    } else {
      ElMessage.error(res.data.error || '删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(e.message || '删除失败')
    }
  }
}

onMounted(() => {
  loadVoices()
})
</script>

<style scoped>
.voice-manage-view {
  max-width: 1000px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.voice-tabs {
  margin-top: 20px;
}
.voice-count {
  margin-top: 16px;
  color: #666;
  font-size: 14px;
}
.voice-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}
.text-muted {
  color: #999;
  font-size: 12px;
}
.mt-20 {
  margin-top: 20px;
}
.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.design-result {
  margin-top: 16px;
}
.design-result h4 {
  margin: 8px 0;
}
.audio-preview {
  margin-top: 12px;
}
.audio-preview audio {
  width: 100%;
  margin-top: 8px;
}
</style>
