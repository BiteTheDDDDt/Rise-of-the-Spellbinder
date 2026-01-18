<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useGame } from '../../core/useGame'
import type { Element } from '../../systems/talent'
import type { Spell } from '../../systems/spell'
import { LearningActivityFactory } from '../../systems/learningActivity'
import Tooltip from '../components/Tooltip.vue'

const game = useGame()
const spells = ref<Spell[]>([])
const spellDefinitions = ref<any[]>([])
const selectedElement = ref<Element | 'all'>('all')

// Load spell definitions
onMounted(async () => {
  try {
    const response = await fetch('/data/spells.json')
    const data = await response.json()
    spellDefinitions.value = data.spells || []
    
    // Register spell definitions to spell manager
    if (game.player.value.spellManager) {
      const spellManager = game.player.value.spellManager
      // Register each spell definition if not already registered
      for (const spellDef of spellDefinitions.value) {
        // Check if definition already registered (simplified check)
        const existingSpell = spellManager.getSpell(spellDef.id)
        if (!existingSpell) {
          spellManager.registerSpellDefinition(spellDef)
        }
      }
      spells.value = spellManager.getAllSpells()
    }
  } catch (error) {
    console.error('Failed to load spells:', error)
  }
})

const filteredSpells = computed(() => {
  if (selectedElement.value === 'all') {
    return spellDefinitions.value
  }
  return spellDefinitions.value.filter(spell => spell.element === selectedElement.value)
})

const learnedSpells = computed(() => {
  if (!game.player.value.spellManager) return []
  return game.player.value.spellManager.getLearnedSpells()
})

const learnableSpells = computed(() => {
  if (!game.player.value.spellManager || !game.player.value) return []
  const playerTalent = game.player.value.talent.data
  const playerSkills = game.player.value.skillManager ? game.player.value.skillManager.getAllSkills().reduce((map, skill) => {
    map.set(skill.id, { currentLevel: skill.currentLevel })
    return map
  }, new Map()) : new Map()
  return game.player.value.spellManager.getLearnableSpells(playerTalent, playerSkills)
})

const learnedSpellIds = computed(() => new Set(learnedSpells.value.map(spell => spell.id)))
const learnableSpellIds = computed(() => new Set(learnableSpells.value.map(spell => spell.id)))

const canLearnSpellMap = computed(() => {
  const map = new Map<string, boolean>()
  if (!game.player.value?.spellManager || !game.player.value) return map
  
  const playerTalent = game.player.value.talent.data
  const playerSkills = game.player.value.skillManager ? game.player.value.skillManager.getAllSkills().reduce((skillMap, skill) => {
    skillMap.set(skill.id, { currentLevel: skill.currentLevel })
    return skillMap
  }, new Map<string, { currentLevel: number }>()) : new Map()
  
  for (const spell of spellDefinitions.value) {
    if (spell.unlockCondition) {
      if (!evaluateCondition(spell.unlockCondition, playerTalent)) {
        map.set(spell.id, false)
        continue
      }
    }
    if (spell.requiredSkill) {
      const skill = playerSkills.get(spell.requiredSkill.skillId)
      if (!skill || skill.currentLevel < spell.requiredSkill.level) {
        map.set(spell.id, false)
        continue
      }
    }
    map.set(spell.id, true)
  }
  return map
})

const elements: Array<Element | 'all'> = ['all', 'fire', 'water', 'earth', 'wind']

const elementDescriptions: Record<Element, string> = {
  fire: '火元素法术：热情、破坏与变革',
  water: '水元素法术：流动、治愈与适应',
  earth: '土元素法术：稳定、防御与生长',
  wind: '风元素法术：自由、速度与洞察'
}

function getSpellStatus(spellId: string): 'learned' | 'learnable' | 'locked' {
  if (learnedSpellIds.value.has(spellId)) return 'learned'
  if (learnableSpellIds.value.has(spellId)) return 'learnable'
  return 'locked'
}

