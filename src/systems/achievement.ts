import { reactive } from 'vue'
import { logSystem } from './log'

export type AchievementId = string

export type AchievementType = 'skill' | 'spell' | 'activity' | 'resource' | 'time' | 'misc'

export type AchievementRewardType = 'resource' | 'unlock' | 'bonus'

export interface AchievementReward {
  type: AchievementRewardType
  resourceId?: string
  amount?: number
  unlockId?: string
  bonusType?: string
  bonusValue?: number
}

export interface AchievementCondition {
  type: string
  target: string
  required: number
  current: number
}

export interface AchievementData {
  id: AchievementId
  name: string
  description: string
  type: AchievementType
  category: string
  icon: string
  hidden: boolean
  rewards: AchievementReward[]
  condition: AchievementCondition
  unlocked: boolean
  unlockedAt?: number
  progress: number
  required: number
  current: number
}

export class Achievement {
  data: AchievementData

  constructor(data: Omit<AchievementData, 'unlocked' | 'unlockedAt' | 'progress' | 'current'>) {
    this.data = reactive({
      ...data,
      unlocked: false,
      unlockedAt: undefined,
      progress: 0,
      current: 0
    })
  }

  get id(): AchievementId {
    return this.data.id
  }

  get name(): string {
    return this.data.name
  }

  get description(): string {
    return this.data.description
  }

  get type(): AchievementType {
    return this.data.type
  }

  get category(): string {
    return this.data.category
  }

  get icon(): string {
    return this.data.icon
  }

  get hidden(): boolean {
    return this.data.hidden
  }

  get rewards(): AchievementReward[] {
    return this.data.rewards
  }

  get condition(): AchievementCondition {
    return this.data.condition
  }

  get unlocked(): boolean {
    return this.data.unlocked
  }

  get unlockedAt(): number | undefined {
    return this.data.unlockedAt
  }

  get progress(): number {
    return this.data.progress
  }

  get required(): number {
    return this.data.required
  }

  get current(): number {
    return this.data.current
  }

  updateProgress(current: number) {
    if (this.unlocked) return

    this.data.current = Math.min(current, this.data.condition.required)
    this.data.progress = (this.data.current / this.data.condition.required) * 100

    if (this.data.current >= this.data.condition.required && !this.unlocked) {
      this.unlock()
    }
  }

  incrementProgress(amount: number = 1) {
    if (this.unlocked) return

    this.updateProgress(this.data.current + amount)
  }

  unlock() {
    if (this.unlocked) return

    this.data.unlocked = true
    this.data.unlockedAt = Date.now()
    this.data.progress = 100
    this.data.current = this.data.condition.required

    logSystem.success(`成就解锁: ${this.name}`, {
      achievementId: this.id,
      rewards: this.rewards
    })

    // Apply rewards
    this.applyRewards()
  }

  applyRewards() {
    for (const reward of this.rewards) {
      switch (reward.type) {
        case 'resource':
          // TODO: Integrate with resource system
          console.log(`Resource reward: ${reward.resourceId} x${reward.amount}`)
          break
        case 'unlock':
          // TODO: Integrate with unlock system
          console.log(`Unlock reward: ${reward.unlockId}`)
          break
        case 'bonus':
          // TODO: Integrate with bonus system
          console.log(`Bonus reward: ${reward.bonusType} +${reward.bonusValue}`)
          break
      }
    }
  }

  toJSON() {
    return {
      id: this.data.id,
      unlocked: this.data.unlocked,
      unlockedAt: this.data.unlockedAt,
      current: this.data.current,
      progress: this.data.progress
    }
  }

  static fromJSON(data: any, achievementDef: Omit<AchievementData, 'unlocked' | 'unlockedAt' | 'progress' | 'current'>): Achievement {
    const achievement = new Achievement(achievementDef)
    achievement.data.unlocked = data.unlocked || false
    achievement.data.unlockedAt = typeof data.unlockedAt === 'number' ? data.unlockedAt : undefined
    achievement.data.current = data.current || 0
    achievement.data.progress = data.progress || 0
    
    // Ensure achievement is marked as unlocked if progress is complete
    if (achievement.data.current >= achievement.data.condition.required && !achievement.data.unlocked) {
      achievement.data.unlocked = true
      if (!achievement.data.unlockedAt) {
        achievement.data.unlockedAt = Date.now()
      }
    }
    
    return achievement
  }
}

