export function getUserInfo() {
  const userInfo = uni.getStorageSync('userInfo')
  if (userInfo) {
    try { return typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo } catch (e) {}
  }
  return null
}

export function getToken() {
  return uni.getStorageSync('token') || ''
}

export function isLoggedIn() {
  return !!getToken()
}

export function logout() {
  uni.removeStorageSync('token')
  uni.removeStorageSync('userInfo')
}
