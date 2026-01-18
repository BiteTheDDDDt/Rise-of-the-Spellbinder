import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { execSync } from 'child_process'

// Plugin to get git information
function gitInfoPlugin() {
  return {
    name: 'git-info',
    config: () => {
      let gitInfo = {
        commitHash: 'dev',
        commitShortHash: 'dev',
        commitMessage: 'Development',
        commitDate: new Date().toISOString(),
        branch: 'main'
      }

      try {
        gitInfo = {
          commitHash: execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim(),
          commitShortHash: execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim(),
          commitMessage: execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim().split('\n')[0],
          commitDate: execSync('git log -1 --format=%ci', { encoding: 'utf-8' }).trim(),
          branch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim()
        }
      } catch (error) {
        console.warn('Could not get git information:', error)
      }

      return {
        define: {
          '__GIT_COMMIT_HASH__': JSON.stringify(gitInfo.commitHash),
          '__GIT_COMMIT_SHORT_HASH__': JSON.stringify(gitInfo.commitShortHash),
          '__GIT_COMMIT_MESSAGE__': JSON.stringify(gitInfo.commitMessage),
          '__GIT_COMMIT_DATE__': JSON.stringify(gitInfo.commitDate),
          '__GIT_BRANCH__': JSON.stringify(gitInfo.branch)
        }
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/Rise-of-the-Spellbinder/' : '/',
  plugins: [vue(), gitInfoPlugin()],
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
