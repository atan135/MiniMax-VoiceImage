<template>
  <div class="history-view">
    <h2>历史记录</h2>

    <div class="filters">
      <el-select v-model="filterType" placeholder="筛选类型" clearable @change="handleFilterChange">
        <el-option label="全部" value="" />
        <el-option label="语音" value="voice" />
        <el-option label="图片" value="image" />
      </el-select>
    </div>

    <el-table :data="records" v-loading="loading" stripe style="width: 100%; margin-top: 20px" @row-click="handleRowClick">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="row.type === 'voice' ? 'primary' : 'success'">
            {{ row.type === 'voice' ? '语音' : '图片' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提示词/内容" min-width="200">
        <template #default="{ row }">
          <div class="prompt-cell">{{ row.prompt }}</div>
        </template>
      </el-table-column>
      <el-table-column label="预览" width="100">
        <template #default="{ row }">
          <div v-if="row.status === 'success' && row.type === 'image'" class="thumbnail-cell">
            <img :src="getFileUrl(row.file_path)" alt="preview" class="thumbnail" @click.stop="openLightbox(getFileUrl(row.file_path))" />
          </div>
          <div v-else-if="row.status === 'success' && row.type === 'voice'" class="audio-icon">
            🔊
          </div>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'success' ? 'success' : 'danger'">
            {{ row.status === 'success' ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next, total"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <div v-if="selectedRecord" class="record-detail">
        <div class="detail-item">
          <label>ID:</label>
          <span>{{ selectedRecord.id }}</span>
        </div>
        <div class="detail-item">
          <label>类型:</label>
          <el-tag :type="selectedRecord.type === 'voice' ? 'primary' : 'success'">
            {{ selectedRecord.type === 'voice' ? '语音' : '图片' }}
          </el-tag>
        </div>
        <div class="detail-item">
          <label>状态:</label>
          <el-tag :type="selectedRecord.status === 'success' ? 'success' : 'danger'">
            {{ selectedRecord.status === 'success' ? '成功' : '失败' }}
          </el-tag>
        </div>
        <div class="detail-item">
          <label>创建时间:</label>
          <span>{{ formatDate(selectedRecord.created_at) }}</span>
        </div>
        <div class="detail-item">
          <label>提示词:</label>
          <div class="prompt-content">{{ selectedRecord.prompt }}</div>
        </div>
        <div class="detail-item">
          <label>参数:</label>
          <pre class="params-content">{{ formatParams(selectedRecord.params) }}</pre>
        </div>
        <div class="detail-item" v-if="selectedRecord.status === 'success'">
          <label>文件:</label>
          <div v-if="selectedRecord.type === 'voice'" class="audio-preview">
            <audio v-if="audioSrc" :src="audioSrc" controls />
          </div>
          <div v-else-if="selectedRecord.type === 'image'" class="image-preview">
            <img :src="imageSrc" alt="generated image" class="preview-image" @click="openLightbox(imageSrc)" />
          </div>
          <div v-else class="file-path">{{ selectedRecord.file_path }}</div>
        </div>
        <div class="detail-item" v-if="selectedRecord.status === 'failed'">
          <label>错误信息:</label>
          <span class="error-msg">{{ selectedRecord.error_msg }}</span>
        </div>
      </div>
    </el-dialog>

    <!-- 图片放大弹窗 -->
    <el-dialog v-model="lightboxVisible" width="90%" top="5vh" :show-close="true" class="lightbox-dialog" :modal-append-to-body="true">
      <div class="lightbox-content">
        <img :src="lightboxSrc" alt="full size" class="lightbox-image" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getHistory, getHistoryById } from '../api'
import { ElMessage } from 'element-plus'

const filterType = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const records = ref([])
const loading = ref(false)
const dialogVisible = ref(false)
const selectedRecord = ref(null)
const dialogTitle = ref('')
const audioSrc = ref('')
const imageSrc = ref('')
const lightboxVisible = ref(false)
const lightboxSrc = ref('')

const loadData = async () => {
  loading.value = true
  try {
    const res = await getHistory(filterType.value, currentPage.value, pageSize.value)
    if (res.data.success) {
      records.value = res.data.data.records
      total.value = res.data.data.total
    }
  } catch (e) {
    ElMessage.error('加载历史记录失败')
  } finally {
    loading.value = false
  }
}

const handleFilterChange = () => {
  currentPage.value = 1
  loadData()
}

const handlePageChange = () => {
  loadData()
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

const formatParams = (params) => {
  if (!params) return '-'
  try {
    return typeof params === 'string' ? JSON.stringify(JSON.parse(params), null, 2) : JSON.stringify(params, null, 2)
  } catch {
    return params
  }
}

const handleRowClick = async (row) => {
  try {
    const res = await getHistoryById(row.id)
    if (res.data.success) {
      selectedRecord.value = res.data.data
      dialogTitle.value = `记录详情 #${row.id}`
      audioSrc.value = ''
      imageSrc.value = ''

      if (selectedRecord.value.status === 'success' && selectedRecord.value.file_path) {
        if (selectedRecord.value.type === 'voice') {
          audioSrc.value = getFileUrl(selectedRecord.value.file_path)
        } else if (selectedRecord.value.type === 'image') {
          imageSrc.value = getFileUrl(selectedRecord.value.file_path)
        }
      }

      dialogVisible.value = true
    }
  } catch (e) {
    ElMessage.error('加载详情失败')
  }
}

const openLightbox = (src) => {
  lightboxSrc.value = src
  lightboxVisible.value = true
}

// 转换文件路径为URL
const getFileUrl = (filePath) => {
  if (!filePath) return ''
  if (filePath.startsWith('http')) return filePath
  return '/' + filePath.replace(/\\/g, '/')
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.history-view {
  max-width: 1200px;
}
.filters {
  margin-top: 16px;
}
.prompt-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.thumbnail-cell {
  width: 60px;
  height: 60px;
  overflow: hidden;
  border-radius: 4px;
  cursor: pointer;
}
.thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.audio-icon {
  font-size: 24px;
  text-align: center;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
.record-detail {
  padding: 10px 0;
}
.detail-item {
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
}
.detail-item label {
  font-weight: bold;
  width: 80px;
  flex-shrink: 0;
}
.detail-item span {
  word-break: break-all;
}
.prompt-content {
  white-space: pre-wrap;
  word-break: break-all;
  flex: 1;
}
.params-content {
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  flex: 1;
  margin: 0;
  font-size: 12px;
}
.audio-preview {
  flex: 1;
}
.audio-preview audio {
  width: 100%;
}
.image-preview {
  flex: 1;
}
.preview-image {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s;
}
.preview-image:hover {
  transform: scale(1.02);
}
.error-msg {
  color: #f56c6c;
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
</style>
