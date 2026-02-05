

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'

const app = createApp(App)

// Allow per-environment branding without changing source code.
document.title = import.meta.env.VITE_APP_TITLE || 'AnalyticsHub'

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

// Register all Element Plus icons globally for template usage.
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.mount('#app')
