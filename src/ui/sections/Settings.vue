<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useGame } from '../../core/useGame'
import { saveSystem, gameState } from '../../core'
import { setLocale as setI18nLocale } from '../../i18n'
import { ref } from 'vue'

const { locale } = useI18n()
const game = useGame()

const languages = [
  { code: 'en-US', label: 'English' },
  { code: 'zh-CN', label: '中文' }
]

const numberFormats = [
  { id: 'default', label: '1000' },
  { id: 'compact', label: '1K' },
  { id: 'formatted', label: '1,000' }
]

const selectedNumberFormat = ref('default')
const autoSaveEnabled = ref(true)
const autoSaveInterval = ref(30) // 秒

function handleNumberFormatChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const newFormat = target.value as 'default' | 'compact' | 'formatted'
  selectedNumberFormat.value = newFormat
}

function handleSave() {
  saveSystem.saveToLocalStorage()
  alert('游戏已保存！')
}

function handleLoad() {
  if (saveSystem.loadFromLocalStorage()) {
    alert('游戏已加载！')
  } else {
    alert('未找到存档')
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
  
  const file = input.files[0] as File
  const reader = new FileReader()
  reader.onload = (e) => {
    const result = e.target?.result as string
    if (saveSystem.importSave(result)) {
      alert('存档导入成功！')
    } else {
      alert('导入存档失败')
    }
  }
  reader.readAsText(file)
  input.value = ''
}

function handleLanguageChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const newLocale = target.value as 'en-US' | 'zh-CN'
  
  // Only update if value actually changed
  if (newLocale && newLocale !== locale.value) {
    setI18nLocale(newLocale)
    console.log(`Language changed to: ${newLocale}`)
  }
}

function resetGame() {
  if (confirm('确定要重置游戏吗？这将删除所有进度并重新开始。此操作不可撤销。')) {
    gameState.reset()
    alert('游戏已重置')
  }
}
</script>

