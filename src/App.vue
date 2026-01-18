<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useGame } from './core/useGame'
import { saveSystem, definitionsManager } from './core'

import { ref, watch, watchEffect, onMounted } from 'vue'
import ResourceBar from './ui/components/ResourceBar.vue'
import Activities from './ui/sections/Activities.vue'
import Skills from './ui/sections/Skills.vue'
import Spells from './ui/sections/Spells.vue'
import Achievements from './ui/sections/Achievements.vue'
import StartScreen from './ui/sections/StartScreen.vue'
import NewGame from './ui/sections/NewGame.vue'
import Character from './ui/sections/Character.vue'
import Settings from './ui/sections/Settings.vue'
import GameLog from './ui/components/GameLog.vue'
import Explore from './ui/sections/Explore.vue'
import Combat from './ui/sections/Combat.vue'
import Inventory from './ui/sections/Inventory.vue'
import Shop from './ui/sections/Shop.vue'
import { logSystem } from './systems/log'

const { t, locale } = useI18n()
const game = useGame()

const languages = [
  { code: 'en-US', label: 'English' },
  { code: 'zh-CN', label: '中文' }
]

const activeMenu = ref('activities')
const menuItems = ref<Array<{id: string, icon: string, label: string}>>([])
const currentView = ref(game.state.hasStarted ? 'main' : 'start')
const isLoading = ref(true)

// Watch for menu unlocks
watch(menuItems, (newItems, oldItems = []) => {
  const newIds = newItems.map(item => item.id)
  const oldIds = oldItems.map(item => item.id)
  const addedIds = newIds.filter(id => !oldIds.includes(id))
  for (const addedId of addedIds) {
    const addedItem = newItems.find(item => item.id === addedId)
    if (addedItem) {
      logSystem.success(`新菜单已解锁: ${addedItem.label}`, { menuId: addedId })
    }
  }
})

const updateMenuItems = () => {
  const items = [
    { id: 'activities', icon: '⚡', label: '活动' },
    { id: 'skills', icon: '📚', label: '技能' },
    { id: 'spells', icon: '✨', label: '法术' },
    { id: 'explore', icon: '🗺️', label: '探索' },
    { id: 'combat', icon: '⚔️', label: '战斗' },
    { id: 'character', icon: '👤', label: '角色' },
    { id: 'achievements', icon: '🏆', label: '成就' },
    { id: 'inventory', icon: '🎒', label: '背包' },
    { id: 'shop', icon: '🏪', label: '商店' },
    { id: 'settings', icon: '⚙️', label: '设置' }
  ]
  
  // 解锁逻辑
  const unlockedItems = items.filter(item => {
    // 法术页面始终解锁，玩家需要访问它来学习法术
    if (item.id === 'achievements') {
      // 检查是否解锁至少一个成就
      const unlockedAchievements = game.player.value?.achievementManager?.getUnlockedAchievements?.()
      return unlockedAchievements && unlockedAchievements.length > 0
    }
    if (item.id === 'explore') {
      // 检查是否学会任意攻击法术
      const learnedSpells = game.player.value?.spellManager?.getLearnedSpells?.()
      const hasAttackSpell = learnedSpells?.some(spell =>
        spell.data.effects.some(effect => effect.type === 'damage')
      )
      return hasAttackSpell || false
    }
    // 战斗菜单始终解锁（但界面内会检查条件）
    // 默认解锁其他菜单
    return true
  })
  
  menuItems.value = unlockedItems
}

watchEffect(updateMenuItems)

// 加载游戏定义并尝试加载存档
onMounted(async () => {
  try {
    // 禁用自动加载，等待定义加载完成
    saveSystem.disableAutoLoad()
    
    // 加载所有定义
    const loaded = await definitionsManager.loadAllDefinitions()
    if (!loaded) {
      console.error('Failed to load game definitions')
      alert('Failed to load game definitions. Please refresh the page.')
      return
    }
    
    // 定义加载完成后，尝试加载存档
    if (saveSystem.hasSave()) {
      const loadSuccess = saveSystem.loadFromLocalStorage()
      if (!loadSuccess) {
        console.warn('Failed to load save, starting fresh game')
      }
    }
    
    // 重新启用自动加载
    saveSystem.enableAutoLoad()
    
    // 设置加载完成
    isLoading.value = false
  } catch (error) {
    console.error('Failed to initialize game:', error)
    alert('Failed to initialize game. Please refresh the page.')
  }
})

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

  const file = input.files![0] as File
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

