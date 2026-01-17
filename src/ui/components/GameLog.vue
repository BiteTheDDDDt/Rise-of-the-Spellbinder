<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { logSystem, type LogEntry, type LogType } from '../../systems/log'

const entries = ref<LogEntry[]>([])
const autoScroll = ref(true)

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

// 订阅新日志
const unsubscribe = logSystem.subscribe((entry) => {
  entries.value.unshift(entry)
  if (entries.value.length > 50) {
    entries.value.pop()
  }
  
  // 延迟滚动到底部
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
  <div class="game-log">
    <div class="log-header">
      <h3>📜 游戏日志</h3>
      <div class="log-controls">
        <button @click="loadEntries" class="btn refresh-btn" title="刷新">
          🔄
        </button>
        <button @click="clearLog" class="btn clear-btn" title="清空日志">
          🗑️
        </button>
        <label class="auto-scroll-toggle">
          <input type="checkbox" v-model="autoScroll" class="toggle-input">
          <span class="toggle-slider"></span>
          <span class="toggle-label">自动滚动</span>
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
        暂无日志
      </div>
    </div>

    <div class="log-footer">
      <span class="log-count">{{ entries.length }} 条日志</span>
      <span class="log-hint">最新日志显示在最上面</span>
    </div>
  </div>
</template>

<style scoped>
.game-log {
  background: #1e1e1e;
  border-radius: 8px;
  border: 1px solid #333;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #252525;
  border-bottom: 1px solid #333;
}

.log-header h3 {
  margin: 0;
  color: #bb86fc;
  font-size: 16px;
}

.log-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn {
  background: transparent;
  border: 1px solid #444;
  border-radius: 4px;
  color: #aaa;
  cursor: pointer;
  padding: 6px 10px;
  font-size: 14px;
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
  gap: 8px;
  color: #aaa;
  font-size: 13px;
  cursor: pointer;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: relative;
  width: 36px;
  height: 18px;
  background: #333;
  border-radius: 9px;
  transition: background 0.3s;
}

.toggle-slider:before {
  content: "";
  position: absolute;
  width: 14px;
  height: 14px;
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
  transform: translateX(18px);
}

.log-entries {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column-reverse; /* 最新日志在顶部 */
  gap: 8px;
}

.log-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #252525;
  border-radius: 6px;
  border-left: 4px solid #444;
  font-size: 13px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
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
  font-size: 11px;
  font-family: monospace;
  min-width: 48px;
}

.log-type-icon {
  font-size: 12px;
  width: 20px;
  text-align: center;
}

.log-message {
  flex: 1;
  color: #e0e0e0;
  word-break: break-word;
}

.log-details {
  color: #666;
  cursor: help;
  font-size: 12px;
  opacity: 0.7;
}

.log-details:hover {
  opacity: 1;
}

.no-logs {
  color: #666;
  text-align: center;
  padding: 20px;
  font-style: italic;
}

.log-footer {
  display: flex;
  justify-content: space-between;
  padding: 10px 16px;
  background: #252525;
  border-top: 1px solid #333;
  font-size: 12px;
  color: #666;
}
</style>