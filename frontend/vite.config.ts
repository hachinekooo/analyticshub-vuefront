import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5173,
    // 允许的主机：如果你使用内网穿透工具（如 cpolar），需要将域名加入白名单
    // allowedHosts: [
    //   'xxxx.r35.cpolar.top'
    // ],

    // HMR 配置：解决内网穿透时热更新连接失败的问题
    // hmr: {
    //   host: 'xxxx.r35.cpolar.top',
    //   clientPort: 443 
    // }
  }
})
