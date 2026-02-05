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
    proxy: {
      // Dev-only proxy: keep browser requests same-origin and forward to backend to avoid CORS.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  
  // ==================== 开发服务器配置（注释掉，生产部署不需要） ====================
  /*
  server: {
    port: 5173, // 开发服务器跑在 5173 端口
    // 允许的主机：如果你使用内网穿透工具（如 cpolar），需要将域名加入白名单
    allowedHosts: [
      '54c2e124.r35.cpolar.top'
    ],

    // HMR 配置：解决内网穿透时热更新连接失败的问题
    hmr: {
      host: '54c2e124.r35.cpolar.top',
      clientPort: 443 // cpolar 的 HTTPS 链接其实是在远程服务器的 443 端口
    }
  },
  */
  // ==================== 开发配置结束 ====================
  
  // ==================== 生产构建配置 ====================
  build: {
    outDir: 'dist', // 输出目录
    assetsDir: 'assets', // 静态资源目录
    sourcemap: false, // 生产环境关闭sourcemap
    minify: 'esbuild', // 使用esbuild进行压缩
    rollupOptions: {
      output: {
        // 代码分割配置
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'], // 第三方库单独打包
          utils: ['lodash', 'axios'] // 工具库单独打包
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
