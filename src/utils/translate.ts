import { i18n } from '../i18n'

export type TranslateType = 
  | 'resource' 
  | 'spell' 
  | 'skill' 
  | 'monster' 
  | 'item' 
  | 'achievement' 
  | 'locale'
  | 'shop'
  | 'origin'
  | 'element'

export function translate(type: TranslateType, id: string, fallback?: string): string {
  const key = `${type}.${id}`
  const result = i18n.global.t(key)
  
  if (result === key && fallback) {
    return fallback
  }
  
  return result
}

export function t(key: string, fallback?: string): string {
  const result = i18n.global.t(key)
  
  if (result === key && fallback) {
    return fallback
  }
  
  return result
}

export function getCurrentLocale(): 'en-US' | 'zh-CN' {
  return i18n.global.locale.value as 'en-US' | 'zh-CN'
}
