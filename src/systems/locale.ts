import { reactive } from 'vue'
import { logSystem } from './log'
import type { AchievementManager } from './achievement'

export type LocaleId = string

export interface LocaleReward {
  gold?: string
  experience?: string
  mana_fire?: string
  mana_water?: string
  mana_earth?: string
  mana_wind?: string
  items?: string[]
}

export interface LocaleData {
  id: LocaleId
  name: string
  description: string
  dangerLevel: number
  unlockCondition: string
  monsters: string[]
  rewards: LocaleReward
  exploreDuration: number
  staminaCost: number
}

export interface LocaleInstance {
  id: LocaleId
  locale: LocaleData
  discovered: boolean
  exploredCount: number
  lastExploredTime?: number
}

export class LocaleManager {
  locales: Map<LocaleId, LocaleInstance> = reactive(new Map())
  discoveredLocales: LocaleId[] = reactive([])
  achievementManager?: AchievementManager

  constructor(achievementManager?: AchievementManager) {
    this.achievementManager = achievementManager
  }

  loadLocaleData(data: LocaleData[]) {
    for (const localeData of data) {
      const instance: LocaleInstance = reactive({
        id: localeData.id,
        locale: localeData,
        discovered: false,
        exploredCount: 0,
        lastExploredTime: undefined
      })
      this.locales.set(localeData.id, instance)
    }
    logSystem.info(`已加载 ${data.length} 个地点数据`)
  }

  discoverLocale(localeId: LocaleId) {
    const locale = this.locales.get(localeId)
    if (!locale) {
      logSystem.error(`尝试发现不存在的的地点: ${localeId}`)
      return false
    }
    if (!locale.discovered) {
      locale.discovered = true
      this.discoveredLocales.push(localeId)
      logSystem.success(`发现新地点: ${locale.locale.name}`, { localeId })
      
      if (this.achievementManager) {
        this.achievementManager.incrementAchievementProgress('explorer')
      }
      return true
    }
    return false
  }

  canExplore(localeId: LocaleId, playerLevel: number, hasAttackSpell: boolean): { can: boolean, reason?: string } {
    const locale = this.locales.get(localeId)
    if (!locale) {
      return { can: false, reason: '地点不存在' }
    }
    if (!locale.discovered) {
      return { can: false, reason: '地点未发现' }
    }

    const condition = locale.locale.unlockCondition
    if (condition === 'always') {
      return { can: true }
    }
    if (condition === 'has_attack_spell' && !hasAttackSpell) {
      return { can: false, reason: '需要学会攻击法术' }
    }
    
    const match = condition.match(/skill_level >= (\d+)/)
    if (match) {
      const requiredLevel = parseInt(match[1]!)
      if (playerLevel < requiredLevel) {
        return { can: false, reason: `需要等级 ${requiredLevel}` }
      }
    }
    
    const andMatch = condition.match(/has_attack_spell && skill_level >= (\d+)/)
    if (andMatch) {
      const requiredLevel = parseInt(andMatch[1]!)
      if (!hasAttackSpell) {
        return { can: false, reason: '需要学会攻击法术' }
      }
      if (playerLevel < requiredLevel) {
        return { can: false, reason: `需要等级 ${requiredLevel}` }
      }
    }

    return { can: true }
  }

  recordExploration(localeId: LocaleId) {
    const locale = this.locales.get(localeId)
    if (!locale) return

    locale.exploredCount++
    locale.lastExploredTime = Date.now()
    
    if (this.achievementManager) {
      this.achievementManager.incrementAchievementProgress('explorer')
      if (locale.exploredCount >= 10) {
        this.achievementManager.unlockAchievement('seasoned_explorer')
      }
    }
  }

  getLocale(localeId: LocaleId): LocaleInstance | undefined {
    return this.locales.get(localeId)
  }

  getAllLocales(): LocaleInstance[] {
    return Array.from(this.locales.values())
  }

  getDiscoveredLocales(): LocaleInstance[] {
    return this.getAllLocales().filter(locale => locale.discovered)
  }

  getAvailableLocales(playerLevel: number, hasAttackSpell: boolean): LocaleInstance[] {
    return this.getDiscoveredLocales().filter(locale => 
      this.canExplore(locale.id, playerLevel, hasAttackSpell).can
    )
  }

  parseRewardRange(range: string | undefined): { min: number, max: number } {
    if (!range || !range.includes('~')) {
      const value = parseInt(range || '0')
      return { min: value, max: value }
    }
    const [minStr, maxStr] = range.split('~')
    return { min: parseInt(minStr || '0'), max: parseInt(maxStr || '0') }
  }

  generateRewards(localeId: LocaleId): Record<string, any> {
    const locale = this.locales.get(localeId)
    if (!locale) return {}

    const rewards: Record<string, any> = {}
    const rewardData = locale.locale.rewards

    for (const [key, value] of Object.entries(rewardData)) {
      if (key === 'items') {
        const items = value as string[]
        if (items.length > 0) {
          const randomIndex = Math.floor(Math.random() * items.length)
          rewards[key] = [items[randomIndex]]
        }
      } else if (typeof value === 'string') {
        const { min, max } = this.parseRewardRange(value)
        const amount = Math.floor(Math.random() * (max - min + 1)) + min
        rewards[key] = amount
      }
    }

    return rewards
  }

  toJSON() {
    return {
      locales: Array.from(this.locales.values()),
      discoveredLocales: this.discoveredLocales
    }
  }

  static fromJSON(data: any, achievementManager?: AchievementManager): LocaleManager {
    const manager = new LocaleManager(achievementManager)
    if (data.locales && Array.isArray(data.locales)) {
      for (const localeInstance of data.locales) {
        manager.locales.set(localeInstance.id, reactive(localeInstance))
      }
    }
    if (data.discoveredLocales && Array.isArray(data.discoveredLocales)) {
      manager.discoveredLocales = reactive(data.discoveredLocales)
    }
    return manager
  }
}