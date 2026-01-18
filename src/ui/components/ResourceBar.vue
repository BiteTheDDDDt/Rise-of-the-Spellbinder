<script setup lang="ts">
import { computed } from 'vue'
import { useGame } from '../../core/useGame'
import { useI18n } from 'vue-i18n'
import type { ResourceId } from '../../systems/resource'
import Tooltip from './Tooltip.vue'

const game = useGame()
const { t } = useI18n()

const resources = computed(() => {
  const manager = game.resourceManager.value
  if (!manager) return []
  const ids: ResourceId[] = ['gold', 'research', 'mana_fire', 'mana_water', 'mana_earth', 'mana_wind']
  return ids.map(id => manager.getResource(id)).filter((r): r is NonNullable<typeof r> => r !== undefined)
})

function getResourceName(id: ResourceId, fallback: string): string {
  return t(`resource.${id}`, fallback)
}

function getResourceDescription(id: ResourceId): string {
  return t(`resourceDesc.${id}`, '')
}
</script>

<template>
  <div class="resource-bar">
    <Tooltip
      v-for="resource in resources"
      :key="resource.data.id"
      :content="getResourceDescription(resource.data.id)"
      position="bottom"
      :delay="200"
    >
      <div class="resource-item">
        <div class="resource-header">
          <span class="resource-name">{{ getResourceName(resource.data.id, resource.data.name) }}</span>
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