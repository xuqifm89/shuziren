import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue')
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('../views/UsersView.vue')
  },
  {
    path: '/library/:type',
    name: 'Library',
    component: () => import('../views/LibraryView.vue'),
    props: true
  },
  {
    path: '/config',
    name: 'Config',
    component: () => import('../views/ConfigView.vue')
  },
  {
    path: '/logs',
    name: 'Logs',
    component: () => import('../views/LogsView.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { public: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.public) {
    const token = sessionStorage.getItem('adminToken')
    if (token) {
      next({ name: 'Dashboard' })
      return
    }
    next()
    return
  }

  const token = sessionStorage.getItem('adminToken')
  if (!token) {
    next({ name: 'Login' })
    return
  }
  next()
})

export default router
