<template>
  <div class="crud-container">
    <div class="crud-header">
      <h2 class="page-title">{{ title }}</h2>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索..."
          class="search-input"
          @input="handleSearch"
        >
          <template #prefix>
            <span>🔍</span>
          </template>
        </el-input>
        <el-button type="primary" @click="openAddModal">
          <span class="btn-icon">➕</span>
          添加
        </el-button>
      </div>
    </div>

    <div class="crud-body" v-loading="loading" element-loading-text="加载中..." element-loading-background="rgba(0, 0, 0, 0.5)">
      <el-table 
        :data="tableData" 
        border 
        class="data-table" 
        :row-key="row => row.id" 
        :show-header="true"
        :highlight-current-row="false"
        :resizable="true"
        :fit="true"
        :row-class-name="table-row"
        :empty-text="'暂无数据'"
      >
        <template v-for="column in columns" :key="column.prop">
          <el-table-column
            :prop="column.prop"
            :label="column.label"
            :min-width="column.minWidth"
            :align="column.align || 'left'"
          >
            <template #default="scope">
              <div v-if="column.type === 'tags'" class="tags-container">
                <el-tag
                  v-for="tag in scope.row[column.prop]"
                  :key="tag"
                  size="small"
                >
                  {{ tag }}
                </el-tag>
              </div>
              <div v-else-if="column.type === 'boolean'" class="boolean-badge">
                <span :class="['badge', scope.row[column.prop] ? 'true' : 'false']">
                  {{ scope.row[column.prop] ? '是' : '否' }}
                </span>
              </div>
              <div v-else-if="column.type === 'status'" class="status-badge">
                <span :class="['badge', scope.row[column.prop]]">
                  {{ getStatusText(scope.row[column.prop]) }}
                </span>
              </div>
              <div v-else-if="column.type === 'actions'" class="actions">
                <el-button
                  size="small"
                  type="primary"
                  @click="openEditModal(scope.row)"
                >
                  编辑
                </el-button>
                <el-button
                  size="small"
                  type="danger"
                  @click="handleDelete(scope.row.id)"
                >
                  删除
                </el-button>
              </div>
              <div v-else-if="column.type === 'preview'" class="preview">
                <img
                  v-if="scope.row.type === 'image' || (scope.row.fileUrl && isImageFile(scope.row.fileUrl)) || (scope.row.coverPath && isImageFile(scope.row.coverPath))"
                  :src="getFullUrl(scope.row[column.prop] || scope.row.coverPath || scope.row.fileUrl)"
                  :alt="scope.row.fileName"
                  class="preview-img"
                />
                <video
                  v-else-if="scope.row.type === 'video' || (scope.row.videoPath && isVideoFile(scope.row.videoPath)) || (scope.row.fileUrl && isVideoFile(scope.row.fileUrl))"
                  :src="getFullUrl(scope.row[column.prop] || scope.row.videoPath || scope.row.fileUrl)"
                  class="preview-video"
                  controls
                  preload="metadata"
                />
                <audio
                  v-else-if="(scope.row.audioPath && isAudioFile(scope.row.audioPath)) || (scope.row.fileUrl && isAudioFile(scope.row.fileUrl))"
                  :src="getFullUrl(scope.row[column.prop] || scope.row.audioPath || scope.row.fileUrl)"
                  class="preview-audio"
                  controls
                />
              </div>
              <div v-else-if="column.type === 'dimensions'" class="dimensions">
                <span v-if="scope.row.width && scope.row.height">{{ scope.row.width }}×{{ scope.row.height }}</span>
                <span v-else>-</span>
              </div>
              <span v-else-if="column.type === 'clickable-title'" class="clickable-title" @click="openTitleEditModal(scope.row)">
                {{ formatValue(scope.row[column.prop], column) }}
              </span>
              <span v-else>
                {{ formatValue(scope.row[column.prop], column) }}
              </span>
            </template>
          </el-table-column>
        </template>
      </el-table>

      <div class="pagination">
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="total"
          @current-change="handlePageChange"
          layout="total, prev, pager, next, jumper"
        />
      </div>
    </div>

    <!-- 完全独立的原生弹窗 -->
    <div v-if="modalVisible" class="custom-modal-overlay">
      <div class="custom-modal">
        <div class="custom-modal-header">
          <h3>{{ isEditing ? '编辑' : '添加' }}</h3>
          <button class="close-btn" @click="modalVisible = false">×</button>
        </div>
        <div class="custom-modal-body">
          <div class="form-container">
            <div v-for="column in formColumns" :key="column.prop" class="form-field">
              <div class="field-label">
                <span class="label-main">{{ column.label }}</span>
                <span v-if="column.description" class="label-tip">{{ column.description }}</span>
              </div>
              <div class="field-input">
                <el-input
                  v-if="column.type === 'text'"
                  v-model="formData[column.prop]"
                  :placeholder="column.placeholder || `请输入${column.label}`"
                />
                <el-input
                  v-else-if="column.type === 'textarea'"
                  v-model="formData[column.prop]"
                  type="textarea"
                  :rows="column.rows || 5"
                  :placeholder="column.placeholder || `请输入${column.label}`"
                />
                <el-select
                  v-else-if="column.type === 'select'"
                  v-model="formData[column.prop]"
                  :placeholder="column.placeholder || `请选择${column.label}`"
                >
                  <el-option
                    v-for="option in column.options"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <el-switch
                  v-else-if="column.type === 'switch'"
                  v-model="formData[column.prop]"
                  :active-text="column.activeText || '是'"
                  :inactive-text="column.inactiveText || '否'"
                />
                <div v-else-if="column.type === 'upload'" class="upload-area">
                  <template v-if="formData[column.prop]">
                    <div class="file-preview">
                      <template v-if="isAudioFile(formData[column.prop])">
                        <audio :src="getFullUrl(formData[column.prop])" controls class="preview-media" />
                      </template>
                      <template v-else-if="isImageFile(formData[column.prop])">
                        <img :src="getFullUrl(formData[column.prop])" class="preview-media-img" alt="预览" />
                      </template>
                      <template v-else-if="isVideoFile(formData[column.prop])">
                        <video :src="getFullUrl(formData[column.prop])" controls class="preview-media" preload="metadata" />
                      </template>
                      <div class="file-name">{{ getFileName(formData[column.prop]) }}</div>
                    </div>
                    <div class="file-actions">
                      <input
                        type="file"
                        :accept="column.accept || '*'"
                        @change="(e) => handleFileUpload(e, column.prop)"
                        class="file-input"
                        :id="'file-' + column.prop"
                      />
                      <label :for="'file-' + column.prop" class="reupload-btn">
                        🔄 重新上传
                      </label>
                      <el-button size="small" type="danger" @click="clearFile(column.prop)">
                        🗑️ 删除
                      </el-button>
                    </div>
                  </template>
                  <template v-else>
                    <input
                      type="file"
                      :accept="column.accept || '*'"
                      @change="(e) => handleFileUpload(e, column.prop)"
                      class="file-input"
                      :id="'file-' + column.prop"
                    />
                    <label :for="'file-' + column.prop" class="upload-btn">
                      <span>📁</span>
                      上传文件
                    </label>
                    <span v-if="column.uploadTip" class="upload-tip">{{ column.uploadTip }}</span>
                  </template>
                </div>
                <el-checkbox-group
                  v-else-if="column.type === 'tags'"
                  v-model="formData[column.prop]"
                >
                  <el-checkbox
                    v-for="tag in availableTags"
                    :key="tag"
                    :label="tag"
                  />
                </el-checkbox-group>
                <div v-if="column.type === 'tags'" class="tags-tip">
                  选择已有标签或输入新标签
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="custom-modal-footer">
          <button class="btn-cancel" @click="modalVisible = false">取消</button>
          <button class="btn-confirm" @click="handleSubmit">确认</button>
        </div>
      </div>
    </div>

    <!-- 文案编辑弹窗 -->
    <div v-if="titleEditModalVisible" class="custom-modal-overlay">
      <div class="custom-modal" style="width: 700px;">
        <div class="custom-modal-header">
          <h3>编辑文案</h3>
          <button class="close-btn" @click="titleEditModalVisible = false">×</button>
        </div>
        <div class="custom-modal-body">
          <div class="form-container">
            <div class="form-field">
              <div class="field-label">
                <span class="label-main">文案标题</span>
              </div>
              <div class="field-input">
                <div class="readonly-value">{{ currentEditRow?.title }}</div>
              </div>
            </div>
            <div class="form-field">
              <div class="field-label">
                <span class="label-main">文案内容</span>
              </div>
              <div class="field-input">
                <el-input
                  v-model="editContent"
                  type="textarea"
                  :rows="12"
                  placeholder="请输入文案内容"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="custom-modal-footer">
          <button class="btn-cancel" @click="titleEditModalVisible = false">取消</button>
          <button class="btn-confirm" @click="saveTitleEdit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  title: { type: String, default: '数据管理' },
  apiPath: { type: String, required: true },
  columns: { type: Array, default: () => [] },
  formColumns: { type: Array, default: () => [] },
  initialFilter: { type: Object, default: () => ({}) }
})

