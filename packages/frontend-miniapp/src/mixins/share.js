export default {
  onShareAppMessage() {
    const pages = getCurrentPages()
    const page = pages[pages.length - 1]
    const title = '拾光引擎 - AI数字人创作平台'
    let path = '/pages/index/index'

    if (page) {
      const route = page.route
      const options = page.options || {}
      const query = Object.keys(options).map(k => `${k}=${encodeURIComponent(options[k])}`).join('&')
      path = query ? `/${route}?${query}` : `/${route}`
    }

    return {
      title,
      path,
      imageUrl: '/static/share-image.png'
    }
  },
  onShareTimeline() {
    return {
      title: '拾光引擎 - AI数字人创作平台',
      query: '',
      imageUrl: '/static/share-image.png'
    }
  }
}
