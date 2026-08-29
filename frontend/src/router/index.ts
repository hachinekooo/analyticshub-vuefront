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
          path: 'projects/:projectId/dashboard',
          name: 'metrics',
          component: () => import('../views/AdminMetrics.vue'),
          meta: { projectScoped: true, projectSection: 'dashboard' },
        },
        {
          path: 'projects/:projectId/privacy',
          name: 'privacy-requests',
          component: () => import('../views/PrivacyRequests.vue'),
          meta: { projectScoped: true, projectSection: 'privacy' },
        },
        {
          path: 'projects/:projectId/semantics',
          name: 'semantics',
          component: () => import('../views/SemanticDictionary.vue'),
          meta: { projectScoped: true, projectSection: 'semantics' },
        },
        {
          path: 'projects/:projectId/counters',
          name: 'counters',
          component: () => import('../views/ProjectCounters.vue'),
          meta: { projectScoped: true, projectSection: 'counters' },
        },
        {
          path: 'projects/:projectId/analysis-config',
          name: 'analysis-config',
          component: () => import('../views/AnalysisConfiguration.vue'),
          meta: { projectScoped: true, projectSection: 'analysis-config' },
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
