import { createI18n } from 'vue-i18n'
import enUS from './en-US.json'
import zhCN from './zh-CN.json'

export type Locale = 'en-US' | 'zh-CN'

export const messages = {
  'en-US': enUS,
  'zh-CN': zhCN
}

export const i18n = createI18n({
  legacy: false,
  locale: 'en-US',
  fallbackLocale: 'en-US',
  messages
})

export function setLocale(locale: Locale) {
  const start = performance.now()
  i18n.global.locale.value = locale
  const mid = performance.now()
  // 延迟 localStorage 操作以避免阻塞主线程
  setTimeout(() => {
    try {
      localStorage.setItem('locale', locale)
      const end = performance.now()
      console.log(`[setLocale] localStorage saved in ${end - mid}ms (deferred)`)
    } catch (error) {
      console.error('[setLocale] Failed to save locale to localStorage:', error)
    }
  }, 0)
  const immediateEnd = performance.now()
  console.log(`[setLocale] Immediate update took ${immediateEnd - start}ms`)
}

export function getLocale(): Locale {
  const saved = localStorage.getItem('locale') as Locale | null
  return saved && Object.keys(messages).includes(saved) ? saved : 'en-US'
}