export class AchievementManager {
  achievements: Map<AchievementId, Achievement>
  achievementDefinitions: Map<AchievementId, Omit<AchievementData, 'unlocked' | 'unlockedAt' | 'progress' | 'current'>>
  listeners: Array<(achievement: Achievement) => void> = []

  constructor() {
    this.achievements = new Map()
    this.achievementDefinitions = new Map()
  }

  registerAchievementDefinition(definition: Omit<AchievementData, 'unlocked' | 'unlockedAt' | 'progress' | 'current'>) {
    this.achievementDefinitions.set(definition.id, definition)
  }

  unlockAchievement(achievementId: AchievementId): boolean {
    const definition = this.achievementDefinitions.get(achievementId)
    if (!definition) return false

    if (this.achievements.has(achievementId)) {
      const achievement = this.achievements.get(achievementId)!
      if (!achievement.unlocked) {
        achievement.unlock()
        return true
      }
      return false
    }

    const achievement = new Achievement(definition)
    achievement.unlock()
    this.achievements.set(achievementId, achievement)
    
    this.notifyListeners(achievement)
    return true
  }

  updateAchievementProgress(achievementId: AchievementId, current: number) {
    const achievement = this.achievements.get(achievementId)
    if (!achievement) {
      // Try to create achievement from definition if it exists
      const definition = this.achievementDefinitions.get(achievementId)
      if (!definition) return false

      const newAchievement = new Achievement(definition)
      this.achievements.set(achievementId, newAchievement)
      newAchievement.updateProgress(current)
      return true
    }

    achievement.updateProgress(current)
    if (achievement.unlocked) {
      this.notifyListeners(achievement)
    }
    return true
  }

  incrementAchievementProgress(achievementId: AchievementId, amount: number = 1) {
    const achievement = this.achievements.get(achievementId)
    if (!achievement) {
      const definition = this.achievementDefinitions.get(achievementId)
      if (!definition) return false

      const newAchievement = new Achievement(definition)
      this.achievements.set(achievementId, newAchievement)
      newAchievement.incrementProgress(amount)
      return true
    }

    achievement.incrementProgress(amount)
    if (achievement.unlocked) {
      this.notifyListeners(achievement)
    }
    return true
  }

  getAchievement(achievementId: AchievementId): Achievement | undefined {
    return this.achievements.get(achievementId)
  }

  getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values())
  }

  getUnlockedAchievements(): Achievement[] {
    return this.getAllAchievements().filter(achievement => achievement.unlocked)
  }

  getLockedAchievements(): Omit<AchievementData, 'unlocked' | 'unlockedAt' | 'progress' | 'current'>[] {
    const locked: Omit<AchievementData, 'unlocked' | 'unlockedAt' | 'progress' | 'current'>[] = []
    for (const definition of this.achievementDefinitions.values()) {
      const achievement = this.achievements.get(definition.id)
      if (!achievement || !achievement.unlocked) {
        locked.push(definition)
      }
    }
    return locked
  }

  getAchievementsByCategory(category: string): Achievement[] {
    return this.getAllAchievements().filter(achievement => achievement.category === category)
  }

  getAchievementsByType(type: AchievementType): Achievement[] {
    return this.getAllAchievements().filter(achievement => achievement.type === type)
  }

  subscribe(listener: (achievement: Achievement) => void) {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) this.listeners.splice(index, 1)
    }
  }

  notifyListeners(achievement: Achievement) {
    this.listeners.forEach(listener => listener(achievement))
  }

  toJSON() {
    const json: Record<string, any> = {}
    for (const [id, achievement] of this.achievements.entries()) {
      json[id] = achievement.toJSON()
    }
    return json
  }

  static fromJSON(data: Record<string, any>, achievementDefinitions: Omit<AchievementData, 'unlocked' | 'unlockedAt' | 'progress' | 'current'>[]): AchievementManager {
    const manager = new AchievementManager()
    for (const def of achievementDefinitions) {
      manager.registerAchievementDefinition(def)
    }
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const achievementData = data[key]
        const definition = manager.achievementDefinitions.get(key)
        if (definition) {
          const achievement = Achievement.fromJSON(achievementData, definition)
          manager.achievements.set(key, achievement)
        }
      }
    }
    return manager
  }
}

// Global achievement manager instance
export const achievementManager = new AchievementManager()