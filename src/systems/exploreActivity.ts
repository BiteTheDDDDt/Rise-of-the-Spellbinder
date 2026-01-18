import type { ActivityData } from './activity'
import type { LocaleManager, LocaleData } from './locale'
import { Monster } from '../entities/monster'
import { CombatSystem } from './combat'
import type { Player } from '../entities/player'
import type { ResourceManager, ResourceId } from './resource'

export type ExploreEventType = 'combat' | 'treasure' | 'resource' | 'empty' | 'special'

export interface ExploreEvent {
  type: ExploreEventType
  description: string
  data?: any
}

export interface ExploreActivityData extends ActivityData {
  localeId: string
  events: ExploreEvent[]
  currentEventIndex: number
  staminaCost: number
}

export class ExploreActivityFactory {
  static createExploreActivity(locale: LocaleData, playerLevel: number): ExploreActivityData {
    const eventCount = 3 + Math.floor(Math.random() * 3) // 3-5个事件
    const events: ExploreEvent[] = []

    for (let i = 0; i < eventCount; i++) {
      events.push(this.generateRandomEvent(locale, playerLevel))
    }

    // 确保至少有一个战斗事件
    if (!events.some(e => e.type === 'combat')) {
      events[Math.floor(Math.random() * events.length)] = this.generateCombatEvent(locale, playerLevel)
    }

    return {
      id: `explore_${locale.id}`,
      name: `探索${locale.name}`,
      description: locale.description,
      duration: locale.exploreDuration,
      localeId: locale.id,
      events,
      currentEventIndex: 0,
      staminaCost: locale.staminaCost,
      rewards: [], // 探索完成后根据事件生成奖励
      category: 'exploration'
    }
  }

  static generateRandomEvent(locale: LocaleData, playerLevel: number): ExploreEvent {
    const roll = Math.random()
    
    if (roll < 0.4) {
      return this.generateCombatEvent(locale, playerLevel)
    } else if (roll < 0.7) {
      return this.generateTreasureEvent(locale)
    } else if (roll < 0.9) {
      return this.generateResourceEvent(locale)
    } else {
      return this.generateEmptyEvent(locale)
    }
  }

  static generateCombatEvent(locale: LocaleData, _playerLevel: number): ExploreEvent {
    const monsterIds = locale.monsters
    const monsterId = monsterIds[Math.floor(Math.random() * monsterIds.length)]
    
    return {
      type: 'combat',
      description: `遭遇了${monsterId}！准备战斗！`,
      data: { monsterId }
    }
  }

  static generateTreasureEvent(_locale: LocaleData): ExploreEvent {
    const treasureTypes = ['宝箱', '隐藏宝藏', '古老遗物']
    const treasureType = treasureTypes[Math.floor(Math.random() * treasureTypes.length)]
    
    return {
      type: 'treasure',
      description: `发现了一个${treasureType}！`,
      data: { treasureType }
    }
  }

  static generateResourceEvent(_locale: LocaleData): ExploreEvent {
    const resourceTypes = ['魔力节点', '草药丛', '矿石脉']
    const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)]
    
    return {
      type: 'resource',
      description: `发现了${resourceType}，可以采集资源。`,
      data: { resourceType }
    }
  }

  static generateEmptyEvent(_locale: LocaleData): ExploreEvent {
    const descriptions = [
      '这片区域看起来很安静，没有什么特别发现。',
      '你小心地探索着，但没有发现值得注意的东西。',
      '这里已经被其他冒险者探索过了。'
    ]
    const description = descriptions[Math.floor(Math.random() * descriptions.length)]!
    
    return {
      type: 'empty',
      description
    }
  }

  static canAffordExplore(locale: LocaleData, resourceManager: ResourceManager): boolean {
    const staminaRes = resourceManager.getResource('stamina')
    if (!staminaRes || staminaRes.value < locale.staminaCost) {
      return false
    }
    return true
  }

  static payExploreCost(locale: LocaleData, resourceManager: ResourceManager): boolean {
    const staminaRes = resourceManager.getResource('stamina')
    if (!staminaRes || staminaRes.value < locale.staminaCost) {
      return false
    }
    staminaRes.consume(locale.staminaCost)
    return true
  }
}