// 获取当前用户信息
const getCurrentUser = () => {
  const userInfo = localStorage.getItem('userInfo')
  if (userInfo) {
    return JSON.parse(userInfo)
  }
  // 生成默认用户
  const generateUserId = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
  const defaultUser = {
    id: generateUserId(),
    username: 'demoUser',
    email: 'demo@example.com'
  }
  localStorage.setItem('userInfo', JSON.stringify(defaultUser))
  return defaultUser
}

const tableData = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const searchKeyword = ref('')
const modalVisible = ref(false)
const isEditing = ref(false)
const formData = ref({})
const availableTags = ref([])
const loading = ref(false)
const hasLoadedOnce = ref(false)
// 文案编辑相关
const titleEditModalVisible = ref(false)
const currentEditRow = ref(null)
const editContent = ref('')

const uploadUrl = computed(() => `http://localhost:3001/api/${props.apiPath}/upload`)

const fetchData = async () => {
  loading.value = true
  try {
    const currentUser = getCurrentUser()
    const userId = currentUser?.id || null
    
    let url = `http://localhost:3001/api/${props.apiPath}?page=${currentPage.value}&size=${pageSize.value}`
    
    if (userId) {
      url += `&userId=${userId}`
    }
    
    if (searchKeyword.value) {
      url += `&keyword=${searchKeyword.value}`
    }
    Object.keys(props.initialFilter).forEach(key => {
      url += `&${key}=${props.initialFilter[key]}`
    })
    const response = await fetch(url)
    const data = await response.json()
    tableData.value = data
    total.value = data.length
    hasLoadedOnce.value = true
  } catch (error) {
    console.error('Failed to fetch data:', error)
  } finally {
    loading.value = false
  }
}

