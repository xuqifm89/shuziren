<template>
  <div class="video-publish">
    <div class="video-preview" v-if="props.videoPath">
      <video :src="getVideoUrl(props.videoPath)" controls class="video-player" />
    </div>
    <div class="no-video" v-else>
      <span class="no-video-text">请先在"视频剪辑"板块生成视频</span>
    </div>

    <div class="form-section">
      <div class="form-row">
        <span class="form-label">标题</span>
        <el-input v-model="title" placeholder="输入视频标题" class="form-input" />
      </div>
      <div class="form-row">
        <span class="form-label">描述</span>
        <el-input v-model="description" type="textarea" :rows="2" placeholder="输入视频描述" class="form-input" />
      </div>
      <div class="form-row">
        <span class="form-label">标签</span>
        <el-input v-model="tagsInput" placeholder="用逗号分隔，如：日常,生活" class="form-input" />
      </div>
      <div class="form-row cover-row">
        <span class="form-label">封面</span>
        <div class="cover-upload-area">
          <div v-if="coverPreview" class="cover-preview-wrapper">
            <img :src="coverPreview" class="cover-preview-img" />
            <div class="cover-remove" @click="removeCover">✕</div>
          </div>
          <el-upload
            v-else
            action="#"
            :auto-upload="false"
            :on-change="handleCoverChange"
            :show-file-list="false"
            accept=".jpg,.jpeg,.png,.webp"
          >
            <div class="cover-placeholder">
              <img class="cover-placeholder-icon" :src="shangchuanIcon" />
              <span class="cover-placeholder-text">上传封面</span>
            </div>
          </el-upload>
          <span class="cover-tip">不传则使用视频首帧</span>
        </div>
      </div>
    </div>

    <div class="platform-section">
      <div class="section-header">
        <span class="section-title">选择平台</span>
        <el-button type="primary" size="small" @click="showAddAccount = true">添加账号</el-button>
      </div>
      <div class="platform-grid">
        <div
          v-for="platform in platforms"
          :key="platform.key"
          :class="['platform-card', { active: selectedPlatforms.includes(platform.key) }]"
          @click="togglePlatform(platform.key)"
        >
          <img class="platform-icon" :src="platformIcons[platform.key]" />
          <span class="platform-name">{{ platform.name }}</span>
          <span :class="['account-count', { 'has-accounts': getAccountsByPlatform(platform.key).length > 0 }]">
            {{ getAccountsByPlatform(platform.key).length }}个账号
          </span>
        </div>
      </div>
    </div>

    <div class="account-section" v-if="selectedPlatforms.length > 0">
      <div class="section-header">
        <span class="section-title">选择账号</span>
      </div>
      <div class="account-list">
        <div v-for="platform in selectedPlatforms" :key="platform" class="account-group">
          <div class="account-group-title">{{ platformNames[platform] }}</div>
          <div v-for="account in getAccountsByPlatform(platform)" :key="account.id" class="account-item">
            <el-checkbox
              :model-value="selectedAccountIds.includes(account.id)"
              @change="(val) => toggleAccount(account.id, val)"
            >
              <span class="account-name">{{ account.accountName }}</span>
            </el-checkbox>
            <span :class="['cookie-status', account.cookieValid ? 'valid' : 'invalid']">
              {{ account.cookieValid ? '有效' : '失效' }}
            </span>
            <el-button type="text" size="small" @click="handleCheckAccount(account)">检查</el-button>
            <el-button type="text" size="small" @click="handleLoginAccount(account)">登录</el-button>
            <el-button type="text" size="small" class="delete-btn" @click="handleDeleteAccount(account)">删除</el-button>
          </div>
          <div v-if="getAccountsByPlatform(platform).length === 0" class="no-account">
            暂无账号，请先添加
          </div>
        </div>
      </div>
    </div>

    <div class="bilibili-tid-section" v-if="selectedPlatforms.includes('bilibili')">
      <div class="form-row">
        <span class="form-label">分区</span>
        <el-select v-model="bilibiliTid" placeholder="选择B站分区" class="form-input" filterable>
          <el-option-group v-for="group in bilibiliTidGroups" :key="group.label" :label="group.label">
            <el-option v-for="item in group.options" :key="item.value" :label="item.label" :value="item.value" />
          </el-option-group>
        </el-select>
      </div>
    </div>

    <div class="publish-section">
      <div class="publish-type-switch">
        <div
          :class="['type-option', { active: publishType === 'immediate' }]"
          @click="publishType = 'immediate'"
        >
          <span class="type-option-icon">⚡</span>
          <span class="type-option-label">立即发布</span>
        </div>
        <div
          :class="['type-option', { active: publishType === 'scheduled' }]"
          @click="publishType = 'scheduled'"
        >
          <span class="type-option-icon">🕐</span>
          <span class="type-option-label">定时发布</span>
        </div>
      </div>
      <div class="schedule-row" v-if="publishType === 'scheduled'">
        <el-date-picker
          v-model="scheduleTime"
          type="datetime"
          placeholder="选择发布时间"
          style="width: 100%"
        />
      </div>
      <el-button
        type="primary"
        class="publish-btn"
        :disabled="!canPublish"
        :loading="publishing"
        @click="handlePublish"
      >
        {{ publishing ? '发布中...' : '一键发布' }}
      </el-button>
    </div>

    <div class="task-section" v-if="currentPublishTasks.length > 0">
      <div class="section-header">
        <span class="section-title">📊 发布进度</span>
        <el-button type="text" size="small" @click="clearPublishProgress" class="clear-progress-btn">清除</el-button>
      </div>
      <div class="task-list">
        <div v-for="task in currentPublishTasks" :key="task.id" class="task-item">
          <span class="task-platform">{{ platformNames[task.platform] || task.platform }}</span>
          <span class="task-title">{{ task.title }}</span>
          <span :class="['task-status', task.status]">{{ statusLabels[task.status] || task.status }}</span>
          <span v-if="task.status === 'running'" class="task-loading">
            <el-icon class="is-loading"><Loading /></el-icon>
          </span>
        </div>
      </div>
    </div>

    <el-dialog v-model="showAddAccount" title="添加账号" width="400px" :append-to-body="true">
      <div class="add-account-form">
        <div class="form-row">
          <span class="form-label">平台</span>
          <el-select v-model="newAccountPlatform" placeholder="选择平台" class="form-input">
            <el-option
              v-for="platform in platforms"
              :key="platform.key"
              :label="platform.name"
              :value="platform.key"
            />
          </el-select>
        </div>
        <div class="form-row">
          <span class="form-label">账号名</span>
          <el-input v-model="newAccountName" placeholder="输入账号名称" class="form-input" />
        </div>
      </div>
      <template #footer>
        <el-button @click="showAddAccount = false">取消</el-button>
        <el-button type="primary" @click="handleAddAccount" :loading="addingAccount">确定</el-button>
      </template>
    </el-dialog>

    <!-- 二维码登录对话框 -->
    <el-dialog
      v-model="showQrcodeDialog"
      title="扫码登录"
      width="400px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @close="closeQrcodeDialog"
    >
      <div class="qrcode-dialog-content">
        <div class="qrcode-tip">
          <p>📱 请使用 <strong>{{ currentLoginPlatform }}</strong> App 扫描二维码登录</p>
          <p class="qrcode-subtip">二维码将在2分钟后失效，请尽快扫码</p>
        </div>

        <div v-if="qrcodeUrl" class="qrcode-image-wrapper">
          <img :src="qrcodeUrl" alt="登录二维码" class="qrcode-image" />
          <p class="qrcode-refresh-tip">如二维码无法显示，请刷新页面重试</p>
        </div>

        <div v-else class="qrcode-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <p>正在生成二维码，请稍候...</p>
        </div>
      </div>

      <template #footer>
        <el-button @click="closeQrcodeDialog">取消登录</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import axios from 'axios'
