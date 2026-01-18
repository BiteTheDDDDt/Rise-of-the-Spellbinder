<script setup lang="ts">
import { computed } from 'vue'
import { useGame } from '../../core/useGame'
import type { ResourceId } from '../../systems/resource'
import Tooltip from './Tooltip.vue'

const game = useGame()

const resourceDescriptions: Record<ResourceId, string> = {
  gold: '通用货币，用于购买物品和升级',
  research: '研究点数，用于解锁新技术和法术',
  mana_fire: '火元素魔力，用于施放火系法术',
  mana_water: '水元素魔力，用于施放水系法术',
  mana_earth: '土元素魔力，用于施放土系法术',
  mana_wind: '风元素魔力，用于施放风系法术',
  health: '生命值，归零则死亡',
  stamina: '耐力，用于探索和战斗'
}

const resources = computed(() => {
  const manager = game.resourceManager.value
  if (!manager) return []
  const ids: ResourceId[] = ['gold', 'research', 'mana_fire', 'mana_water', 'mana_earth', 'mana_wind']
  return ids.map(id => manager.getResource(id)).filter((r): r is NonNullable<typeof r> => r !== undefined)
})
</script>

<template>
  <div class="resource-bar">
    <Tooltip
      v-for="resource in resources"
      :key="resource.data.id"
      :content="resourceDescriptions[resource.data.id]"
      position="bottom"
      :delay="200"
    >
      <div class="resource-item">
        <div class="resource-header">
          <span class="resource-name">{{ resource.data.name }}</span>
          <span class="resource-values">
            {{ Math.floor(resource.value) }} / {{ resource.max === Infinity ? '∞' : Math.floor(resource.max) }}
          </span>
        </div>
        <div class="resource-progress" v-if="resource.max !== Infinity">
          <div class="progress-fill" :style="{ width: `${resource.percent}%` }"></div>
        </div>
        <div class="resource-rate">
          <span v-if="resource.ratePerSecond > 0" class="rate-positive">+{{ resource.ratePerSecond.toFixed(1) }}/s</span>
          <span v-else-if="resource.ratePerSecond < 0" class="rate-negative">{{ resource.ratePerSecond.toFixed(1) }}/s</span>
          <span v-else class="rate-neutral">0/s</span>
        </div>
      </div>
    </Tooltip>
  </div>
</template>

<style scoped>
.resource-bar {
  display: flex;
  gap: 15px;
  padding: 12px 20px;
  background: #1e1e1e;
  border-bottom: 2px solid #333;
  flex-wrap: wrap;
}

.resource-item {
  display: flex;
  flex-direction: column;
  min-width: 140px;
  background: #252525;
  padding: 10px 15px;
  border-radius: 8px;
  border: 1px solid #333;
}

.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}

.resource-name {
  font-weight: bold;
  color: #e0e0e0;
  font-size: 0.9rem;
}

.resource-values {
  font-size: 0.85rem;
  color: #bb86fc;
  font-family: monospace;
}

.resource-progress {
  height: 6px;
  background: #333;
  border-radius: 3px;
  overflow: hidden;
  margin: 5px 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3700b3, #bb86fc);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.resource-rate {
  text-align: right;
  font-size: 0.8rem;
  font-family: monospace;
}

.rate-positive {
  color: #4caf50;
}

.rate-negative {
  color: #f44336;
}

.rate-neutral {
  color: #888;
}
</style>