<template>
  <main class="library-view">
    <CRUDTable
      v-if="currentConfig"
      :key="type"
      :title="currentConfig.title"
      :api-path="currentConfig.apiPath"
      :columns="currentConfig.columns"
      :form-columns="currentConfig.formColumns"
    />
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { CRUDTable } from '@shuziren/shared-components'

const route = useRoute()

const type = computed(() => route.params.type)

const tableConfigs = {
  voiceLibrary: {
    title: '音色库',
    apiPath: 'voice-library',
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
      { prop: 'fileName', label: '文件名', type: 'text', description: '音频文件的显示名称，方便识别' },
      { prop: 'description', label: '描述', type: 'textarea', description: '音频文件的详细描述或用途说明' },
      { prop: 'isPublic', label: '公开', type: 'switch', description: '开启后其他用户可以使用此音色' },
      { prop: 'fileUrl', label: '音频文件', type: 'upload', accept: '.wav,.mp3,.ogg', uploadTip: '支持 WAV、MP3、OGG 格式音频文件' }
    ]
  },
  dubbingLibrary: {
    title: '配音库',
    apiPath: 'dubbing-library',
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
      { prop: 'fileName', label: '文件名', type: 'text', description: '配音文件的显示名称，方便识别' },
      { prop: 'description', label: '描述', type: 'textarea', description: '配音文件的详细描述或用途说明' },
      { prop: 'isPublic', label: '公开', type: 'switch', description: '开启后其他用户可以使用此配音' },
      { prop: 'fileUrl', label: '音频文件', type: 'upload', accept: '.wav,.mp3,.ogg', uploadTip: '支持 WAV、MP3、OGG 格式音频文件' }
    ]
  },
  musicLibrary: {
    title: '音乐库',
    apiPath: 'music-library',
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
      { prop: 'fileName', label: '文件名', type: 'text', description: '音乐文件的显示名称，方便识别' },
      { prop: 'description', label: '描述', type: 'textarea', description: '音乐文件的详细描述或用途说明' },
      { prop: 'isPublic', label: '公开', type: 'switch', description: '开启后其他用户可以使用此音乐' },
      { prop: 'fileUrl', label: '音频文件', type: 'upload', accept: '.wav,.mp3,.ogg,.flac,.aac', uploadTip: '支持 WAV、MP3、OGG、FLAC、AAC 格式音频文件' }
    ]
  },
  portraitLibrary: {
    title: '肖像库',
    apiPath: 'portrait-library',
    columns: [
      { prop: 'fileUrl', label: '预览', type: 'preview', minWidth: '150', align: 'center' },
      { prop: 'fileName', label: '文件名', minWidth: '200' },
      { prop: 'type', label: '类型', minWidth: '80', align: 'center' },
      { prop: 'fileSize', label: '大小', type: 'filesize', minWidth: '100', align: 'center' },
      { prop: 'duration', label: '时长', type: 'duration', minWidth: '100', align: 'center' },
      { prop: 'width', label: '尺寸', type: 'dimensions', minWidth: '120', align: 'center' },
      { prop: 'isPublic', label: '公开', type: 'boolean', minWidth: '80', align: 'center' },
      { prop: 'usageCount', label: '使用次数', type: 'number', minWidth: '100', align: 'center' },
      { prop: 'createdAt', label: '创建时间', type: 'datetime', minWidth: '180', align: 'center' },
      { prop: 'actions', label: '操作', type: 'actions', minWidth: '140', align: 'center' }
    ],
    formColumns: [
      { prop: 'fileName', label: '文件名', type: 'text', description: '肖像文件的显示名称，方便识别' },
      { prop: 'type', label: '类型', type: 'select', options: [
        { label: '图片', value: 'image' },
        { label: '视频', value: 'video' }
      ], description: '选择图片或视频类型的肖像' },
      { prop: 'description', label: '描述', type: 'textarea', description: '肖像文件的详细描述或用途说明' },
      { prop: 'isPublic', label: '公开', type: 'switch', description: '开启后其他用户可以使用此肖像' },
      { prop: 'fileUrl', label: '肖像文件', type: 'upload', accept: '.jpg,.jpeg,.png,.gif,.mp4,.mov,.webm', uploadTip: '支持 JPG、PNG、GIF 图片或 MP4、MOV、WEBM 视频格式' }
    ]
  },
  copyLibrary: {
    title: '文案库',
    apiPath: 'copy-library',
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
      { prop: 'title', label: '标题', type: 'text', description: '文案内容的简短标题，便于识别' },
      { prop: 'content', label: '内容', type: 'textarea', rows: 6, description: '文案正文内容，支持多行文本输入' },
      { prop: 'category', label: '分类', type: 'text', default: 'default', description: '文案的分类标识，如：default、marketing 等' },
      { prop: 'isPublic', label: '公开', type: 'switch', description: '开启后其他用户可以使用此文案' }
    ]
  },
  promptLibrary: {
    title: '提示词库',
    apiPath: 'prompt-library',
    columns: [
      { prop: 'content', label: '提示词', minWidth: '300' },
      { prop: 'wordCount', label: '字数', type: 'number', minWidth: '80', align: 'center' },
      { prop: 'category', label: '分类', minWidth: '100', align: 'center' },
      { prop: 'modelType', label: '模型类型', minWidth: '120', align: 'center' },
      { prop: 'isPublic', label: '公开', type: 'boolean', minWidth: '80', align: 'center' },
      { prop: 'usageCount', label: '使用次数', type: 'number', minWidth: '100', align: 'center' },
      { prop: 'createdAt', label: '创建时间', type: 'datetime', minWidth: '180', align: 'center' },
      { prop: 'actions', label: '操作', type: 'actions', minWidth: '140', align: 'center' }
    ],
    formColumns: [
      { prop: 'content', label: '提示词', type: 'textarea', rows: 5, description: 'AI提示词内容，用于生成特定风格的文案或图片' },
      { prop: 'category', label: '分类', type: 'text', default: 'default', description: '提示词的分类，如：general、image、video 等' },
      { prop: 'modelType', label: '模型类型', type: 'text', default: 'general', description: '适用的模型类型，如：general、gpt、claude 等' },
      { prop: 'isPublic', label: '公开', type: 'switch', description: '开启后其他用户可以使用此提示词' }
    ]
  },
  workLibrary: {
    title: '作品库',
    apiPath: 'work-library',
    columns: [
      { prop: 'videoPath', label: '视频预览', type: 'preview', minWidth: '120', align: 'center' },
      { prop: 'title', label: '标题', minWidth: '150' },
      { prop: 'status', label: '状态', type: 'status', minWidth: '100', align: 'center' },
      { prop: 'duration', label: '时长', type: 'duration', minWidth: '100', align: 'center' },
      { prop: 'size', label: '大小', type: 'filesize', minWidth: '100', align: 'center' },
      { prop: 'viewCount', label: '浏览', type: 'number', minWidth: '80', align: 'center' },
      { prop: 'likeCount', label: '点赞', type: 'number', minWidth: '80', align: 'center' },
      { prop: 'category', label: '分类', minWidth: '100', align: 'center' },
      { prop: 'createdAt', label: '创建时间', type: 'datetime', minWidth: '180', align: 'center' },
      { prop: 'actions', label: '操作', type: 'actions', minWidth: '140', align: 'center' }
    ],
    formColumns: [
      { prop: 'title', label: '标题', type: 'text', description: '作品的标题，便于识别' },
      { prop: 'description', label: '描述', type: 'textarea', description: '作品的详细描述或说明' },
      { prop: 'content', label: '文案内容', type: 'textarea', rows: 4, description: '作品关联的文案内容' },
      { prop: 'category', label: '分类', type: 'text', default: 'default', description: '作品的分类，如：default、commercial 等' },
      { prop: 'videoPath', label: '视频文件', type: 'upload', accept: '.mp4,.mov,.avi,.mkv,.webm', uploadTip: '支持 MP4、MOV、AVI、MKV、WEBM 格式视频文件' },
      { prop: 'audioPath', label: '音频文件', type: 'upload', accept: '.wav,.mp3,.ogg,.flac,.aac', uploadTip: '支持 WAV、MP3、OGG、FLAC、AAC 格式音频文件' },
      { prop: 'coverPath', label: '封面图片', type: 'upload', accept: '.jpg,.jpeg,.png,.gif,.webp', uploadTip: '支持 JPG、PNG、GIF、WEBP 格式图片' },
      { prop: 'isPublic', label: '公开', type: 'switch', description: '开启后其他用户可以查看此作品' }
    ]
  }
}

const currentConfig = computed(() => {
  return tableConfigs[type.value] || tableConfigs.promptLibrary
})
</script>

<style scoped>
.library-view {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: rgba(30, 30, 60, 0.7);
  backdrop-filter: blur(15px);
  border-radius: 16px;
  border: 1px solid rgba(102, 126, 234, 0.3);
  overflow: hidden;
  padding: 0;
}
</style>