import dyIcon from '../assets/dy.png'
import bzIcon from '../assets/bz.png'
import xhsIcon from '../assets/xhs.png'
import ksIcon from '../assets/ks.png'
import shangchuanIcon from '../assets/shangchuan.png'

const API_BASE = 'http://localhost:3001/api/publish'

const authAxios = axios.create()
authAxios.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const props = defineProps({
  videoPath: {
    type: String,
    default: ''
  }
})

const title = ref('')
const description = ref('')
const tagsInput = ref('')
const publishType = ref('immediate')
const scheduleTime = ref(null)
const publishing = ref(false)
const bilibiliTid = ref(95)

const coverFile = ref(null)
const coverPreview = ref('')
const coverAbsolutePath = ref('')

const platforms = ref([])
const accounts = ref([])
const selectedPlatforms = ref([])
const selectedAccountIds = ref([])
const tasks = ref([])
const currentPublishTasks = ref([])

const showAddAccount = ref(false)
const newAccountPlatform = ref('')
const newAccountName = ref('')
const addingAccount = ref(false)

// 登录二维码相关
const showQrcodeDialog = ref(false)
const qrcodeUrl = ref('')
const loginPollingTimer = ref(null)
const currentLoginPlatform = ref('')

const platformIcons = {
  douyin: dyIcon,
  bilibili: bzIcon,
  xiaohongshu: xhsIcon,
  kuaishou: ksIcon
}

const platformNames = {
  douyin: '抖音',
  bilibili: 'B站',
  xiaohongshu: '小红书',
  kuaishou: '快手'
}

const statusLabels = {
  pending: '等待中',
  running: '发布中',
  success: '成功',
  failed: '失败'
}