const fetchTags = async () => {
  try {
    const response = await fetch(`http://localhost:3001/api/${props.apiPath}/tags/list`)
    const data = await response.json()
    availableTags.value = data
  } catch (error) {
    console.error('Failed to fetch tags:', error)
  }
}

const handleSearch = () => {
  currentPage.value = 1
  fetchData()
}

const handlePageChange = (page) => {
  currentPage.value = page
  fetchData()
}

const openAddModal = () => {
  console.log('openAddModal called')
  isEditing.value = false
  formData.value = {}
  props.formColumns.forEach(col => {
    if (col.default !== undefined) {
      formData.value[col.prop] = col.default
    } else if (col.type === 'tags') {
      formData.value[col.prop] = []
    } else if (col.type === 'switch') {
      formData.value[col.prop] = false
    }
  })
  modalVisible.value = true
  console.log('modalVisible set to:', modalVisible.value)
}

defineExpose({
  openAddModal
})

const openEditModal = (row) => {
  isEditing.value = true
  formData.value = { ...row }
  if (formData.value.tags && typeof formData.value.tags === 'string') {
    try {
      const trimmed = formData.value.tags.trim()
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        formData.value.tags = JSON.parse(trimmed)
      }
    } catch (e) {
      formData.value.tags = trimmed
    }
  }
  modalVisible.value = true
}

