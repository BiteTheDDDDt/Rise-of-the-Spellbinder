import { createI18n } from 'vue-i18n'
import enUS from './en-US.json'
import zhCN from './zh-CN.json'

export type Locale = 'en-US' | 'zh-CN'

export const messages = {
  'en-US': enUS,
  'zh-CN': zhCN
}

// Initialize with saved locale or default
const savedLocale = (() => {
  try {
    const saved = localStorage.getItem('locale') as Locale | null
    return saved && Object.keys(messages).includes(saved) ? saved : 'en-US'
  } catch {
    return 'en-US'
  }
})()

export const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en-US',
  messages
})

export function setLocale(locale: Locale) {
  const start = performance.now()
  i18n.global.locale.value = locale
  const immediateEnd = performance.now()
  
  // Save to localStorage asynchronously
  setTimeout(() => {
    try {
      localStorage.setItem('locale', locale)
    } catch (error) {
      console.error('[setLocale] Failed to save locale to localStorage:', error)
    }
  }, 0)
  
  console.log(`[setLocale] Set locale to ${locale} in ${immediateEnd - start}ms`)
}