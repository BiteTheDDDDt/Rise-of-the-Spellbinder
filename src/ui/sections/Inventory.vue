<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useGame } from '../../core/useGame'
import type { EquipmentSlot } from '../../entities/item'
import { itemManager } from '../../systems/item'

const game = useGame()
const inventory = computed(() => game.player.value.inventory)
const equipment = computed(() => inventory.value.equipment)
const slots = computed(() => inventory.value.slots)
const selectedSlot = ref<number | null>(null)
const sortMode = ref<'name' | 'type' | 'rarity'>('name')

const itemDefinitions = ref<any[]>([])

// Load item definitions
onMounted(async () => {
  try {
    const basePath = import.meta.env.BASE_URL || '/'
    const response = await fetch(`${basePath}data/items.json`)
    const data = await response.json()
    itemDefinitions.value = data.items || []
    
    // Register item definitions
    itemManager.registerDefinitions(itemDefinitions.value)
  } catch (error) {
    console.error('Failed to load items:', error)
  }
})

const selectedItem = computed(() => {
  if (selectedSlot.value === null) return null
  return slots.value[selectedSlot.value]?.item || null
})

const usedSlots = computed(() => inventory.value.getUsedSlots())
const freeSlots = computed(() => inventory.value.getFreeSlots())

function selectSlot(index: number) {
  selectedSlot.value = index
}

function useItem() {
  if (selectedSlot.value === null) return
  const success = inventory.value.useItem(selectedSlot.value, game.player.value)
  if (success) {
    // Success feedback
    selectedSlot.value = null
  }
}

function equipItem() {
  if (selectedSlot.value === null) return
  const success = inventory.value.equipItem(selectedSlot.value)
  if (success) {
    selectedSlot.value = null
  }
}

function unequipItem(slotType: EquipmentSlot) {
  inventory.value.unequipItem(slotType)
}

function discardItem() {
  if (selectedSlot.value === null) return
  if (confirm('确定要丢弃此物品吗？')) {
    inventory.value.removeItemFromSlot(selectedSlot.value, 1)
    selectedSlot.value = null
  }
}

function sortInventory() {
  switch (sortMode.value) {
    case 'name':
      inventory.value.sortByName()
      break
    case 'type':
      inventory.value.sortByType()
      break
    case 'rarity':
      inventory.value.sortByRarity()
      break
  }
}

const rarityColor: Record<string, string> = {
  common: 'text-gray-500',
  uncommon: 'text-green-500',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-yellow-500'
}

const typeColor: Record<string, string> = {
  consumable: 'text-red-500',
  equipment: 'text-blue-500',
  material: 'text-green-500',
  book: 'text-yellow-500'
}

const slotNames: Record<EquipmentSlot, string> = {
  weapon: '武器',
  armor: '防具',
  accessory1: '饰品1',
  accessory2: '饰品2'
}
</script>

