<template>
  <div class="library-view">
    <CRUDTable
      v-if="currentConfig"
      :key="type"
      :title="currentConfig.title"
      :api-path="currentConfig.apiPath"
      :columns="currentConfig.columns"
      :form-columns="currentConfig.formColumns"
      :show-all="true"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { CRUDTable } from '@shuziren/shared-components'

const route = useRoute()
const crudTableRef = ref(null)
const type = computed(() => route.params.type)

const tableConfigs = {
  voiceLibrary: {
    title: '音色库管理', apiPath: 'voice-library',
    columns: [
      { prop: 'fileUrl', label: '预览', type: 'preview', minWidth: '150', align: 'center' },
      { prop: 'fileName', label: '文件名', minWidth: '200' },
      { prop: 'fileSize', label: '大小', type: 'filesize', minWidth: '100', align: 'center' },
      { prop: 'duration', label: '时长', type: 'duration', minWidth: '100', align: 'center' },
      { prop: 'isPublic', label: '公开', type: 'boolean', minWidth: '80', align: 'center' },
      { prop: 'usageCount', label: '使用次数', type: 'number', minWidth: '100', align: 'center' },
      { prop: 'createdAt', label: '创建时间', type: 'datetime', minWidth: '180', align: 'center' },
      { prop: 'actions', label: '操作', type: 'actions', minWidth: '140', align: 'center' }
    ],
    formColumns: [
      { prop: 'fileName', label: '文件名', type: 'text' },
      { prop: 'description', label: '描述', type: 'textarea' },
      { prop: 'isPublic', label: '公开', type: 'switch' },
      { prop: 'fileUrl', label: '音频文件', type: 'upload', accept: '.wav,.mp3,.ogg' }
    ]
  },
  dubbingLibrary: {
    title: '配音库管理', apiPath: 'dubbing-library',
    columns: [
      { prop: 'fileUrl', label: '预览', type: 'preview', minWidth: '150', align: 'center' },
      { prop: 'fileName', label: '文件名', minWidth: '200' },
      { prop: 'fileSize', label: '大小', type: 'filesize', minWidth: '100', align: 'center' },
      { prop: 'duration', label: '时长', type: 'duration', minWidth: '100', align: 'center' },
      { prop: 'isPublic', label: '公开', type: 'boolean', minWidth: '80', align: 'center' },
      { prop: 'usageCount', label: '使用次数', type: 'number', minWidth: '100', align: 'center' },
      { prop: 'createdAt', label: '创建时间', type: 'datetime', minWidth: '180', align: 'center' },
      { prop: 'actions', label: '操作', type: 'actions', minWidth: '140', align: 'center' }
    ],
    formColumns: [
      { prop: 'fileName', label: '文件名', type: 'text' },
      { prop: 'description', label: '描述', type: 'textarea' },
      { prop: 'isPublic', label: '公开', type: 'switch' },
      { prop: 'fileUrl', label: '音频文件', type: 'upload', accept: '.wav,.mp3,.ogg' }
    ]
  },
  musicLibrary: {
    title: '音乐库管理', apiPath: 'music-library',
    columns: [
      { prop: 'fileUrl', label: '预览', type: 'preview', minWidth: '150', align: 'center' },
      { prop: 'fileName', label: '文件名', minWidth: '200' },
      { prop: 'fileSize', label: '大小', type: 'filesize', minWidth: '100', align: 'center' },
      { prop: 'duration', label: '时长', type: 'duration', minWidth: '100', align: 'center' },
      { prop: 'isPublic', label: '公开', type: 'boolean', minWidth: '80', align: 'center' },
      { prop: 'usageCount', label: '使用次数', type: 'number', minWidth: '100', align: 'center' },
      { prop: 'createdAt', label: '创建时间', type: 'datetime', minWidth: '180', align: 'center' },
      { prop: 'actions', label: '操作', type: 'actions', minWidth: '140', align: 'center' }
    ],
    formColumns: [
      { prop: 'fileName', label: '文件名', type: 'text' },
      { prop: 'description', label: '描述', type: 'textarea' },
      { prop: 'isPublic', label: '公开', type: 'switch' },
      { prop: 'fileUrl', label: '音频文件', type: 'upload', accept: '.wav,.mp3,.ogg,.flac,.aac' }
    ]
  },
  portraitLibrary: {
    title: '肖像库管理', apiPath: 'portrait-library',
    columns: [
      { prop: 'fileUrl', label: '预览', type: 'preview', minWidth: '150', align: 'center' },
      { prop: 'fileName', label: '文件名', minWidth: '200' },
      { prop: 'type', label: '类型', minWidth: '80', align: 'center' },
      { prop: 'fileSize', label: '大小', type: 'filesize', minWidth: '100', align: 'center' },
      { prop: 'isPublic', label: '公开', type: 'boolean', minWidth: '80', align: 'center' },
      { prop: 'usageCount', label: '使用次数', type: 'number', minWidth: '100', align: 'center' },
      { prop: 'createdAt', label: '创建时间', type: 'datetime', minWidth: '180', align: 'center' },
      { prop: 'actions', label: '操作', type: 'actions', minWidth: '140', align: 'center' }
    ],
    formColumns: [
      { prop: 'fileName', label: '文件名', type: 'text' },
      { prop: 'type', label: '类型', type: 'select', options: [{ label: '图片', value: 'image' }, { label: '视频', value: 'video' }] },
      { prop: 'description', label: '描述', type: 'textarea' },
      { prop: 'isPublic', label: '公开', type: 'switch' },
      { prop: 'fileUrl', label: '肖像文件', type: 'upload', accept: '.jpg,.jpeg,.png,.gif,.mp4,.mov,.webm' }
    ]
  },
  copyLibrary: {
    title: '文案库管理', apiPath: 'copy-library',
    columns: [
      { prop: 'title', label: '标题', type: 'clickable-title', minWidth: '200' },
      { prop: 'wordCount', label: '字数', type: 'number', minWidth: '80', align: 'center' },
      { prop: 'category', label: '分类', minWidth: '100', align: 'center' },
      { prop: 'isPublic', label: '公开', type: 'boolean', minWidth: '80', align: 'center' },
      { prop: 'usageCount', label: '使用次数', type: 'number', minWidth: '100', align: 'center' },
      { prop: 'createdAt', label: '创建时间', type: 'datetime', minWidth: '180', align: 'center' },
      { prop: 'actions', label: '操作', type: 'actions', minWidth: '140', align: 'center' }
    ],
    formColumns: [
      { prop: 'title', label: '标题', type: 'text' },
      { prop: 'content', label: '内容', type: 'textarea', rows: 6 },
      { prop: 'category', label: '分类', type: 'text', default: 'default' },
      { prop: 'isPublic', label: '公开', type: 'switch' }
    ]
  },
  promptLibrary: {
    title: '提示词库管理', apiPath: 'prompt-library',
    columns: [
      { prop: 'content', label: '提示词', minWidth: '300' },
      { prop: 'category', label: '分类', minWidth: '100', align: 'center' },
      { prop: 'modelType', label: '模型类型', minWidth: '120', align: 'center' },
      { prop: 'isPublic', label: '公开', type: 'boolean', minWidth: '80', align: 'center' },
      { prop: 'usageCount', label: '使用次数', type: 'number', minWidth: '100', align: 'center' },
      { prop: 'createdAt', label: '创建时间', type: 'datetime', minWidth: '180', align: 'center' },
      { prop: 'actions', label: '操作', type: 'actions', minWidth: '140', align: 'center' }
    ],
    formColumns: [
      { prop: 'content', label: '提示词', type: 'textarea', rows: 5 },
      { prop: 'category', label: '分类', type: 'text', default: 'default' },
      { prop: 'modelType', label: '模型类型', type: 'text', default: 'general' },
      { prop: 'isPublic', label: '公开', type: 'switch' }
    ]
  },
  workLibrary: {
    title: '作品库管理', apiPath: 'work-library',
    columns: [
      { prop: 'videoPath', label: '视频预览', type: 'preview', minWidth: '200' },
      { prop: 'title', label: '标题', minWidth: '150' },
      { prop: 'status', label: '状态', type: 'status', minWidth: '100', align: 'center' },
      { prop: 'category', label: '分类', minWidth: '100', align: 'center' },
      { prop: 'createdAt', label: '创建时间', type: 'datetime', minWidth: '180', align: 'center' },
      { prop: 'actions', label: '操作', type: 'actions', minWidth: '140', align: 'center' }
    ],
    formColumns: [
      { prop: 'title', label: '标题', type: 'text' },
      { prop: 'description', label: '描述', type: 'textarea' },
      { prop: 'category', label: '分类', type: 'text', default: 'default' },
      { prop: 'videoPath', label: '视频文件', type: 'upload', accept: '.mp4,.mov,.avi,.mkv,.webm' },
      { prop: 'isPublic', label: '公开', type: 'switch' }
    ]
  }
}

const currentConfig = computed(() => tableConfigs[type.value] || tableConfigs.promptLibrary)

watch(type, () => {
  nextTick(() => { document.querySelectorAll('.el-overlay').forEach(el => el.remove()) })
})
</script>

<style scoped>
.library-view { width: 100%; height: 100%; overflow: auto; padding: 0; }
</style>