const bilibiliTidGroups = [
  {
    label: '动画',
    options: [
      { label: 'MAD·AMV', value: 24 },
      { label: 'MMD·3D', value: 25 },
      { label: '短片·手书·配音', value: 47 },
      { label: '手办·模玩', value: 210 },
      { label: '特摄', value: 86 },
      { label: '动漫杂谈', value: 253 },
      { label: '综合', value: 27 }
    ]
  },
  {
    label: '番剧',
    options: [
      { label: '连载中番剧', value: 33 },
      { label: '已完结番剧', value: 32 },
      { label: '资讯', value: 51 },
      { label: '官方延伸', value: 152 }
    ]
  },
  {
    label: '国创',
    options: [
      { label: '国产动画', value: 153 },
      { label: '国产原创相关', value: 168 },
      { label: '布袋戏', value: 169 },
      { label: '动态漫·广播剧', value: 195 },
      { label: '资讯', value: 170 }
    ]
  },
  {
    label: '音乐',
    options: [
      { label: '原创音乐', value: 28 },
      { label: '翻唱', value: 31 },
      { label: '演奏', value: 59 },
      { label: 'VOCALOID·UTAU', value: 30 },
      { label: '音乐现场', value: 29 },
      { label: 'MV', value: 193 },
      { label: '乐评盘点', value: 243 },
      { label: '音乐教学', value: 244 },
      { label: '音乐综合', value: 130 }
    ]
  },
  {
    label: '舞蹈',
    options: [
      { label: '宅舞', value: 20 },
      { label: '街舞', value: 198 },
      { label: '明星舞蹈', value: 199 },
      { label: '中国舞', value: 200 },
      { label: '舞蹈综合', value: 154 },
      { label: '舞蹈教程', value: 156 }
    ]
  },
  {
    label: '游戏',
    options: [
      { label: '单机游戏', value: 17 },
      { label: '电子竞技', value: 171 },
      { label: '手机游戏', value: 172 },
      { label: '网络游戏', value: 65 },
      { label: '桌游棋牌', value: 173 },
      { label: 'GMV', value: 121 },
      { label: '音游', value: 136 },
      { label: 'Mugen', value: 19 }
    ]
  },
  {
    label: '知识',
    options: [
      { label: '科学科普', value: 201 },
      { label: '社科·法律·心理', value: 124 },
      { label: '人文历史', value: 228 },
      { label: '财经商业', value: 207 },
      { label: '校园学习', value: 208 },
      { label: '职业职场', value: 209 },
      { label: '设计·创意', value: 229 },
      { label: '野生技能协会', value: 122 }
    ]
  },
  {
    label: '科技',
    options: [
      { label: '数码', value: 95 },
      { label: '软件应用', value: 230 },
      { label: '计算机技术', value: 231 },
      { label: '科工机械', value: 232 }
    ]
  },
  {
    label: '运动',
    options: [
      { label: '篮球', value: 114 },
      { label: '足球', value: 249 },
      { label: '健身', value: 164 },
      { label: '竞技体育', value: 236 },
      { label: '运动文化', value: 237 },
      { label: '运动综合', value: 238 }
    ]
  },
  {
    label: '汽车',
    options: [
      { label: '赛车', value: 245 },
      { label: '改装玩车', value: 246 },
      { label: '新能源车', value: 247 },
      { label: '房车', value: 248 },
      { label: '摩托车', value: 240 },
      { label: '购车攻略', value: 227 },
      { label: '汽车生活', value: 176 }
    ]
  },
  {
    label: '生活',
    options: [
      { label: '搞笑', value: 138 },
      { label: '出行', value: 250 },
      { label: '三农', value: 251 },
      { label: '家居房产', value: 239 },
      { label: '手工', value: 161 },
      { label: '绘画', value: 162 },
      { label: '日常', value: 21 }
    ]
  },
  {
    label: '美食',
    options: [
      { label: '美食制作', value: 76 },
      { label: '美食侦探', value: 212 },
      { label: '美食测评', value: 213 },
      { label: '田园美食', value: 214 },
      { label: '美食记录', value: 215 }
    ]
  },
  {
    label: '动物',
    options: [
      { label: '猫', value: 218 },
      { label: '狗', value: 219 },
      { label: '大熊猫', value: 220 },
      { label: '野生动物', value: 221 },
      { label: '爬宠', value: 222 },
      { label: '动物综合', value: 75 }
    ]
  },
  {
    label: '鬼畜',
    options: [
      { label: '鬼畜调教', value: 22 },
      { label: '音MAD', value: 26 },
      { label: '人力VOCALOID', value: 126 },
      { label: '鬼畜剧场', value: 216 },
      { label: '教程演示', value: 127 }
    ]
  },
  {
    label: '时尚',
    options: [
      { label: '美妆护肤', value: 157 },
      { label: '仿妆cos', value: 252 },
      { label: '穿搭', value: 158 },
      { label: '时尚潮流', value: 159 }
    ]
  },
  {
    label: '影视',
    options: [
      { label: '影视杂谈', value: 182 },
      { label: '影视剪辑', value: 183 },
      { label: '小剧场', value: 85 },
      { label: '预告·资讯', value: 184 }
    ]
  },
  {
    label: '纪录片',
    options: [
      { label: '人文·历史', value: 71 },
      { label: '科学', value: 72 },
      { label: '军事', value: 73 },
      { label: '社会·美食·旅行', value: 74 }
    ]
  },
  {
    label: '娱乐',
    options: [
      { label: '综艺', value: 71 },
      { label: '娱乐杂谈', value: 241 },
      { label: '粉丝创作', value: 242 },
      { label: '明星综合', value: 137 }
    ]
  },
  {
    label: 'Vlog',
    options: [
      { label: 'Vlog', value: 19 }
    ]
  }
]

const canPublish = computed(() => {
  return props.videoPath && title.value && selectedAccountIds.value.length > 0 && !publishing.value
})

const CACHE_KEY = 'video-publish-cache'

// 读取本地缓存
function loadCache() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const data = JSON.parse(cached)
      title.value = data.title || ''
      description.value = data.description || ''
      tagsInput.value = data.tagsInput || ''
      publishType.value = data.publishType || 'immediate'
      bilibiliTid.value = data.bilibiliTid || 95
    }
  } catch (err) {
    console.error('读取缓存失败:', err)
  }
}

