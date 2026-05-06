<template>
  <view class="video-player-page">
    <video
      :src="videoUrl"
      class="player-video"
      controls
      autoplay
      show-fullscreen-btn
      show-play-btn
      enable-progress-gesture
      object-fit="contain"
    />
  </view>
</template>

<script setup>
import { ref } from 'vue'

const videoUrl = ref('')

// #ifdef MP-WEIXIN || APP-PLUS
import { onLoad } from '@dcloudio/uni-app'
onLoad((options) => {
  if (options.url) {
    videoUrl.value = decodeURIComponent(options.url)
  }
})
// #endif

// #ifdef H5
const pages = getCurrentPages()
const page = pages[pages.length - 1]
if (page && page.options && page.options.url) {
  videoUrl.value = decodeURIComponent(page.options.url)
}
// #endif
</script>

<style scoped>
.video-player-page {
  width: 100vw;
  height: 100vh;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.player-video {
  width: 100%;
  height: 100%;
}
</style>
