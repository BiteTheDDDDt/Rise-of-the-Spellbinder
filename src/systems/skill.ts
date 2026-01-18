import { reactive } from 'vue'
import type { Element } from './talent'
import { logSystem } from './log'
import type { AchievementManager } from './achievement'

export type SkillId = string

export interface SkillEffect {
  type: string
  value: number
  formula?: string
}

export interface SkillData {
  id: SkillId
  name: string
  description: string
  element: Element | 'neutral'
  maxLevel: number
  currentLevel: number
  currentExp: number
  requiredExp: number
  unlockCondition?: string
  effects: SkillEffect[]
}

export class Skill {
  data: SkillData

  constructor(data: Omit<SkillData, 'currentLevel' | 'currentExp' | 'requiredExp'>) {
    this.data = reactive({
      ...data,
      currentLevel: 0,
      currentExp: 0,
      requiredExp: this.calculateRequiredExp(0)
    })
  }

  get id(): SkillId {
    return this.data.id
  }

  get name(): string {
    return this.data.name
  }

  get description(): string {
    return this.data.description
  }

  get element(): Element | 'neutral' {
    return this.data.element
  }

  get maxLevel(): number {
    return this.data.maxLevel
  }

  get currentLevel(): number {
    return this.data.currentLevel
  }

  get currentExp(): number {
    return this.data.currentExp
  }

  get requiredExp(): number {
    return this.data.requiredExp
  }

  get progress(): number {
    return this.currentLevel >= this.maxLevel ? 100 : (this.currentExp / this.requiredExp) * 100
  }

  get isMaxed(): boolean {
    return this.currentLevel >= this.maxLevel
  }

  get isUnlocked(): boolean {
    return true
  }

  get effects(): SkillEffect[] {
    return this.data.effects
  }

  addExp(amount: number) {
    if (this.isMaxed) return

    this.data.currentExp += amount
    while (!this.isMaxed && this.data.currentExp >= this.data.requiredExp) {
      this.levelUp()
    }
  }

  levelUp() {
    if (this.isMaxed) return

    const overflow = this.data.currentExp - this.data.requiredExp
    const oldLevel = this.data.currentLevel
    this.data.currentLevel += 1
    this.data.currentExp = overflow
    this.data.requiredExp = this.calculateRequiredExp(this.data.currentLevel)
    
    logSystem.success(`技能升级: ${this.name} Lv.${oldLevel} → Lv.${this.data.currentLevel}`, {
      skillId: this.id,
      oldLevel,
      newLevel: this.data.currentLevel
    })
  }

  calculateRequiredExp(level: number): number {
    return Math.floor(100 * Math.pow(1.3, level))
  }

  getEffectValue(type: string): number {
    const effect = this.data.effects.find(e => e.type === type)
    if (!effect) return 0
    
    if (effect.formula) {
      try {
        const level = this.currentLevel
        return eval(effect.formula.replace('level', level.toString()))
      } catch {
        return effect.value * this.currentLevel
      }
    }
    return effect.value * this.currentLevel
  }



  toJSON() {
    return {
      id: this.data.id,
      currentLevel: this.data.currentLevel,
      currentExp: this.data.currentExp,
      requiredExp: this.data.requiredExp
    }
  }

  static fromJSON(data: any, skillDef: SkillData): Skill {
    const skill = new Skill(skillDef)
    skill.data.currentLevel = data.currentLevel || 0
    skill.data.currentExp = data.currentExp || 0
    skill.data.requiredExp = data.requiredExp || skill.calculateRequiredExp(data.currentLevel || 0)
    return skill
  }
}

export class SkillManager {
  skills: Map<SkillId, Skill>
  skillDefinitions: Map<SkillId, Omit<SkillData, 'currentLevel' | 'currentExp' | 'requiredExp'>>
  achievementManager: AchievementManager | undefined

  constructor(achievementManager?: AchievementManager) {
    this.skills = reactive(new Map())
    this.skillDefinitions = reactive(new Map())
    this.achievementManager = achievementManager
  }

