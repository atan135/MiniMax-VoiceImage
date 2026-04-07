<template>
  <div class="voice-manage-view">
    <div class="header">
      <h2>音色管理</h2>
      <el-button type="primary" @click="handleRefresh" :loading="refreshing">
        刷新音色列表
      </el-button>
    </div>

    <el-tabs v-model="activeTab" class="voice-tabs">
      <!-- 系统音色 -->
      <el-tab-pane label="系统音色" name="system">
        <el-table :data="systemVoices" v-loading="loading" stripe style="width: 100%">
          <el-table-column prop="voiceId" label="音色ID" min-width="200" />
          <el-table-column prop="voiceName" label="音色名称" min-width="150" />
          <el-table-column prop="description" label="描述" min-width="200">
            <template #default="{ row }">
              {{ row.description?.join(', ') || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center">
            <template #default>
              <span class="text-muted">不可删除</span>
            </template>
          </el-table-column>
        </el-table>
        <div class="voice-count">共 {{ systemVoices.length }} 个系统音色</div>
      </el-tab-pane>

      <!-- 克隆音色 -->
      <el-tab-pane label="克隆音色" name="cloning">
        <el-table :data="cloningVoices" v-loading="loading" stripe style="width: 100%">
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
        <div class="voice-count">共 {{ cloningVoices.length }} 个克隆音色</div>
      </el-tab-pane>

      <!-- 生成的音色 -->
      <el-tab-pane label="生成音色" name="generation">
        <el-table :data="generationVoices" v-loading="loading" stripe style="width: 100%">
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
        <div class="voice-count">共 {{ generationVoices.length }} 个生成音色</div>
      </el-tab-pane>
    </el-tabs>

    <el-alert v-if="error" :title="error" type="error" show-icon class="mt-20" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getVoiceOptions, refreshVoiceOptions, deleteVoice } from '../api'
import { ElMessage, ElMessageBox } from 'element-plus'

const activeTab = ref('system')
const systemVoices = ref([])
const cloningVoices = ref([])
const generationVoices = ref([])
const loading = ref(false)
const refreshing = ref(false)
const error = ref('')

const loadVoices = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await getVoiceOptions()
    if (res.data.success) {
      systemVoices.value = res.data.systemVoices || []
      cloningVoices.value = res.data.cloningVoices || []
      generationVoices.value = res.data.generationVoices || []
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
.text-muted {
  color: #999;
  font-size: 12px;
}
.mt-20 {
  margin-top: 20px;
}
</style>
