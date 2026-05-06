<template>
  <div class="api-log-manager">
    <div class="manager-layout">
      <!-- 页面头部 -->
      <div class="log-header">
      <div class="header-left">
        <h1>📊 API 调用日志</h1>
        <p>实时监控所有用户的 API 调用记录，包括 RunningHub 和 SiliconFlow</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="loadLogs" :loading="loading">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          刷新
        </el-button>
        <el-button @click="showCleanupDialog = true" type="warning" plain>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          清理过期数据
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card total">
        <div class="stat-icon">📈</div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.overview.totalCalls || 0 }}</div>
          <div class="stat-label">总调用次数</div>
        </div>
      </div>
      <div class="stat-card success">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.overview.successCalls || 0 }}</div>
          <div class="stat-label">成功次数</div>
        </div>
      </div>
      <div class="stat-card failed">
        <div class="stat-icon">❌</div>
        <div class="stat-info">
          <div class="stat-value">{{ statistics.overview.failedCalls || 0 }}</div>
          <div class="stat-label">失败次数</div>
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
          <div class="stat-label">消耗金币</div>
        </div>
      </div>
      <div class="stat-card tokens">
        <div class="stat-icon">🔤</div>
        <div class="stat-info">
          <div class="stat-value">{{ formatNumber(statistics.costs.totalTokens || 0) }}</div>
          <div class="stat-label">Token 消耗</div>
        </div>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="平台">
          <el-select v-model="filters.platform" placeholder="所有平台" clearable @change="handleFilterChange">
            <el-option label="RunningHub" value="runninghub" />
            <el-option label="硅基流动" value="siliconflow" />
          </el-select>
        </el-form-item>

        <el-form-item label="功能类型">
          <el-select v-model="filters.functionType" placeholder="所有功能" clearable @change="handleFilterChange">
            <el-option-group label="RunningHub 功能">
              <el-option label="音频转文字 (ASR)" value="asr" />
              <el-option label="文字转音频 (TTS)" value="tts" />
              <el-option label="配音生成" value="dubbing" />
              <el-option label="图生视频/数字人" value="image_to_video" />
              <el-option label="视频生成视频" value="video_to_video" />
            </el-option-group>
            <el-option-group label="SiliconFlow 功能">
              <el-option label="文案改写" value="text_rewrite" />
              <el-option label="文案审核" value="text_check" />
              <el-option label="文案生成" value="text_generate" />
              <el-option label="主题提取" value="text_extract_topics" />
            </el-option-group>
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="filters.isSuccess" placeholder="全部" clearable @change="handleFilterChange">
            <el-option label="成功" :value="true" />
            <el-option label="失败" :value="false" />
          </el-select>
        </el-form-item>

        <el-form-item label="时间范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleDateRangeChange"
          />
        </el-form-item>

        <el-form-item label="搜索">
          <el-input
            v-model="filters.taskId"
            placeholder="任务ID"
            clearable
            style="width: 200px"
            @keyup.enter="handleFilterChange"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleFilterChange">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 日志表格 -->
    <div class="log-table-container">
      <el-table
        :data="logs"
        v-loading="loading"
        stripe
        style="width: 100%"
        @row-click="showLogDetail"
        row-class-name="log-row"
      >
        <el-table-column prop="id" label="ID" width="100" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="log-id">{{ row.id.substring(0, 8) }}...</span>
          </template>
        </el-table-column>

        <el-table-column prop="startTime" label="调用时间" width="170" sortable>
          <template #default="{ row }">
            {{ formatDateTime(row.startTime) }}
          </template>
        </el-table-column>

        <el-table-column prop="userId" label="用户ID" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.userId.substring(0, 8) }}...</span>
          </template>
        </el-table-column>

        <el-table-column prop="platform" label="平台" width="110" sortable>
          <template #default="{ row }">
            <el-tag :type="row.platform === 'runninghub' ? 'primary' : 'success'" size="small">
              {{ row.platform === 'runninghub' ? 'RunningHub' : '硅基流动' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="functionName" label="功能" width="160" show-overflow-tooltip sortable />

        <el-table-column prop="isSuccess" label="状态" width="80" sortable>
          <template #default="{ row }">
            <el-tag :type="row.isSuccess ? 'success' : 'danger'" size="small">
              {{ row.isSuccess ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="durationMs" label="耗时" width="90" sortable>
          <template #default="{ row }">
            <span v-if="row.durationMs">{{ formatDuration(row.durationMs) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <!-- RunningHub 特有列 -->
        <el-table-column prop="rhTaskId" label="任务ID" width="130" show-overflow-tooltip v-if="hasPlatformData('runninghub')">
          <template #default="{ row }">
            <span v-if="row.rhTaskId">{{ row.rhTaskId }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="consumeCoins" label="消耗金币" width="90" sortable v-if="hasPlatformData('runninghub')">
          <template #default="{ row }">
            <span v-if="row.consumeCoins" class="coin-value">{{ row.consumeCoins }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="taskCostTimeFormatted" label="执行时间" width="90" v-if="hasPlatformData('runninghub')">
          <template #default="{ row }">
            <span v-if="row.taskCostTimeFormatted">{{ row.taskCostTimeFormatted }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <!-- SiliconFlow 特有列 -->
        <el-table-column prop="inputTokens" label="输入Token" width="95" sortable v-if="hasPlatformData('siliconflow')">
          <template #default="{ row }">
            <span v-if="row.inputTokens">{{ formatNumber(row.inputTokens) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="outputTokens" label="输出Token" width="95" sortable v-if="hasPlatformData('siliconflow')">
          <template #default="{ row }">
            <span v-if="row.outputTokens">{{ formatNumber(row.outputTokens) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="modelName" label="模型" width="150" show-overflow-tooltip v-if="hasPlatformData('siliconflow')" />

        <el-table-column prop="errorMessage" label="错误信息" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="!row.isSuccess && row.errorMessage" class="error-text">
              {{ row.errorMessage }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click.stop="showLogDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="API 调用详情"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedLog" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="日志ID">{{ selectedLog.id }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ selectedLog.userId }}</el-descriptions-item>
          
          <el-descriptions-item label="平台">
            <el-tag :type="selectedLog.platform === 'runninghub' ? 'primary' : 'success'" size="small">
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
            <el-tag :type="selectedLog.isSuccess ? 'success' : 'danger'" size="small">
              {{ selectedLog.isSuccess ? '✅ 成功' : '❌ 失败' }}
            </el-tag>
          </el-descriptions-item>

          <!-- RunningHub 特有信息 -->
          <template v-if="selectedLog.platform === 'runninghub'">
            <el-descriptions-item label="RH 任务ID">{{ selectedLog.rhTaskId || '-' }}</el-descriptions-item>
            <el-descriptions-item label="消耗金币">
              <span v-if="selectedLog.consumeCoins" class="coin-value">{{ selectedLog.consumeCoins }}</span>
              <span v-else>-</span>
            </el-descriptions-item>
            
            <el-descriptions-item label="任务执行时间">{{ selectedLog.taskCostTimeFormatted || '-' }}</el-descriptions-item>
            <el-descriptions-item label="WebSocket URL">{{ selectedLog.netWssUrl || '-' }}</el-descriptions-item>
          </template>

          <!-- SiliconFlow 特有信息 -->
          <template v-if="selectedLog.platform === 'siliconflow'">
            <el-descriptions-item label="模型名称">{{ selectedLog.modelName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="输入 Token">{{ selectedLog.inputTokens ? formatNumber(selectedLog.inputTokens) : '-' }}</el-descriptions-item>
            
            <el-descriptions-item label="输出 Token">{{ selectedLog.outputTokens ? formatNumber(selectedLog.outputTokens) : '-' }}</el-descriptions-item>
            <el-descriptions-item label="总 Token 消耗">{{ selectedLog.totalTokens ? formatNumber(selectedLog.totalTokens) : '-' }}</el-descriptions-item>
          </template>

          <!-- 错误信息（如果有） -->
          <el-descriptions-item v-if="!selectedLog.isSuccess" label="错误代码" :span="2">
            {{ selectedLog.errorCode || '-' }}
          </el-descriptions-item>
          
          <el-descriptions-item v-if="!selectedLog.isSuccess && selectedLog.errorMessage" label="错误详情" :span="2">
            <div class="error-detail">{{ selectedLog.errorMessage }}</div>
          </el-descriptions-item>

          <!-- 输出文件信息 -->
          <el-descriptions-item v-if="selectedLog.outputFilePath" label="输出文件" :span="2">
            {{ selectedLog.outputFilePath }}
            <span v-if="selectedLog.outputFileSize"> ({{ formatFileSize(selectedLog.outputFileSize) }})</span>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 请求参数 -->
        <div v-if="selectedLog.requestParams" class="section-block">
          <h4>📥 请求参数</h4>
          <pre class="json-preview">{{ JSON.stringify(selectedLog.requestParams, null, 2) }}</pre>
        </div>

        <!-- 响应数据 -->
        <div v-if="selectedLog.responseData" class="section-block">
          <h4>📤 响应数据</h4>
          <pre class="json-preview">{{ JSON.stringify(selectedLog.responseData, null, 2) }}</pre>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 清理确认对话框 -->
    <el-dialog
      v-model="showCleanupDialog"
      title="清理过期日志"
      width="450px"
    >
      <div class="cleanup-content">
        <p>⚠️ 此操作将删除指定天数之前的所有 API 日志记录，且<strong>不可恢复</strong>！</p>
        
        <el-form :model="cleanupForm" label-width="120px">
          <el-form-item label="保留最近">
            <el-input-number v-model="cleanupForm.daysToKeep" :min="7" :max="365" :step="1" />
            <span style="margin-left: 10px;">天的日志</span>
          </el-form-item>
        </el-form>

        <el-alert
          title="建议：保留至少 30 天的日志以便分析和排查问题"
          type="info"
          :closable="false"
          show-icon
          style="margin-top: 15px;"
        />
      </div>

      <template #footer>
        <el-button @click="showCleanupDialog = false">取消</el-button>
        <el-button type="danger" @click="handleCleanup" :loading="cleanupLoading">
          确认清理
        </el-button>
      </template>
    </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'

const loading = ref(false)
const logs = ref([])
const detailDialogVisible = ref(false)
const selectedLog = ref(null)
const showCleanupDialog = ref(false)
const cleanupLoading = ref(false)

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

onMounted(() => {
  loadLogs()
  loadStatistics()
})

async function loadLogs() {
  loading.value = true
  
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters
    }

    const response = await axios.get('/api/api-logs', { params })
    
    if (response.data.success) {
      logs.value = response.data.data.logs
      pagination.total = response.data.data.total
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
    const response = await axios.get('/api/api-logs/stats/overview', { params: filters })
    
    if (response.data.success) {
      Object.assign(statistics, response.data.data)
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
    const response = await axios.post('/api/api-logs/cleanup', cleanupForm)
    
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

// ========== 工具函数 ==========

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
  
  return `${minutes}m ${remainingSeconds}s`
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
  height: 100%;
  overflow: auto;
  padding: 24px;
  box-sizing: border-box;
}

.manager-layout {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  max-width: 100%;
  margin: 0 auto;
  background: rgba(30, 30, 60, 0.7);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.3);
  overflow: visible;
  padding: 24px 28px;
  box-sizing: border-box;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 20px;
  flex-wrap: wrap;  /* ✅ 允许换行 */
}

.header-left h1 {
  font-size: 22px;
  color: #fff;
  margin: 0 0 6px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-left p {
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  font-size: 13px;
}

.header-right {
  display: flex;
  gap: 10px;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
  width: 100%;
}

.stat-card {
  background: rgba(255, 255, 255, 0.06);
  padding: 18px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  gap: 15px;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.09);
}

.stat-card.total { border-left: 4px solid #409eff; }
.stat-card.success { border-left: 4px solid #67c23a; }
.stat-card.failed { border-left: 4px solid #f56c6c; }
.stat-card.rate { border-left: 4px solid #e6a23c; }
.stat-card.cost { border-left: 4px solid #f56c6c; }
.stat-card.tokens { border-left: 4px solid #909399; }

.stat-icon {
  font-size: 32px;
}

.stat-value {
  font-size: 26px;
  font-weight: bold;
  color: #fff;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

.coin-value {
  color: #f56c6c;
  font-weight: bold;
}

/* 筛选区域 */
.filter-section {
  background: rgba(255, 255, 255, 0.04);
  padding: 18px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 20px;
  overflow-x: auto;
  width: 100%;
  box-sizing: border-box;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* 表格容器 */
.log-table-container {
  background: rgba(255, 255, 255, 0.04);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow-x: auto;
  width: 100%;
  box-sizing: border-box;
}

.log-table-container :deep(.el-table) {
  min-width: 1000px;
}

.log-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.log-row:hover {
  background-color: #f5f7fa !important;
}

.log-id {
  font-family: monospace;
  color: #909399;
  font-size: 12px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.error-text {
  color: #f56c6c;
  font-size: 12px;
}

.error-detail {
  color: #f56c6c;
  background: #fef0f0;
  padding: 10px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.5;
}

/* 详情对话框 */
.detail-content {
  max-height: 600px;
  overflow-y: auto;
}

.section-block {
  margin-top: 20px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.section-block h4 {
  margin: 0 0 10px 0;
  color: #fff;
  font-size: 14px;
}

.json-preview {
  background: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  margin: 0;
  color: #606266;
}

.cleanup-content {
  padding: 10px 0;
}

.cleanup-content p {
  color: #f56c6c;
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 20px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .log-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .filter-form {
    flex-direction: column;
  }
}
</style>
