import { reactive } from 'vue'
import type { Element } from './talent'
import type { SkillId } from './skill'

export type SpellId = string

export interface SpellEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'summon'
  target: 'self' | 'enemy' | 'ally' | 'area'
  value: number
  element?: Element
  duration?: number
}

export interface SpellCost {
  resource: string
  amount: number
}

export interface SpellData {
  id: SpellId
  name: string
  description: string
  element: Element
  level: number
  manaCost: number
  cooldown: number
  castTime: number
  effects: SpellEffect[]
  unlockCondition?: string
  requiredSkill?: {
    skillId: SkillId
    level: number
  }
}

export class Spell {
  data: SpellData
  currentCooldown: number
  isLearned: boolean

  constructor(data: SpellData) {
    this.data = reactive({ ...data })
    this.currentCooldown = 0
    this.isLearned = false
  }

  get id(): SpellId {
    return this.data.id
  }

  get name(): string {
    return this.data.name
  }

  get description(): string {
    return this.data.description
  }

  get element(): Element {
    return this.data.element
  }

  get level(): number {
    return this.data.level
  }

  get manaCost(): number {
    return this.data.manaCost
  }

  get cooldown(): number {
    return this.data.cooldown
  }

  get castTime(): number {
    return this.data.castTime
  }

  get effects(): SpellEffect[] {
    return this.data.effects
  }

  get unlockCondition(): string | undefined {
    return this.data.unlockCondition
  }

  get requiredSkill(): { skillId: SkillId, level: number } | undefined {
    return this.data.requiredSkill
  }

  get isOnCooldown(): boolean {
    return this.currentCooldown > 0
  }

  get cooldownPercent(): number {
    return this.cooldown > 0 ? (this.currentCooldown / this.cooldown) * 100 : 0
  }

  learn() {
    this.isLearned = true
  }

  unlearn() {
    this.isLearned = false
  }

  canCast(availableMana: number, playerSkills: Map<SkillId, { currentLevel: number }>): boolean {
    if (!this.isLearned) return false
    if (this.isOnCooldown) return false
    if (availableMana < this.manaCost) return false

    if (this.requiredSkill) {
      const skill = playerSkills.get(this.requiredSkill.skillId)
      if (!skill || skill.currentLevel < this.requiredSkill.level) {
        return false
      }
    }

    return true
  }

  cast() {
    if (this.isOnCooldown) return false
    
    this.currentCooldown = this.cooldown
    return true
  }

  update(deltaSeconds: number) {
    if (this.currentCooldown > 0) {
      this.currentCooldown = Math.max(0, this.currentCooldown - deltaSeconds)
    }
  }

  canLearn(playerTalent: Record<Element, number>, playerSkills: Map<SkillId, { currentLevel: number }>): boolean {
    if (this.isLearned) return true

    if (this.unlockCondition) {
      try {
        const condition = this.unlockCondition
        const { fire = 0, water = 0, earth = 0, wind = 0 } = playerTalent
        
        // These variables are used in eval
        void fire; void water; void earth; void wind;
        
        if (!eval(condition)) {
          return false
        }
      } catch {
        return false
      }
    }

    if (this.requiredSkill) {
      const skill = playerSkills.get(this.requiredSkill.skillId)
      if (!skill || skill.currentLevel < this.requiredSkill.level) {
        return false
      }
    }

    return true
  }

  getEffectDescription(): string {
    const effects = this.effects.map(effect => {
      switch (effect.type) {
        case 'damage':
          return `造成 ${effect.value} 点${effect.element ? effect.element + ' ' : ''}伤害`
        case 'heal':
          return `治疗 ${effect.value} 点生命值`
        case 'buff':
          return `增益: ${effect.value} ${effect.element ? effect.element + ' ' : ''}效果，持续 ${effect.duration || 1} 秒`
        case 'debuff':
          return `减益: ${effect.value} ${effect.element ? effect.element + ' ' : ''}效果，持续 ${effect.duration || 1} 秒`
        case 'summon':
          return `召唤 ${effect.value} 个单位`
        default:
          return ''
      }
    })
    return effects.join('; ')
  }