<template>
  <div class="settings-section">
    <h2 class="section-title">⚙️ 设置</h2>

    <div class="settings-grid">
      <!-- 语言设置 -->
      <div class="settings-card">
        <h3>🌐 语言</h3>
        <div class="setting-item">
          <label for="language-select">界面语言:</label>
          <select id="language-select" :value="locale" @change="handleLanguageChange" class="setting-select">
            <option v-for="lang in languages" :key="lang.code" :value="lang.code">
              {{ lang.label }}
            </option>
          </select>
          <p class="setting-hint">切换游戏界面显示语言。</p>
        </div>
      </div>

      <!-- 显示设置 -->
      <div class="settings-card">
        <h3>📊 显示</h3>
        <div class="setting-item">
          <label for="number-format">数字格式:</label>
          <select id="number-format" :value="selectedNumberFormat" @change="handleNumberFormatChange" class="setting-select">
            <option 
              v-for="format in numberFormats" 
              :key="format.id" 
              :value="format.id"
              :selected="selectedNumberFormat === format.id"
            >
              {{ format.label }}
            </option>
          </select>
          <p class="setting-hint">选择数字显示格式。</p>
        </div>
      </div>

      <!-- 保存设置 -->
      <div class="settings-card">
        <h3>💾 保存设置</h3>
        <div class="setting-item">
          <label class="toggle-switch">
            <input type="checkbox" v-model="autoSaveEnabled" class="toggle-input">
            <span class="toggle-slider"></span>
          </label>
          <div class="toggle-label">
            <strong>自动保存</strong>
            <span>每隔 {{ autoSaveInterval }} 秒自动保存游戏进度</span>
          </div>
        </div>
        <div class="setting-item">
          <label>自动保存间隔:</label>
          <div class="range-container">
            <input 
              type="range" 
              v-model="autoSaveInterval" 
              min="10" 
              max="300" 
              step="10"
              class="range-slider"
            >
            <span class="range-value">{{ autoSaveInterval }} 秒</span>
          </div>
          <p class="setting-hint">设置自动保存的时间间隔。</p>
        </div>
      </div>

      <!-- 存档管理 -->
      <div class="settings-card">
        <h3>📁 存档管理</h3>
        <div class="setting-buttons">
          <button @click="handleSave" class="btn save-btn">
            💾 保存游戏
          </button>
          <button @click="handleLoad" class="btn load-btn">
            📂 加载游戏
          </button>
          <button @click="handleExport" class="btn export-btn">
            📤 导出存档
          </button>
          <label class="btn import-btn">
            📥 导入存档
            <input type="file" accept=".json" @change="handleImport" hidden />
          </label>
        </div>
        <div class="save-info">
          <p v-if="saveSystem.hasSave()" class="has-save">
            ✅ 已有存档
          </p>
          <p v-else class="no-save">
            📭 暂无存档
          </p>
        </div>
      </div>

      <!-- 游戏控制 -->
      <div class="settings-card">
        <h3>🎮 游戏控制</h3>
        <div class="setting-buttons">
          <button @click="game.togglePause" class="btn pause-btn">
            {{ game.isPaused ? '▶️ 继续游戏' : '⏸️ 暂停游戏' }}
          </button>
          <button @click="resetGame" class="btn reset-btn">
            🔄 重置游戏
          </button>
        </div>
        <div class="game-info">
          <p>游戏时间: {{ Math.floor(game.gameTime.value) }} 秒</p>
          <p>游戏状态: {{ game.isPaused ? '⏸️ 暂停' : '▶️ 运行中' }}</p>
          <p>版本: v1.0.0</p>
        </div>
      </div>

      <!-- 关于 -->
      <div class="settings-card">
        <h3>ℹ️ 关于</h3>
        <div class="about-content">
          <p><strong>Rise of the Spellbinder</strong></p>
          <p>一款基于浏览器的时间管理类魔法游戏。</p>
          <p>通过学习和掌握四大元素法术，成为传奇的法术大师。</p>
          <p>游戏进度会自动保存到本地浏览器。</p>
          <p>感谢游玩！</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-section {
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

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.settings-card {
  background: #252525;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid #333;
}

.settings-card h3 {
  color: #03dac6;
  margin: 0 0 15px 0;
  font-size: 18px;
  border-bottom: 1px solid #333;
  padding-bottom: 8px;
}

.setting-item {
  margin-bottom: 20px;
}

.setting-item label {
  display: block;
  color: #fff;
  margin-bottom: 8px;
  font-weight: bold;
}

.setting-select {
  width: 100%;
  padding: 10px 12px;
  background: #333;
  color: white;
  border: 1px solid #444;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  appearance: none;
  outline: none;
}

.setting-select:focus {
  background: #333;
  border-color: #bb86fc;
  box-shadow: 0 0 0 3px rgba(187, 134, 252, 0.3);
}

.setting-select option {
  background: #252525;
  color: #e0e0e0;
  padding: 8px 12px;
}

.setting-select option:checked,
.setting-select option[selected] {
  background: #bb86fc;
  color: white;
  font-weight: bold;
}

.setting-select option:hover {
  background: #444;
}

.setting-hint {
  margin-top: 8px;
  color: #666;
  font-size: 13px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
  margin-right: 15px;
  vertical-align: middle;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #333;
  border-radius: 24px;
  transition: .3s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  border-radius: 50%;
  transition: .3s;
}

.toggle-input:checked + .toggle-slider {
  background-color: #4caf50;
}

.toggle-input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.toggle-label {
  display: inline-block;
  vertical-align: middle;
  max-width: calc(100% - 70px);
}

.toggle-label strong {
  display: block;
  color: #fff;
  margin-bottom: 2px;
}

.toggle-label span {
  color: #aaa;
  font-size: 13px;
}

.range-container {
  display: flex;
  align-items: center;
  gap: 15px;
}

.range-slider {
  flex: 1;
  height: 6px;
  background: #333;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: #bb86fc;
  border-radius: 50%;
  cursor: pointer;
}

.range-value {
  color: #fff;
  font-weight: bold;
  min-width: 50px;
}

.setting-buttons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-bottom: 15px;
}

.btn {
  padding: 10px 15px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.save-btn {
  background: #4caf50;
  color: white;
}

.save-btn:hover {
  background: #45a049;
}

.load-btn {
  background: #2196f3;
  color: white;
}

.load-btn:hover {
  background: #1976d2;
}

.export-btn {
  background: #ff9800;
  color: white;
}

.export-btn:hover {
  background: #f57c00;
}

.import-btn {
  background: #9c27b0;
  color: white;
  cursor: pointer;
  position: relative;
}

.import-btn:hover {
  background: #7b1fa2;
}

.pause-btn {
  background: #ff5722;
  color: white;
}

.pause-btn:hover {
  background: #e64a19;
}

.reset-btn {
  background: #f44336;
  color: white;
}

.reset-btn:hover {
  background: #d32f2f;
}

.save-info, .game-info {
  margin-top: 15px;
  padding: 12px;
  background: #333;
  border-radius: 6px;
  font-size: 14px;
}

.has-save {
  color: #4caf50;
}

.no-save {
  color: #ff9800;
}

.game-info p {
  margin: 5px 0;
  color: #aaa;
}

.about-content {
  color: #aaa;
  line-height: 1.6;
}

.about-content p {
  margin: 8px 0;
}
</style>