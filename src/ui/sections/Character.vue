<script setup lang="ts">
import { computed } from 'vue'
import { useGame } from '../../core/useGame'
import type { Element } from '../../systems/talent'

const game = useGame()
const player = computed(() => game.player.value)
const talent = computed(() => player.value?.talent?.data)
const resources = computed(() => player.value?.resourceManager)

// 统计数据
const stats = computed(() => ({
  gameTime: game.gameTime.value,
  totalGold: resources.value?.getResource('gold')?.value || 0,
  totalManaFire: resources.value?.getResource('mana_fire')?.value || 0,
  totalManaWater: resources.value?.getResource('mana_water')?.value || 0,
  totalManaEarth: resources.value?.getResource('mana_earth')?.value || 0,
  totalManaWind: resources.value?.getResource('mana_wind')?.value || 0,
  learnedSpells: player.value?.spellManager?.getLearnedSpells?.().length || 0,
  unlockedSkills: player.value?.skillManager?.getUnlockedSkills?.().length || 0,
  level: player.value?.level || 1,
  experience: player.value?.experience || 0,
  nextLevelExp: player.value?.getExperienceRequiredForNextLevel?.() || 100
}))

const elements: Element[] = ['fire', 'water', 'earth', 'wind']
const elementIcons = {
  fire: '🔥',
  water: '💧',
  earth: '⛰️',
  wind: '🌪️'
}
const elementColors = {
  fire: '#ff5722',
  water: '#2196f3',
  earth: '#795548',
  wind: '#4caf50'
}

function getElementName(element: Element): string {
  return {
    fire: '火',
    water: '水',
    earth: '土',
    wind: '风'
  }[element]
}
</script>

<template>
  <div class="character-section">
    <h2 class="section-title">👤 角色信息</h2>

    <!-- 基本信息 -->
    <div class="character-card">
      <div class="character-header">
        <div class="character-avatar">
          <span class="avatar-icon">🧙</span>
        </div>
        <div class="character-info">
          <h3 class="character-name">{{ player?.name || '未命名' }}</h3>
          <div class="character-level">
            <span class="level-label">等级</span>
            <span class="level-value">{{ stats.level }}</span>
            <div class="exp-bar">
              <div 
                class="exp-fill" 
                :style="{ width: `${(stats.experience / stats.nextLevelExp) * 100}%` }"
              ></div>
              <span class="exp-text">
                {{ stats.experience }} / {{ stats.nextLevelExp }} EXP
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 天赋值 -->
      <div class="talent-section">
        <h4>天赋值</h4>
        <div class="talent-bars">
          <div 
            v-for="element in elements" 
            :key="element"
            class="talent-bar"
          >
            <div class="talent-label">
              <span class="talent-icon">{{ elementIcons[element] }}</span>
              <span class="talent-name">{{ getElementName(element) }}</span>
              <span class="talent-value">{{ talent?.[element] || 0 }}</span>
            </div>
            <div class="talent-bar-bg">
              <div
                class="talent-bar-fill"
                :style="{
                  width: `${(talent?.[element] || 0)}%`,
                  backgroundColor: elementColors[element]
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 统计数据 -->
      <div class="stats-section">
        <h4>统计数据</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-icon">⏱️</div>
            <div class="stat-info">
              <div class="stat-label">游戏时间</div>
              <div class="stat-value">{{ Math.floor(stats.gameTime) }} 秒</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">💰</div>
            <div class="stat-info">
              <div class="stat-label">金币</div>
              <div class="stat-value">{{ stats.totalGold }}</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">✨</div>
            <div class="stat-info">
              <div class="stat-label">已学会法术</div>
              <div class="stat-value">{{ stats.learnedSpells }}</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">🎯</div>
            <div class="stat-info">
              <div class="stat-label">已解锁技能</div>
              <div class="stat-value">{{ stats.unlockedSkills }}</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">🔥</div>
            <div class="stat-info">
              <div class="stat-label">火元素魔力</div>
              <div class="stat-value">{{ stats.totalManaFire }}</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">💧</div>
            <div class="stat-info">
              <div class="stat-label">水元素魔力</div>
              <div class="stat-value">{{ stats.totalManaWater }}</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">⛰️</div>
            <div class="stat-info">
              <div class="stat-label">土元素魔力</div>
              <div class="stat-value">{{ stats.totalManaEarth }}</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">🌪️</div>
            <div class="stat-info">
              <div class="stat-label">风元素魔力</div>
              <div class="stat-value">{{ stats.totalManaWind }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 角色描述 -->
      <div class="description-section">
        <h4>角色描述</h4>
        <p v-if="player?.name">
          {{ player.name }} 是一位 {{ stats.level }} 级的法师，在元素魔法方面有着独特的天赋。
          通过不懈的努力，已经掌握了 {{ stats.learnedSpells }} 种法术和 {{ stats.unlockedSkills }} 种技能。
        </p>
        <p v-else>
          角色信息未加载。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.character-section {
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

.character-card {
  background: #252525;
  border-radius: 10px;
  padding: 25px;
  border: 1px solid #333;
}

.character-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.character-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3700b3, #bb86fc);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  font-size: 40px;
}

.character-info {
  flex: 1;
}

.character-name {
  margin: 0 0 10px 0;
  color: #fff;
  font-size: 28px;
}

.character-level {
  display: flex;
  align-items: center;
  gap: 15px;
}

.level-label {
  color: #aaa;
  font-size: 14px;
}

.level-value {
  background: #3700b3;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 18px;
}

.exp-bar {
  flex: 1;
  height: 20px;
  background: #333;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  max-width: 300px;
}

.exp-fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  border-radius: 10px;
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

.talent-section {
  margin-bottom: 30px;
}

.talent-section h4 {
  color: #03dac6;
  margin: 0 0 15px 0;
  font-size: 18px;
}

.talent-bars {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.talent-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.talent-label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
}

.talent-icon {
  font-size: 20px;
}

.talent-name {
  flex: 1;
  font-size: 16px;
}

.talent-value {
  font-weight: bold;
  font-size: 18px;
  color: #bb86fc;
  width: 40px;
  text-align: right;
}

.talent-bar-bg {
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

.stats-section {
  margin-bottom: 30px;
}

.stats-section h4 {
  color: #03dac6;
  margin: 0 0 15px 0;
  font-size: 18px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #333;
  border-radius: 8px;
  border: 1px solid #444;
  transition: transform 0.2s;
}

.stat-item:hover {
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 24px;
}

.stat-info {
  flex: 1;
}

.stat-label {
  color: #aaa;
  font-size: 13px;
  margin-bottom: 4px;
}

.stat-value {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}

.description-section {
  padding-top: 20px;
  border-top: 1px solid #333;
}

.description-section h4 {
  color: #03dac6;
  margin: 0 0 10px 0;
  font-size: 18px;
}

.description-section p {
  color: #aaa;
  line-height: 1.6;
  margin: 0;
}
</style>