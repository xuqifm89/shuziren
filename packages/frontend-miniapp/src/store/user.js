import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const userInfo = ref(null)
  const token = ref('')

  function setUser(user) {
    userInfo.value = user
    uni.setStorageSync('userInfo', JSON.stringify(user))
  }

  function setToken(t) {
    token.value = t
    uni.setStorageSync('token', t)
  }

  function logout() {
    userInfo.value = null
    token.value = ''
    uni.removeStorageSync('userInfo')
    uni.removeStorageSync('token')
  }

  function init() {
    try {
      const info = uni.getStorageSync('userInfo')
      const t = uni.getStorageSync('token')
      if (info) userInfo.value = JSON.parse(info)
      if (t) token.value = t
    } catch (e) {}
  }

  return { userInfo, token, setUser, setToken, logout, init }
})