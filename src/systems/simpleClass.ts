import { reactive } from 'vue'
import { logSystem } from './log'

export type ClassId = string

export class SimpleClassManager {
  unlocked: Set<ClassId>
  classes: Map<ClassId, any>

  constructor() {
    this.unlocked = reactive(new Set())
    this.classes = reactive(new Map())
  }

  init() {
    console.log('[SimpleClassManager] Initializing...')
    const classData = [
      {
        id: 'apprentice',
        name: '学徒',
        description: '魔法之路的起点。',
        tier: 0,
        costs: { gold: 0 },
        requirements: [],
        icon: '📖'
      },
      {
        id: 'fire_acolyte',
        name: '火焰信徒',
        description: '专精火焰魔法。',
        tier: 1,
        costs: { gold: 100 },
        requirements: [
          { type: 'talent', target: 'fire', value: 20 },
          { type: 'previous_class', target: 'apprentice' }
        ],
        icon: '🔥'
      },
      {
        id: 'fire_mage',
        name: '火焰法师',
        description: '精通火焰魔法。',
        tier: 2,
        costs: { gold: 500 },
        requirements: [
          { type: 'talent', target: 'fire', value: 40 },
          { type: 'previous_class', target: 'fire_acolyte' }
        ],
        icon: '🔥'
      },
      {
        id: 'archmage',
        name: '大法师',
        description: '魔法至高掌握者。',
        tier: 3,
        costs: { gold: 3000 },
        requirements: [
          { type: 'talent', target: 'fire', value: 70 },
          { type: 'level', value: 10 }
        ],
        icon: '👑'
      }
    ]

    for (const data of classData) {
      this.classes.set(data.id, reactive(data))
    }

    console.log('[SimpleClassManager] Initialized', classData.length, 'classes')
  }

  unlock(classId: ClassId, gold: number): boolean {
    if (this.unlocked.has(classId)) {
      console.warn('[SimpleClassManager] Already unlocked:', classId)
      return false
    }

    const classData = this.classes.get(classId)
    if (!classData) {
      console.error('[SimpleClassManager] Class not found:', classId)
      return false
    }

    if (gold < classData.costs.gold) {
      console.warn('[SimpleClassManager] Not enough gold:', classId)
      return false
    }

    const reqMet = this.checkRequirements(classData)
    if (!reqMet) return false

    this.unlocked.add(classId)
    logSystem.success(`解锁职业: ${classData.name}`)
    return true
  }

  isUnlocked(classId: ClassId): boolean {
    return this.unlocked.has(classId)
  }

  checkRequirements(classData: any): boolean {
    for (const req of classData.requirements) {
      if (req.type === 'previous_class' && req.target) {
        if (!this.unlocked.has(req.target)) return false
      }
    }
    return true
  }

  getClass(classId: ClassId): any {
    return this.classes.get(classId)
  }

  getAllClasses(): any[] {
    return Array.from(this.classes.values())
  }

  toJSON() {
    return {
      unlocked: Array.from(this.unlocked)
    }
  }

  static fromJSON(data: any): SimpleClassManager {
    const manager = new SimpleClassManager()
    if (data?.unlocked) {
      for (const id of data.unlocked) {
        manager.unlocked.add(id)
      }
    }
    return manager
  }
}
