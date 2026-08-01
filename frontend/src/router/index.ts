import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: () => import('../layouts/AdminShell.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          alias: 'admin',
          component: () => import('../views/AdminDashboard.vue'),
        },
        {
          path: 'metrics',
          name: 'metrics',
          component: () => import('../views/AdminMetrics.vue'),
          meta: { projectScoped: true },
        },
        {
          path: 'privacy-requests',
          name: 'privacy-requests',
          component: () => import('../views/PrivacyRequests.vue'),
          meta: { projectScoped: true },
        },
        {
          path: 'semantics',
          name: 'semantics',
          component: () => import('../views/SemanticDictionary.vue'),
          meta: { projectScoped: true },
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    }
  ],
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  
  // Lightweight auth gate: redirect to login and preserve the target path.
  if (to.meta.requiresAuth && !token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
