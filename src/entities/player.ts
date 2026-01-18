import { reactive, markRaw } from 'vue'
import { Talent } from '../systems/talent'
import { ResourceManager, type ResourceId } from '../systems/resource'
import { SkillManager } from '../systems/skill'
import { SpellManager } from '../systems/spell'
import { AchievementManager } from '../systems/achievement'
import { Inventory } from '../systems/inventory'
import { SimpleClassManager } from '../systems/simpleClass'
import { ClassManager } from '../systems/class'
import { createDefaultClassTree } from '../systems/classData'
import { logSystem } from '../systems/log'

export interface PlayerData {
  name: string
  level: number
  experience: number
  talent: Talent
  resourceManager: ResourceManager
  skillManager: SkillManager
  spellManager: SpellManager
  achievementManager: AchievementManager
  inventory: Inventory
  simpleClassManager: any
  classManager: any
}

export class Player {
  data: PlayerData

  constructor(name: string, talentPreset?: 'fire' | 'water' | 'earth' | 'wind') {
    try {
      const talent = talentPreset ? Talent.createPreset(talentPreset) : new Talent()
      const resourceManager = ResourceManager.createDefault()
      const achievementManager = new AchievementManager()
      const skillManager = new SkillManager(achievementManager)
      const spellManager = new SpellManager(achievementManager)
      const inventory = new Inventory()
      const simpleClassManager = new SimpleClassManager()
      const classManager = new ClassManager()
      
      // 标记 classTree 为非响应式，因为职业树数据量很大且不需要响应式
      const classTree = createDefaultClassTree()
      markRaw(classTree)
      classManager.setClassTree(classTree)
      simpleClassManager.init()

      this.data = reactive({
        name,
        level:1,
        experience: 0,
        talent,
        resourceManager,
        skillManager,
        spellManager,
        achievementManager,
        inventory,
        simpleClassManager,
        classManager
      })

      this.applyTalentBonuses()

      // 自动解锁初始职业"学徒"
      this.unlockInitialClass()
    } catch (error) {
      console.error('[Player] Error in constructor:', error)
      throw error
    }
  }

  private unlockInitialClass() {
    try {
      const apprenticeNode = this.data.classManager.classTree.getNode('apprentice')
      if (apprenticeNode && !this.data.classManager.unlockedClasses.includes('apprentice')) {
        this.data.classManager.unlockedClasses.push('apprentice')
        this.data.classManager.classTree.achievements.push('apprentice')
        console.log('[Player] Initial class unlocked: Apprentice')
      }
    } catch (error) {
      console.error('[Player] Error unlocking initial class:', error)
    }
  }

  applyTalentBonuses() {
    const talent = this.data.talent
    const resources = this.data.resourceManager

    const elementMap: Record<string, ResourceId> = {
      fire: 'mana_fire',
      water: 'mana_water',
      earth: 'mana_earth',
      wind: 'mana_wind'
    }

    for (const elem of ['fire', 'water', 'earth', 'wind'] as const) {
      const resourceId = elementMap[elem] as ResourceId
      const resource = resources.getResource(resourceId)
      if (resource) {
        const multiplier = talent.getManaCapacityMultiplier(elem)
        resource.setMax(100 * multiplier)
      }
    }
  }

  get name(): string {
    return this.data.name
  }

  get level(): number {
    return this.data.level
  }

  get experience(): number {
    return this.data.experience
  }

  get talent(): Talent {
    return this.data.talent
  }

  get resourceManager(): ResourceManager {
    return this.data.resourceManager
  }

  get skillManager(): SkillManager {
    return this.data.skillManager
  }

  get spellManager(): SpellManager {
    return this.data.spellManager
  }

  get achievementManager(): AchievementManager {
    return this.data.achievementManager
  }

  get inventory(): Inventory {
    return this.data.inventory
  }

  get simpleClassManager(): any {
    return this.data.simpleClassManager
  }

  get classManager(): ClassManager {
    return this.data.classManager
  }

