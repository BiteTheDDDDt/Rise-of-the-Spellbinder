import { reactive } from 'vue'
import { Talent } from '../systems/talent'
import { ResourceManager, type ResourceId } from '../systems/resource'
import { SkillManager } from '../systems/skill'
import { SpellManager } from '../systems/spell'
import { AchievementManager } from '../systems/achievement'
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
}

export class Player {
  data: PlayerData

  constructor(name: string, talentPreset?: 'fire' | 'water' | 'earth' | 'wind') {
    const talent = talentPreset ? Talent.createPreset(talentPreset) : new Talent()
    const resourceManager = ResourceManager.createDefault()
    const achievementManager = new AchievementManager()
    const skillManager = new SkillManager(achievementManager)
    const spellManager = new SpellManager(achievementManager)
    
    this.data = reactive({
      name,
      level: 1,
      experience: 0,
      talent,
      resourceManager,
      skillManager,
      spellManager,
      achievementManager
    })

    this.applyTalentBonuses()
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
      achievements: this.data.achievementManager.toJSON()
    }
  }

  static fromJSON(data: any, skillDefinitions?: any[], spellDefinitions?: any[], achievementDefinitions?: any[]): Player {
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
    
    player.applyTalentBonuses()
    return player
  }
}