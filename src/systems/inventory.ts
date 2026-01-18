import { reactive } from 'vue'
import { Item, type EquipmentSlot } from '../entities/item'
import { applyItemEffects } from './item'

export interface InventorySlot {
  item: Item
  quantity: number
}

export interface Equipment {
  weapon: Item | null
  armor: Item | null
  accessory1: Item | null
  accessory2: Item | null
  [key: string]: Item | null
}

export class Inventory {
  data: {
    slots: InventorySlot[]
    capacity: number
    equipment: Equipment
  }

  constructor(capacity: number = 20) {
    this.data = reactive({
      slots: [],
      capacity,
      equipment: {
        weapon: null,
        armor: null,
        accessory1: null,
        accessory2: null
      }
    })
  }

  get slots(): InventorySlot[] {
    return this.data.slots
  }

  get capacity(): number {
    return this.data.capacity
  }

  set capacity(value: number) {
    this.data.capacity = value
  }

  get equipment(): Equipment {
    return this.data.equipment
  }

  getUsedSlots(): number {
    return this.data.slots.length
  }

  getFreeSlots(): number {
    return this.capacity - this.getUsedSlots()
  }

  isFull(): boolean {
    return this.getUsedSlots() >= this.capacity
  }

  findItemSlot(itemId: string): number {
    return this.data.slots.findIndex(slot => slot.item.id === itemId)
  }

  findStackableSlot(itemId: string, maxStack: number): number {
    return this.data.slots.findIndex(slot => 
      slot.item.id === itemId && slot.quantity < maxStack
    )
  }

  addItem(item: Item, quantity: number = 1): boolean {
    if (quantity <= 0) return false

    const maxStack = item.maxStack
    let remaining = quantity

    // 尝试堆叠到现有槽位
    while (remaining > 0) {
      const stackableIndex = this.findStackableSlot(item.id, maxStack)
      if (stackableIndex >= 0) {
        const slot = this.data.slots[stackableIndex]!
        const canAdd = maxStack - slot.quantity
        const addAmount = Math.min(remaining, canAdd)
        slot.quantity += addAmount
        remaining -= addAmount
      } else {
        break
      }
    }

    // 创建新槽位
    while (remaining > 0) {
      if (this.isFull()) {
        return false
      }
      const addAmount = Math.min(remaining, maxStack)
      this.data.slots.push({
        item: item.clone(),
        quantity: addAmount
      })
      remaining -= addAmount
    }
    return true
  }

  removeItem(itemId: string, quantity: number = 1): boolean {
    if (quantity <= 0) return false

    let remaining = quantity
    const slotsToRemove: number[] = []

    // 从后向前遍历，方便移除
    for (let i = this.data.slots.length - 1; i >= 0 && remaining > 0; i--) {
       const slot = this.data.slots[i]!
      if (slot.item.id === itemId) {
        if (slot.quantity <= remaining) {
          remaining -= slot.quantity
          slotsToRemove.push(i)
        } else {
          slot.quantity -= remaining
          remaining = 0
        }
      }
    }

    // 移除空槽位
    slotsToRemove.sort((a, b) => b - a)
    for (const index of slotsToRemove) {
      this.data.slots.splice(index, 1)
    }

    return remaining === 0
  }

  getItemQuantity(itemId: string): number {
    let total = 0
    for (const slot of this.data.slots) {
      if (slot.item.id === itemId) {
        total += slot.quantity
      }
    }
    return total
  }

  useItem(slotIndex: number, target: any): boolean {
    if (slotIndex < 0 || slotIndex >= this.data.slots.length) {
      return false
    }

    const slot = this.data.slots[slotIndex]!
    const item = slot.item

    if (item.type === 'consumable') {
      applyItemEffects(item, target)
      this.removeItemFromSlot(slotIndex, 1)
      return true
    } else if (item.type === 'book') {
      applyItemEffects(item, target)
      this.removeItemFromSlot(slotIndex, 1)
      return true
    } else if (item.type === 'equipment') {
      return this.equipItem(slotIndex)
    }

    return false
  }

  equipItem(slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= this.data.slots.length) {
      return false
    }

    const slot = this.data.slots[slotIndex]!
    const item = slot.item

    if (item.type !== 'equipment') {
      return false
    }

    const slotType = item.metadata?.slot as EquipmentSlot
    if (!slotType) {
      return false
    }

    // 先卸下当前装备（如果有）
    const currentEquipped = this.equipment[slotType]
    if (currentEquipped) {
      this.unequipItem(slotType)
    }

    // 装备新物品
    this.equipment[slotType] = item.clone()
    this.removeItemFromSlot(slotIndex, 1)

    return true
  }

  unequipItem(slotType: EquipmentSlot): boolean {
    const equipped = this.equipment[slotType]
    if (!equipped) {
      return false
    }

    // 尝试添加到背包
    if (this.addItem(equipped, 1)) {
      this.equipment[slotType] = null
      return true
    }

    return false
  }

  removeItemFromSlot(slotIndex: number, quantity: number): boolean {
    if (slotIndex < 0 || slotIndex >= this.data.slots.length) {
      return false
    }

    const slot = this.data.slots[slotIndex]!
    if (slot.quantity < quantity) {
      return false
    }

    if (slot.quantity === quantity) {
      this.data.slots.splice(slotIndex, 1)
    } else {
      slot.quantity -= quantity
    }

    return true
  }

  sortByName() {
    this.data.slots.sort((a, b) => a.item.name.localeCompare(b.item.name))
  }

  sortByType() {
    this.data.slots.sort((a, b) => a.item.type.localeCompare(b.item.type))
  }

  sortByRarity() {
    const rarityOrder = {
      common: 0,
      uncommon: 1,
      rare: 2,
      epic: 3,
      legendary: 4
    }
    this.data.slots.sort((a, b) => rarityOrder[a.item.rarity] - rarityOrder[b.item.rarity])
  }

  clear() {
    this.data.slots = []
  }

  getTotalValue(): number {
    let total = 0
    for (const slot of this.data.slots) {
      total += slot.item.value * slot.quantity
    }
    return total
  }

  toJSON() {
    return {
      slots: this.data.slots.map(slot => ({
        itemId: slot.item.id,
        quantity: slot.quantity
      })),
      capacity: this.data.capacity,
      equipment: {
        weapon: this.equipment.weapon?.id || null,
        armor: this.equipment.armor?.id || null,
        accessory1: this.equipment.accessory1?.id || null,
        accessory2: this.equipment.accessory2?.id || null
      }
    }
  }

  static fromJSON(data: any, itemManager: any): Inventory {
    const inventory = new Inventory(data.capacity || 20)
    
    // 加载背包物品
    if (data.slots && Array.isArray(data.slots)) {
      for (const slotData of data.slots) {
        const item = itemManager.createItem(slotData.itemId)
        if (item) {
          inventory.addItem(item, slotData.quantity)
        }
      }
    }

    // 加载装备
    if (data.equipment) {
      const equip = data.equipment
      if (equip.weapon) {
        const item = itemManager.createItem(equip.weapon)
        if (item) {
          inventory.equipment.weapon = item
        }
      }
      if (equip.armor) {
        const item = itemManager.createItem(equip.armor)
        if (item) {
          inventory.equipment.armor = item
        }
      }
      if (equip.accessory1) {
        const item = itemManager.createItem(equip.accessory1)
        if (item) {
          inventory.equipment.accessory1 = item
        }
      }
      if (equip.accessory2) {
        const item = itemManager.createItem(equip.accessory2)
        if (item) {
          inventory.equipment.accessory2 = item
        }
      }
    }

    return inventory
  }
}