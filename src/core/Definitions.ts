import { itemManager, type ItemDefinition } from '../systems/item'


export interface SkillDefinition {
  id: string
  name: string
  description: string
  element: string
  maxLevel: number
  unlockCondition?: string
  effects: any[]
}

export interface SpellDefinition {
  id: string
  name: string
  description: string
  element: string
  manaCost: number
  cooldown: number
  unlockCondition?: string
  effects: any[]
}

export interface AchievementDefinition {
  id: string
  name: string
  description: string
  type: string
  category: string
  icon: string
  hidden: boolean
  rewards: any[]
  condition: any
  required: number
}

export interface ShopDefinition {
  id: string
  name: string
  description: string
  itemTypes: string[]
  priceMultiplier: number
  sellMultiplier: number
  refreshInterval: number
  items: Array<{
    itemId: string
    price: number
    stock: number
    maxStock: number
  }>
}

class DefinitionsManager {
  private skillDefinitions: SkillDefinition[] = []
  private spellDefinitions: SpellDefinition[] = []
  private achievementDefinitions: AchievementDefinition[] = []
  private shopDefinitions: ShopDefinition[] = []
  private itemDefinitions: ItemDefinition[] = []
  
  private loaded = false

  async loadAllDefinitions() {
    if (this.loaded) return true
    
    try {
      // Load item definitions first (needed for shops)
      const itemResponse = await fetch('/data/items.json')
      const itemData = await itemResponse.json()
      this.itemDefinitions = itemData.items || []
      itemManager.registerDefinitions(this.itemDefinitions)

      // Load skill definitions
      const skillResponse = await fetch('/data/skills.json')
      const skillData = await skillResponse.json()
      this.skillDefinitions = skillData.skills || []

      // Load spell definitions
      const spellResponse = await fetch('/data/spells.json')
      const spellData = await spellResponse.json()
      this.spellDefinitions = spellData.spells || []

      // Load achievement definitions
      const achievementResponse = await fetch('/data/achievements.json')
      const achievementData = await achievementResponse.json()
      this.achievementDefinitions = achievementData.achievements || []

      // Load shop definitions
      const shopResponse = await fetch('/data/shops.json')
      const shopData = await shopResponse.json()
      this.shopDefinitions = shopData.shops || []

      this.loaded = true
      return true
    } catch (error) {
      console.error('Failed to load definitions:', error)
      return false
    }
  }

  getSkillDefinitions(): SkillDefinition[] {
    return this.skillDefinitions
  }

  getSpellDefinitions(): SpellDefinition[] {
    return this.spellDefinitions
  }

  getAchievementDefinitions(): AchievementDefinition[] {
    return this.achievementDefinitions
  }

  getShopDefinitions(): ShopDefinition[] {
    return this.shopDefinitions
  }

  getItemDefinitions(): ItemDefinition[] {
    return this.itemDefinitions
  }

  isLoaded(): boolean {
    return this.loaded
  }

  // Helper methods for save/load system
  getPlayerLoadData() {
    return {
      skillDefinitions: this.skillDefinitions,
      spellDefinitions: this.spellDefinitions,
      achievementDefinitions: this.achievementDefinitions,
      itemManager: itemManager
    }
  }
}

export const definitionsManager = new DefinitionsManager()