function showNewGame() {
  currentView.value = 'new-game'
}

function showMainGame() {
  game.state.hasStarted = true
  currentView.value = 'main'
}

function handleNewGameCreated() {
  showMainGame()
}

// 监视游戏状态，如果hasStarted变为false，则显示开始界面
watch(() => game.state.hasStarted, (hasStarted) => {
  if (!hasStarted && currentView.value !== 'start') {
    currentView.value = 'start'
  }
})
</script>

<template>
  <div class="app-container">
    <!-- 加载界面 -->
    <div v-if="isLoading" class="loading-screen">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <h2>🧙 {{ t('app.title') }}</h2>
        <p>正在加载游戏数据...</p>
      </div>
    </div>
    
    <!-- 开始界面 -->
    <StartScreen
      v-else-if="currentView === 'start'"
      @startNewGame="showNewGame"
      @continueGame="showMainGame"
    />
    
    <!-- 新游戏创建界面 -->
    <NewGame
      v-else-if="currentView === 'new-game'"
      @created="handleNewGameCreated"
    />
    
    <!-- 主游戏界面 -->
    <div v-else-if="currentView === 'main'" class="main-game">
      <!-- Top Bar -->
      <header class="top-bar">
        <div class="top-left">
          <h1 class="game-title">🧙 {{ t('app.title') }}</h1>
          <div class="game-time">
            ⏱️ {{ Math.floor(game.gameTime.value) }}s
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

      <!-- Resource Bar -->
      <ResourceBar />

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
            <div v-if="activeMenu === 'activities'" class="activities">
              <Activities />
            </div>
            <div v-else-if="activeMenu === 'skills'" class="skills">
              <Skills />
            </div>
            <div v-else-if="activeMenu === 'spells'" class="spells">
              <Spells />
            </div>
            <div v-else-if="activeMenu === 'character'" class="character">
              <Character />
            </div>
            <div v-else-if="activeMenu === 'achievements'" class="achievements">
              <Achievements />
            </div>
            <div v-else-if="activeMenu === 'explore'" class="explore">
              <Explore />
            </div>
            <div v-else-if="activeMenu === 'combat'" class="combat">
              <Combat />
            </div>
            <div v-else-if="activeMenu === 'inventory'" class="inventory">
              <Inventory />
            </div>
            <div v-else-if="activeMenu === 'shop'" class="shop">
              <Shop />
            </div>
            <div v-else-if="activeMenu === 'settings'" class="settings">
              <Settings />
            </div>
          </div>
        </main>

        <!-- Game Log Sidebar -->
        <aside class="log-sidebar">
          <GameLog />
        </aside>
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

.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #121212;
  z-index: 9999;
}

.loading-content {
  text-align: center;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #333;
  border-top-color: #bb86fc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-content h2 {
  color: #bb86fc;
  margin: 0 0 10px 0;
  font-size: 2rem;
}

.loading-content p {
  color: #888;
  font-size: 1rem;
  margin: 0;
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
  outline: none;
}

.lang-select:hover {
  background: #333;
  border-color: #666;
}

.lang-select:focus {
  background: #333;
  border-color: #bb86fc;
  box-shadow: 0 0 0 3px rgba(187, 134, 252, 0.3);
}

.lang-select option {
  background: #252525;
  color: #e0e0e0;
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
}

.sidebar {
  width: 200px;
  background: #1e1e1e;
  border-right: 1px solid #333;
  padding: 20px 0;
}

.log-sidebar {
  width: 300px;
  background: #1e1e1e;
  border-left: 1px solid #333;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
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
  overflow-y: auto;
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

.magic-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #333;
}

.magic-tabs {
  display: flex;
  gap: 10px;
}

.tab-btn {
  background: #252525;
  color: #aaa;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #333;
  color: #e0e0e0;
}

.tab-btn.active {
  background: #3700b3;
  color: white;
  border-color: #6200ee;
}

.magic-content {
  margin-top: 20px;
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

.main-game {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>