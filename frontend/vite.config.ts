import { fileURLToPath, URL } from 'node:url' 
import { defineConfig } from 'vite' 
import vue from '@vitejs/plugin-vue' 
import vueDevTools from 'vite-plugin-vue-devtools' 

// https://vitejs.dev/config/
export default defineConfig({
  // 生产环境挂载在 /analyticshub，避免静态资源从官网根路径 /assets 加载。
  base: '/analyticshub/',
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
    proxy: {
      /**
       * 开发环境代理配置 - 解决CORS跨域问题
       * 
       * 工作原理：
       * 1. 前端请求发送到同源地址 (http://localhost:5173/api/...)
       * 2. Vite开发服务器将 /api/* 路径的请求转发到后端服务 (http://127.0.0.1:3001)
       * 3. 浏览器认为所有请求都是同源的，避免了CORS限制
       * 
       * 注意：生产环境通过Nginx反向代理实现相同功能，见 docs/DEPLOYMENT.md
       */
      '/api/': {
        // Use an explicit IPv4 loopback address so a localhost -> ::1 mapping
        // still works when the backend is intentionally bound to 127.0.0.1.
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      }
    }
  },
  // ==================== 生产构建配置 ====================
  build: {
    outDir: 'dist', // 输出目录
    assetsDir: 'assets', // 静态资源目录
    sourcemap: false, // 生产环境关闭sourcemap
    minify: 'esbuild', // 使用esbuild进行压缩
    // ECharts and zrender must remain in one non-circular lazy chunk. Its gzip
    // size is still enforced separately by scripts/verify-bundle.mjs.
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      onwarn(warning, warn) {
        // VueUse 14.3 emits two misplaced PURE annotations. Rollup safely
        // removes only those comments; keep every other warning visible.
        if (warning.code === 'INVALID_ANNOTATION'
          && warning.id?.includes('/node_modules/@vueuse/core/')) return
        warn(warning)
      },
      output: {
        // 代码分割配置
        manualChunks(id) {
          // ECharts and zrender have bidirectional module edges. Keep them in
          // one lazy chunk so Rollup does not create a circular chunk graph.
          if (id.includes('/node_modules/echarts/') || id.includes('/node_modules/zrender/')) {
            return 'charts'
          }
          if (id.includes('/node_modules/@element-plus/icons-vue/')) return 'element-icons'
          if (id.includes('/node_modules/vue/')
            || id.includes('/node_modules/vue-router/')
            || id.includes('/node_modules/pinia/')) {
            return 'vendor'
          }
          if (id.includes('/node_modules/lodash/') || id.includes('/node_modules/axios/')) {
            return 'utils'
          }
        },
        // 确保静态资源文件名包含hash以便缓存
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    }
  }
  // ==================== 生产配置结束 ====================
})
