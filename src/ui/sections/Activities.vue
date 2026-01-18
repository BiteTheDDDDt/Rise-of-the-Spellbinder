<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGame } from '../../core/useGame'
import type { ActivityData } from '../../systems/activity'
import Tooltip from '../components/Tooltip.vue'

const game = useGame()
const activities = ref<ActivityData[]>([])

// Load activities data
fetch('/data/activities.json')
  .then(res => res.json())
  .then(data => activities.value = data)

function startActivity(activity: ActivityData) {
  const success = game.activityRunner.value.startActivity(activity)
  if (!success) {
    alert(`无法开始活动: ${activity.name}\n资源不足或成本扣除失败`)
  }
}

function cancelActivity() {
  game.activityRunner.value.cancelCurrentActivity()
}

const currentActivity = computed(() => game.activityRunner.value.getCurrentActivity())
const progressPercent = computed(() => currentActivity.value ? currentActivity.value.progress * 100 : 0)
const remainingTime = computed(() => game.activityRunner.value.getRemainingTime())
const queue = computed(() => game.activityRunner.value.getQueue())

function getActivityTooltip(activity: ActivityData): string {
  const rewards = activity.rewards.map(r => `+${r.amount} ${r.resource}`).join(', ')
  const costs = activity.costs ? activity.costs.map(c => `-${c.amount} ${c.resource}`).join(', ') : '无消耗'
  return `${activity.description}\n\n奖励: ${rewards}\n消耗: ${costs}`
}
</script>

<template>
  <div class="activities-section">
    <h2 class="section-title">📋 活动</h2>
    
    <!-- Current Activity -->
    <div v-if="currentActivity" class="current-activity">
      <h3>当前活动: {{ currentActivity.activity.name }}</h3>
      <div class="progress-container">
        <div class="progress-bar" :style="{ width: `${progressPercent}%` }"></div>
        <span class="progress-text">{{ progressPercent.toFixed(1) }}%</span>
      </div>
      <p class="activity-desc">{{ currentActivity.activity.description }}</p>
      <p class="remaining-time">剩余时间: {{ remainingTime.toFixed(1) }} 秒</p>
      <button @click="cancelActivity" class="btn cancel-btn">取消活动</button>
    </div>
    <div v-else class="no-activity">
      <p>没有进行中的活动</p>
    </div>

    <!-- Activity Queue -->
    <div v-if="queue.length > 0" class="activity-queue">
      <h4>队列 ({{ queue.length }})</h4>
      <ul class="queue-list">
        <li v-for="item in queue" :key="item.id" class="queue-item">
          <span>{{ item.activity.name }}</span>
          <small>{{ item.activity.duration }} 秒</small>
        </li>
      </ul>
    </div>

    <!-- Available Activities -->
    <div class="available-activities">
      <h3>可用活动</h3>
      <div class="activity-grid">
        <Tooltip v-for="activity in activities" :key="activity.id" :content="getActivityTooltip(activity)" position="top" :delay="200">
          <div class="activity-card">
            <h4 class="activity-name">{{ activity.name }}</h4>
            <p class="activity-desc">{{ activity.description }}</p>
            <div class="activity-meta">
              <span class="duration">⏱️ {{ activity.duration }} 秒</span>
              <div class="rewards">
                <span v-for="reward in activity.rewards" :key="reward.resource" class="reward-tag">
                  +{{ reward.amount }} {{ reward.resource }}
                </span>
              </div>
            </div>
            <button @click="startActivity(activity)" class="btn start-btn">开始</button>
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
  border: 1px solid #333;
}

.section-title {
  margin-top: 0;
  color: #bb86fc;
  border-bottom: 2px solid #333;
  padding-bottom: 10px;
}

.current-activity {
  background: #252525;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.progress-container {
  background: #333;
  height: 24px;
  border-radius: 12px;
  margin: 10px 0;
  position: relative;
  overflow: hidden;
}

.progress-bar {
  background: linear-gradient(90deg, #3700b3, #bb86fc);
  height: 100%;
  border-radius: 12px;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-weight: bold;
  text-shadow: 0 0 3px black;
}

.activity-desc {
  color: #aaa;
  font-size: 0.9rem;
  margin: 8px 0;
}

.remaining-time {
  color: #ff9800;
  font-weight: bold;
}

.no-activity {
  background: #252525;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  color: #888;
  margin-bottom: 20px;
}

.activity-queue {
  background: #252525;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.queue-list {
  list-style: none;
  padding: 0;
  margin: 10px 0 0 0;
}

.queue-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: #1e1e1e;
  margin-bottom: 5px;
  border-radius: 6px;
  border-left: 4px solid #3700b3;
}

.available-activities {
  margin-top: 20px;
}

.activity-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.activity-card {
  background: #252525;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #333;
  transition: transform 0.2s, border-color 0.2s;
}

.activity-card:hover {
  transform: translateY(-2px);
  border-color: #bb86fc;
}

.activity-name {
  margin-top: 0;
  color: #e0e0e0;
  font-size: 1.1rem;
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
}

.rewards {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.reward-tag {
  background: #3700b3;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.8rem;
}

.btn {
  background: #3700b3;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
  width: 100%;
  margin-top: 10px;
}

.btn:hover {
  background: #6200ee;
}

.cancel-btn {
  background: #b00020;
}

.cancel-btn:hover {
  background: #d32f2f;
}

.start-btn {
  background: #00796b;
}

.start-btn:hover {
  background: #009688;
}
</style>