<template>
  <div class="inventory-container">
    <div class="inventory-header">
      <h2>背包</h2>
      <div class="inventory-stats">
        <span>容量: {{ usedSlots }} / {{ inventory.capacity }}</span>
        <div class="sort-controls">
          <span>排序:</span>
          <select v-model="sortMode" @change="sortInventory">
            <option value="name">名称</option>
            <option value="type">类型</option>
            <option value="rarity">稀有度</option>
          </select>
          <button @click="sortInventory">整理</button>
        </div>
      </div>
    </div>

    <div class="inventory-content">
      <div class="inventory-slots">
        <h3>物品栏</h3>
        <div class="slot-grid">
          <div
            v-for="(slot, index) in slots"
            :key="index"
            class="slot"
            :class="{ selected: selectedSlot === index }"
            @click="selectSlot(index)"
          >
            <div class="slot-content">
              <div class="item-name">{{ slot.item.name }}</div>
              <div class="item-quantity" v-if="slot.quantity > 1">x{{ slot.quantity }}</div>
              <div class="item-type" :class="typeColor[slot.item.type]">{{ slot.item.type }}</div>
              <div class="item-rarity" :class="rarityColor[slot.item.rarity]">{{ slot.item.rarity }}</div>
            </div>
          </div>
          <div
            v-for="i in freeSlots"
            :key="'empty-' + i"
            class="slot empty"
          >
            空位
          </div>
        </div>
      </div>

      <div class="inventory-details">
        <div class="item-details" v-if="selectedItem">
          <h3>{{ selectedItem.name }}</h3>
          <div class="item-rarity" :class="rarityColor[selectedItem.rarity]">{{ selectedItem.rarity }}</div>
          <div class="item-type" :class="typeColor[selectedItem.type]">{{ selectedItem.type }}</div>
          <p class="item-description">{{ selectedItem.description }}</p>
          <div class="item-value">价值: {{ selectedItem.value }} 金币</div>
          <div class="item-effects" v-if="selectedItem.effects.length > 0">
            <h4>效果:</h4>
            <ul>
              <li v-for="(effect, idx) in selectedItem.effects" :key="idx">
                {{ effect.type }}: {{ effect.value }}{{ effect.target ? ` (${effect.target})` : '' }}
              </li>
            </ul>
          </div>
          <div class="item-actions">
            <button
              v-if="selectedItem.type === 'consumable' || selectedItem.type === 'book'"
              @click="useItem"
              class="action-btn use"
            >
              使用
            </button>
            <button
              v-if="selectedItem.type === 'equipment'"
              @click="equipItem"
              class="action-btn equip"
            >
              装备
            </button>
            <button
              @click="discardItem"
              class="action-btn discard"
            >
              丢弃
            </button>
          </div>
        </div>
        <div class="no-selection" v-else>
          <p>点击物品查看详情</p>
        </div>

        <div class="equipment-section">
          <h3>装备</h3>
          <div class="equipment-slots">
            <div
              v-for="slotType in ['weapon', 'armor', 'accessory1', 'accessory2'] as EquipmentSlot[]"
              :key="slotType"
              class="equipment-slot"
            >
              <div class="slot-label">{{ slotNames[slotType] }}</div>
              <div class="slot-item" v-if="equipment[slotType]">
                {{ equipment[slotType]!.name }}
                <button @click="unequipItem(slotType)" class="unequip-btn">卸下</button>
              </div>
              <div class="slot-empty" v-else>
                空
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inventory-container {
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
}

.inventory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.inventory-stats {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.sort-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.inventory-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

.slot-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
  margin-top: 1rem;
}

.slot {
  border: 2px solid #ccc;
  border-radius: 4px;
  padding: 0.5rem;
  cursor: pointer;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: #f9f9f9;
}

.slot.selected {
  border-color: #007bff;
  background-color: #e7f1ff;
}

.slot.empty {
  opacity: 0.5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.slot-content {
  text-align: center;
}

.item-name {
  font-weight: bold;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.item-quantity {
  font-size: 0.8rem;
  color: #666;
}

.item-type {
  font-size: 0.7rem;
  text-transform: uppercase;
}

.item-rarity {
  font-size: 0.7rem;
}

.inventory-details {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.item-details {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
}

.item-description {
  margin: 0.5rem 0;
  color: #555;
}

.item-value {
  font-weight: bold;
  color: #888;
  margin: 0.5rem 0;
}

.item-effects ul {
  margin: 0.5rem 0;
  padding-left: 1rem;
}

.item-effects li {
  font-size: 0.9rem;
  color: #444;
}

.item-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.action-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.action-btn.use {
  background-color: #28a745;
  color: white;
}

.action-btn.equip {
  background-color: #007bff;
  color: white;
}

.action-btn.discard {
  background-color: #dc3545;
  color: white;
}

.equipment-section {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
}

.equipment-slots {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  margin-top: 1rem;
}

.equipment-slot {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.5rem;
  background-color: white;
}

.slot-label {
  font-weight: bold;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.slot-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.unequip-btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 2px;
  cursor: pointer;
}
</style>