  registerSkillDefinition(definition: Omit<SkillData, 'currentLevel' | 'currentExp' | 'requiredExp'>) {
    this.skillDefinitions.set(definition.id, definition)
  }

  unlockSkill(skillId: SkillId, playerTalent: Record<Element, number>): boolean {
    const definition = this.skillDefinitions.get(skillId)
    if (!definition) return false

    if (this.skills.has(skillId)) return true

    // Evaluate unlock condition
    if (!this.evaluateUnlockCondition(definition.unlockCondition, playerTalent)) {
      return false
    }

    const skill = new Skill(definition)
    this.skills.set(skillId, skill)
    logSystem.success(`技能解锁: ${skill.name}`, { skillId, element: skill.element })
    
    // Track achievement progress
    if (this.achievementManager) {
      this.achievementManager.incrementAchievementProgress('first_skill')
      this.achievementManager.incrementAchievementProgress('skill_master')
    }
    
    return true
  }

  canUnlockSkill(skillId: SkillId, playerTalent: Record<Element, number>): boolean {
    const definition = this.skillDefinitions.get(skillId)
    if (!definition) return false
    if (this.skills.has(skillId)) return true
    return this.evaluateUnlockCondition(definition.unlockCondition, playerTalent)
  }

  public evaluateUnlockCondition(condition: string | undefined, playerTalent: Record<Element, number>): boolean {
    if (!condition || condition === 'true') return true
    
    try {
      // Prepare variables for eval
      const { fire = 0, water = 0, earth = 0, wind = 0 } = playerTalent
      
      // Get skill levels for skill references in condition
      const skillLevels: Record<string, number> = {}
      for (const [skillId, _definition] of this.skillDefinitions.entries()) {
        const skill = this.skills.get(skillId)
        skillLevels[skillId] = skill ? skill.currentLevel : 0
      }
      
      // Combine all variables for eval
      const allVars = { fire, water, earth, wind, ...skillLevels }
      
      // Create eval context with all variables
      const evalFunc = new Function(...Object.keys(allVars), `return ${condition}`)
      return evalFunc(...Object.values(allVars))
    } catch {
      return false
    }
  }

  getSkill(skillId: SkillId): Skill | undefined {
    return this.skills.get(skillId)
  }

  getAllSkills(): Skill[] {
    return Array.from(this.skills.values())
  }

  getUnlockedSkills(): Skill[] {
    return this.getAllSkills().filter(skill => skill.isUnlocked)
  }

  getLockedSkills(): Omit<SkillData, 'currentLevel' | 'currentExp' | 'requiredExp'>[] {
    const locked: Omit<SkillData, 'currentLevel' | 'currentExp' | 'requiredExp'>[] = []
    for (const definition of this.skillDefinitions.values()) {
      if (!this.skills.has(definition.id)) {
        locked.push(definition)
      }
    }
    return locked
  }

  addExpToSkill(skillId: SkillId, amount: number) {
    const skill = this.skills.get(skillId)
    if (skill) {
      skill.addExp(amount)
    } else {
      console.warn('[SkillManager] Skill not found:', skillId, 'Available skills:', Array.from(this.skills.keys()))
    }
  }

  toJSON() {
    const json: Record<string, any> = {}
    for (const [id, skill] of this.skills.entries()) {
      json[id] = skill.toJSON()
    }
    return json
  }

  static fromJSON(data: Record<string, any>, skillDefinitions: Omit<SkillData, 'currentLevel' | 'currentExp' | 'requiredExp'>[]): SkillManager {
    const manager = new SkillManager()
    for (const def of skillDefinitions) {
      manager.registerSkillDefinition(def)
    }
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        const skillData = data[key]
        const definition = manager.skillDefinitions.get(key)
        if (definition) {
          const skill = Skill.fromJSON(skillData, definition as SkillData)
          manager.skills.set(key, skill)
        }
      }
    }
    return manager
  }
}