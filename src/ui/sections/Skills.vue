<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGame } from '../../core/useGame'
import { definitionsManager } from '../../core'
import type { Element } from '../../systems/talent'
import type { Skill } from '../../systems/skill'
import { LearningActivityFactory } from '../../systems/learningActivity'
import Tooltip from '../components/Tooltip.vue'

const game = useGame()
const { t } = useI18n()
const skills = ref<Skill[]>([])
const skillDefinitions = ref<any[]>([])
const selectedElement = ref<Element | 'neutral' | 'all'>('all')

function getSkillName(id: string, fallback: string): string {
  return t(`skill.${id}`, fallback)
}

const elements: Array<Element | 'neutral' | 'all'> = ['all', 'fire', 'water', 'earth', 'wind', 'neutral']

const elementDescriptions: Record<Element | 'neutral', string> = {
  fire: t('element.fireDesc'),
  water: t('element.waterDesc'),
  earth: t('element.earthDesc'),
  wind: t('element.windDesc'),
  neutral: t('element.neutralDesc')
}

// Load skill definitions
onMounted(async () => {
  try {
    // Ensure definitions are loaded
    if (!definitionsManager.isLoaded()) {
      await definitionsManager.loadAllDefinitions()
    }
    
    const skillDefs = definitionsManager.getSkillDefinitions()
    skillDefinitions.value = skillDefs
    
    // Register skill definitions to skill manager
    if (game.player.value.skillManager) {
      const skillManager = game.player.value.skillManager
      // Register each skill definition if not already registered
      for (const skillDef of skillDefinitions.value) {
        // Check if definition already registered (simplified check)
        const existingSkill = skillManager.getSkill(skillDef.id)
        if (!existingSkill) {
          skillManager.registerSkillDefinition(skillDef)
        }
      }
      skills.value = skillManager.getAllSkills()
    }
  } catch (error) {
    console.error('Failed to load skills:', error)
  }
})

const filteredSkills = computed(() => {
  if (selectedElement.value === 'all') {
    return skillDefinitions.value
  }
  return skillDefinitions.value.filter(skill => skill.element === selectedElement.value)
})

const unlockedSkills = computed(() => {
  if (!game.player.value.skillManager) return []
  return game.player.value.skillManager.getUnlockedSkills()
})

const lockedSkills = computed(() => {
  if (!game.player.value.skillManager) return []
  return game.player.value.skillManager.getLockedSkills()
})

function getSkillEffectDescription(skill: any): string {
  if (!skill.effects || skill.effects.length === 0) return t('ui.none')
  return skill.effects.map((effect: any) => {
    if (effect.formula) {
      return `${effect.type}: ${effect.formula}`
    }
    return `${effect.type}: +${effect.value}/等级`
  }).join(', ')
}

function canUnlockSkill(skill: any): boolean {
  if (!game.player.value.skillManager) return false
  const playerTalent = game.player.value.talent.data
  return game.player.value.skillManager.canUnlockSkill(skill.id, playerTalent)
}

function startSkillPractice(skillId: string) {
  if (!game.player.value.skillManager || !game.activityRunner.value) return
  
  const skill = game.player.value.skillManager.getSkill(skillId)
  
  if (!skill) {
    alert(`技能未找到或尚未解锁: ${skillId}`)
    return
  }
  
  // 获取玩家天赋等级
  const player = game.player.value
  const talent = player.talent
  const talentLevel = (skill.element !== 'neutral' ? talent.get(skill.element as Element) : 0) || 0
  
  // 创建练习活动
  const practiceActivity = LearningActivityFactory.createSkillPracticeActivity(skill as any, talentLevel)
  
  // 开始活动
  const success = game.activityRunner.value.startActivity(practiceActivity)
  if (!success) {
    alert(`无法开始练习: ${getSkillName(skill.id, skill.name)}\n资源不足`)
  }
}

function isSkillPracticeRepeating(skillId: string): boolean {
  if (!game.activityRunner.value) return false
  return game.activityRunner.value.repeatingActivities.has(`practice_${skillId}`)
}

function toggleSkillPracticeRepeat(skillId: string) {
  if (!game.activityRunner.value) return
  game.activityRunner.value.toggleRepeat(`practice_${skillId}`)
}

function unlockSkill(skillId: string) {
  if (!game.player.value.skillManager || !game.player.value) return
  
  const playerTalent = game.player.value.talent.data
  const success = game.player.value.skillManager.unlockSkill(skillId, playerTalent)
  if (success) {
    alert(`技能解锁成功！`)
    skills.value = game.player.value.skillManager.getAllSkills()
  } else {
    alert(`技能解锁失败，条件未满足。`)
  }
}
</script>