  toJSON() {
    return {
      id: this.data.id,
      isLearned: this.isLearned,
      currentCooldown: this.currentCooldown
    }
  }

  static fromJSON(data: any, spellDef: SpellData): Spell {
    const spell = new Spell(spellDef)
    spell.isLearned = data.isLearned || false
    spell.currentCooldown = data.currentCooldown || 0
    return spell
  }
}

export class SpellManager {
  spells: Map<SpellId, Spell>
  spellDefinitions: Map<SpellId, SpellData>

  constructor() {
    this.spells = new Map()
    this.spellDefinitions = new Map()
  }

  registerSpellDefinition(definition: SpellData) {
    this.spellDefinitions.set(definition.id, definition)
  }

  learnSpell(spellId: SpellId, playerTalent: Record<Element, number>, playerSkills: Map<SkillId, { currentLevel: number }>): boolean {
    const definition = this.spellDefinitions.get(spellId)
    if (!definition) return false

    if (this.spells.has(spellId)) {
      const existing = this.spells.get(spellId)!
      if (existing.isLearned) return true
      
      if (existing.canLearn(playerTalent, playerSkills)) {
        existing.learn()
        return true
      }
      return false
    }

    const spell = new Spell(definition)
    if (!spell.canLearn(playerTalent, playerSkills)) return false

    spell.learn()
    this.spells.set(spellId, spell)
    return true
  }

  getSpell(spellId: SpellId): Spell | undefined {
    return this.spells.get(spellId)
  }

  getAllSpells(): Spell[] {
    return Array.from(this.spells.values())
  }

  getLearnedSpells(): Spell[] {
    return this.getAllSpells().filter(spell => spell.isLearned)
  }

  getLearnableSpells(playerTalent: Record<Element, number>, playerSkills: Map<SkillId, { currentLevel: number }>): SpellData[] {
    const learnable: SpellData[] = []
    for (const definition of this.spellDefinitions.values()) {
      if (!this.spells.has(definition.id)) {
        const tempSpell = new Spell(definition)
        if (tempSpell.canLearn(playerTalent, playerSkills)) {
          learnable.push(definition)
        }
      } else {
        const spell = this.spells.get(definition.id)!
        if (!spell.isLearned && spell.canLearn(playerTalent, playerSkills)) {
          learnable.push(definition)
        }
      }
    }
    return learnable
  }

  getLockedSpells(playerTalent: Record<Element, number>, playerSkills: Map<SkillId, { currentLevel: number }>): SpellData[] {
    const locked: SpellData[] = []
    for (const definition of this.spellDefinitions.values()) {
      if (!this.spells.has(definition.id)) {
        const tempSpell = new Spell(definition)
        if (!tempSpell.canLearn(playerTalent, playerSkills)) {
          locked.push(definition)
        }
      } else {
        const spell = this.spells.get(definition.id)!
        if (!spell.isLearned && !spell.canLearn(playerTalent, playerSkills)) {
          locked.push(definition)
        }
      }
    }
    return locked
  }

  update(deltaSeconds: number) {
    for (const spell of this.spells.values()) {
      spell.update(deltaSeconds)
    }
  }

  toJSON() {
    const json: Record<string, any> = {}
    for (const [id, spell] of this.spells.entries()) {
      json[id] = spell.toJSON()
    }
    return json
  }

  static fromJSON(data: Record<string, any>, spellDefinitions: SpellData[]): SpellManager {
    const manager = new SpellManager()
    for (const def of spellDefinitions) {
      manager.registerSpellDefinition(def)
    }
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const spellData = data[key]
        const definition = manager.spellDefinitions.get(key)
        if (definition) {
          const spell = Spell.fromJSON(spellData, definition)
          manager.spells.set(key, spell)
        }
      }
    }
    return manager
  }
}