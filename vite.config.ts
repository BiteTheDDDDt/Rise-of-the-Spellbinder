import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/Rise-of-the-Spellbinder/' : '/',
  plugins: [vue()],
  publicDir: 'public',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@ui': resolve(__dirname, './src/ui'),
      '@data': resolve(__dirname, './data'),
      '@core': resolve(__dirname, './src/core'),
      '@systems': resolve(__dirname, './src/systems'),
      '@entities': resolve(__dirname, './src/entities'),
      '@i18n': resolve(__dirname, './src/i18n'),
      '@utils': resolve(__dirname, './src/utils'),
    }
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
})