<template>
  <div class="skills-section">
    <h2 class="section-title">🎯 技能</h2>
    
    <!-- Element Filter -->
    <div class="element-filter">
      <label for="element-select">筛选元素: </label>
      <select id="element-select" v-model="selectedElement" class="element-select">
        <option v-for="elem in elements" :key="elem" :value="elem">
          {{ 
            elem === 'all' ? t('common.all') :
            elem === 'fire' ? `🔥 ${t('element.fire')}` :
            elem === 'water' ? `💧 ${t('element.water')}` :
            elem === 'earth' ? `⛰️ ${t('element.earth')}` :
            elem === 'wind' ? `🌪️ ${t('element.wind')}` :
            `⚪ ${t('element.neutral')}`
          }}
        </option>
      </select>
    </div>

    <!-- Unlocked Skills -->
    <div class="skills-category">
      <h3>已解锁技能 ({{ unlockedSkills.length }})</h3>
      <div v-if="unlockedSkills.length > 0" class="skill-grid">
        <div v-for="skill in unlockedSkills" :key="skill.id" class="skill-card unlocked">
          <div class="skill-header">
            <h4 class="skill-name">{{ getSkillName(skill.id, skill.name) }}</h4>
              <Tooltip :content="elementDescriptions[skill.element as (Element | 'neutral')]" position="top" :delay="200">
              <span class="skill-element" :class="skill.element">
                {{ 
                  skill.element === 'fire' ? '🔥' :
                  skill.element === 'water' ? '💧' :
                  skill.element === 'earth' ? '⛰️' :
                  skill.element === 'wind' ? '🌪️' : '⚪'
                }}
              </span>
            </Tooltip>
          </div>
          <p class="skill-desc">{{ skill.description }}</p>
          
          <div class="skill-level">
            <div class="level-info">
              等级: <span class="level-number">{{ skill.currentLevel }}</span>/{{ skill.maxLevel }}
            </div>
            <div class="exp-bar">
              <div class="exp-fill" :style="{ width: `${skill.progress}%` }"></div>
              <span class="exp-text">{{ skill.currentExp }}/{{ skill.requiredExp }} EXP</span>
            </div>
          </div>

          <div class="skill-effects">
            <strong>效果: </strong>
            <span class="effects-text">{{ getSkillEffectDescription(skill) }}</span>
          </div>

          <button 
            @click="startSkillPractice(skill.id)" 
            class="btn practice-btn"
            :disabled="skill.isMaxed"
          >
            {{ skill.isMaxed ? t('common.maxed') : t('common.practice') }}
          </button>
          <button 
            @click="toggleSkillPracticeRepeat(skill.id)" 
            :class="['btn repeat-btn', { active: isSkillPracticeRepeating(skill.id) }]"
            :disabled="skill.isMaxed"
          >
            {{ isSkillPracticeRepeating(skill.id) ? t('ui.cancelRepeat') : t('ui.repeat') }}
          </button>
        </div>
      </div>
      <p v-else class="no-skills">尚未解锁任何技能</p>
    </div>

    <!-- Locked Skills -->
    <div class="skills-category">
      <h3>可解锁技能 ({{ lockedSkills.length }})</h3>
      <div v-if="lockedSkills.length > 0" class="skill-grid">
        <div v-for="skill in lockedSkills" :key="skill.id" class="skill-card locked">
          <div class="skill-header">
            <h4 class="skill-name">{{ getSkillName(skill.id, skill.name) }}</h4>
              <Tooltip :content="elementDescriptions[skill.element as (Element | 'neutral')]" position="top" :delay="200">
              <span class="skill-element" :class="skill.element">
                {{ 
                  skill.element === 'fire' ? '🔥' :
                  skill.element === 'water' ? '💧' :
                  skill.element === 'earth' ? '⛰️' :
                  skill.element === 'wind' ? '🌪️' : '⚪'
                }}
              </span>
            </Tooltip>
          </div>
          <p class="skill-desc">{{ skill.description }}</p>
          
          <div class="skill-requirements">
            <strong>{{ t('ui.requirements') }}: </strong>
            <span v-if="skill.unlockCondition" class="req-text">
              {{ 
                skill.unlockCondition === 'true' ? t('ui.noRequirements') :
                skill.unlockCondition.replace('fire', '🔥').replace('water', '💧').replace('earth', '⛰️').replace('wind', '🌪️')
              }}
            </span>
            <span v-else class="req-text">{{ t('ui.noRequirements') }}</span>
          </div>

          <div class="skill-effects">
            <strong>效果: </strong>
            <span class="effects-text">{{ getSkillEffectDescription(skill) }}</span>
          </div>

          <button 
            @click="unlockSkill(skill.id)" 
            class="btn unlock-btn"
            :disabled="!canUnlockSkill(skill)"
          >
            {{ canUnlockSkill(skill) ? t('common.unlock') : t('ui.requirementsNotMet') }}
          </button>
        </div>
      </div>
      <p v-else class="no-skills">没有可解锁的技能</p>
    </div>

    <!-- All Skills -->
    <div class="skills-category">
      <h3>所有技能 ({{ filteredSkills.length }})</h3>
      <div v-if="filteredSkills.length > 0" class="skill-grid">
        <div v-for="skill in filteredSkills" :key="skill.id" class="skill-card all">
          <div class="skill-header">
            <h4 class="skill-name">{{ getSkillName(skill.id, skill.name) }}</h4>
              <Tooltip :content="elementDescriptions[skill.element as (Element | 'neutral')]" position="top" :delay="200">
              <span class="skill-element" :class="skill.element">
                {{ 
                  skill.element === 'fire' ? '🔥' :
                  skill.element === 'water' ? '💧' :
                  skill.element === 'earth' ? '⛰️' :
                  skill.element === 'wind' ? '🌪️' : '⚪'
                }}
              </span>
            </Tooltip>
          </div>
          <p class="skill-desc">{{ skill.description }}</p>
          
          <div class="skill-meta">
            <span class="meta-item">{{ t('ui.maxLevel') }}: {{ skill.maxLevel }}</span>
            <span class="meta-item">{{ t('element.element') }}: {{ 
              skill.element === 'fire' ? t('element.fire') :
              skill.element === 'water' ? t('element.water') :
              skill.element === 'earth' ? t('element.earth') :
              skill.element === 'wind' ? t('element.wind') : t('element.neutral')
            }}</span>
          </div>
          
          <div class="skill-effects">
            <strong>{{ t('common.effect') }}: </strong>
            <span class="effects-text">{{ getSkillEffectDescription(skill) }}</span>
          </div>
        </div>
      </div>
      <p v-else class="no-skills">没有找到技能</p>
    </div>
  </div>
