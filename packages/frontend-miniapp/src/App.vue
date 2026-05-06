<script>
export default {
  onLaunch() {
    console.log('拾光引擎启动')
    // #ifdef MP-WEIXIN
    this.checkUpdate()
    // #endif
  },
  // #ifdef MP-WEIXIN
  methods: {
    checkUpdate() {
      if (uni.canIUse('getUpdateManager')) {
        const updateManager = uni.getUpdateManager()
        updateManager.onCheckForUpdate((res) => {
          if (res.hasUpdate) {
            updateManager.onUpdateReady(() => {
              uni.showModal({
                title: '更新提示',
                content: '新版本已就绪，是否重启应用？',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    updateManager.applyUpdate()
                  }
                }
              })
            })
            updateManager.onUpdateFailed(() => {
              uni.showModal({
                title: '更新提示',
                content: '新版本下载失败，请检查网络后重试'
              })
            })
          }
        })
      }
    }
  }
  // #endif
}
</script>

<style>
page {
  background-color: #0f0f23;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  max-width: 100vw;
  overflow-x: hidden;
  box-sizing: border-box;
}

*, *::before, *::after {
  box-sizing: border-box;
  max-width: 100%;
}

::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
}

input, textarea {
  font-size: 16px !important;
}

button {
  margin: 0;
  padding: 0;
  background: none;
  border: none;
  outline: none;
  line-height: normal;
}

button::after {
  display: none;
}

/* #ifdef H5 */
.uni-tabbar {
  padding-bottom: env(safe-area-inset-bottom) !important;
}

uni-page-body {
  background-color: #0f0f23 !important;
}

@media screen and (min-width: 768px) {
  page {
    max-width: 750px;
    margin: 0 auto;
  }
}
/* #endif */
</style>