const handleSubmit = async () => {
  try {
    const currentUser = getCurrentUser()
    const method = isEditing.value ? 'PUT' : 'POST'
    const url = isEditing.value
      ? `http://localhost:3001/api/${props.apiPath}/${formData.value.id}`
      : `http://localhost:3001/api/${props.apiPath}`

    // 准备提交数据
    const submitData = { ...formData.value }
    if (!isEditing.value) {
      submitData.userId = currentUser.id
    }

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submitData)
    })

    if (response.ok) {
      modalVisible.value = false
      fetchData()
      fetchTags()
      alert(isEditing.value ? '修改成功' : '添加成功')
    } else {
      const error = await response.json()
      alert(error.error || '操作失败')
    }
  } catch (error) {
    console.error('Submit failed:', error)
    alert('操作失败')
  }
}

const handleDelete = async (id) => {
  if (!confirm('确定要删除这条记录吗？')) return

  try {
    const response = await fetch(`http://localhost:3001/api/${props.apiPath}/${id}`, {
      method: 'DELETE'
    })

    if (response.ok) {
      fetchData()
      alert('删除成功')
    } else {
      const error = await response.json()
      alert(error.error || '删除失败')
    }
  } catch (error) {
    console.error('Delete failed:', error)
    alert('删除失败')
  }
}

const handleFileUpload = async (event, prop) => {
  const file = event.target.files[0]
  if (!file) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'video/mp4', 'video/mov', 'video/webm']
  if (!allowedTypes.includes(file.type)) {
    alert('不支持的文件类型')
    return
  }

  const uploadFormData = new FormData()
  uploadFormData.append('file', file)
  if (isEditing.value) {
    uploadFormData.append('id', formData.value.id)
  }
  if (formData.value.type) {
    uploadFormData.append('type', formData.value.type)
  } else if (file.type.startsWith('video/')) {
    uploadFormData.append('type', 'video')
  } else if (file.type.startsWith('image/')) {
    uploadFormData.append('type', 'image')
  }

  try {
    const response = await fetch(`http://localhost:3001/api/${props.apiPath}/upload`, {
      method: 'POST',
      body: uploadFormData
    })

    if (response.ok) {
      const data = await response.json()
      formData.value[prop] = data.fileUrl
      
      if (!formData.value.fileName) {
        formData.value.fileName = data.originalName || file.name
      }
      
      formData.value.fileSize = data.fileSize || file.size
      
      if (data.type && !formData.value.type) {
        formData.value.type = data.type
      }
      
      if (data.duration !== undefined && data.duration !== null) {
        formData.value.duration = data.duration
      }
      
      if (data.width !== undefined && data.width !== null) {
        formData.value.width = data.width
      }
      
      if (data.height !== undefined && data.height !== null) {
        formData.value.height = data.height
      }
      
      alert('上传成功')
    } else {
      const error = await response.json()
      alert(error.error || '上传失败')
    }
  } catch (error) {
    console.error('Upload failed:', error)
    alert('上传失败')
  }
}

const clearFile = (prop) => {
  if (confirm('确定要删除这个文件吗？')) {
    formData.value[prop] = null
  }
}

// 打开标题编辑弹窗
const openTitleEditModal = (row) => {
  currentEditRow.value = row
  editContent.value = row.content || ''
  titleEditModalVisible.value = true
}

