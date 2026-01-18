<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGame } from '../../core/useGame'

const game = useGame()
const selectedClass = ref<any>(null)

const playerGold = computed(() => {
  const gold = game.player.value?.resourceManager.getResource('gold')
  return gold?.value || 0
})

const allClasses = ref<any[]>([])
const unlockedClasses = ref<string[]>([])

function initClasses() {
  if (!game.player.value?.simpleClassManager) return
  const classes = game.player.value.simpleClassManager.getAllClasses()
  allClasses.value = classes
  const unlocked = game.player.value.simpleClassManager.toJSON().unlocked || []
  unlockedClasses.value = unlocked
}

initClasses()

function selectClass(classData: any) {
  selectedClass.value = classData
}

function unlockClass() {
  if (!selectedClass.value || !game.player.value?.simpleClassManager) return

  const gold = playerGold.value
  const cost = selectedClass.value.costs.gold || 0

  const success = game.player.value.simpleClassManager.unlock(selectedClass.value.id, gold)

  if (success && cost > 0) {
    game.player.value.resourceManager.getResource('gold')?.add(-cost)
    allClasses.value = game.player.value.simpleClassManager.getAllClasses()
    unlockedClasses.value = game.player.value.simpleClassManager.toJSON().unlocked || []
  }
}

const canUnlock = computed(() => {
  if (!selectedClass.value) return false
  return playerGold.value >= selectedClass.value.costs.gold
})
</script>

<template>
  <div class="simple-classes">
    <div class="header">
      <h2>职业系统</h2>
      <button @click="initClasses" class="refresh-btn">刷新</button>
    </div>

    <div class="content">
      <div class="class-list">
        <div
          v-for="classData in allClasses"
          :key="classData.id"
          :class="['class-item', { 
            unlocked: unlockedClasses.includes(classData.id),
            selected: selectedClass?.id === classData.id 
          }]"
          @click="selectClass(classData)"
        >
          <div class="class-icon">{{ classData.icon }}</div>
          <div class="class-info">
            <div class="class-name">{{ classData.name }}</div>
            <div class="class-tier">Tier {{ classData.tier }}</div>
          </div>
        </div>
      </div>

      <div class="details" v-if="selectedClass">
        <h3>{{ selectedClass.icon }} {{ selectedClass.name }}</h3>
        <p>{{ selectedClass.description }}</p>

        <div class="section" v-if="selectedClass.costs.gold">
          <h4>需要金币: {{ selectedClass.costs.gold }}</h4>
          <div class="gold-status">
            <span :class="{ enough: playerGold >= selectedClass.costs.gold }">
              当前金币: {{ playerGold }}
            </span>
          </div>
        </div>

        <div class="section">
          <h4>效果</h4>
          <div v-for="(effect, index) in selectedClass.effects" :key="index" class="effect">
            {{ effect.type }}: +{{ effect.value }}
          </div>
        </div>

        <button 
          :disabled="!canUnlock" 
          @click="unlockClass"
          class="unlock-btn"
        >
          解锁
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.simple-classes {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #121212;
  color: #e0e0e0;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header h2 {
  margin: 0;
  color: #bb86fc;
}

.refresh-btn {
  padding: 8px 16px;
  background: #3700b3;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.content {
  display: flex;
  gap: 20px;
  flex: 1;
  overflow: hidden;
}

.class-list {
  flex: 1;
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 8px;
  padding: 10px;
}

.class-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #2a2a2a;
  border: 2px solid #444;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 10px;
}

.class-item:hover {
  border-color: #bb86fc;
  transform: translateX(5px);
}

.class-item.unlocked {
  background: linear-gradient(135deg, #1b5e20, #2a2a2a);
  border-color: #4caf50;
}

.class-item.selected {
  border-color: #bb86fc;
  border-width: 3px;
  box-shadow: 0 0 10px rgba(187, 134, 252, 0.3);
}

.class-icon {
  font-size: 2rem;
}

.class-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.class-name {
  font-size: 1rem;
  font-weight: 600;
}

.class-tier {
  font-size: 0.8rem;
  color: #888;
}

.details {
  width: 350px;
  background: #1e1e1e;
  border-radius: 8px;
  padding: 20px;
  overflow-y: auto;
}

.details h3 {
  margin: 0 0 15px 0;
  color: #bb86fc;
}

.details p {
  color: #b0bec5;
  margin-bottom: 20px;
  line-height: 1.6;
}

.section {
  margin-bottom: 20px;
}

.section h4 {
  margin: 0 0 10px 0;
  color: #bb86fc;
  font-size: 1.1rem;
}

.gold-status {
  margin-top: 10px;
}

.gold-status span {
  padding: 8px 12px;
  border-radius: 6px;
  background: #424242;
}

.gold-status span.enough {
  background: #2e7d32;
  color: #81c784;
}

.effect {
  padding: 8px 12px;
  background: #252525;
  border-radius: 4px;
  margin-bottom: 8px;
}

.unlock-btn {
  width: 100%;
  padding: 12px;
  background: #3700b3;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.unlock-btn:hover:not(:disabled) {
  background: #6200ee;
}

.unlock-btn:disabled {
  background: #424242;
  color: #9e9e9e;
  cursor: not-allowed;
}
</style>
