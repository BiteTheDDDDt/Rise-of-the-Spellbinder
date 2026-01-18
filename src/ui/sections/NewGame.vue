<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { gameState, saveSystem } from '../../core'
import { Player } from '../../entities/player'
import { ActivityRunner } from '../../systems/activity'
import type { Element } from '../../systems/talent'

const step = ref(1) // 1: 名称输入, 2: 元素选择, 3: 确认
const characterName = ref('')
const selectedOrigin = ref<Element>('fire')
const spellDefinitions = ref<any[]>([])

const elements: Element[] = ['fire', 'water', 'earth', 'wind']

const origins: { id: Element, name: string, icon: string, color: string }[] = [
  { id: 'fire', name: '火国', icon: '🔥', color: '#ff5722' },
  { id: 'water', name: '水国', icon: '💧', color: '#2196f3' },
  { id: 'earth', name: '土国', icon: '⛰️', color: '#795548' },
  { id: 'wind', name: '风国', icon: '🌪️', color: '#4caf50' }
]

const originDescriptions: Record<Element, string> = {
  fire: '火国居民天生具有强大的火焰亲和力，擅长攻击性法术和能量操控。',
  water: '水国居民掌握水流与治愈之力，善于恢复和防御魔法。',
  earth: '土国居民与大地的联系深厚，精通防御和召唤法术。',
  wind: '风国居民敏捷且自由，擅长速度和辅助性魔法。'
}

const talentPresets: Record<Element, Record<Element, number>> = {
  fire: { fire: 70, water: 20, earth: 25, wind: 30 },
  water: { fire: 25, water: 70, earth: 30, wind: 20 },
  earth: { fire: 20, water: 30, earth: 70, wind: 25 },
  wind: { fire: 30, water: 25, earth: 20, wind: 70 }
}

const initialSpells: Record<Element, string[]> = {
  fire: ['spark', 'flame_burst'],
  water: ['water_bolt', 'healing_drop'],
  earth: ['stone_skin', 'rock_throw'],
  wind: ['gust', 'swift_wind']
}

// 加载法术定义
onMounted(async () => {
  try {
    const basePath = import.meta.env.BASE_URL || '/'
    const response = await fetch(`${basePath}data/spells.json`)
    const data = await response.json()
    spellDefinitions.value = data.spells || []
  } catch (error) {
    console.error('Failed to load spells:', error)
  }
})

const currentOrigin = computed(() => origins.find(o => o.id === selectedOrigin.value))
const currentTalent = computed(() => talentPresets[selectedOrigin.value])
const currentSpells = computed(() => {
  const spellIds = initialSpells[selectedOrigin.value]
  return spellIds.map(id => spellDefinitions.value.find(spell => spell.id === id)).filter(Boolean)
})

function nextStep() {
  if (step.value < 3) step.value++
}

function prevStep() {
  if (step.value > 1) step.value--
}

function createCharacter() {
  if (!characterName.value.trim()) {
    alert('请输入角色名称')
    return
  }

  // 创建新玩家
  const newPlayer = new Player(characterName.value, selectedOrigin.value)
  gameState.data.player = newPlayer
  gameState.data.gameTime = 0
  gameState.data.isPaused = false
  gameState.data.lastUpdate = Date.now()
  gameState.data.hasStarted = true

  // 重置 activityRunner
  gameState.data.activityRunner = new ActivityRunner(
    newPlayer.achievementManager,
    newPlayer.resourceManager
  )

  // 重新连接活动回调
  gameState.reconnectActivityCallbacks()

  // 自动学习初始法术
  const spellIds = initialSpells[selectedOrigin.value]
  for (const spellId of spellIds) {
    const allSkills = newPlayer.skillManager.getAllSkills()
    newPlayer.spellManager.learnSpell(
      spellId,
      newPlayer.talent.data,
      new Map(allSkills.map(skill => [skill.id, { currentLevel: skill.currentLevel }]))
    )
  }

  // 删除旧存档
  saveSystem.deleteSave()

  // 触发游戏开始事件
  console.log(`新角色创建: ${characterName.value} (${selectedOrigin.value})`)
  // 可以在这里触发日志事件

  // 返回到主界面（需要父组件处理）
  emit('created')
}

