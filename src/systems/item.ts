import { Item, type ItemType, type ItemRarity, type ItemEffect, type EquipmentSlot } from '../entities/item'
import type { Element } from './talent'

export interface ItemDefinition {
  id: string
  name: string
  description: string
  type: ItemType
  rarity: ItemRarity
  value: number
  maxStack: number
  effects: ItemEffect[]
  metadata?: {
    element?: Element
    slot?: EquipmentSlot
    skillId?: string
    spellId?: string
    restoreAmount?: number
  }
}

export class ItemManager {
  private definitions: Map<string, ItemDefinition>

  constructor() {
    this.definitions = new Map()
  }

  registerDefinition(definition: ItemDefinition) {
    this.definitions.set(definition.id, definition)
  }

  registerDefinitions(definitions: ItemDefinition[]) {
    for (const def of definitions) {
      this.registerDefinition(def)
    }
  }

  getDefinition(id: string): ItemDefinition | undefined {
    return this.definitions.get(id)
  }

  getAllDefinitions(): ItemDefinition[] {
    return Array.from(this.definitions.values())
  }

  createItem(id: string): Item | null {
    const definition = this.getDefinition(id)
    if (!definition) {
      console.warn(`Item definition not found: ${id}`)
      return null
    }
    console.log('[ItemManager] Creating item:', id, definition)
    return new Item(definition)
  }

  getDefinitionsByType(type: ItemType): ItemDefinition[] {
    return this.getAllDefinitions().filter(def => def.type === type)
  }

  getDefinitionsByRarity(rarity: ItemRarity): ItemDefinition[] {
    return this.getAllDefinitions().filter(def => def.rarity === rarity)
  }

  getEquipmentDefinitions(): ItemDefinition[] {
    return this.getAllDefinitions().filter(def => def.type === 'equipment')
  }

  getConsumableDefinitions(): ItemDefinition[] {
    return this.getAllDefinitions().filter(def => def.type === 'consumable')
  }

  getBookDefinitions(): ItemDefinition[] {
    return this.getAllDefinitions().filter(def => def.type === 'book')
  }

  getMaterialDefinitions(): ItemDefinition[] {
    return this.getAllDefinitions().filter(def => def.type === 'material')
  }

  static loadFromJSON(data: any[]): ItemManager {
    const manager = new ItemManager()
    manager.registerDefinitions(data)
    return manager
  }
}

export function applyItemEffects(item: Item, target: any) {
  const effects = item.effects
  for (const effect of effects) {
    applyEffect(effect, target)
  }
}

function applyEffect(effect: ItemEffect, target: any) {
  switch (effect.type) {
    case 'restore_mana':
      const element = effect.target
      if (element && target.resourceManager) {
        const resource = target.resourceManager.getResource(`mana_${element}` as any)
        if (resource) {
          resource.add(effect.value)
        }
      }
      break
    case 'restore_health':
      if (target.resourceManager) {
        const resource = target.resourceManager.getResource('health')
        if (resource) {
          resource.add(effect.value)
        }
      }
      break
    case 'restore_stamina':
      if (target.resourceManager) {
        const resource = target.resourceManager.getResource('stamina')
        if (resource) {
          resource.add(effect.value)
        }
      }
      break
    case 'add_experience':
      if (target.addExperience) {
        target.addExperience(effect.value)
      }
      break
    case 'add_research':
      if (target.resourceManager) {
        const resource = target.resourceManager.getResource('research')
        if (resource) {
          resource.add(effect.value)
        }
      }
      break
    case 'add_gold':
      if (target.resourceManager) {
        const resource = target.resourceManager.getResource('gold')
        if (resource) {
          resource.add(effect.value)
        }
      }
      break
    case 'learn_skill':
      if (target.skillManager && effect.target) {
        target.skillManager.unlockSkill(effect.target)
      }
      break
    case 'learn_spell':
      if (target.spellManager && effect.target) {
        target.spellManager.unlockSpell(effect.target)
      }
      break
    default:
      console.warn(`Unknown item effect type: ${effect.type}`)
  }
}

export const itemManager = new ItemManager()