  addExperience(amount: number) {
    this.data.experience += amount
    const required = this.getExperienceRequiredForNextLevel()
    if (this.data.experience >= required) {
      this.levelUp()
    }
  }

  getExperienceRequiredForNextLevel(): number {
    return Math.floor(100 * Math.pow(1.5, this.data.level - 1))
  }

  levelUp() {
    const oldLevel = this.data.level
    this.data.level += 1
    this.data.experience = 0
    logSystem.success(`${this.data.name} 升级到等级 ${this.data.level}!`, { oldLevel, newLevel: this.data.level })
    
    // Track achievement progress
    if (this.data.achievementManager) {
      this.data.achievementManager.updateAchievementProgress('level_10', this.data.level)
    }
  }

  update(deltaSeconds: number) {
    this.data.resourceManager.update(deltaSeconds)
    this.data.spellManager.update(deltaSeconds)

    // 应用职业效果
    this.applyClassEffects()

    // 应用技能提供的魔力恢复加成
    this.applySkillManaRegen(deltaSeconds)
  }

  private applyClassEffects() {
    if (!this.data.classManager || !this.data.skillManager) return

    const unlockedSkills = this.data.classManager.getUnlockedSkills()
    const skillMaxBonuses = this.data.classManager.getSkillMaxBonuses()

    // 解锁技能
    for (const skillId of unlockedSkills) {
      if (!this.data.skillManager.skills.has(skillId)) {
        const definition = this.data.skillManager.skillDefinitions.get(skillId)
        if (definition) {
          this.data.skillManager.unlockSkill(skillId, this.data.talent.data)
        }
      }
    }

    // 应用技能上限加成
    for (const [skillId, bonus] of skillMaxBonuses.entries()) {
      const skill = this.data.skillManager.getSkill(skillId)
      if (skill) {
        const newMax = skill.data.maxLevel + bonus
        skill.data.maxLevel = Math.max(newMax, skill.currentLevel)
      }
    }

    // 应用其他职业效果（法力上限、法力恢复、法术强度等）
    const classEffects = this.data.classManager.getClassEffects()
    for (const effect of classEffects) {
      switch (effect.type) {
        case 'mana_capacity':
          const manaResources = ['mana_fire', 'mana_water', 'mana_earth', 'mana_wind'] as const
          for (const resourceId of manaResources) {
            const resource = this.data.resourceManager.getResource(resourceId)
            if (resource) {
              resource.setMax(100 * this.data.talent.getManaCapacityMultiplier(
                resourceId.replace('mana_', '') as any
              ) + effect.value)
            }
          }
          break
        case 'mana_regen':
          // 添加到玩家属性中，用于技能计算
          this.getSkillStats()
          break
      }
    }
  }

  private applySkillManaRegen(deltaSeconds: number) {
    if (!this.data.skillManager || !this.data.resourceManager) return
    
    const stats = this.getSkillStats()
    
    // 通用魔力恢复加成（冥想技能）
    if (stats.manaRegenBonus > 0) {
      const manaResources = ['mana_fire', 'mana_water', 'mana_earth', 'mana_wind'] as const
      for (const resourceId of manaResources) {
        const resource = this.data.resourceManager.getResource(resourceId)
        if (resource) {
          const gain = stats.manaRegenBonus * deltaSeconds
          resource.add(gain)
        }
      }
    }
    
    // 水魔力恢复加成（水流操控技能）
    if (stats.waterManaRegen > 0) {
      const waterResource = this.data.resourceManager.getResource('mana_water')
      if (waterResource) {
        const gain = stats.waterManaRegen * deltaSeconds
        waterResource.add(gain)
      }
    }
  }

  toJSON() {
    return {
      name: this.data.name,
      level: this.data.level,
      experience: this.data.experience,
      talent: this.data.talent.toJSON(),
      resources: this.data.resourceManager.toJSON(),
      skills: this.data.skillManager.toJSON(),
      spells: this.data.spellManager.toJSON(),
      achievements: this.data.achievementManager.toJSON(),
      inventory: this.data.inventory.toJSON(),
      classes: this.data.simpleClassManager.toJSON(),
      classManager: this.data.classManager.toJSON()
    }
  }