// 辅助方法避免模板类型错误
function getTalentValue(origin: Element, element: string): number {
  return talentPresets[origin][element as Element]
}

const emit = defineEmits<{
  created: []
}>()
</script>

<template>
  <div class="new-game-section">
    <h2 class="section-title">🧙 新游戏</h2>

    <!-- 进度指示器 -->
    <div class="step-indicator">
      <div class="step" :class="{ active: step >= 1 }">
        <span class="step-number">1</span>
        <span class="step-label">角色名称</span>
      </div>
      <div class="step-line"></div>
      <div class="step" :class="{ active: step >= 2 }">
        <span class="step-number">2</span>
        <span class="step-label">元素出身</span>
      </div>
      <div class="step-line"></div>
      <div class="step" :class="{ active: step >= 3 }">
        <span class="step-number">3</span>
        <span class="step-label">确认创建</span>
      </div>
    </div>

    <!-- 步骤内容 -->
    <div class="step-content">
      <!-- 步骤1: 名称输入 -->
      <div v-if="step === 1" class="step-panel">
        <h3>输入角色名称</h3>
        <div class="input-group">
          <label for="character-name">角色名称:</label>
          <input
            id="character-name"
            type="text"
            v-model="characterName"
            placeholder="请输入你的角色名"
            maxlength="20"
            class="name-input"
          />
          <p class="hint">名称将用于游戏内显示和存档。</p>
        </div>
        <div class="button-group">
          <button @click="nextStep" :disabled="!characterName.trim()" class="btn next-btn">
            下一步 →
          </button>
        </div>
      </div>

      <!-- 步骤2: 元素选择 -->
      <div v-if="step === 2" class="step-panel">
        <h3>选择元素出身</h3>
        <p class="section-description">选择你的魔法亲和力，这将影响你的天赋和初始法术。</p>
        
        <!-- 元素选择卡片 -->
        <div class="origin-grid">
          <div
            v-for="origin in origins"
            :key="origin.id"
            class="origin-card"
            :class="{ selected: selectedOrigin === origin.id }"
            @click="selectedOrigin = origin.id"
            :style="{ borderColor: origin.color }"
          >
            <div class="origin-icon" :style="{ color: origin.color }">
              {{ origin.icon }}
            </div>
            <h4 class="origin-name">{{ origin.name }}</h4>
            <p class="origin-desc">{{ originDescriptions[origin.id] }}</p>
            
            <!-- 天赋分布 -->
            <div class="talent-distribution">
              <div class="talent-bar" v-for="elem in elements" :key="elem">
                <span class="talent-label">
                  {{ 
                    elem === 'fire' ? '🔥' :
                    elem === 'water' ? '💧' :
                    elem === 'earth' ? '⛰️' :
                    '🌪️'
                  }}
                </span>
                <div class="talent-bar-bg">
                  <div
                    class="talent-bar-fill"
                    :style="{
                      width: `${getTalentValue(origin.id, elem)}%`,
                      backgroundColor: origin.color
                    }"
                  ></div>
                </div>
                <span class="talent-value">{{ getTalentValue(origin.id, elem) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 选定元素的详细信息 -->
        <div class="origin-detail">
          <h4>{{ currentOrigin?.name }} 详情</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <div class="detail-label">天赋分布</div>
              <div class="talent-chart">
                <div
                  v-for="elem in elements"
                  :key="elem"
                  class="talent-item"
                >
                  <span class="talent-elem-icon">
                    {{ 
                      elem === 'fire' ? '🔥' :
                      elem === 'water' ? '💧' :
                      elem === 'earth' ? '⛰️' :
                      '🌪️'
                    }}
                  </span>
                  <div class="talent-item-bar">
                    <div
                      class="talent-item-fill"
                      :style="{ width: `${getTalentValue(selectedOrigin, elem)}%` }"
                    ></div>
                  </div>
                  <span class="talent-item-value">{{ getTalentValue(selectedOrigin, elem) }}</span>
                </div>
              </div>
            </div>
            <div class="detail-item">
              <div class="detail-label">初始法术</div>
              <div class="spell-list">
                <div v-for="spell in currentSpells" :key="spell.id" class="spell-item">
                  <span class="spell-icon">✨</span>
                  <div class="spell-info">
                    <div class="spell-name">{{ spell.name }}</div>
                    <div class="spell-desc">{{ spell.description }}</div>
                  </div>
                </div>
                <div v-if="currentSpells.length === 0" class="no-spells">
                  加载法术数据中...
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="button-group">
          <button @click="prevStep" class="btn prev-btn">← 上一步</button>
          <button @click="nextStep" class="btn next-btn">下一步 →</button>
        </div>
      </div>

      <!-- 步骤3: 确认创建 -->
      <div v-if="step === 3" class="step-panel">
        <h3>确认创建角色</h3>
        <div class="summary">
          <div class="summary-item">
            <span class="summary-label">角色名称:</span>
            <span class="summary-value">{{ characterName }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">元素出身:</span>
            <span class="summary-value">
              {{ currentOrigin?.icon }} {{ currentOrigin?.name }}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">初始天赋:</span>
            <div class="talent-summary">
              <span v-for="elem in elements" :key="elem" class="talent-tag">
                {{ 
                  elem === 'fire' ? '🔥' :
                  elem === 'water' ? '💧' :
                  elem === 'earth' ? '⛰️' :
                  '🌪️'
                }}
                {{ currentTalent[elem] }}
              </span>
            </div>
          </div>
          <div class="summary-item">
            <span class="summary-label">初始法术:</span>
            <div class="spell-summary">
              <div v-for="spell in currentSpells" :key="spell.id" class="spell-tag">
                ✨ {{ spell.name }}
              </div>
              <div v-if="currentSpells.length === 0" class="no-spells">无</div>
            </div>
          </div>
        </div>

        <div class="warning">
          ⚠️ 创建角色后将开始游戏，当前进度（如有）将被覆盖。
        </div>

        <div class="button-group">
          <button @click="prevStep" class="btn prev-btn">← 上一步</button>
          <button @click="createCharacter" class="btn create-btn">🎮 开始游戏</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.new-game-section {
  padding: 30px;
  background: #1e1e1e;
  border-radius: 12px;
  border: 1px solid #333;
  max-width: 1000px;
  margin: 0 auto;
}

.section-title {
  margin-top: 0;
  color: #bb86fc;
  border-bottom: 2px solid #333;
  padding-bottom: 15px;
  text-align: center;
  font-size: 2rem;
}

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 30px 0;
  gap: 10px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100px;
  opacity: 0.5;
  transition: opacity 0.3s;
}

.step.active {
  opacity: 1;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #252525;
  border: 2px solid #444;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.step.active .step-number {
  background: #3700b3;
  border-color: #bb86fc;
  color: white;
}

.step-label {
  font-size: 14px;
  color: #aaa;
  text-align: center;
}

.step-line {
  flex: 1;
  height: 2px;
  background: #333;
  max-width: 100px;
}

.step-content {
  margin-top: 30px;
}

.step-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.step-panel h3 {
  color: #03dac6;
  margin-bottom: 20px;
  text-align: center;
  font-size: 1.5rem;
}

.section-description {
  text-align: center;
  color: #aaa;
  margin-bottom: 30px;
  font-size: 15px;
}

.input-group {
  max-width: 400px;
  margin: 0 auto 30px;
}

.input-group label {
  display: block;
  margin-bottom: 10px;
  color: #fff;
  font-size: 16px;
}

.name-input {
  width: 100%;
  padding: 12px 16px;
  background: #252525;
  border: 2px solid #444;
  border-radius: 8px;
  color: white;
  font-size: 16px;
  transition: border-color 0.2s;
}

.name-input:focus {
  outline: none;
  border-color: #bb86fc;
}

.hint {
  margin-top: 8px;
  color: #666;
  font-size: 14px;
}

.origin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.origin-card {
  background: #252525;
  border-radius: 10px;
  padding: 20px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.3s;
}

.origin-card:hover {
  transform: translateY(-5px);
  background: #2a2a2a;
}

.origin-card.selected {
  border-color: #bb86fc;
  background: #2a2a2a;
}

.origin-icon {
  font-size: 40px;
  text-align: center;
  margin-bottom: 15px;
}

.origin-name {
  text-align: center;
  color: #fff;
  margin: 0 0 10px 0;
  font-size: 18px;
}

.origin-desc {
  color: #aaa;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 20px;
  text-align: center;
}

.talent-distribution {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.talent-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.talent-label {
  font-size: 20px;
  width: 30px;
}

.talent-bar-bg {
  flex: 1;
  height: 12px;
  background: #333;
  border-radius: 6px;
  overflow: hidden;
}

.talent-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s;
}

.talent-value {
  width: 30px;
  text-align: right;
  color: #fff;
  font-weight: bold;
  font-size: 14px;
}

.origin-detail {
  background: #252525;
  border-radius: 10px;
  padding: 25px;
  border: 1px solid #333;
  margin-bottom: 30px;
}

.origin-detail h4 {
  color: #03dac6;
  margin: 0 0 20px 0;
  font-size: 18px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.detail-item {
  display: flex;
  flex-direction: column;
}

.detail-label {
  color: #fff;
  font-weight: bold;
  margin-bottom: 15px;
  font-size: 16px;
}

.talent-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.talent-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.talent-elem-icon {
  font-size: 20px;
  width: 30px;
}

.talent-item-bar {
  flex: 1;
  height: 10px;
  background: #333;
  border-radius: 5px;
  overflow: hidden;
}

.talent-item-fill {
  height: 100%;
  background: linear-gradient(90deg, #bb86fc, #3700b3);
  border-radius: 5px;
}

.talent-item-value {
  width: 30px;
  text-align: right;
  color: #fff;
  font-weight: bold;
  font-size: 14px;
}

.spell-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.spell-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #333;
  border-radius: 8px;
}

.spell-icon {
  font-size: 24px;
  color: #bb86fc;
}

.spell-info {
  flex: 1;
}

.spell-name {
  color: #fff;
  font-weight: bold;
  margin-bottom: 4px;
}

.spell-desc {
  color: #aaa;
  font-size: 13px;
  line-height: 1.3;
}

.no-spells {
  color: #666;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

.summary {
  background: #252525;
  border-radius: 10px;
  padding: 25px;
  border: 1px solid #333;
  margin-bottom: 30px;
}

.summary-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 20px;
}

.summary-label {
  width: 120px;
  color: #fff;
  font-weight: bold;
  font-size: 16px;
}

.summary-value {
  flex: 1;
  color: #bb86fc;
  font-size: 16px;
}

.talent-summary {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.talent-tag {
  background: #333;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
}

.spell-summary {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.spell-tag {
  background: #3700b3;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 14px;
}

.warning {
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid #ff9800;
  border-radius: 8px;
  padding: 15px;
  color: #ff9800;
  text-align: center;
  margin-bottom: 30px;
  font-size: 15px;
}

.button-group {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 150px;
}

.prev-btn {
  background: #666;
  color: white;
}

.prev-btn:hover {
  background: #777;
}

.next-btn {
  background: #3700b3;
  color: white;
}

.next-btn:hover {
  background: #6200ee;
}

.next-btn:disabled {
  background: #333;
  color: #666;
  cursor: not-allowed;
}

.create-btn {
  background: #4caf50;
  color: white;
  font-size: 18px;
  padding: 15px 30px;
}

.create-btn:hover {
  background: #45a049;
}
</style>