// 保存到本地缓存
function saveCache() {
  try {
    const data = {
      title: title.value,
      description: description.value,
      tagsInput: tagsInput.value,
      publishType: publishType.value,
      bilibiliTid: bilibiliTid.value
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('保存缓存失败:', err)
  }
}

function getVideoUrl(path) {
  if (!path) return ''
  if (path.startsWith('http') || path.startsWith('blob:') || path.startsWith('data:')) return path
  return `http://localhost:3001${path}`
}

function getAccountsByPlatform(platform) {
  return accounts.value.filter(a => a.platform === platform && a.status === 'active')
}

function togglePlatform(key) {
  const idx = selectedPlatforms.value.indexOf(key)
  if (idx >= 0) {
    selectedPlatforms.value.splice(idx, 1)
    const platformAccounts = getAccountsByPlatform(key)
    platformAccounts.forEach(a => {
      const aidx = selectedAccountIds.value.indexOf(a.id)
      if (aidx >= 0) selectedAccountIds.value.splice(aidx, 1)
    })
  } else {
    selectedPlatforms.value.push(key)
  }
}

function toggleAccount(accountId, checked) {
  if (checked) {
    if (!selectedAccountIds.value.includes(accountId)) {
      selectedAccountIds.value.push(accountId)
    }
  } else {
    const idx = selectedAccountIds.value.indexOf(accountId)
    if (idx >= 0) selectedAccountIds.value.splice(idx, 1)
  }
}

function handleCoverChange(file) {
  coverFile.value = file.raw
  coverPreview.value = URL.createObjectURL(file.raw)
  coverAbsolutePath.value = ''
}

function removeCover() {
  coverFile.value = null
  coverPreview.value = ''
  coverAbsolutePath.value = ''
}

async function uploadCover() {
  if (!coverFile.value) return null
  const formData = new FormData()
  formData.append('file', coverFile.value)
  try {
    const { data } = await authAxios.post(`${API_BASE}/upload-thumbnail`, formData)
    coverAbsolutePath.value = data.absolutePath
    return data.absolutePath
  } catch (err) {
    console.error('封面上传失败:', err)
    return null
  }
}

async function fetchPlatforms() {
  try {
    const { data } = await authAxios.get(`${API_BASE}/platforms`)
    platforms.value = data
  } catch (err) {
    console.error('获取平台列表失败:', err)
  }
}

async function fetchAccounts() {
  try {
    const userInfo = localStorage.getItem('userInfo')
    const userId = userInfo ? JSON.parse(userInfo).id : undefined
    const { data } = await authAxios.get(`${API_BASE}/accounts`, { params: { userId } })
    accounts.value = data
  } catch (err) {
    console.error('获取账号列表失败:', err)
  }
}

async function fetchTasks() {
  try {
    const userInfo = localStorage.getItem('userInfo')
    const userId = userInfo ? JSON.parse(userInfo).id : undefined
    const { data } = await authAxios.get(`${API_BASE}/tasks`, { params: { userId } })
    tasks.value = data
  } catch (err) {
    console.error('获取任务列表失败:', err)
  }
}

function clearPublishProgress() {
  currentPublishTasks.value = []
}

async function handleAddAccount() {
  if (!newAccountPlatform.value || !newAccountName.value) {
    ElMessage.warning('请选择平台并输入账号名')
    return
  }
  addingAccount.value = true
  try {
    const userInfo = localStorage.getItem('userInfo')
    const userId = userInfo ? JSON.parse(userInfo).id : undefined
    await authAxios.post(`${API_BASE}/accounts`, {
      userId,
      platform: newAccountPlatform.value,
      accountName: newAccountName.value
    })
    ElMessage.success('账号添加成功')
    showAddAccount.value = false
    newAccountPlatform.value = ''
    newAccountName.value = ''
    await fetchAccounts()
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '添加账号失败')
  } finally {
    addingAccount.value = false
  }
}

async function handleLoginAccount(account) {
  try {
    console.log(`🔐 开始登录 ${account.platform} 账号: ${account.accountName}`)

    // 显示二维码对话框
    showQrcodeDialog.value = true
    qrcodeUrl.value = ''
    ElMessage.info('正在启动登录，请稍等...')

    // 1. 发起登录请求（后台执行）
    const loginPromise = authAxios.post(`${API_BASE}/accounts/${account.id}/login`, {}, {
      timeout: 180000
    })

    // 2. 轮询二维码图片（每2秒检查一次）
    let pollCount = 0
    const maxPolls = 60  // 最多轮询2分钟

    loginPollingTimer.value = setInterval(async () => {
      pollCount++
      console.log(`🔄 检查二维码 [${pollCount}/${maxPolls}]...`)

      try {
        const { data: qrcodeData } = await authAxios.get(`${API_BASE}/accounts/${account.id}/qrcode`)

        if (qrcodeData.success && qrcodeData.qrcodeUrl) {
          qrcodeUrl.value = `${qrcodeData.qrcodeUrl}`
          console.log('✅ 二维码已加载:', qrcodeData.filename)
        }
      } catch (err) {
        // 二维码还未生成，继续等待...
      }

      if (pollCount >= maxPolls) {
        clearInterval(loginPollingTimer.value)
        console.warn('⏰ 二维码轮询超时')
      }
    }, 2000)

    // 3. 等待登录完成
    const { data } = await loginPromise

    // 清理轮询
    if (loginPollingTimer.value) {
      clearInterval(loginPollingTimer.value)
      loginPollingTimer.value = null
    }

    console.log('✅ 登录成功:', data)
    showQrcodeDialog.value = false
    ElMessage.success(`${account.accountName} 登录成功`)
    await fetchAccounts()
  } catch (err) {
    console.error('❌ 登录失败:', err)
    console.error('   错误详情:', {
      message: err.message,
      code: err.code,
      response: err.response?.data
    })

    // 清理轮询
    if (loginPollingTimer.value) {
      clearInterval(loginPollingTimer.value)
      loginPollingTimer.value = null
    }

    if (err.code === 'ECONNABORTED') {
      ElMessage.error('登录超时（3分钟），请重试')
    } else if (err.response?.status === 500) {
      ElMessage.error(`登录失败: ${err.response.data?.error || '服务器错误'}`)
    } else {
      ElMessage.error(err.response?.data?.error || '登录失败，请查看控制台')
    }

    showQrcodeDialog.value = false
  }
}

