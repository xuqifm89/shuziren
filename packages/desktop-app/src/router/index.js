import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue')
  },
  {
    path: '/library/:type',
    name: 'Library',
    component: () => import('../views/LibraryView.vue'),
    props: true
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.public) {
    const token = localStorage.getItem('token')
    const userInfo = localStorage.getItem('userInfo')
    if (token && userInfo) {
      next({ name: 'Home' })
      return
    }
    next()
    return
  }

  const token = localStorage.getItem('token')
  const userInfo = localStorage.getItem('userInfo')
  if (!token && !userInfo) {
    next({ name: 'Login' })
    return
  }
  next()
})

export default router
