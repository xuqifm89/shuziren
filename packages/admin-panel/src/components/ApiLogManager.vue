<template>
  <div class="api-log-manager">
    <div class="manager-layout">
      <div class="log-header">
        <div class="header-left">
          <h1>API 调用日志</h1>
          <p>监控所有用户的 API 调用记录</p>
        </div>
        <div class="header-right">
          <el-button type="primary" @click="loadLogs" :loading="loading" size="small">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
            刷新
          </el-button>
          <el-button @click="showCleanupDialog = true" type="warning" plain size="small">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            清理
          </el-button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card total">
          <div class="stat-icon">📈</div>
          <div class="stat-info">
            <div class="stat-value">{{ statistics.overview.totalCalls || 0 }}</div>
            <div class="stat-label">总调用</div>
          </div>
        </div>
        <div class="stat-card success">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-value">{{ statistics.overview.successCalls || 0 }}</div>
            <div class="stat-label">成功</div>
          </div>
        </div>
        <div class="stat-card failed">
          <div class="stat-icon">❌</div>
          <div class="stat-info">
            <div class="stat-value">{{ statistics.overview.failedCalls || 0 }}</div>
            <div class="stat-label">失败</div>
          </div>
        </div>
        <div class="stat-card rate">
          <div class="stat-icon">🎯</div>
          <div class="stat-info">
            <div class="stat-value">{{ statistics.overview.successRate || '0%' }}</div>
            <div class="stat-label">成功率</div>
          </div>
        </div>
        <div class="stat-card cost">
          <div class="stat-icon">💰</div>
          <div class="stat-info">
            <div class="stat-value">{{ statistics.costs.totalCoins || '0' }}</div>
            <div class="stat-label">金币</div>
          </div>
        </div>
        <div class="stat-card tokens">
          <div class="stat-icon">🔤</div>
          <div class="stat-info">
            <div class="stat-value">{{ formatNumber(statistics.costs.totalTokens || 0) }}</div>
            <div class="stat-label">Token</div>
          </div>
        </div>
      </div>

      <div class="filter-section">
        <el-form :inline="true" :model="filters" class="filter-form" size="small">
          <el-form-item label="平台">
            <el-select v-model="filters.platform" placeholder="所有平台" clearable @change="handleFilterChange" style="width: 140px">
              <el-option label="RunningHub" value="runninghub" />
              <el-option label="硅基流动" value="siliconflow" />
            </el-select>
          </el-form-item>

          <el-form-item label="功能">
            <el-select v-model="filters.functionType" placeholder="所有功能" clearable @change="handleFilterChange" style="width: 160px">
              <el-option-group label="RunningHub">
                <el-option label="音频转文字" value="asr" />
                <el-option label="文字转音频" value="tts" />
                <el-option label="配音生成" value="dubbing" />
                <el-option label="图生视频" value="image_to_video" />
                <el-option label="视频生成" value="video_to_video" />
              </el-option-group>
              <el-option-group label="SiliconFlow">
                <el-option label="文案改写" value="text_rewrite" />
                <el-option label="文案审核" value="text_check" />
                <el-option label="文案生成" value="text_generate" />
                <el-option label="主题提取" value="text_extract_topics" />
              </el-option-group>
            </el-select>
          </el-form-item>

          <el-form-item label="状态">
            <el-select v-model="filters.isSuccess" placeholder="全部" clearable @change="handleFilterChange" style="width: 100px">
              <el-option label="成功" :value="true" />
              <el-option label="失败" :value="false" />
            </el-select>
          </el-form-item>

          <el-form-item label="时间">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="-"
              start-placeholder="开始"
              end-placeholder="结束"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              @change="handleDateRangeChange"
              style="width: 240px"
            />
          </el-form-item>

          <el-form-item label="任务ID">
            <el-input
              v-model="filters.taskId"
              placeholder="搜索"
              clearable
              style="width: 140px"
              @keyup.enter="handleFilterChange"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleFilterChange">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <div class="log-table-container">
        <el-table
          :data="logs"
          v-loading="loading"
          border
          class="data-table"
          style="width: 100%"
          :max-height="tableMaxHeight"
          @row-click="showLogDetail"
          row-class-name="log-row"
        >
          <el-table-column prop="startTime" label="调用时间" min-width="160" sortable fixed>
            <template #default="{ row }">
              {{ formatDateTime(row.startTime) }}
            </template>
          </el-table-column>

          <el-table-column prop="platform" label="平台" min-width="100" sortable>
            <template #default="{ row }">
              <el-tag :type="row.platform === 'runninghub' ? 'primary' : 'success'" effect="dark" size="small">
                {{ row.platform === 'runninghub' ? 'RH' : 'SF' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="functionName" label="功能" min-width="130" show-overflow-tooltip sortable />

          <el-table-column prop="isSuccess" label="状态" min-width="70" sortable>
            <template #default="{ row }">
              <el-tag :type="row.isSuccess ? 'success' : 'danger'" effect="dark" size="small">
                {{ row.isSuccess ? '成功' : '失败' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="durationMs" label="耗时" min-width="80" sortable>
            <template #default="{ row }">
              <span v-if="row.durationMs">{{ formatDuration(row.durationMs) }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column prop="userId" label="用户ID" min-width="110" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="log-id">{{ row.userId.substring(0, 8) }}...</span>
            </template>
          </el-table-column>

          <el-table-column prop="rhTaskId" label="RH任务ID" min-width="120" show-overflow-tooltip v-if="hasPlatformData('runninghub')">
            <template #default="{ row }">
              <span v-if="row.rhTaskId">{{ row.rhTaskId }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column prop="consumeCoins" label="金币" min-width="70" sortable v-if="hasPlatformData('runninghub')">
            <template #default="{ row }">
              <span v-if="row.consumeCoins" class="coin-value">{{ row.consumeCoins }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column prop="taskCostTimeFormatted" label="执行时间" min-width="80" v-if="hasPlatformData('runninghub')">
            <template #default="{ row }">
              <span v-if="row.taskCostTimeFormatted">{{ row.taskCostTimeFormatted }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column prop="inputTokens" label="入Token" min-width="80" sortable v-if="hasPlatformData('siliconflow')">
            <template #default="{ row }">
              <span v-if="row.inputTokens">{{ formatNumber(row.inputTokens) }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column prop="outputTokens" label="出Token" min-width="80" sortable v-if="hasPlatformData('siliconflow')">
            <template #default="{ row }">
              <span v-if="row.outputTokens">{{ formatNumber(row.outputTokens) }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column prop="modelName" label="模型" min-width="140" show-overflow-tooltip v-if="hasPlatformData('siliconflow')" />

          <el-table-column prop="errorMessage" label="错误信息" min-width="160" show-overflow-tooltip>
            <template #default="{ row }">
              <span v-if="!row.isSuccess && row.errorMessage" class="error-text">
                {{ row.errorMessage }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="70" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click.stop="showLogDetail(row)">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next"
            small
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <el-dialog
      v-model="detailDialogVisible"
      title="API 调用详情"
      width="720px"
      :close-on-click-modal="false"
      class="log-detail-dialog"
    >
      <div v-if="selectedLog" class="detail-content">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="日志ID" :span="2">{{ selectedLog.id }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ selectedLog.userId }}</el-descriptions-item>

          <el-descriptions-item label="平台">
            <el-tag :type="selectedLog.platform === 'runninghub' ? 'primary' : 'success'" effect="dark" size="small">
              {{ selectedLog.platform === 'runninghub' ? 'RunningHub' : '硅基流动' }}
            </el-tag>
          </el-descriptions-item>

          <el-descriptions-item label="功能类型">{{ selectedLog.functionName }}</el-descriptions-item>

          <el-descriptions-item label="调用时间">{{ formatDateTime(selectedLog.startTime) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ selectedLog.endTime ? formatDateTime(selectedLog.endTime) : '-' }}</el-descriptions-item>

          <el-descriptions-item label="总耗时">
            <span v-if="selectedLog.durationMs">{{ formatDuration(selectedLog.durationMs) }} ({{ selectedLog.durationMs }}ms)</span>
            <span v-else>-</span>
          </el-descriptions-item>

          <el-descriptions-item label="状态">
            <el-tag :type="selectedLog.isSuccess ? 'success' : 'danger'" effect="dark" size="small">
              {{ selectedLog.isSuccess ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>

          <template v-if="selectedLog.platform === 'runninghub'">
            <el-descriptions-item label="RH 任务ID">{{ selectedLog.rhTaskId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="消耗金币">
              <span v-if="selectedLog.consumeCoins" class="coin-value">{{ selectedLog.consumeCoins }}</span>
              <span v-else>-</span>
            </el-descriptions-item>

            <el-descriptions-item label="任务执行时间">{{ selectedLog.taskCostTimeFormatted || '-' }}</el-descriptions-item>
            <el-descriptions-item label="WebSocket URL">{{ selectedLog.netWssUrl || '-' }}</el-descriptions-item>
          </template>

          <template v-if="selectedLog.platform === 'siliconflow'">
            <el-descriptions-item label="模型名称">{{ selectedLog.modelName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="输入 Token">{{ selectedLog.inputTokens ? formatNumber(selectedLog.inputTokens) : '-' }}</el-descriptions-item>

            <el-descriptions-item label="输出 Token">{{ selectedLog.outputTokens ? formatNumber(selectedLog.outputTokens) : '-' }}</el-descriptions-item>
            <el-descriptions-item label="总 Token 消耗">{{ selectedLog.totalTokens ? formatNumber(selectedLog.totalTokens) : '-' }}</el-descriptions-item>
          </template>

          <el-descriptions-item v-if="!selectedLog.isSuccess" label="错误代码" :span="2">
            {{ selectedLog.errorCode || '-' }}
          </el-descriptions-item>

          <el-descriptions-item v-if="!selectedLog.isSuccess && selectedLog.errorMessage" label="错误详情" :span="2">
            <div class="error-detail">{{ selectedLog.errorMessage }}</div>
          </el-descriptions-item>

          <el-descriptions-item v-if="selectedLog.outputFilePath" label="输出文件" :span="2">
            {{ selectedLog.outputFilePath }}
            <span v-if="selectedLog.outputFileSize"> ({{ formatFileSize(selectedLog.outputFileSize) }})</span>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedLog.requestParams" class="section-block">
          <h4>请求参数</h4>
          <pre class="json-preview">{{ JSON.stringify(selectedLog.requestParams, null, 2) }}</pre>
        </div>

        <div v-if="selectedLog.responseData" class="section-block">
          <h4>响应数据</h4>
          <pre class="json-preview">{{ JSON.stringify(selectedLog.responseData, null, 2) }}</pre>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false" size="small">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="showCleanupDialog"
      title="清理过期日志"
      width="420px"
    >
      <div class="cleanup-content">
        <p>此操作将删除指定天数之前的所有 API 日志记录，且<strong>不可恢复</strong>！</p>

        <el-form :model="cleanupForm" label-width="100px" size="small">
          <el-form-item label="保留最近">
            <el-input-number v-model="cleanupForm.daysToKeep" :min="7" :max="365" :step="1" />
            <span style="margin-left: 8px;">天</span>
          </el-form-item>
        </el-form>

        <el-alert
          title="建议保留至少 30 天的日志以便排查问题"
          type="info"
          :closable="false"
          show-icon
          style="margin-top: 12px;"
        />
      </div>

      <template #footer>
        <el-button @click="showCleanupDialog = false" size="small">取消</el-button>
        <el-button type="danger" @click="handleCleanup" :loading="cleanupLoading" size="small">
          确认清理
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, onBeforeUnmount, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '../utils/api.js'

const loading = ref(false)
const logs = ref([])
const detailDialogVisible = ref(false)
const selectedLog = ref(null)
const showCleanupDialog = ref(false)
const cleanupLoading = ref(false)
const tableMaxHeight = ref(400)

const filters = reactive({
  platform: '',
  functionType: '',
  isSuccess: '',
  taskId: '',
  startDate: '',
  endDate: ''
})

const dateRange = ref([])

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const statistics = reactive({
  overview: {
    totalCalls: 0,
    successCalls: 0,
    failedCalls: 0,
    successRate: '0%',
    avgDuration: 'N/A'
  },
  byPlatform: [],
  byFunction: [],
  costs: {
    totalCoins: '0',
    totalTokens: 0
  }
})

const cleanupForm = reactive({
  daysToKeep: 90
})

function calcTableHeight() {
  nextTick(() => {
    const vh = window.innerHeight
    tableMaxHeight.value = Math.max(200, vh - 420)
  })
}

onMounted(() => {
  loadLogs()
  loadStatistics()
  calcTableHeight()
  window.addEventListener('resize', calcTableHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', calcTableHeight)
})

async function loadLogs() {
  loading.value = true

  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters
    }

    const response = await api.get('/api-logs', { params })

    if (response.success) {
      logs.value = response.data.logs
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('加载日志失败:', error)
    ElMessage.error('加载日志失败')
  } finally {
    loading.value = false
  }
}

async function loadStatistics() {
  try {
    const response = await api.get('/api-logs/stats/overview', { params: filters })

    if (response.success) {
      Object.assign(statistics, response.data)
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

function handleFilterChange() {
  pagination.page = 1
  loadLogs()
  loadStatistics()
}

function handleDateRangeChange(value) {
  if (value && value.length === 2) {
    filters.startDate = value[0]
    filters.endDate = value[1]
  } else {
    filters.startDate = ''
    filters.endDate = ''
  }
  handleFilterChange()
}

function resetFilters() {
  Object.assign(filters, {
    platform: '',
    functionType: '',
    isSuccess: '',
    taskId: '',
    startDate: '',
    endDate: ''
  })
  dateRange.value = []
  handleFilterChange()
}

function handleSizeChange(val) {
  pagination.pageSize = val
  pagination.page = 1
  loadLogs()
}

function handlePageChange(val) {
  pagination.page = val
  loadLogs()
}

function showLogDetail(row) {
  selectedLog.value = row
  detailDialogVisible.value = true
}

async function handleCleanup() {
  cleanupLoading.value = true

  try {
    const response = await api.post('/api-logs/cleanup', cleanupForm)

    if (response.data.success) {
      ElMessage.success(`成功清理 ${response.data.data.deletedCount} 条过期日志`)
      showCleanupDialog.value = false
      loadLogs()
      loadStatistics()
    }
  } catch (error) {
    console.error('清理失败:', error)
    ElMessage.error('清理失败')
  } finally {
    cleanupLoading.value = false
  }
}

function hasPlatformData(platform) {
  if (!filters.platform) return true
  return filters.platform === platform
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatDuration(ms) {
  if (!ms) return '-'

  if (ms < 1000) return `${ms}ms`

  const seconds = Math.floor(ms / 1000)

  if (seconds < 60) return `${seconds}s`

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function formatNumber(num) {
  if (!num) return '0'
  return num.toLocaleString()
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let size = bytes

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`
}
</script>

<style scoped>
.api-log-manager {
  height: calc(100vh - 144px);
  display: flex;
  flex-direction: column;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.manager-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.header-left h1 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 4px 0;
}

.header-left p {
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
  font-size: 13px;
}

.header-right {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.stat-card {
  background: rgba(255, 255, 255, 0.06);
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.09);
}

.stat-card.total { border-left: 3px solid #667eea; }
.stat-card.success { border-left: 3px solid #40c480; }
.stat-card.failed { border-left: 3px solid #f56c6c; }
.stat-card.rate { border-left: 3px solid #e6a23c; }
.stat-card.cost { border-left: 3px solid #f56c6c; }
.stat-card.tokens { border-left: 3px solid #909399; }

.stat-icon {
  font-size: 26px;
  flex-shrink: 0;
}

.stat-value {
  font-size: 22px;
  font-weight: bold;
  color: #fff;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
}

.coin-value {
  color: #f56c6c;
  font-weight: bold;
}

.filter-section {
  background: rgba(255, 255, 255, 0.05);
  padding: 16px 18px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 16px;
  flex-shrink: 0;
  overflow-x: auto;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  align-items: center;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 16px;
}

.filter-form :deep(.el-form-item__label) {
  font-size: 13px;
  padding-right: 6px;
  color: rgba(255, 255, 255, 0.6);
}

.log-table-container {
  background: rgba(255, 255, 255, 0.05);
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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

.log-row {
  cursor: pointer;
}

.log-id {
  font-family: monospace;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.pagination-wrapper :deep(.el-pagination button),
.pagination-wrapper :deep(.el-pager li) {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.85);
}

.pagination-wrapper :deep(.el-pagination button:hover),
.pagination-wrapper :deep(.el-pager li:hover) {
  background: rgba(102, 126, 234, 0.2);
  color: #fff;
}

.pagination-wrapper :deep(.el-pagination .is-active) {
  background: #667eea;
  color: #fff;
}

.error-text {
  color: #f56c6c;
  font-size: 12px;
}

.error-detail {
  color: #f56c6c;
  background: rgba(245, 87, 108, 0.1);
  border: 1px solid rgba(245, 87, 108, 0.2);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.5;
}

.detail-content {
  max-height: 60vh;
  overflow-y: auto;
}

.section-block {
  margin-top: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.section-block h4 {
  margin: 0 0 12px 0;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.json-preview {
  background: rgba(20, 20, 40, 0.8);
  padding: 14px;
  border-radius: 8px;
  border: 1px solid rgba(102, 126, 234, 0.25);
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  margin: 0;
  color: #d1d5db;
  max-height: 300px;
}

.cleanup-content {
  padding: 10px 0;
}

.cleanup-content p {
  color: #f56c6c;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 16px;
}

:deep(.el-descriptions) {
  --el-descriptions-bg-color: transparent;
}

:deep(.el-descriptions__header) {
  background: rgba(255, 255, 255, 0.05);
}

:deep(.el-descriptions__label),
:deep(.el-descriptions__body .el-descriptions__cell) {
  color: rgba(255, 255, 255, 0.85);
  border-color: rgba(255, 255, 255, 0.1);
}

:deep(.el-descriptions__label) {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.65);
}

:deep(.el-dialog) {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.el-dialog__title) {
  color: #fff;
  font-weight: 600;
}

:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner),
:deep(.el-select__wrapper),
:deep(.el-input-number) {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: none;
  color: #fff;
}

:deep(.el-input__inner),
:deep(.el-textarea__inner),
:deep(.el-select__wrapper),
:deep(.el-input-number__input) {
  color: #fff;
}

:deep(.el-input__inner::placeholder),
:deep(.el-textarea__inner::placeholder),
:deep(.el-select__placeholder) {
  color: rgba(255, 255, 255, 0.35);
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .log-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .filter-form {
    flex-direction: column;
  }

  .filter-form :deep(.el-form-item) {
    margin-right: 0;
    margin-bottom: 12px;
  }
}

@media (max-width: 768px) {
  .api-log-manager {
    padding: 12px;
    height: calc(100vh - 120px);
  }

  .log-header {
    margin-bottom: 16px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .stat-card {
    padding: 10px 12px;
  }

  .stat-icon {
    font-size: 22px;
  }

  .stat-value {
    font-size: 18px;
  }
}
</style>
