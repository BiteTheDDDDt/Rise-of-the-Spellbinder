<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGame } from '../../core/useGame'
import type { ActivityData } from '../../systems/activity'
import Tooltip from '../components/Tooltip.vue'

const game = useGame()
const { t } = useI18n()
const activities = ref<ActivityData[]>([])


// Load activities data
onMounted(async () => {
  try {
    const basePath = import.meta.env.BASE_URL || '/'
    const response = await fetch(`${basePath}data/activities.json`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    activities.value = data
  } catch (error) {
    console.error('Failed to load activities:', error)
  }
})

function startActivity(activity: ActivityData) {
  const success = game.activityRunner.value.startActivity(activity)
  if (!success) {
    alert(`${t('common.cannotStart')} ${getActivityName(activity)}\n${t('common.cannotStartDetail')}`)
  }
}

function getActivityName(activity: ActivityData): string {
  if ('name_key' in activity) {
    return t(activity.name_key)
  }
  // 回退到使用活动ID作为翻译键
  return t(`activity.${activity.id}`) || activity.name || ''
}

function getActivityDescription(activity: ActivityData): string {
  if ('description_key' in activity) {
    return t(activity.description_key)
  }
  // 回退到使用活动ID作为翻译键
  return t(`activity.${activity.id}Desc`) || activity.description || ''
}

function getActivityTooltip(activity: ActivityData): string {
  const rewards = activity.rewards.map(r => `+${r.amount} ${r.resource}`).join(', ')
  const costs = activity.costs ? activity.costs.map(c => `-${c.amount} ${c.resource}`).join(', ') : t('common.noCosts')
  return `${getActivityDescription(activity)}\n\n${t('common.reward')}: ${rewards}\n${t('common.cost')}: ${costs}`
}

const isActivityRepeating = (activityId: string) => game.activityRunner.value.repeatingActivities.has(activityId)
const toggleActivityRepeat = (activityId: string) => {
  game.activityRunner.value.toggleRepeat(activityId)
}
</script>

<template>
  <div class="activities-section">
    <h2 class="section-title">📋 活动</h2>

    <!-- Available Activities -->
    <div class="available-activities">
      <h3>{{ t('common.availableActivities') }}</h3>
      <div class="activity-grid">
        <Tooltip v-for="activity in activities" :key="activity.id" :content="getActivityTooltip(activity)" position="top" :delay="200">
          <div class="activity-card">
            <h4 class="activity-name">{{ getActivityName(activity) }}</h4>
            <p class="activity-desc">{{ getActivityDescription(activity) }}</p>
            <div class="activity-meta">
              <span class="duration">⏱️ {{ activity.duration }} {{ t('common.seconds') }}</span>
              <div class="rewards">
                <span v-for="reward in activity.rewards" :key="reward.resource" class="reward-tag">
                  +{{ reward.amount }} {{ reward.resource }}
                </span>
              </div>
            </div>
            <button @click="toggleActivityRepeat(activity.id)" :class="['btn repeat-btn', { active: isActivityRepeating(activity.id) }]">
              {{ isActivityRepeating(activity.id) ? t('ui.cancelRepeat') : t('ui.repeat') }}
            </button>
            <button @click="startActivity(activity)" class="btn start-btn">{{ t('common.start') }}</button>
          </div>
        </Tooltip>
      </div>
    </div>
  </div>
</template>

<style scoped>
.activities-section {
  padding: 20px;
  background: #1e1e1e;
  border-radius: 12px;
  border:1px solid #333;
}

.section-title {
  margin-top: 0;
  color: #bb86fc;
  border-bottom: 2px solid #333;
  padding-bottom: 10px;
}

.available-activities {
  margin-top: 20px;
}

.available-activities h3 {
  color: #e0e0e0;
  font-size: 1.2rem;
  margin-bottom: 15px;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.activity-card {
  background: #252525;
  padding: 20px;
  border-radius: 10px;
  border: 1px solid #333;
  transition: transform 0.2s, border-color 0.2s;
  display: flex;
  flex-direction: column;
}

.activity-card:hover {
  transform: translateY(-3px);
  border-color: #bb86fc;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
}

.activity-name {
  margin: 0 0 10px 0;
  color: #e0e0e0;
  font-size: 1.2rem;
  font-weight: bold;
}

.activity-desc {
  color: #aaa;
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 15px;
  flex: 1;
}

.activity-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 10px 0;
  font-size: 0.9rem;
}

.duration {
  color: #ff9800;
  font-weight: bold;
}

.rewards {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.reward-tag {
  background: #3700b3;
  color: white;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.btn {
  background: #3700b3;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  margin-top: 5px;
}

.btn:hover {
  background: #6200ee;
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn:disabled:hover {
  transform: none;
  background: #3700b3;
}

.repeat-btn {
  background: #444;
  margin-right: 8px;
}

.repeat-btn.active {
  background: #ff9800;
  color: white;
}

.start-btn {
  background: #00796b;
}

.start-btn:hover {
  background: #009688;
}
</style>
