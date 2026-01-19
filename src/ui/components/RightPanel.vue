<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { logSystem, type LogEntry, type LogType } from '../../systems/log'
import { useGame } from '../../core/useGame'
import { useI18n } from 'vue-i18n'

const game = useGame()
const { t } = useI18n()
const entries = ref<LogEntry[]>([])
const autoScroll = ref(true)

const currentActivity = computed(() => game.activityRunner.value.getCurrentActivity())
const progressPercent = computed(() => currentActivity.value ? currentActivity.value.progress * 100 : 0)
const remainingTime = computed(() => game.activityRunner.value.getRemainingTime())
const queue = computed(() => game.activityRunner.value.getQueue())

const typeIcons: Record<LogType, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌'
}

function loadEntries() {
  entries.value = logSystem.getRecent(50)
}

function clearLog() {
  logSystem.clear()
  entries.value = []
}

function scrollToBottom() {
  const container = document.querySelector('.log-entries')
  if (container && autoScroll.value) {
    container.scrollTop = container.scrollHeight
  }
}

function cancelActivity() {
  game.activityRunner.value.cancelCurrentActivity()
}

function cancelQueueItem(index: number) {
  const item = queue.value[index]
  if (item) {
    game.activityRunner.value.cancelFromQueue(index)
  }
}

function getActivityTypeLabel(activity: any): string {
  if (activity.type === 'practice') {
    return activity.name
  } else if (activity.type === 'learning') {
    return activity.name
  } else if (activity.type === 'training') {
    return activity.name
  } else if (activity.type === 'standard') {
    return activity.name
  }
  return activity.name
}

const unsubscribe = logSystem.subscribe((entry) => {
  entries.value.unshift(entry)
  if (entries.value.length > 50) {
    entries.value.pop()
  }
  setTimeout(scrollToBottom, 10)
})

onMounted(() => {
  loadEntries()
  scrollToBottom()
})

onUnmounted(() => {
  unsubscribe()
})
</script>

