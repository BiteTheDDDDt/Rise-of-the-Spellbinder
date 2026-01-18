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
  
  // Save to localStorage synchronously
  try {
    localStorage.setItem('locale', locale)
  } catch (error) {
    console.error('[setLocale] Failed to save locale to localStorage:', error)
  }
  
  const immediateEnd = performance.now()
  console.log(`[setLocale] Set locale to ${locale} in ${immediateEnd - start}ms`)
}

export function getLocale(): Locale {
  try {
    const saved = localStorage.getItem('locale') as Locale | null
    return saved && Object.keys(messages).includes(saved) ? saved : 'en-US'
  } catch {
    return 'en-US'
  }
}