function evaluateCondition(condition: string, talent: any): boolean {
  if (condition === 'true') return true
  
  try {
    // 简单表达式解析，支持 >=, <=, >, <, &&, ||
    const tokens = condition.split(/(&&|\|\|)/).map(token => token.trim())
    
    for (let i = 0; i < tokens.length; i += 2) {
      const comparison = tokens[i]
      if (!comparison) continue
      
      // 解析比较表达式，如 "fire >= 20"
      const match = comparison.match(/^(\w+)\s*(>=|<=|>|<)\s*(\d+)$/)
      if (!match) {
        // 如果包含未知变量如 fire_affinity，直接返回 false
        return false
      }
      
      const [, variable, operator, valueStr] = match
      const value = parseInt(valueStr!, 10)
      const talentValue = talent[variable!] || 0
      
      let result = false
      switch (operator) {
        case '>=': result = talentValue >= value; break
        case '<=': result = talentValue <= value; break
        case '>': result = talentValue > value; break
        case '<': result = talentValue < value; break
      }
      
      // 检查逻辑运算符
      if (i + 1 < tokens.length) {
        const logicOp = tokens[i + 1]
        if (logicOp === '&&' && !result) return false
        if (logicOp === '||' && result) return true
      } else {
        return result
      }
    }
    return true
  } catch {
    return false
  }
}

function getSpellEffectDescription(spell: any): string {
  if (!spell.effects || spell.effects.length === 0) return '无效果'
  return spell.effects.map((effect: any) => {
    let text = ''
    switch (effect.type) {
      case 'damage':
        text = `造成 ${effect.value} 点${effect.element ? effect.element + ' ' : ''}伤害`
        break
      case 'heal':
        text = `治疗 ${effect.value} 点生命值`
        break
      case 'buff':
        text = `增益: ${effect.value} ${effect.element ? effect.element + ' ' : ''}效果`
        if (effect.duration) text += `，持续 ${effect.duration} 秒`
        break
      case 'debuff':
        text = `减益: ${effect.value} ${effect.element ? effect.element + ' ' : ''}效果`
        if (effect.duration) text += `，持续 ${effect.duration} 秒`
        break
      case 'summon':
        text = `召唤 ${effect.value} 个单位`
        break
    }
    return text
  }).join('; ')
}



function startSpellLearning(spellId: string) {
  if (!game.player.value.spellManager || !game.activityRunner.value) return
  
  const spellDef = spellDefinitions.value.find(s => s.id === spellId)
  if (!spellDef) return
  
  // 获取玩家天赋等级
  const player = game.player.value
  const talent = player.talent
  const talentLevel = talent.get(spellDef.element as Element) || 0
  
  // 创建学习活动
  const learningActivity = LearningActivityFactory.createSpellLearningActivity(spellDef as any, talentLevel)
  
  // 开始活动
  const success = game.activityRunner.value.startActivity(learningActivity)
  if (!success) {
    alert(`无法开始学习: ${spellDef.name}\n资源不足`)
  }
}



function castSpell(spellId: string) {
  if (!game.player.value.spellManager || !game.player.value) return
  
  const spell = game.player.value.spellManager.getSpell(spellId)
  if (!spell || !spell.isLearned) return
  
  // Check if spell can be cast
  const manaResourceId = `mana_${spell.element}` as 'mana_fire' | 'mana_water' | 'mana_earth' | 'mana_wind'
  const manaResource = game.player.value.resourceManager.getResource(manaResourceId)
  if (!manaResource || manaResource.value < spell.manaCost) {
    console.log('Not enough mana')
    return
  }
  
  const playerSkills = game.player.value.skillManager ? game.player.value.skillManager.getAllSkills().reduce((map, skill) => {
    map.set(skill.id, { currentLevel: skill.currentLevel })
    return map
  }, new Map()) : new Map()
  
  if (spell.canCast(manaResource.value, playerSkills)) {
    manaResource.consume(spell.manaCost)
    spell.cast()
    console.log(`Casted ${spell.name}`)
  }
}
</script>