  getEquipmentStats() {
    const stats = {
      spellPower: 0,
      elementDamage: {
        fire: 0,
        water: 0,
        earth: 0,
        wind: 0
      },
      manaRegen: 0,
      damageReduction: 0
    }

    const equipment = this.data.inventory.equipment
    const equipmentItems = [equipment.weapon, equipment.armor, equipment.accessory1, equipment.accessory2]
    
    for (const item of equipmentItems) {
      if (!item) continue
      for (const effect of item.effects) {
        switch (effect.type) {
          case 'spell_power':
            stats.spellPower += effect.value
            break
          case 'element_damage':
            if (effect.target && stats.elementDamage.hasOwnProperty(effect.target)) {
              stats.elementDamage[effect.target as keyof typeof stats.elementDamage] += effect.value
            }
            break
          case 'mana_regen':
            stats.manaRegen += effect.value
            break
          case 'damage_reduction':
            stats.damageReduction += effect.value
            break
        }
      }
    }
    
    return stats
  }

  getSkillStats() {
    const stats = {
      // 基础属性
      spellPower: 0,
      elementDamage: {
        fire: 0,
        water: 0,
        earth: 0,
        wind: 0
      },
      manaRegen: 0,
      damageReduction: 0,
      // 技能特有属性
      spellCastSpeed: 0,
      cooldownReduction: 0,
      // 元素属性
      fireSpellPower: 0,
      fireManaCapacity: 0,
      fireManaEfficiency: 0,
      fireDamageReduction: 0,
      waterHealingPower: 0,
      waterEffectDuration: 0,
      waterCastSpeed: 0,
      waterManaRegen: 0,
      earthDefense: 0,
      earthDurability: 0,
      physicalDefense: 0,
      windSpeed: 0,
      windEvasion: 0,
      // 通用属性
      manaRegenBonus: 0
    }

    if (!this.data.skillManager) return stats
    
    const skills = this.data.skillManager.getAllSkills()
    for (const skill of skills) {
      // 遍历技能的所有效果类型
      for (const effect of skill.effects) {
        const effectValue = skill.getEffectValue(effect.type)
        switch (effect.type) {
          // 基础属性映射
          case 'manaRegenBonus':
            stats.manaRegenBonus += effectValue
            stats.manaRegen += effectValue  // 也加到总manaRegen
            break
          case 'spellCastSpeed':
            stats.spellCastSpeed += effectValue
            break
          case 'cooldownReduction':
            stats.cooldownReduction += effectValue
            break
          // 火元素
          case 'fireSpellPower':
          case 'fireSpellDamage':
            stats.fireSpellPower += effectValue
            stats.elementDamage.fire += effectValue
            break
          case 'fireManaCapacity':
            stats.fireManaCapacity += effectValue
            break
          case 'fireManaEfficiency':
            stats.fireManaEfficiency += effectValue
            break
          case 'fireDamageReduction':
            stats.fireDamageReduction += effectValue
            stats.damageReduction += effectValue
            break
          // 水元素
          case 'waterSpellPower':
            stats.elementDamage.water += effectValue
            break
          case 'waterHealingPower':
            stats.waterHealingPower += effectValue
            break
          case 'waterEffectDuration':
            stats.waterEffectDuration += effectValue
            break
          case 'waterCastSpeed':
            stats.waterCastSpeed += effectValue
            break
          case 'waterManaRegen':
            stats.waterManaRegen += effectValue
            stats.manaRegen += effectValue
            break
          case 'waterManaCapacity':
            // 需要单独处理资源容量
            break
          // 土元素
          case 'earthSpellPower':
            stats.elementDamage.earth += effectValue
            break
          case 'earthDefense':
            stats.earthDefense += effectValue
            break
          case 'earthDurability':
            stats.earthDurability += effectValue
            break
          case 'physicalDefense':
            stats.physicalDefense += effectValue
            stats.damageReduction += effectValue
            break
          // 风元素
          case 'windSpellPower':
            stats.elementDamage.wind += effectValue
            break
          case 'windSpeed':
            stats.windSpeed += effectValue
            break
          case 'windEvasion':
            stats.windEvasion += effectValue
            break
        }
      }
    }
    
    return stats
  }