export class ExploreActivityManager {
  static handleExploreEvent(
    event: ExploreEvent,
    activity: ExploreActivityData,
    player: Player,
    localeManager: LocaleManager,
    monsterData: any[]
  ): { result: string, rewards?: any, combat?: CombatSystem } {
    switch (event.type) {
      case 'combat':
        return this.handleCombatEvent(event, player, monsterData)
      case 'treasure':
        return this.handleTreasureEvent(event, localeManager, activity.localeId)
      case 'resource':
        return this.handleResourceEvent(event, localeManager, activity.localeId)
      case 'empty':
        return this.handleEmptyEvent(event)
      default:
        return { result: '未知事件类型' }
    }
  }

  static handleCombatEvent(event: ExploreEvent, player: Player, monsterData: any[]): { result: string, combat?: CombatSystem } {
    const monsterId = event.data?.monsterId
    if (!monsterId) {
      return { result: '战斗事件数据错误' }
    }

    const monsterDataEntry = monsterData.find(m => m.id === monsterId)
    if (!monsterDataEntry) {
      return { result: '怪物数据不存在' }
    }

    // 创建怪物实例
    const monster = new Monster(monsterDataEntry)

    const combat = new CombatSystem(player, [monster], player.achievementManager)
    
    return {
      result: `遭遇了${monster.name}！战斗开始。`,
      combat
    }
  }

  static handleTreasureEvent(event: ExploreEvent, localeManager: LocaleManager, localeId: string): { result: string, rewards?: any } {
    const rewards = localeManager.generateRewards(localeId)
    const gold = rewards.gold || 0
    const items = rewards.items || []
    
    let result = event.description
    if (gold > 0) {
      result += ` 发现了 ${gold} 金币！`
    }
    if (items.length > 0) {
      result += ` 获得了 ${items.join(', ')}！`
    }

    return {
      result,
      rewards
    }
  }

  static handleResourceEvent(event: ExploreEvent, localeManager: LocaleManager, localeId: string): { result: string, rewards?: any } {
    const rewards = localeManager.generateRewards(localeId)
    const manaRewards: Record<string, number> = {}
    
    for (const [key, value] of Object.entries(rewards)) {
      if (key.startsWith('mana_')) {
        manaRewards[key] = value as number
      }
    }

    let result = event.description
    if (Object.keys(manaRewards).length > 0) {
      const manaStrings = Object.entries(manaRewards).map(([type, amount]) => `${amount} ${type}`)
      result += ` 采集到 ${manaStrings.join(', ')}！`
    }

    return {
      result,
      rewards: manaRewards
    }
  }

  static handleEmptyEvent(event: ExploreEvent): { result: string } {
    return {
      result: event.description
    }
  }

  static completeExploreActivity(
    activity: ExploreActivityData,
    player: Player,
    localeManager: LocaleManager
  ): { success: boolean, message: string, rewards?: any } {
    // 记录探索次数
    localeManager.recordExploration(activity.localeId)

    // 生成最终奖励
    const rewards = localeManager.generateRewards(activity.localeId)
    
    // 给予玩家奖励
    const goldRes = player.resourceManager.getResource('gold')
    if (goldRes && rewards.gold) {
      goldRes.add(rewards.gold)
    }

    if (rewards.experience) {
      player.addExperience(rewards.experience)
    }

    for (const [key, value] of Object.entries(rewards)) {
      if (key.startsWith('mana_')) {
        const manaRes = player.resourceManager.getResource(key as ResourceId)
        if (manaRes) {
          manaRes.add(value as number)
        }
      }
    }

    return {
      success: true,
      message: `完成探索${activity.name}，获得奖励。`,
      rewards
    }
  }
}