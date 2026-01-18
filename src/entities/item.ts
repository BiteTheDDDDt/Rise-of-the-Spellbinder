import { reactive } from 'vue'
import type { Element } from '../systems/talent'

export type ItemType = 'consumable' | 'equipment' | 'material' | 'book'
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory1' | 'accessory2'

export interface ItemEffect {
  type: string
  value: number
  target?: string
  formula?: string
}

export interface ItemData {
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

export class Item {
  data: ItemData

  constructor(data: ItemData) {
    this.data = reactive(data)
  }

  get id(): string {
    return this.data.id
  }

  get name(): string {
    return this.data.name
  }

  get description(): string {
    return this.data.description
  }

  get type(): ItemType {
    return this.data.type
  }

  get rarity(): ItemRarity {
    return this.data.rarity
  }

  get value(): number {
    return this.data.value
  }

  get maxStack(): number {
    return this.data.maxStack
  }

  get effects(): ItemEffect[] {
    return this.data.effects
  }

  get metadata(): any {
    return this.data.metadata || {}
  }

  clone(): Item {
    return new Item({
      ...this.data,
      effects: [...this.data.effects]
    })
  }

  toJSON() {
    return {
      id: this.data.id,
      name: this.data.name,
      description: this.data.description,
      type: this.data.type,
      rarity: this.data.rarity,
      value: this.data.value,
      maxStack: this.data.maxStack,
      effects: this.data.effects,
      metadata: this.data.metadata
    }
  }

  static fromJSON(data: any): Item {
    return new Item(data)
  }
}