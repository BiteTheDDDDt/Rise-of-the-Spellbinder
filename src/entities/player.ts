import { reactive } from 'vue'
import { Talent } from '../systems/talent'
import { ResourceManager, type ResourceId } from '../systems/resource'

export interface PlayerData {
  name: string
  level: number
  experience: number
  talent: Talent
  resourceManager: ResourceManager
}

export class Player {
  data: PlayerData

  constructor(name: string, talentPreset?: 'fire' | 'water' | 'earth' | 'wind') {
    const talent = talentPreset ? Talent.createPreset(talentPreset) : new Talent()
    const resourceManager = ResourceManager.createDefault()
    
    this.data = reactive({
      name,
      level: 1,
      experience: 0,
      talent,
      resourceManager
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
    this.data.level += 1
    this.data.experience = 0
    console.log(`${this.data.name} reached level ${this.data.level}!`)
  }

  update(deltaSeconds: number) {
    this.data.resourceManager.update(deltaSeconds)
  }

  toJSON() {
    return {
      name: this.data.name,
      level: this.data.level,
      experience: this.data.experience,
      talent: this.data.talent.toJSON(),
      resources: this.data.resourceManager.toJSON()
    }
  }

  static fromJSON(data: any): Player {
    const player = new Player(data.name)
    player.data.level = data.level || 1
    player.data.experience = data.experience || 0
    player.data.talent = Talent.fromJSON(data.talent || {})
    player.data.resourceManager = ResourceManager.fromJSON(data.resources || {})
    player.applyTalentBonuses()
    return player
  }
}