<template>
  <div class="right-panel">
    <!-- Activity Progress Section -->
    <div class="progress-section">
      <div class="section-header">
        <h3>⏱️ {{ t('common.inProgress') }}</h3>
      </div>
      <div v-if="currentActivity" class="current-activity">
        <div class="activity-header">
          <h4 class="activity-name">{{ getActivityTypeLabel(currentActivity.activity) }}</h4>
          <span class="activity-type">{{ currentActivity.activity.type || t('common.activity') }}</span>
        </div>
        <div class="progress-container">
          <div class="progress-bar" :style="{ width: `${progressPercent}%` }"></div>
          <span class="progress-text">{{ progressPercent.toFixed(1) }}%</span>
        </div>
        <p class="remaining-time">⏳ {{ remainingTime.toFixed(1) }}s</p>
        <button @click="cancelActivity" class="btn cancel-btn">
          {{ t('common.cancel') }}
        </button>
      </div>
      <div v-else class="no-activity">
        <p>💤 {{ t('common.noActivity') }}</p>
      </div>

      <!-- Activity Queue -->
      <div v-if="queue.length > 0" class="activity-queue">
        <h4 class="queue-title">📋 {{ t('common.queue') }} ({{ queue.length }})</h4>
        <ul class="queue-list">
          <li v-for="(item, index) in queue" :key="item.id" class="queue-item">
            <div class="queue-item-content">
              <span class="queue-item-name">{{ getActivityTypeLabel(item.activity) }}</span>
              <small class="queue-item-duration">{{ item.activity.duration }}{{ t('common.seconds') }}</small>
            </div>
            <button @click="cancelQueueItem(index)" class="queue-cancel-btn">✕</button>
          </li>
        </ul>
      </div>
    </div>

    <!-- Game Log Section -->
    <div class="log-section">
      <div class="log-header">
        <h3>📜 {{ t('common.gameLog') }}</h3>
        <div class="log-controls">
          <button @click="loadEntries" class="btn refresh-btn" :title="t('common.refresh')">
            🔄
          </button>
          <button @click="clearLog" class="btn clear-btn" :title="t('common.clearLog')">
            🗑️
          </button>
          <label class="auto-scroll-toggle">
            <input type="checkbox" v-model="autoScroll" class="toggle-input">
            <span class="toggle-slider"></span>
            <span class="toggle-label">{{ t('common.autoScroll') }}</span>
          </label>
        </div>
      </div>
      <div class="log-entries">
        <div 
          v-for="entry in entries" 
          :key="entry.id"
          class="log-entry"
          :class="entry.type"
        >
          <div class="log-time">{{ logSystem.formatTime(entry.timestamp) }}</div>
          <div class="log-type-icon">{{ typeIcons[entry.type] }}</div>
          <div class="log-message">{{ entry.message }}</div>
          <div v-if="entry.details" class="log-details" :title="JSON.stringify(entry.details)">
            🔍
          </div>
        </div>
        <div v-if="entries.length === 0" class="no-logs">
          {{ t('common.noLogs') }}
        </div>
      </div>
      <div class="log-footer">
        <span class="log-count">{{ entries.length }} {{ t('common.logCount') }}</span>
        <span class="log-hint">{{ t('common.logHint') }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.right-panel {
  width: 300px;
  background: #1e1e1e;
  border-left: 1px solid #333;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.progress-section, .log-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: #1e1e1e;
}

.section-header {
  padding: 12px 16px;
  background: #252525;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.section-header h3 {
  margin: 0;
  color: #bb86fc;
  font-size: 14px;
}

.current-activity {
  padding: 15px;
  background: #252525;
  flex-shrink: 0;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.activity-name {
  margin: 0;
  color: #e0e0e0;
  font-size: 1rem;
  flex: 1;
}

.activity-type {
  background: #3700b3;
  color: white;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 0.7rem;
  text-transform: uppercase;
  flex-shrink: 0;
}

.progress-container {
  background: #333;
  height: 24px;
  border-radius: 12px;
  margin: 12px 0;
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
  font-size: 0.8rem;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.remaining-time {
  color: #ff9800;
  font-weight: bold;
  font-size: 0.9rem;
  margin: 10px 0;
}

.no-activity {
  padding: 20px;
  text-align: center;
  color: #888;
  font-size: 0.9rem;
}

.activity-queue {
  margin-top: 10px;
  padding: 0 15px 15px 15px;
  background: #252525;
  flex-shrink: 0;
  overflow-y: auto;
}

.queue-title {
  margin: 0 0 10px 0;
  color: #03dac6;
  font-size: 0.9rem;
}

.queue-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.queue-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #1e1e1e;
  margin-bottom: 6px;
  border-radius: 6px;
  border-left: 4px solid #3700b3;
  transition: transform 0.2s;
}

.queue-item:hover {
  transform: translateX(2px);
}

.queue-item-content {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.queue-item-name {
  color: #e0e0e0;
  font-size: 0.9rem;
}

.queue-item-duration {
  color: #888;
  font-size: 0.75rem;
}

.queue-cancel-btn {
  background: #b00020;
  color: white;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  margin-left: 8px;
  flex-shrink: 0;
}

.queue-cancel-btn:hover {
  background: #d32f2f;
  transform: scale(1.1);
}

.btn {
  background: #3700b3;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 10px;
  width: 100%;
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

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #252525;
  border-bottom: 1px solid #333;
  flex-shrink: 0;
}

.log-header h3 {
  margin: 0;
  color: #bb86fc;
  font-size: 14px;
}

.log-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn {
  background: transparent;
  border: 1px solid #444;
  border-radius: 4px;
  color: #aaa;
  cursor: pointer;
  padding: 6px 10px;
  font-size: 12px;
  transition: all 0.2s;
}

.btn:hover {
  background: #333;
  color: #fff;
}

.refresh-btn:hover {
  border-color: #2196F3;
  color: #2196F3;
}

.clear-btn:hover {
  border-color: #F44336;
  color: #F44336;
}

.auto-scroll-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #aaa;
  font-size: 11px;
  cursor: pointer;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: relative;
  width: 32px;
  height: 16px;
  background: #333;
  border-radius: 8px;
  transition: background 0.3s;
}

.toggle-slider:before {
  content: "";
  position: absolute;
  width: 12px;
  height: 12px;
  left: 2px;
  top: 2px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s;
}

.toggle-input:checked + .toggle-slider {
  background: #4CAF50;
}

.toggle-input:checked + .toggle-slider:before {
  transform: translateX(16px);
}

.log-entries {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column-reverse;
  gap: 6px;
}

.log-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #252525;
  border-radius: 6px;
  border-left: 3px solid #444;
  font-size: 12px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-3px); }
  to { opacity: 1; transform: translateY(0); }
}

.log-entry.info {
  border-left-color: #2196F3;
}

.log-entry.success {
  border-left-color: #4CAF50;
}

.log-entry.warning {
  border-left-color: #FF9800;
}

.log-entry.error {
  border-left-color: #F44336;
}

.log-time {
  color: #666;
  font-size: 10px;
  font-family: monospace;
  min-width: 40px;
  flex-shrink: 0;
}

.log-type-icon {
  font-size: 11px;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.log-message {
  flex: 1;
  color: #e0e0e0;
  word-break: break-word;
  font-size: 12px;
}

.log-details {
  color: #666;
  cursor: help;
  font-size: 11px;
  opacity: 0.7;
  flex-shrink: 0;
}

.log-details:hover {
  opacity: 1;
}

.no-logs {
  color: #666;
  text-align: center;
  padding: 20px;
  font-style: italic;
  font-size: 0.9rem;
}

.log-footer {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  background: #252525;
  border-top: 1px solid #333;
  font-size: 11px;
  color: #666;
  flex-shrink: 0;
}

.log-count, .log-hint {
  color: #666;
}
</style>
