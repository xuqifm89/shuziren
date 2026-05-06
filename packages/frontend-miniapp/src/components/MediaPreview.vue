<template>
  <view class="media-preview" @tap="handlePreview">
    <image
      v-if="mediaType === 'image'"
      :src="resolvedUrl"
      class="preview-image"
      mode="aspectFill"
      @error="onError"
    />
    <view v-else-if="mediaType === 'video'" class="preview-video-wrap">
      <image
        v-if="coverUrl"
        :src="coverUrl"
        class="preview-cover"
        mode="aspectFill"
      />
      <view v-else class="preview-video-placeholder">
        <text class="play-icon">▶</text>
      </view>
    </view>
    <view v-else-if="mediaType === 'audio'" class="preview-audio-wrap" @tap.stop="togglePlay">
      <text class="audio-icon">{{ isPlaying ? '⏸' : '🎵' }}</text>
      <text class="audio-name">{{ fileName || '音频' }}</text>
    </view>
    <view v-else class="preview-unknown">
      <text class="unknown-icon">📄</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { resolveMediaUrl } from '@/utils/media.js'

const props = defineProps({
  url: { type: String, default: '' },
  cover: { type: String, default: '' },
  fileName: { type: String, default: '' },
  type: { type: String, default: '' }
})

const isPlaying = ref(false)
const innerAudioContext = ref(null)

const resolvedUrl = computed(() => resolveMediaUrl(props.url))
const coverUrl = computed(() => props.cover ? resolveMediaUrl(props.cover) : '')

const mediaType = computed(() => {
  if (props.type === 'image' || props.type === 'video' || props.type === 'audio') return props.type
  const url = props.url || ''
  if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)) return 'image'
  if (/\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url)) return 'video'
  if (/\.(mp3|wav|ogg|flac|aac|m4a)(\?|$)/i.test(url)) return 'audio'
  return 'unknown'
})

const handlePreview = () => {
  if (mediaType.value === 'image') {
    uni.previewImage({
      urls: [resolvedUrl.value],
      current: resolvedUrl.value
    })
  } else if (mediaType.value === 'video') {
    uni.navigateTo({
      url: `/pages/video-player/index?url=${encodeURIComponent(resolvedUrl.value)}`
    })
  }
}

const togglePlay = () => {
  if (!innerAudioContext.value) {
    innerAudioContext.value = uni.createInnerAudioContext()
    innerAudioContext.value.src = resolvedUrl.value
    innerAudioContext.value.onPlay(() => { isPlaying.value = true })
    innerAudioContext.value.onPause(() => { isPlaying.value = false })
    innerAudioContext.value.onEnded(() => { isPlaying.value = false })
    innerAudioContext.value.onError(() => { isPlaying.value = false })
  }
  if (isPlaying.value) {
    innerAudioContext.value.pause()
  } else {
    innerAudioContext.value.play()
  }
}

const onError = () => {}
</script>

<style scoped>
.media-preview {
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 8rpx;
}
.preview-image {
  width: 100%;
  height: 100%;
}
.preview-video-wrap {
  width: 100%;
  height: 100%;
  position: relative;
}
.preview-cover {
  width: 100%;
  height: 100%;
}
.preview-video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}
.play-icon {
  font-size: 48rpx;
  color: #fff;
}
.preview-audio-wrap {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx;
  background: rgba(102, 126, 234, 0.15);
  border-radius: 8rpx;
}
.audio-icon {
  font-size: 36rpx;
}
.audio-name {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-unknown {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
}
.unknown-icon {
  font-size: 48rpx;
}
</style>
