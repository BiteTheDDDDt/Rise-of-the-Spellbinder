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
  i18n.global.locale.value = locale
  localStorage.setItem('locale', locale)
}

export function getLocale(): Locale {
  const saved = localStorage.getItem('locale') as Locale | null
  return saved && Object.keys(messages).includes(saved) ? saved : 'en-US'
}