  getTotalStats() {
    const equipmentStats = this.getEquipmentStats()
    const skillStats = this.getSkillStats()
    
    return {
      spellPower: equipmentStats.spellPower + skillStats.spellPower,
      elementDamage: {
        fire: equipmentStats.elementDamage.fire + skillStats.elementDamage.fire,
        water: equipmentStats.elementDamage.water + skillStats.elementDamage.water,
        earth: equipmentStats.elementDamage.earth + skillStats.elementDamage.earth,
        wind: equipmentStats.elementDamage.wind + skillStats.elementDamage.wind
      },
      manaRegen: equipmentStats.manaRegen + skillStats.manaRegen,
      damageReduction: equipmentStats.damageReduction + skillStats.damageReduction,
      // 技能特有属性（仅来自技能）
      spellCastSpeed: skillStats.spellCastSpeed,
      cooldownReduction: skillStats.cooldownReduction,
      fireSpellPower: skillStats.fireSpellPower,
      fireManaCapacity: skillStats.fireManaCapacity,
      fireManaEfficiency: skillStats.fireManaEfficiency,
      fireDamageReduction: skillStats.fireDamageReduction,
      waterHealingPower: skillStats.waterHealingPower,
      waterEffectDuration: skillStats.waterEffectDuration,
      waterCastSpeed: skillStats.waterCastSpeed,
      waterManaRegen: skillStats.waterManaRegen,
      earthDefense: skillStats.earthDefense,
      earthDurability: skillStats.earthDurability,
      physicalDefense: skillStats.physicalDefense,
      windSpeed: skillStats.windSpeed,
      windEvasion: skillStats.windEvasion,
      manaRegenBonus: skillStats.manaRegenBonus
    }
  }

  static fromJSON(data: any, skillDefinitions?: any[], spellDefinitions?: any[], achievementDefinitions?: any[], itemManager?: any): Player {
    const player = new Player(data.name)
    player.data.level = data.level || 1
    player.data.experience = data.experience || 0
    player.data.talent = Talent.fromJSON(data.talent || {})
    player.data.resourceManager = ResourceManager.fromJSON(data.resources || {})

    if (data.achievements && achievementDefinitions) {
      player.data.achievementManager = AchievementManager.fromJSON(data.achievements, achievementDefinitions)
    }

    if (data.skills && skillDefinitions) {
      player.data.skillManager = SkillManager.fromJSON(data.skills, skillDefinitions)
      // Update skill manager's achievement manager reference
      player.data.skillManager.achievementManager = player.data.achievementManager
    }

    if (data.spells && spellDefinitions) {
      player.data.spellManager = SpellManager.fromJSON(data.spells, spellDefinitions)
      // Update spell manager's achievement manager reference
      player.data.spellManager.achievementManager = player.data.achievementManager
    }

    // Load inventory if data exists
    if (data.inventory && itemManager) {
      player.data.inventory = Inventory.fromJSON(data.inventory, itemManager)
    }

    player.applyTalentBonuses()

    if (data.classes) {
      if (player.data.simpleClassManager) {
        const loadedManager = player.data.simpleClassManager.constructor()
        if (loadedManager.fromJSON) {
          player.data.simpleClassManager = loadedManager.fromJSON(data.classes)
        }
      }
    }

    if (data.classManager) {
      player.data.classManager = ClassManager.fromJSON(data.classManager)
      const classTree = createDefaultClassTree()
      markRaw(classTree)
      player.data.classManager.setClassTree(classTree)
    }

    return player
  }
}