// 保存文案编辑
const saveTitleEdit = async () => {
  if (!editContent.value.trim()) {
    alert('文案内容不能为空')
    return
  }
  
  try {
    const response = await fetch(`http://localhost:3001/api/${props.apiPath}/${currentEditRow.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...currentEditRow.value,
        content: editContent.value
      })
    })
    
    if (response.ok) {
      alert('保存成功')
      titleEditModalVisible.value = false
      fetchData()
    } else {
      const error = await response.json()
      alert(error.error || '保存失败')
    }
  } catch (error) {
    console.error('Save failed:', error)
    alert('保存失败')
  }
}

const isAudioFile = (path) => {
  if (!path) return false
  const ext = path.split('.').pop().toLowerCase()
  return ['wav', 'mp3', 'ogg', 'mpeg', 'flac', 'aac', 'm4a'].includes(ext)
}

const isImageFile = (path) => {
  if (!path) return false
  const ext = path.split('.').pop().toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
}

const isVideoFile = (path) => {
  if (!path) return false
  const ext = path.split('.').pop().toLowerCase()
  return ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)
}

const getFullUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `http://localhost:3001${path}`
}

const getFileName = (path) => {
  if (!path) return ''
  return path.split('/').pop()
}

const formatValue = (value, column) => {
  if (value === null || value === undefined) return '-'
  if (column.type === 'number' && typeof value === 'number') {
    return value.toLocaleString()
  }
  if (column.type === 'datetime') {
    return new Date(value).toLocaleString('zh-CN')
  }
  if (column.type === 'filesize') {
    if (value < 1024) return value + ' B'
    if (value < 1024 * 1024) return (value / 1024).toFixed(2) + ' KB'
    return (value / (1024 * 1024)).toFixed(2) + ' MB'
  }
  if (column.type === 'duration') {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue <= 0) return '0:00'
    const mins = Math.floor(numValue / 60)
    const secs = Math.floor(numValue % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  // 文本显示优化：显示更多字符而不是截断到2个
  const strValue = String(value)
  if (['fileName', 'title', 'content', 'name'].includes(column.prop)) {
    return strValue
  }
  return strValue
}

const getStatusText = (status) => {
  const statusMap = {
    draft: '草稿',
    processing: '处理中',
    completed: '已完成',
    published: '已发布'
  }
  return statusMap[status] || status
}

onMounted(() => {
  fetchData()
  fetchTags()
})

onBeforeUnmount(() => {
  modalVisible.value = false
})

watch(() => props.apiPath, () => {
  currentPage.value = 1
  fetchData()
  fetchTags()
})
</script>

<style scoped>
.crud-container {
  height: calc(100vh - 144px);
  display: flex;
  flex-direction: column;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.crud-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.crud-header h2 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 20px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  width: 250px;
}

.btn-icon {
  margin-right: 5px;
}

.crud-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.data-table {
  flex: 1;
  overflow: hidden;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  --el-table-border-color: rgba(255, 255, 255, 0.1);
  --el-table-header-bg-color: rgba(102, 126, 234, 0.15);
  --el-table-row-hover-bg-color: rgba(102, 126, 234, 0.1);
  --el-table-bg-color: rgba(255, 255, 255, 0.05);
  --el-table-tr-bg-color: rgba(255, 255, 255, 0.05);
  --el-table-text-color: rgba(255, 255, 255, 0.8);
  --el-table-header-text-color: #fff;
}

.data-table :deep(.el-table__inner-wrapper) {
  height: 100%;
}

.data-table :deep(.el-table__header-wrapper) {
  overflow-x: auto !important;
  position: sticky;
  top: 0;
  z-index: 1;
}

.data-table :deep(.el-table__body-wrapper) {
  overflow-y: auto !important;
  overflow-x: auto !important;
}

.data-table :deep(.el-table__header-row) {
  background: rgba(102, 126, 234, 0.15);
}

.data-table :deep(.el-table__header-cell) {
  color: #fff;
  font-weight: 600;
  background: rgba(102, 126, 234, 0.15);
  border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15) !important;
}

.data-table :deep(.el-table__body-row) {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.05);
}

.data-table :deep(.el-table__body-row:hover > td) {
  background: rgba(102, 126, 234, 0.1) !important;
}

.data-table :deep(.el-table__cell) {
  border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  white-space: normal;
  word-break: break-word;
}

.data-table :deep(.el-table__empty-block) {
  background: rgba(255, 255, 255, 0.05);
  min-height: 300px;
  width: 100% !important;
}

.data-table :deep(.el-table__empty-text) {
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tags-container :deep(.el-tag) {
  font-size: 12px;
}

.boolean-badge .badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.boolean-badge .badge.true {
  background: rgba(79, 172, 254, 0.3);
  color: #4facfe;
}

.boolean-badge .badge.false {
  background: rgba(245, 87, 108, 0.3);
  color: #f5576c;
}

.status-badge .badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.status-badge .badge.draft {
  background: rgba(255, 193, 7, 0.3);
  color: #ffc107;
}

.status-badge .badge.processing {
  background: rgba(79, 172, 254, 0.3);
  color: #4facfe;
}

.status-badge .badge.completed {
  background: rgba(64, 196, 128, 0.3);
  color: #40c480;
}

.status-badge .badge.published {
  background: rgba(118, 75, 162, 0.3);
  color: #764ba2;
}

.actions {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
}

.actions .el-button {
  padding: 5px 12px;
  font-size: 13px;
}

.clickable-title {
  cursor: pointer;
  color: #667eea;
  text-decoration: underline;
  transition: color 0.3s;
}

.dimensions {
  display: flex;
  align-items: center;
  justify-content: center;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
}

.clickable-title:hover {
  color: #a0b0ff;
}

.readonly-value {
  padding: 10px 15px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-weight: 500;
}

.preview {
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}

.preview-video {
  width: 140px;
  height: 100px;
  border-radius: 4px;
  object-fit: contain;
  background: #000;
}

.preview-audio {
  max-width: 120px;
  height: 30px;
}

.pagination {
  padding: 15px 0;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.form-container {
  padding: 10px 0;
}

.form-field {
  margin-bottom: 20px;
}

.field-label {
  margin-bottom: 8px;
}

.label-main {
  color: #fff;
  font-weight: 500;
  font-size: 14px;
  display: block;
  margin-bottom: 4px;
}

.label-tip {
  color: #999;
  font-size: 12px;
  display: block;
}

.field-input :deep(.el-input__inner),
.field-input :deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #333;
}

.field-input :deep(.el-select) {
  width: 100%;
}

.upload-area {
  position: relative;
}

.file-preview {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 10px;
}

.preview-media {
  width: 100%;
  margin-bottom: 10px;
}

.preview-media-img {
  max-width: 100%;
  max-height: 200px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.file-name {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
}

.file-actions {
  display: flex;
  gap: 10px;
  position: relative;
}

.upload-btn, .reupload-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.upload-btn:hover, .reupload-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.upload-area .file-input {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  z-index: 10;
}

.upload-tip {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

.tags-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
}

/* 完全独立的原生弹窗样式 */
.custom-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  overflow-y: auto;
}

.custom-modal {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: modalIn 0.3s ease;
  margin-top: 60px;
  margin-bottom: 20px;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.custom-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
}

.custom-modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.custom-modal-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.custom-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02);
}

.btn-cancel, .btn-confirm {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: #999;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.btn-confirm {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

/* ===== 移动端响应式样式 ===== */
@media (max-width: 768px) {
  .crud-container {
    padding: 12px;
    height: calc(100vh - 120px);
  }

  .crud-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .crud-header .page-title {
    width: 100%;
    font-size: 18px;
    text-align: left;
  }

  .header-actions {
    width: 100%;
    flex-direction: row;
  }

  .search-input {
    width: 100%;
    max-width: 250px;
  }

  .crud-body {
    overflow-x: auto;
  }

  .data-table {
    min-width: 600px;
  }

  /* 移动端弹窗优化 */
  .custom-modal {
    margin: 10px;
    max-height: calc(100vh - 20px);
  }

  .custom-modal-header {
    padding: 16px;
  }

  .custom-modal-body {
    padding: 16px;
  }

  .custom-modal-footer {
    padding: 16px;
  }
}
</style>