function closeQrcodeDialog() {
  showQrcodeDialog.value = false
  qrcodeUrl.value = ''
  if (loginPollingTimer.value) {
    clearInterval(loginPollingTimer.value)
    loginPollingTimer.value = null
  }
}

async function handleCheckAccount(account) {
  try {
    ElMessage.info('正在检查Cookie有效性...')
    const { data } = await authAxios.post(`${API_BASE}/accounts/${account.id}/check`)
    if (data.valid) {
      ElMessage.success(`${account.accountName} Cookie有效`)
    } else {
      ElMessage.warning(`${account.accountName} Cookie已失效，请重新登录`)
    }
    await fetchAccounts()
  } catch (err) {
    ElMessage.error('检查失败')
  }
}

async function handleDeleteAccount(account) {
  try {
    await ElMessageBox.confirm(`确定删除账号 "${account.accountName}" 吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await authAxios.delete(`${API_BASE}/accounts/${account.id}`)
    ElMessage.success('账号已删除')
    await fetchAccounts()
    const idx = selectedAccountIds.value.indexOf(account.id)
    if (idx >= 0) selectedAccountIds.value.splice(idx, 1)
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

async function handlePublish() {
  if (!canPublish.value) return

  publishing.value = true
  try {
    const userInfo = localStorage.getItem('userInfo')
    const userId = userInfo ? JSON.parse(userInfo).id : undefined
    const tags = tagsInput.value ? tagsInput.value.split(/[,，]/).map(t => t.trim()).filter(Boolean) : []

    const videoPath = props.videoPath.startsWith('http')
      ? props.videoPath
      : props.videoPath.startsWith('data:')
        ? await uploadBase64Video()
        : props.videoPath

    if (!videoPath) {
      ElMessage.error('视频路径无效')
      publishing.value = false
      return
    }

    let thumbnailPath = null
    if (coverFile.value) {
      thumbnailPath = await uploadCover()
    }

    // 🔍 步骤1：发布前预检查所有账号的登录状态
    console.log('🔍 开始预检查账号登录状态...')
    const invalidAccounts = await preCheckAccounts()

    if (invalidAccounts.length > 0) {
      console.log(`⚠️ 发现 ${invalidAccounts.length} 个账号需要重新登录:`, invalidAccounts)

      const accountNames = invalidAccounts.map(a => `${a.accountName} (${platformNames[a.platform] || a.platform})`).join('、')
      
      try {
        await ElMessageBox.confirm(
          `以下账号登录已失效：\n\n${accountNames}\n\n是否立即重新登录并继续发布？`,
          '需要重新登录',
          {
            confirmButtonText: '登录并继续发布',
            cancelButtonText: '取消发布',
            type: 'warning',
            dangerouslyUseHTMLString: false
          }
        )

        // 用户同意，开始逐个登录失效账号
        ElMessage.info('正在准备登录，请稍候...')
        
        for (const account of invalidAccounts) {
          console.log(`🔐 自动登录账号: ${account.accountName}`)
          
          try {
            await handleLoginAccount(account)
            console.log(`✅ 账号 ${account.accountName} 登录成功`)
            
            // 短暂延迟，让界面更新
            await new Promise(resolve => setTimeout(resolve, 500))
          } catch (loginErr) {
            console.error(`❌ 账号 ${account.accountName} 登录失败:`, loginErr.message)
            
            const retryAction = await ElMessageBox.confirm(
              `账号 ${account.accountName} 登录失败：${loginErr.message}\n\n是否跳过此账号继续发布其他账号？`,
              '登录失败',
              {
                confirmButtonText: '跳过并继续',
                cancelButtonText: '取消全部发布',
                type: 'error'
              }
            ).catch(() => 'cancel')

            if (retryAction === 'cancel') {
              ElMessage.warning('已取消发布')
              publishing.value = false
              return
            }

            // 从选中列表中移除该账号
            const idx = selectedAccountIds.value.indexOf(account.id)
            if (idx >= 0) selectedAccountIds.value.splice(idx, 1)
          }
        }

        console.log('✅ 所有账号登录完成，继续发布...')
        ElMessage.success('登录完成，正在提交发布任务...')

      } catch (confirmErr) {
        // 用户点击"取消发布"
        console.log('❌ 用户取消了登录和发布')
        ElMessage.info('已取消发布')
        publishing.value = false
        return
      }
    }

    // 📤 步骤2：正式提交发布任务
    console.log('📤 准备发布视频:', {
      userId,
      accountIds: selectedAccountIds.value,
      videoPath,
      thumbnailPath,
      title: title.value,
      publishType: publishType.value,
      scheduleTime: scheduleTime.value
    })

    const { data } = await authAxios.post(`${API_BASE}/upload`, {
      userId,
      accountIds: selectedAccountIds.value,
      videoPath,
      thumbnailPath,
      title: title.value,
      description: description.value,
      tags,
      publishType: publishType.value,
      scheduleTime: scheduleTime.value,
      bilibiliTid: bilibiliTid.value
    }, { timeout: 30000 })  // 添加30秒超时

    console.log('✅ 发布任务已提交:', data)
    ElMessage.success('发布任务已提交，正在后台处理...')

    // 将当前发布的任务添加到发布进度列表（仅本次会话显示）
    if (data && data.length > 0) {
      data.forEach(task => {
        currentPublishTasks.value.push({
          id: task.id,
          platform: task.platform,
          title: title.value,
          status: 'pending'
        })
      })

      // 开始轮询第一个任务的状态（带自动重试）
      await pollTaskStatusWithRetry(data[0].id, data)
    }

    // 发布成功后清除缓存
    localStorage.removeItem(CACHE_KEY)
    title.value = ''
    description.value = ''
    tagsInput.value = ''
    publishType.value = 'immediate'
    scheduleTime.value = null
    bilibiliTid.value = 95
  } catch (err) {
    console.error('❌ 发布失败:', err)
    console.error('   错误详情:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
      stack: err.stack
    })
    
    if (err.code === 'ECONNABORTED') {
      ElMessage.error('请求超时，请检查网络连接')
    } else if (err.response?.status === 500) {
      ElMessage.error(`服务器错误: ${err.response.data?.error || '内部错误'}`)
    } else {
      ElMessage.error(err.response?.data?.error || '发布失败，请查看控制台详情')
    }
  } finally {
    publishing.value = false
  }
}

/**
 * 预检查所有选中账号的登录状态
 * @returns {Array} 失效的账号列表
 */
async function preCheckAccounts() {
  const invalidAccounts = []
  
  for (const accountId of selectedAccountIds.value) {
    const account = accounts.value.find(a => a.id === accountId)
    if (!account) continue
    
    try {
      console.log(`🔍 检查账号 ${account.platform}/${account.accountName}...`)
      const { data } = await authAxios.post(`${API_BASE}/accounts/${accountId}/check`)
      
      if (!data.valid) {
        console.log(`⚠️ 账号 ${account.accountName} 登录已失效`)
        invalidAccounts.push(account)
      } else {
        console.log(`✅ 账号 ${account.accountName} 登录有效`)
      }
    } catch (err) {
      console.warn(`⚠️ 无法验证账号 ${account.accountName}，标记为可能失效:`, err.message)
      // 如果无法验证，也加入失效列表（安全起见）
      invalidAccounts.push(account)
    }
    
    // 避免请求过快
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  
  return invalidAccounts
}

/**
 * 带自动重试的任务轮询函数
 * 如果检测到登录失败，会自动触发重新登录
 */
async function pollTaskStatusWithRetry(taskId, allTasks, maxRetries = 1) {
  let retryCount = 0
  
  while (retryCount <= maxRetries) {
    try {
      const result = await pollTaskStatus(taskId)
      
      if (result && result.status === 'success') {
        console.log('✅ 任务执行成功')
        return result
      }
      
      // 如果是登录失败且还有重试次数
      if (result && result.status === 'failed' && retryCount < maxRetries) {
        const errorMsg = result.result || ''
        
        if (errorMsg.includes('登录已失效') || 
            errorMsg.includes('Cookie') || 
            errorMsg.includes('strict mode violation') ||
            errorMsg.includes('Locator.set_input_files')) {
          
          retryCount++
          console.log(`🔄 检测到登录失效，尝试第 ${retryCount} 次重新登录...`)
          
          // 找到对应的账号
          const failedTask = currentPublishTasks.value.find(t => t.id === taskId)
          if (!failedTask) break
          
          const account = accounts.value.find(a => 
            a.platform === failedTask.platform && 
            selectedAccountIds.value.includes(a.id)
          )
          
          if (account) {
            try {
              ElMessage.warning(`账号 ${account.accountName} 登录失效，正在重新登录...`)
              
              await handleLoginAccount(account)
              
              // 登录成功后，重新提交该任务
              console.log('🔄 重新提交发布任务...')
              
              const userInfo = localStorage.getItem('userInfo')
              const userId = userInfo ? JSON.parse(userInfo).id : undefined
              const tags = tagsInput.value ? tagsInput.value.split(/[,，]/).map(t => t.trim()).filter(Boolean) : []
              
              const { data: newTasks } = await authAxios.post(`${API_BASE}/upload`, {
                userId,
                accountIds: [account.id],
                videoPath: props.videoPath.startsWith('http') ? props.videoPath : props.videoPath,
                thumbnailPath: null,
                title: title.value,
                description: description.value,
                tags,
                publishType: publishType.value,
                scheduleTime: scheduleTime.value,
                bilibiliTid: bilibiliTid.value
              }, { timeout: 30000 })
              
              if (newTasks && newTasks.length > 0) {
                // 更新任务ID
                failedTask.id = newTasks[0].id
                taskId = newTasks[0].id
                
                ElMessage.success('重新登录成功，继续发布...')
                
                // 继续轮询新任务
                continue
              }
            } catch (retryErr) {
              console.error('❌ 自动重试登录失败:', retryErr.message)
              ElMessage.error(`自动重试失败: ${retryErr.message}`)
              break
            }
          }
        }
      }
      
      // 其他类型的失败或已完成所有重试
      break
      
    } catch (err) {
      console.error('❌ 轮询任务状态出错:', err.message)
      break
    }
  }
  
  return null
}

async function pollTaskStatus(taskId, maxAttempts = 60) {
  console.log(`🔄 开始轮询任务状态: ${taskId} (最多 ${maxAttempts * 2} 秒)`)

  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))  // 每2秒查询一次

      const { data: task } = await authAxios.get(`${API_BASE}/tasks/${taskId}`)
      console.log(`📊 任务状态 [${i + 1}/${maxAttempts}]:`, {
        status: task.status,
        hasResult: !!task.result,
        resultPreview: task.result ? task.result.substring(0, 100) + '...' : null
      })

      // 同步更新发布进度列表中的任务状态
      const localTask = currentPublishTasks.value.find(t => t.id === taskId)
      if (localTask) {
        localTask.status = task.status
      }

      if (task.status === 'success') {
        ElMessage.success('✅ 视频发布成功！')
        return task
      } else if (task.status === 'failed') {
        console.error('❌ 任务失败详情:', task.result)
        console.error('❌ 完整输出:', task.processOutput)

        // 提取友好的错误消息
        let errorMessage = task.result || '未知错误'
        let needRelogin = false

        // 常见错误的友好提示
        if (errorMessage.includes('登录已失效') || errorMessage.includes('Cookie') || errorMessage.includes('cookie')) {
          errorMessage = errorMessage.includes('登录已失效')
            ? errorMessage
            : '账号 Cookie 已过期或无效'
          needRelogin = true
        } else if (errorMessage.includes('Timeout')) {
          errorMessage = `上传超时 (${i * 2}秒)，网络连接或平台响应过慢`
        } else if (errorMessage.includes('strict mode violation')) {
          errorMessage = '页面元素定位失败（可能需要重新登录），平台页面结构可能已更新'
          needRelogin = true
        } else if (errorMessage.includes('Locator.set_input_files')) {
          errorMessage = '上传页面需要重新登录，请先扫码或手机验证登录'
          needRelogin = true
        } else if (errorMessage.length > 150) {
          // 截断过长的错误信息
          errorMessage = errorMessage.substring(0, 150) + '... (详见控制台)'
        }

        ElMessage.error(`❌ 发布失败: ${errorMessage}`)

        // 如果需要重新登录，显示提示框
        if (needRelogin) {
          setTimeout(() => {
            ElMessageBox.confirm(
              `${errorMessage}，是否现在重新登录？`,
              '需要重新登录',
              {
                confirmButtonText: '立即登录',
                cancelButtonText: '稍后再说',
                type: 'warning'
              }
            ).then(() => {
              // 滚动到账号区域并高亮显示登录按钮
              const accountSection = document.querySelector('.account-section')
              if (accountSection) {
                accountSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
                // 高亮所有"登录"按钮
                const loginButtons = document.querySelectorAll('.account-item .el-button--text')
                loginButtons.forEach(btn => {
                  if (btn.textContent.includes('登录')) {
                    btn.classList.add('highlight-login-btn')
                    setTimeout(() => btn.classList.remove('highlight-login-btn'), 3000)
                  }
                })
              }
            }).catch(() => {
              // 用户选择稍后再说
            })
          }, 500)
        }

        // 显示详细错误对话框
        if (task.processOutput && task.processOutput.length > 0) {
          console.group('📋 完整错误日志')
          console.log(task.processOutput)
          console.groupEnd()
        }

        return task
      }

      // 继续轮询...
    } catch (err) {
      console.warn(`⚠️ [${i + 1}] 查询任务状态失败:`, err.message)
    }
  }

  console.log(`⏰ 轮询超时 (${maxAttempts * 2}秒)，任务可能仍在处理中`)
  ElMessage.warning('任务仍在后台处理中，请稍后刷新页面查看详细状态')

  // 尝试获取最终状态
  try {
    const { data: finalTask } = await authAxios.get(`${API_BASE}/tasks/${taskId}`)
    console.log('📊 最终任务状态:', finalTask)
    if (finalTask.status === 'failed' && finalTask.result) {
      ElMessage.error(`任务已失败: ${finalTask.result.substring(0, 100)}`)
    }
  } catch (e) {
    console.warn('无法获取最终状态:', e.message)
  }
}

async function uploadBase64Video() {
  try {
    const blob = await fetch(props.videoPath).then(r => r.blob())
    const formData = new FormData()
    formData.append('file', blob, `video_${Date.now()}.mp4`)
    const { data } = await authAxios.post('http://localhost:3001/api/work-library/upload/video', formData)
    return data.fileUrl
  } catch (err) {
    console.error('视频上传失败:', err)
    return null
  }
}

// 监听变化自动保存缓存
watch([title, description, tagsInput, publishType, bilibiliTid], () => {
  saveCache()
}, { deep: true })

watch(() => props.videoPath, (newPath) => {
  if (newPath && !title.value) {
    const parts = newPath.split('/')
    const filename = parts[parts.length - 1] || '视频'
    title.value = filename.replace(/\.[^.]+$/, '')
  }
})

onMounted(() => {
  loadCache()
  fetchPlatforms()
  fetchAccounts()
})
</script>

<style scoped>
.video-publish {
  padding: 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.video-preview {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.video-player {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.no-video {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-video-text {
  color: rgba(255, 255, 255, 0.4);
  font-size: 13px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.form-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  min-width: 36px;
  line-height: 32px;
  flex-shrink: 0;
}

.form-input {
  flex: 1;
}

.cover-row {
  align-items: center;
}

.cover-upload-area {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.cover-preview-wrapper {
  position: relative;
  width: 72px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(102, 126, 234, 0.3);
  flex-shrink: 0;
}

.cover-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.cover-remove:hover {
  background: rgba(245, 108, 108, 0.9);
}

.cover-placeholder {
  width: 72px;
  height: 48px;
  border-radius: 6px;
  border: 1px dashed rgba(102, 126, 234, 0.4);
  background: rgba(102, 126, 234, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.cover-placeholder:hover {
  border-color: rgba(102, 126, 234, 0.7);
  background: rgba(102, 126, 234, 0.15);
}

.cover-placeholder-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.cover-placeholder-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
}

.cover-tip {
  color: rgba(255, 255, 255, 0.35);
  font-size: 11px;
}

.platform-section {
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-title {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  font-weight: 500;
}

.platform-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.platform-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s ease;
}

.platform-card:hover {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
}

.platform-card.active {
  background: rgba(102, 126, 234, 0.2);
  border-color: rgba(102, 126, 234, 0.6);
  box-shadow: 0 0 12px rgba(102, 126, 234, 0.2);
}

.platform-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.platform-name {
  color: rgba(255, 255, 255, 0.9);
  font-size: 12px;
  font-weight: 500;
}

.account-count {
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
}

.account-count.has-accounts {
  color: rgba(102, 126, 234, 0.8);
}

.account-section {
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.account-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.account-group-title {
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin-bottom: 4px;
}

.account-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
}

.account-name {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
}

.cookie-status {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
}

.cookie-status.valid {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
}

.cookie-status.invalid {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
}

.delete-btn {
  color: #f56c6c !important;
}

/* 高亮登录按钮动画 */
:deep(.highlight-login-btn) {
  animation: pulse-login 1.5s ease-in-out 3;
  color: #e6a23c !important;
  font-weight: bold;
  text-decoration: underline;
}

@keyframes pulse-login {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(230, 162, 60, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 10px 3px rgba(230, 162, 60, 0.6);
  }
}

.no-account {
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
  padding: 4px 8px;
}

.bilibili-tid-section {
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.publish-section {
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.publish-type-switch {
  display: flex;
  gap: 8px;
}

.type-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.25s ease;
  user-select: none;
}

.type-option:hover {
  background: rgba(102, 126, 234, 0.08);
  border-color: rgba(102, 126, 234, 0.25);
}

.type-option.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  border-color: rgba(102, 126, 234, 0.6);
  box-shadow: 0 0 16px rgba(102, 126, 234, 0.15), inset 0 0 12px rgba(102, 126, 234, 0.05);
}

.type-option-icon {
  font-size: 16px;
}

.type-option-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 500;
  transition: color 0.25s ease;
}

.type-option.active .type-option-label {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.schedule-row {
  display: flex;
  width: 100%;
}

.schedule-row :deep(.el-date-editor) {
  width: 100% !important;
  border-radius: 10px !important;
}

.schedule-row :deep(.el-date-editor .el-input__wrapper) {
  border-radius: 10px !important;
}

.publish-btn {
  width: 100%;
  height: 40px;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: none !important;
  border-radius: 10px !important;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.35);
  transition: all 0.3s ease !important;
}

.publish-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 28px rgba(102, 126, 234, 0.5) !important;
}

.publish-btn:disabled {
  opacity: 0.5;
  box-shadow: none !important;
}

.task-section {
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 12px;
}

.task-platform {
  color: rgba(102, 126, 234, 0.9);
  min-width: 40px;
}

.task-title {
  color: rgba(255, 255, 255, 0.7);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-status {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
}

.task-status.pending {
  color: #e6a23c;
  background: rgba(230, 162, 60, 0.1);
}

.task-status.running {
  color: #409eff;
  background: rgba(64, 158, 255, 0.1);
}

.task-status.success {
  color: #67c23a;
  background: rgba(103, 194, 58, 0.1);
}

.task-status.failed {
  color: #f56c6c;
  background: rgba(245, 108, 108, 0.1);
}

.clear-progress-btn {
  color: rgba(255, 255, 255, 0.4) !important;
  font-size: 12px;
}

.clear-progress-btn:hover {
  color: rgba(255, 255, 255, 0.7) !important;
}

.task-loading {
  display: flex;
  align-items: center;
  color: #409eff;
}

.task-loading .el-icon {
  font-size: 14px;
}

.add-account-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.add-account-form .form-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.add-account-form .form-label {
  min-width: 50px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.add-account-form .form-input {
  flex: 1;
}
</style>
