import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import vueDevTools from 'vite-plugin-vue-devtools' // 已移除Vue DevTools

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // vueDevTools(), // 已禁用Vue DevTools面板
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8887,
    strictPort: true,
    allowedHosts: true
  },
  preview: {
    host: '0.0.0.0',
    port: 8887,
    strictPort: true
  }
})