<template>
  <div class="spells-section">
    <h2 class="section-title">✨ 法术</h2>
    
    <!-- Element Filter -->
    <div class="element-filter">
      <label for="spell-element-select">筛选元素: </label>
      <select id="spell-element-select" v-model="selectedElement" class="element-select">
        <option v-for="elem in elements" :key="elem" :value="elem">
          {{ 
            elem === 'all' ? '全部' :
            elem === 'fire' ? '🔥 火' :
            elem === 'water' ? '💧 水' :
            elem === 'earth' ? '⛰️ 土' :
            '🌪️ 风'
          }}
        </option>
      </select>
    </div>

    <!-- Learned Spells -->
    <div class="spells-category">
      <h3>已学会的法术 ({{ learnedSpells.length }})</h3>
      <div v-if="learnedSpells.length > 0" class="spell-grid">
        <div v-for="spell in learnedSpells" :key="spell.id" class="spell-card learned">
          <div class="spell-header">
            <h4 class="spell-name">{{ spell.name }}</h4>
            <div class="spell-meta">
              <Tooltip :content="elementDescriptions[spell.element as Element]" position="top" :delay="200">
                <span class="spell-element" :class="spell.element">
                  {{ 
                    spell.element === 'fire' ? '🔥' :
                    spell.element === 'water' ? '💧' :
                    spell.element === 'earth' ? '⛰️' :
                    '🌪️'
                  }}
                </span>
              </Tooltip>
              <span class="spell-level">Lv {{ spell.level }}</span>
            </div>
          </div>
          <p class="spell-desc">{{ spell.description }}</p>
          
          <div class="spell-stats">
            <div class="stat">
              <span class="stat-label">魔力消耗:</span>
              <span class="stat-value">{{ spell.manaCost }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">冷却时间:</span>
              <span class="stat-value">{{ spell.cooldown }} 秒</span>
            </div>
            <div class="stat">
              <span class="stat-label">施法时间:</span>
              <span class="stat-value">{{ spell.castTime }} 秒</span>
            </div>
          </div>

          <div class="spell-effects">
            <strong>效果: </strong>
            <span class="effects-text">{{ spell.getEffectDescription ? spell.getEffectDescription() : getSpellEffectDescription(spell) }}</span>
          </div>

          <div class="spell-cooldown" v-if="spell.isOnCooldown">
            <div class="cooldown-bar">
              <div class="cooldown-fill" :style="{ width: `${spell.cooldownPercent}%` }"></div>
              <span class="cooldown-text">冷却中: {{ spell.currentCooldown?.toFixed(1) || 0 }}/{{ spell.cooldown }} 秒</span>
            </div>
          </div>

          <button 
            @click="castSpell(spell.id)" 
            class="btn cast-btn"
            :disabled="spell.isOnCooldown"
          >
            {{ spell.isOnCooldown ? '冷却中' : '施放' }}
          </button>
        </div>
      </div>
      <p v-else class="no-spells">尚未学会任何法术</p>
    </div>

    <!-- Learnable Spells -->
    <div class="spells-category">
      <h3>可学习的法术 ({{ learnableSpells.length }})</h3>
      <div v-if="learnableSpells.length > 0" class="spell-grid">
        <div v-for="spell in learnableSpells" :key="spell.id" class="spell-card learnable">
          <div class="spell-header">
            <h4 class="spell-name">{{ spell.name }}</h4>
            <div class="spell-meta">
              <Tooltip :content="elementDescriptions[spell.element as Element]" position="top" :delay="200">
                <span class="spell-element" :class="spell.element">
                  {{ 
                    spell.element === 'fire' ? '🔥' :
                    spell.element === 'water' ? '💧' :
                    spell.element === 'earth' ? '⛰️' :
                    '🌪️'
                  }}
                </span>
              </Tooltip>
              <span class="spell-level">Lv {{ spell.level }}</span>
            </div>
          </div>
          <p class="spell-desc">{{ spell.description }}</p>
          
          <div class="spell-requirements">
            <strong>解锁条件: </strong>
            <div v-if="spell.unlockCondition" class="req-text">
              {{ 
                spell.unlockCondition.replace('fire', '🔥').replace('water', '💧').replace('earth', '⛰️').replace('wind', '🌪️')
              }}
            </div>
            <div v-if="spell.requiredSkill" class="req-text">
              需要 {{ spell.requiredSkill.skillId }} 等级 {{ spell.requiredSkill.level }}
            </div>
            <div v-if="!spell.unlockCondition && !spell.requiredSkill" class="req-text">
              无要求
            </div>
          </div>

          <div class="spell-stats">
            <div class="stat">
              <span class="stat-label">魔力消耗:</span>
              <span class="stat-value">{{ spell.manaCost }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">冷却时间:</span>
              <span class="stat-value">{{ spell.cooldown }} 秒</span>
            </div>
          </div>

          <button 
            @click="startSpellLearning(spell.id)" 
            class="btn learn-btn"
            :disabled="!canLearnSpellMap.get(spell.id)"
          >
            {{ canLearnSpellMap.get(spell.id) ? '学习' : '条件未满足' }}
          </button>
        </div>
      </div>
      <p v-else class="no-spells">没有可学习的法术</p>
    </div>

    <!-- All Spells -->
    <div class="spells-category">
      <h3>所有法术 ({{ filteredSpells.length }})</h3>
      <div v-if="filteredSpells.length > 0" class="spell-grid">
        <div v-for="spell in filteredSpells" :key="spell.id" class="spell-card all">
          <div class="spell-header">
            <h4 class="spell-name">{{ spell.name }}</h4>
            <div class="spell-meta">
              <Tooltip :content="elementDescriptions[spell.element as Element]" position="top" :delay="200">
                <span class="spell-element" :class="spell.element">
                  {{ 
                    spell.element === 'fire' ? '🔥' :
                    spell.element === 'water' ? '💧' :
                    spell.element === 'earth' ? '⛰️' :
                    '🌪️'
                  }}
                </span>
              </Tooltip>
              <span class="spell-level">Lv {{ spell.level }}</span>
            </div>
          </div>
          <p class="spell-desc">{{ spell.description }}</p>
          
          <div class="spell-stats">
            <div class="stat">
              <span class="stat-label">魔力消耗:</span>
              <span class="stat-value">{{ spell.manaCost }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">冷却时间:</span>
              <span class="stat-value">{{ spell.cooldown }} 秒</span>
            </div>
            <div class="stat">
              <span class="stat-label">施法时间:</span>
              <span class="stat-value">{{ spell.castTime }} 秒</span>
            </div>
          </div>

          <div class="spell-effects">
            <strong>效果: </strong>
            <span class="effects-text">{{ getSpellEffectDescription(spell) }}</span>
          </div>

          <div class="spell-status">
            <span class="status-tag" :class="getSpellStatus(spell.id)">
              {{ 
                getSpellStatus(spell.id) === 'learned' ? '已学会' :
                getSpellStatus(spell.id) === 'learnable' ? '可学习' : '未解锁'
              }}
            </span>
          </div>
        </div>
      </div>
      <p v-else class="no-spells">没有找到法术</p>
    </div>
  </div>
</template>

<style scoped>
.spells-section {
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

.element-filter {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.element-select {
  padding: 8px 12px;
  background: #252525;
  color: white;
  border: 1px solid #444;
  border-radius: 6px;
  font-size: 14px;
}

.spells-category {
  margin-bottom: 30px;
}

.spells-category h3 {
  color: #03dac6;
  margin-bottom: 15px;
  padding-bottom: 5px;
  border-bottom: 1px solid #333;
}

.spell-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.spell-card {
  background: #252525;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid #333;
  transition: transform 0.2s, border-color 0.2s;
}

.spell-card:hover {
  transform: translateY(-2px);
}

.spell-card.learned {
  border-color: #4caf50;
}

.spell-card.learnable {
  border-color: #ff9800;
}

.spell-card.all {
  border-color: #666;
}

.spell-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.spell-name {
  margin: 0;
  color: #bb86fc;
  font-size: 18px;
}

.spell-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}

.spell-element {
  font-size: 20px;
}

.spell-level {
  background: #333;
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
}

.spell-desc {
  color: #aaa;
  font-size: 14px;
  margin-bottom: 15px;
  line-height: 1.4;
}

.spell-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.stat {
  display: flex;
  flex-direction: column;
  background: #333;
  padding: 8px;
  border-radius: 6px;
}

.stat-label {
  color: #aaa;
  font-size: 11px;
  margin-bottom: 2px;
}

.stat-value {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

.spell-requirements, .spell-effects {
  margin-bottom: 10px;
  font-size: 14px;
}

.spell-requirements strong, .spell-effects strong {
  color: #ff9800;
}

.req-text, .effects-text {
  color: #aaa;
  display: block;
  margin-top: 5px;
}

.spell-cooldown {
  margin-bottom: 15px;
}

.cooldown-bar {
  height: 20px;
  background: #333;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.cooldown-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff5722, #ff9800);
  transition: width 0.3s;
}

.cooldown-text {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.spell-status {
  margin-top: 10px;
}

.status-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status-tag.learned {
  background: #4caf50;
  color: white;
}

.status-tag.learnable {
  background: #ff9800;
  color: white;
}

.status-tag.locked {
  background: #666;
  color: #aaa;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s;
  width: 100%;
  margin-top: 10px;
}

.cast-btn {
  background: #2196f3;
  color: white;
}

.cast-btn:hover:not(:disabled) {
  background: #1976d2;
}

.cast-btn:disabled {
  background: #666;
  cursor: not-allowed;
}

.learn-btn {
  background: #ff9800;
  color: white;
}

.learn-btn:hover:not(:disabled) {
  background: #f57c00;
}

.learn-btn:disabled {
  background: #666;
  cursor: not-allowed;
}

.no-spells {
  color: #666;
  text-align: center;
  padding: 20px;
  font-style: italic;
}
</style>