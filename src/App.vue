<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useGame } from './core/useGame'
import { saveSystem } from './core'
import { ref } from 'vue'

const { t, locale } = useI18n()
const game = useGame()

const languages = [
  { code: 'en-US', label: 'English' },
  { code: 'zh-CN', label: '中文' }
]

const activeMenu = ref('overview')
const menuItems = [
  { id: 'overview', icon: '📊', label: t('menu.overview') },
  { id: 'resources', icon: '💰', label: t('menu.resources') },
  { id: 'magic', icon: '✨', label: t('menu.magic') },
  { id: 'research', icon: '🔬', label: t('menu.research') },
  { id: 'settings', icon: '⚙️', label: t('menu.settings') }
]

function handleSave() {
  saveSystem.saveToLocalStorage()
  alert('Game saved!')
}

function handleLoad() {
  if (saveSystem.loadFromLocalStorage()) {
    alert('Game loaded!')
  } else {
    alert('No save found')
  }
}

function handleExport() {
  const data = saveSystem.exportSave()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rise_of_the_spellbinder_save_${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function handleImport(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  const file = input.files[0]
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    if (saveSystem.importSave(result)) {
      alert('Save imported successfully!')
    } else {
      alert('Failed to import save')
    }
  }
  reader.readAsText(file)
  input.value = ''
}
</script>

<template>
  <div class="app-container">
    <!-- Top Bar -->
    <header class="top-bar">
      <div class="top-left">
        <h1 class="game-title">🧙 {{ t('app.title') }}</h1>
        <div class="game-time">
          ⏱️ {{ Math.floor(game.gameTime) }}s
          <button @click="game.togglePause" class="pause-btn">
            {{ game.isPaused ? '▶️' : '⏸️' }}
          </button>
        </div>
      </div>
      <div class="top-right">
        <select v-model="locale" class="lang-select">
          <option v-for="lang in languages" :key="lang.code" :value="lang.code">
            {{ lang.label }}
          </option>
        </select>
        <div class="save-buttons">
          <button @click="handleSave" class="btn">💾 {{ t('common.save') }}</button>
          <button @click="handleLoad" class="btn">📂 {{ t('common.load') }}</button>
          <button @click="handleExport" class="btn">📤 {{ t('common.export') }}</button>
          <label class="btn import-btn">
            📥 {{ t('common.import') }}
            <input type="file" accept=".json" @change="handleImport" hidden />
          </label>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <div class="main-content">
      <!-- Sidebar -->
      <nav class="sidebar">
        <ul class="menu">
          <li
            v-for="item in menuItems"
            :key="item.id"
            :class="{ active: activeMenu === item.id }"
            @click="activeMenu = item.id"
          >
            <span class="menu-icon">{{ item.icon }}</span>
            <span class="menu-label">{{ item.label }}</span>
          </li>
        </ul>
      </nav>

      <!-- Content Area -->
      <main class="content-area">
        <div class="content-header">
          <h2>{{ menuItems.find(item => item.id === activeMenu)?.label }}</h2>
        </div>
        <div class="content-body">
          <div v-if="activeMenu === 'overview'" class="overview">
            <h3>📈 {{ t('app.title') }}</h3>
            <p>{{ t('app.description') }}</p>
            <div class="stats">
              <div class="stat">
                <div class="stat-label">Game Time</div>
                <div class="stat-value">{{ Math.floor(game.gameTime) }} seconds</div>
              </div>
              <div class="stat">
                <div class="stat-label">Status</div>
                <div class="stat-value">{{ game.isPaused ? '⏸️ Paused' : '▶️ Running' }}</div>
              </div>
              <div class="stat">
                <div class="stat-label">Save Status</div>
                <div class="stat-value">{{ saveSystem.hasSave() ? '💾 Saved' : '📭 No Save' }}</div>
              </div>
            </div>
          </div>
          <div v-else-if="activeMenu === 'resources'" class="resources">
            <h3>💰 Resources</h3>
            <p>Resource management will be implemented in Phase 2.</p>
          </div>
          <div v-else-if="activeMenu === 'magic'" class="magic">
            <h3>✨ Magic</h3>
            <p>Magic system will be implemented in Phase 2.</p>
          </div>
          <div v-else-if="activeMenu === 'research'" class="research">
            <h3>🔬 Research</h3>
            <p>Research system will be implemented in Phase 2.</p>
          </div>
          <div v-else-if="activeMenu === 'settings'" class="settings">
            <h3>⚙️ Settings</h3>
            <p>Game settings will be implemented later.</p>
          </div>
        </div>
      </main>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-content">
        <span>Rise of the Spellbinder v1.0.0</span>
        <span> | </span>
        <span>Game Loop: {{ game.isPaused ? 'Paused' : 'Running' }}</span>
        <span> | </span>
        <span>Auto-save: Every 30s</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #121212;
  color: #e0e0e0;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #1e1e1e;
  border-bottom: 2px solid #333;
}

.top-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.game-title {
  margin: 0;
  font-size: 1.8rem;
  color: #bb86fc;
}

.game-time {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  background: #252525;
  padding: 6px 12px;
  border-radius: 8px;
}

.pause-btn {
  background: transparent;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  color: #e0e0e0;
}

.top-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.lang-select {
  background: #252525;
  color: #e0e0e0;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 0.9rem;
  cursor: pointer;
}

.save-buttons {
  display: flex;
  gap: 8px;
}

.btn {
  background: #3700b3;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 0.9rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: background 0.2s;
}

.btn:hover {
  background: #6200ee;
}

.import-btn {
  position: relative;
  cursor: pointer;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 200px;
  background: #1e1e1e;
  border-right: 1px solid #333;
  padding: 20px 0;
}

.menu {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.menu li:hover {
  background: #252525;
}

.menu li.active {
  background: #3700b3;
  border-right: 3px solid #bb86fc;
}

.menu-icon {
  font-size: 1.2rem;
}

.menu-label {
  font-size: 0.95rem;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  padding: 20px;
  background: #252525;
  border-bottom: 1px solid #333;
}

.content-header h2 {
  margin: 0;
  color: #bb86fc;
}

.content-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.overview h3,
.resources h3,
.magic h3,
.research h3,
.settings h3 {
  margin-top: 0;
  color: #bb86fc;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 20px;
}

.stat {
  background: #1e1e1e;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #333;
}

.stat-label {
  font-size: 0.9rem;
  color: #aaa;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: #e0e0e0;
}

.footer {
  padding: 12px 20px;
  background: #1e1e1e;
  border-top: 1px solid #333;
  text-align: center;
  font-size: 0.9rem;
  color: #888;
}

.footer-content {
  display: flex;
  justify-content: center;
  gap: 10px;
}
</style>