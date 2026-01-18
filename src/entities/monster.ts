import { reactive } from 'vue'
import type { Element } from '../systems/talent'

export type MonsterId = string

export interface MonsterDrop {
  gold?: string
  experience?: string
  mana_fire?: string
  mana_water?: string
  mana_earth?: string
  mana_wind?: string
  items?: string[]
}

export interface MonsterData {
  id: MonsterId
  name: string
  element: Element | 'neutral'
  health: number
  maxHealth: number
  attack: number
  defense: number
  spells: string[]
  drops: MonsterDrop
  level: number
}

export interface MonsterInstance {
  id: MonsterId
  monster: MonsterData
  currentHealth: number
  isAlive: boolean
  buffs: CombatBuff[]
  debuffs: CombatDebuff[]
}

export interface CombatBuff {
  type: string
  value: number
  duration: number
  source: string
}

export interface CombatDebuff {
  type: string
  value: number
  duration: number
  source: string
}

export class Monster {
  data: MonsterData
  currentHealth: number
  isAlive: boolean
  buffs: CombatBuff[]
  debuffs: CombatDebuff[]

  constructor(data: MonsterData) {
    this.data = reactive({ ...data })
    this.currentHealth = data.health
    this.isAlive = true
    this.buffs = reactive([])
    this.debuffs = reactive([])
  }

  get id(): MonsterId {
    return this.data.id
  }

  get name(): string {
    return this.data.name
  }

  get element(): Element | 'neutral' {
    return this.data.element
  }

  get maxHealth(): number {
    return this.data.maxHealth
  }

  get attack(): number {
    let base = this.data.attack
    for (const buff of this.buffs) {
      if (buff.type === 'attack') {
        base += buff.value
      }
    }
    for (const debuff of this.debuffs) {
      if (debuff.type === 'attack') {
        base -= debuff.value
      }
    }
    return Math.max(0, base)
  }

  get defense(): number {
    let base = this.data.defense
    for (const buff of this.buffs) {
      if (buff.type === 'defense') {
        base += buff.value
      }
    }
    for (const debuff of this.debuffs) {
      if (debuff.type === 'defense') {
        base -= debuff.value
      }
    }
    return Math.max(0, base)
  }

  get spells(): string[] {
    return this.data.spells
  }

  get level(): number {
    return this.data.level
  }

  takeDamage(damage: number): number {
    const actualDamage = Math.max(1, damage - this.defense)
    this.currentHealth -= actualDamage
    if (this.currentHealth <= 0) {
      this.currentHealth = 0
      this.isAlive = false
    }
    return actualDamage
  }

  heal(amount: number): number {
    const missingHealth = this.maxHealth - this.currentHealth
    const actualHeal = Math.min(amount, missingHealth)
    this.currentHealth += actualHeal
    return actualHeal
  }

  addBuff(buff: CombatBuff) {
    this.buffs.push(buff)
  }

  addDebuff(debuff: CombatDebuff) {
    this.debuffs.push(debuff)
  }

  updateBuffsAndDebuffs() {
    this.buffs = this.buffs.filter(buff => buff.duration > 0)
    this.debuffs = this.debuffs.filter(debuff => debuff.duration > 0)
    
    for (const buff of this.buffs) {
      buff.duration--
    }
    for (const debuff of this.debuffs) {
      debuff.duration--
    }
  }

  getHealthPercentage(): number {
    return (this.currentHealth / this.maxHealth) * 100
  }

  parseDropRange(range: string | undefined): { min: number, max: number } {
    if (!range || !range.includes('~')) {
      const value = parseInt(range || '0')
      return { min: value, max: value }
    }
    const [minStr, maxStr] = range.split('~')
    return { min: parseInt(minStr || '0'), max: parseInt(maxStr || '0') }
  }

  generateDrops(): Record<string, any> {
    const drops: Record<string, any> = {}
    const dropData = this.data.drops

    for (const [key, value] of Object.entries(dropData)) {
      if (value === undefined) continue
      
      if (key === 'items') {
        const items = value as string[]
        if (items.length > 0) {
          const randomIndex = Math.floor(Math.random() * items.length)
          drops[key] = [items[randomIndex]]
        }
      } else if (typeof value === 'string') {
        const { min, max } = this.parseDropRange(value)
        const amount = Math.floor(Math.random() * (max - min + 1)) + min
        drops[key] = amount
      }
    }

    return drops
  }

  static fromJSON(data: any): Monster {
    const monster = new Monster(data)
    if (data.currentHealth !== undefined) {
      monster.currentHealth = data.currentHealth
    }
    if (data.isAlive !== undefined) {
      monster.isAlive = data.isAlive
    }
    if (data.buffs) {
      monster.buffs = reactive(data.buffs)
    }
    if (data.debuffs) {
      monster.debuffs = reactive(data.debuffs)
    }
    return monster
  }

  toJSON() {
    return {
      ...this.data,
      currentHealth: this.currentHealth,
      isAlive: this.isAlive,
      buffs: this.buffs,
      debuffs: this.debuffs
    }
  }
}