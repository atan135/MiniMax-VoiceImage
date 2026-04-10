<template>
  <div class="history-view">
    <h2>历史记录</h2>

    <div class="filters">
      <el-select v-model="filterType" placeholder="筛选类型" clearable @change="handleFilterChange">
        <el-option label="全部" value="" />
        <el-option label="语音" value="voice" />
        <el-option label="图片" value="image" />
        <el-option label="歌词" value="lyrics" />
        <el-option label="音乐" value="music" />
      </el-select>
    </div>

    <el-table :data="records" v-loading="loading" stripe style="width: 100%; margin-top: 20px" @row-click="handleRowClick">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="getTypeTagType(row.type)">
            {{ getTypeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="提示词/内容" min-width="200">
        <template #default="{ row }">
          <div class="prompt-cell">{{ row.prompt }}</div>
        </template>
      </el-table-column>
      <el-table-column label="预览" width="120">
        <template #default="{ row }">
          <div v-if="row.status === 'success' && row.type === 'image'" class="thumbnail-cell">
            <img v-if="getFirstFilePath(row.file_path)" :src="getFileUrl(getFirstFilePath(row.file_path))" alt="preview" class="thumbnail" @click.stop="openLightboxForList(row.file_path)" />
            <span v-if="getImageCount(row.file_path) > 1" class="image-count">+{{ getImageCount(row.file_path) - 1 }}</span>
          </div>
          <div v-else-if="row.status === 'success' && row.type === 'voice'" class="audio-icon">
            🔊
          </div>
          <div v-else-if="row.status === 'success' && row.type === 'music'" class="audio-icon">
            🎵
          </div>
          <div v-else-if="row.status === 'success' && row.type === 'lyrics'" class="lyrics-icon">
            📝
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
          <el-tag :type="getTypeTagType(selectedRecord.type)">
            {{ getTypeLabel(selectedRecord.type) }}
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
            <div class="image-grid">
              <img v-for="(img, idx) in imageSrcList" :key="idx" :src="getFileUrl(img)" alt="generated image" class="preview-image" @click="openLightbox(getFileUrl(img))" />
            </div>
          </div>
          <div v-else-if="selectedRecord.type === 'music'" class="audio-preview">
            <audio v-if="audioSrc" :src="audioSrc" controls />
          </div>
          <div v-else-if="selectedRecord.type === 'lyrics'" class="lyrics-preview">
            <pre class="lyrics-content">{{ selectedRecord.file_path }}</pre>
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
        <div v-if="lightboxImageList.length > 1" class="lightbox-nav">
          <el-button @click="prevImage" :disabled="lightboxCurrentIndex <= 0">上一张</el-button>
          <span class="lightbox-counter">{{ lightboxCurrentIndex + 1 }} / {{ lightboxImageList.length }}</span>
          <el-button @click="nextImage" :disabled="lightboxCurrentIndex >= lightboxImageList.length - 1">下一张</el-button>
        </div>
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
const imageSrcList = ref([])
const lightboxVisible = ref(false)
const lightboxSrc = ref('')
const lightboxImageList = ref([])
const lightboxCurrentIndex = ref(0)

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

const getTypeLabel = (type) => {
  const labels = {
    voice: '语音',
    image: '图片',
    music: '音乐',
    lyrics: '歌词'
  }
  return labels[type] || type
}

const getTypeTagType = (type) => {
  const tagTypes = {
    voice: 'primary',
    image: 'success',
    music: 'warning',
    lyrics: 'danger'
  }
  return tagTypes[type] || 'info'
}

const handleRowClick = async (row) => {
  try {
    const res = await getHistoryById(row.id)
    if (res.data.success) {
      selectedRecord.value = res.data.data
      dialogTitle.value = `记录详情 #${row.id}`
      audioSrc.value = ''
      imageSrc.value = ''
      imageSrcList.value = []

      if (selectedRecord.value.status === 'success' && selectedRecord.value.file_path) {
        if (selectedRecord.value.type === 'voice' || selectedRecord.value.type === 'music') {
          audioSrc.value = getFileUrl(selectedRecord.value.file_path)
        } else if (selectedRecord.value.type === 'image') {
          imageSrcList.value = parseFilePaths(selectedRecord.value.file_path)
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
  const normalized = filePath.replace(/\\/g, '/')
  return normalized.startsWith('/') ? normalized : '/' + normalized
}

// 解析文件路径列表 (JSON格式或单路径)
const parseFilePaths = (filePath) => {
  if (!filePath) return []
  try {
    const parsed = JSON.parse(filePath)
    return Array.isArray(parsed) ? parsed : [filePath]
  } catch {
    return [filePath]
  }
}

// 获取第一个文件路径
const getFirstFilePath = (filePath) => {
  const paths = parseFilePaths(filePath)
  return paths[0] || ''
}

// 获取图片数量
const getImageCount = (filePath) => {
  return parseFilePaths(filePath).length
}

// 打开图片列表灯箱
const openLightboxForList = (filePath) => {
  const paths = parseFilePaths(filePath)
  lightboxImageList.value = paths.map(p => getFileUrl(p))
  if (paths.length > 1) {
    // 多图模式
    lightboxCurrentIndex.value = 0
    lightboxSrc.value = lightboxImageList.value[0]
    lightboxVisible.value = true
  } else {
    // 单图模式
    openLightbox(lightboxImageList.value[0])
  }
}

// 上一张
const prevImage = () => {
  if (lightboxCurrentIndex.value > 0) {
    lightboxCurrentIndex.value--
    lightboxSrc.value = lightboxImageList.value[lightboxCurrentIndex.value]
  }
}

// 下一张
const nextImage = () => {
  if (lightboxCurrentIndex.value < lightboxImageList.value.length - 1) {
    lightboxCurrentIndex.value++
    lightboxSrc.value = lightboxImageList.value[lightboxCurrentIndex.value]
  }
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
.lyrics-icon {
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
.lyrics-preview {
  flex: 1;
  max-height: 300px;
  overflow-y: auto;
}
.lyrics-content {
  white-space: pre-wrap;
  word-break: break-all;
  background: #f5f5f5;
  padding: 12px;
  border-radius: 4px;
  margin: 0;
}
.image-preview {
  flex: 1;
}
.image-preview .image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
  margin-top: 8px;
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
  flex-direction: column;
  align-items: center;
}
.lightbox-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}
.lightbox-counter {
  font-size: 14px;
  color: #666;
}
.lightbox-image {
  max-width: 100%;
  max-height: 85vh;
  object-fit: contain;
}
</style>
