<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGame } from '../../core/useGame'
import type { CombatSystem, CombatLogEntry } from '../../systems/combat'
import type { SpellData } from '../../systems/spell'
import type { ResourceId } from '../../systems/resource'

const game = useGame()
const combatSystem = ref<CombatSystem | null>(null)
const isCombatActive = ref(false)
const combatLog = ref<CombatLogEntry[]>([])
const selectedSpell = ref<SpellData | null>(null)

// 检查玩家是否学会攻击法术
const hasAttackSpell = computed(() => {
  if (!game.player.value) return false
  const learnedSpells = game.player.value.spellManager.getLearnedSpells()
  return learnedSpells.some(spell => 
    spell.data.effects.some(effect => effect.type === 'damage')
  )
})

// 玩家学会的法术
const learnedSpells = computed(() => {
  if (!game.player.value) return []
  return game.player.value.spellManager.getLearnedSpells()
    .map(spell => spell.data)
    .filter(spell => {
      const manaKey = `mana_${spell.element}`
      const manaRes = game.resourceManager.value.getResource(manaKey as ResourceId)
      return manaRes && manaRes.value >= spell.manaCost
    })
})

// 玩家状态
const playerHealth = computed(() => {
  const healthRes = game.resourceManager.value.getResource('health')
  return {
    current: healthRes?.value || 100,
    max: healthRes?.max || 100,
    percent: healthRes ? (healthRes.value / healthRes.max) * 100 : 100
  }
})

const playerMana = computed(() => {
  const manaTypes: ResourceId[] = ['mana_fire', 'mana_water', 'mana_earth', 'mana_wind']
  const mana: Record<string, { current: number, max: number, percent: number }> = {}
  for (const type of manaTypes) {
    const res = game.resourceManager.value.getResource(type)
    if (res) {
      mana[type] = {
        current: res.value,
        max: res.max,
        percent: (res.value / res.max) * 100
      }
    }
  }
  return mana
})

// 怪物状态
const monsters = computed(() => {
  if (!combatSystem.value) return []
  return combatSystem.value.getCombatState().monsters
})

// 当前回合
const currentTurn = computed(() => {
  if (!combatSystem.value) return 'none'
  return combatSystem.value.getCombatState().currentTurn
})

// 开始测试战斗
async function startTestCombat() {
  if (!game.player.value) return
  
  // 加载怪物数据
  const response = await fetch('/data/monsters.json')
  const monsterData = await response.json()
  
  // 选择测试怪物
  const monsterEntry = monsterData.find((m: any) => m.id === 'slime')
  if (!monsterEntry) return
  
  const { Monster } = await import('../../entities/monster')
  const monster = new Monster(monsterEntry)

  
  const { CombatSystem } = await import('../../systems/combat')
  combatSystem.value = new CombatSystem(
    game.player.value,
    [monster],
    game.player.value.achievementManager
  )
  
  isCombatActive.value = true
  combatSystem.value.start()
  
  // 更新日志
  updateCombatLog()
}

// 施放法术
function castSpell(spell: SpellData) {
  if (!combatSystem.value || !isCombatActive.value) return
  if (currentTurn.value !== 'player') return
  
  // 设置法术优先级为选中的法术类型
  const priority = spell.effects.map(effect => effect.type)
  combatSystem.value.setActionPriority(priority)
  
  // 执行玩家回合
  combatSystem.value.executePlayerTurn()
  
  // 更新日志
  updateCombatLog()
}

// 逃跑
function fleeCombat() {
  if (!combatSystem.value) return
  const success = combatSystem.value.flee()
  if (success) {
    isCombatActive.value = false
    updateCombatLog()
  }
}

// 更新战斗日志
function updateCombatLog() {
  if (!combatSystem.value) return
  combatLog.value = combatSystem.value.getLogs()
  
  // 检查战斗是否结束
  const state = combatSystem.value.getCombatState()
  if (!state.isActive) {
    isCombatActive.value = false
  }
}