</template>

<style scoped>
.skills-section {
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

.skills-category {
  margin-bottom: 30px;
}

.skills-category h3 {
  color: #03dac6;
  margin-bottom: 15px;
  padding-bottom: 5px;
  border-bottom: 1px solid #333;
}

.skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.skill-card {
  background: #252525;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid #333;
  transition: transform 0.2s, border-color 0.2s;
}

.skill-card:hover {
  transform: translateY(-2px);
}

.skill-card.unlocked {
  border-color: #4caf50;
}

.skill-card.locked {
  border-color: #ff5722;
}

.skill-card.all {
  border-color: #666;
}

.skill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.skill-name {
  margin: 0;
  color: #bb86fc;
  font-size: 18px;
}

.skill-element {
  font-size: 20px;
}

.skill-desc {
  color: #aaa;
  font-size: 14px;
  margin-bottom: 15px;
  line-height: 1.4;
}

.skill-level {
  margin-bottom: 15px;
}

.level-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #fff;
  font-size: 14px;
}

.level-number {
  color: #4caf50;
  font-weight: bold;
}

.exp-bar {
  height: 20px;
  background: #333;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.exp-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  transition: width 0.3s;
}

.exp-text {
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

.skill-requirements, .skill-effects, .skill-meta {
  margin-bottom: 10px;
  font-size: 14px;
}

.skill-requirements strong, .skill-effects strong {
  color: #ff9800;
}

.req-text, .effects-text {
  color: #aaa;
}

.skill-meta {
  display: flex;
  gap: 15px;
}

.meta-item {
  color: #aaa;
  font-size: 13px;
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

.practice-btn {
  background: #4caf50;
  color: white;
}

.practice-btn:hover:not(:disabled) {
  background: #45a049;
}

.practice-btn:disabled {
  background: #666;
  cursor: not-allowed;
}

.repeat-btn {
  background: #555;
  color: white;
}
.repeat-btn.active {
  background: #ff9800;
  color: white;
}
.repeat-btn:hover:not(:disabled) {
  background: #777;
}
.repeat-btn:disabled {
  background: #666;
  cursor: not-allowed;
}

.unlock-btn {
  background: #ff9800;
  color: white;
}

.unlock-btn:hover:not(:disabled) {
  background: #f57c00;
}

.unlock-btn:disabled {
  background: #666;
  cursor: not-allowed;
}

.no-skills {
  color: #666;
  text-align: center;
  padding: 20px;
  font-style: italic;
}
</style>