// 自动滚动到最新日志
function scrollToLatestLog() {
  const logContainer = document.querySelector('.combat-log')
  if (logContainer) {
    logContainer.scrollTop = logContainer.scrollHeight
  }
}

// 定时更新
let updateInterval: number | null = null

onMounted(() => {
  updateInterval = setInterval(() => {
    if (combatSystem.value && isCombatActive.value) {
      updateCombatLog()
      scrollToLatestLog()
    }
  }, 1000)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>

<template>
  <div class="combat-section">
    <h2 class="section-title">⚔️ 战斗</h2>
    
    <!-- 解锁提示 -->
    <div v-if="!hasAttackSpell" class="unlock-hint">
      <p>需要学会至少一个攻击法术才能进行战斗。</p>
      <p>前往 <strong>法术</strong> 页面学习攻击法术。</p>
    </div>

    <!-- 战斗状态 -->
    <div v-else class="combat-container">
      <!-- 玩家状态 -->
      <div class="player-status">
        <h3>{{ game.player.value?.name || '玩家' }}</h3>
        <div class="health-bar">
          <div class="health-label">生命值: {{ playerHealth.current }} / {{ playerHealth.max }}</div>
          <div class="bar-container">
            <div class="bar-fill health-fill" :style="{ width: `${playerHealth.percent}%` }"></div>
          </div>
        </div>
        
        <!-- 法力值 -->
        <div class="mana-bars">
          <div v-for="(mana, type) in playerMana" :key="type" class="mana-bar">
            <div class="mana-label">{{ type.replace('mana_', '') }}: {{ mana.current }} / {{ mana.max }}</div>
            <div class="bar-container">
              <div class="bar-fill mana-fill" :style="{ width: `${mana.percent}%` }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 战斗控制 -->
      <div class="combat-controls">
        <div class="turn-indicator">
          当前回合: <span :class="currentTurn">{{ currentTurn === 'player' ? '玩家回合' : '怪物回合' }}</span>
        </div>
        
        <div class="action-buttons">
          <button 
            v-if="!isCombatActive" 
            @click="startTestCombat" 
            class="btn start-combat-btn"
            :disabled="!hasAttackSpell"
          >
            开始测试战斗
          </button>
          
          <button 
            v-if="isCombatActive" 
            @click="fleeCombat" 
            class="btn flee-btn"
            :disabled="currentTurn !== 'player'"
          >
            逃跑
          </button>
        </div>
      </div>

      <!-- 怪物状态 -->
      <div v-if="isCombatActive && monsters.length > 0" class="monsters-container">
        <h3>怪物</h3>
        <div class="monsters-grid">
          <div v-for="monster in monsters" :key="monster.id" class="monster-card">
            <h4 class="monster-name">{{ monster.name }}</h4>
            <div class="monster-element">元素: {{ monster.element }}</div>
            <div class="monster-health">
              <div class="health-label">生命值: {{ monster.health }} / {{ monster.maxHealth }}</div>
              <div class="bar-container">
                <div 
                  class="bar-fill monster-health-fill" 
                  :style="{ width: `${(monster.health / monster.maxHealth) * 100}%` }"
                ></div>
              </div>
            </div>
            <div class="monster-status" :class="{ alive: monster.isAlive, dead: !monster.isAlive }">
              {{ monster.isAlive ? '存活' : '已击败' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 法术快捷栏 -->
      <div v-if="isCombatActive && learnedSpells.length > 0" class="spells-quickbar">
        <h3>法术</h3>
        <div class="spells-grid">
          <button
            v-for="spell in learnedSpells"
            :key="spell.id"
            @click="castSpell(spell)"
            class="spell-btn"
            :class="{ selected: selectedSpell?.id === spell.id }"
            :disabled="currentTurn !== 'player'"
          >
            <div class="spell-name">{{ spell.name }}</div>
            <div class="spell-cost">{{ spell.manaCost }} 法力</div>
            <div class="spell-element">{{ spell.element }}</div>
          </button>
        </div>
      </div>

      <!-- 战斗日志 -->
      <div class="combat-log-container">
        <h3>战斗日志</h3>
        <div class="combat-log">
          <div 
            v-for="entry in combatLog.slice().reverse()" 
            :key="entry.timestamp"
            class="log-entry"
            :class="entry.type"
          >
            <span class="log-timestamp">{{ new Date(entry.timestamp).toLocaleTimeString() }}</span>
            <span class="log-message">{{ entry.message }}</span>
            <span v-if="entry.value" class="log-value">{{ entry.value }}</span>
          </div>
        </div>
        <div class="log-controls">
          <button @click="combatLog = []" class="btn clear-log-btn">清空日志</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.combat-section {
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

.unlock-hint {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 20px;
  margin: 20px 0;
  text-align: center;
}

.unlock-hint p {
  margin: 10px 0;
  color: #aaa;
}

.combat-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.player-status, .combat-controls, .monsters-container, .spells-quickbar, .combat-log-container {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 15px;
}

.player-status h3, .monsters-container h3, .spells-quickbar h3, .combat-log-container h3 {
  margin-top: 0;
  color: #bb86fc;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
}

.health-bar, .mana-bar, .monster-health {
  margin: 10px 0;
}

.bar-container {
  background: #333;
  border-radius: 4px;
  height: 20px;
  overflow: hidden;
  position: relative;
}

.bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.health-fill {
  background: linear-gradient(90deg, #f44336, #ff9800);
}

.mana-fill {
  background: linear-gradient(90deg, #2196f3, #03a9f4);
}

.monster-health-fill {
  background: linear-gradient(90deg, #4caf50, #8bc34a);
}

.health-label, .mana-label {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
}

.mana-bars {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 15px;
}

.turn-indicator {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
}

.turn-indicator .player {
  color: #4caf50;
}

.turn-indicator .monster {
  color: #f44336;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.start-combat-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.flee-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.clear-log-btn {
  background: #555;
  color: white;
}

.monsters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.monster-card {
  background: #3a3a3a;
  border: 1px solid #555;
  border-radius: 8px;
  padding: 15px;
}

.monster-name {
  margin: 0 0 8px 0;
  color: #ff9800;
}

.monster-element {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 10px;
}

.monster-status {
  font-size: 12px;
  font-weight: bold;
  margin-top: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}

.monster-status.alive {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.monster-status.dead {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.spells-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 15px;
}

.spell-btn {
  background: #3a3a3a;
  border: 1px solid #555;
  border-radius: 8px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.spell-btn:hover:not(:disabled) {
  border-color: #bb86fc;
  background: #444;
}

.spell-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spell-btn.selected {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.1);
}

.spell-name {
  font-weight: bold;
  margin-bottom: 4px;
  color: #fff;
}

.spell-cost {
  font-size: 12px;
  color: #aaa;
  margin-bottom: 2px;
}

.spell-element {
  font-size: 11px;
  color: #bb86fc;
}

.combat-log {
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 6px;
  padding: 10px;
  height: 200px;
  overflow-y: auto;
  margin: 10px 0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.log-entry {
  padding: 4px 8px;
  border-bottom: 1px solid #333;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-entry.info {
  color: #aaa;
}

.log-entry.damage {
  color: #ff9800;
}

.log-entry.heal {
  color: #4caf50;
}

.log-entry.buff {
  color: #2196f3;
}

.log-entry.debuff {
  color: #f44336;
}

.log-entry.victory {
  color: #4caf50;
  font-weight: bold;
}

.log-entry.defeat {
  color: #f44336;
  font-weight: bold;
}

.log-timestamp {
  color: #666;
  margin-right: 10px;
}

.log-value {
  color: #ff9800;
  font-weight: bold;
  margin-left: 10px;
}

.log-controls {
  display: flex;
  justify-content: flex-end;
}
</style>