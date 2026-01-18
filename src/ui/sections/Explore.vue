<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGame } from '../../core/useGame'
import type { LocaleManager, LocaleInstance, LocaleReward } from '../../systems/locale'
import type { ResourceId } from '../../systems/resource'

const game = useGame()
const localeManager = ref<LocaleManager | null>(null)
const locales = ref<LocaleInstance[]>([])
const isLoading = ref(true)
const exploreError = ref<string | null>(null)
const recentCombatLogs = ref<any[]>([])

// 检查玩家是否学会攻击法术
const hasAttackSpell = computed(() => {
  if (!game.player.value) return false
  const learnedSpells = game.player.value.spellManager.getLearnedSpells()
  return learnedSpells.some(spell => 
    spell.data.effects.some(effect => effect.type === 'damage')
  )
})

// 玩家等级
const playerLevel = computed(() => game.player.value?.level || 1)



// 可用的地点
const availableLocales = computed(() => {
  if (!localeManager.value) return []
  return localeManager.value.getAvailableLocales(playerLevel.value, hasAttackSpell.value)
})

// 已发现的地点
const discoveredLocales = computed(() => {
  if (!localeManager.value) return []
  return localeManager.value.getDiscoveredLocales()
})

// 加载地点数据
async function loadLocaleData() {
  try {
    // 加载地点数据
    const basePath = import.meta.env.BASE_URL || '/'
    const response = await fetch(`${basePath}data/locales.json`)
    const localeData = await response.json()
    
    // 创建地点管理器
    const { LocaleManager } = await import('../../systems/locale')
    localeManager.value = new LocaleManager(game.player.value?.achievementManager)
    localeManager.value.loadLocaleData(localeData)
    
    // 自动发现第一个地点（城镇外围）
    localeManager.value.discoverLocale('town_outskirts')
    
    // 获取所有地点
    locales.value = localeManager.value.getAllLocales()
    
    isLoading.value = false
  } catch (error) {
    console.error('加载地点数据失败:', error)
    exploreError.value = '加载地点数据失败，请刷新页面重试。'
    isLoading.value = false
  }
}

// 获取地点的魔力奖励类型
function getManaRewardTypes(locale: LocaleInstance): ResourceId[] {
  const manaKeys: ResourceId[] = ['mana_fire', 'mana_water', 'mana_earth', 'mana_wind']
  return manaKeys.filter(key => locale.locale.rewards[key as keyof LocaleReward])
}

// 开始探索
async function startExplore(localeId: string) {
  if (!localeManager.value || !game.player.value) return
  
  const locale = localeManager.value.getLocale(localeId)
  if (!locale) return
  
  // 检查是否可以探索
  const canExplore = localeManager.value.canExplore(
    localeId, 
    playerLevel.value, 
    hasAttackSpell.value
  )
  
  if (!canExplore.can) {
    exploreError.value = `无法探索: ${canExplore.reason}`
    return
  }
  
  // 检查体力
  const staminaRes = game.resourceManager.value.getResource('stamina')
  if (!staminaRes || staminaRes.value < locale.locale.staminaCost) {
    exploreError.value = `体力不足，需要 ${locale.locale.staminaCost} 体力`
    return
  }
  
  try {
    // 创建探索活动
    const { ExploreActivityFactory } = await import('../../systems/exploreActivity')
    const exploreActivity = ExploreActivityFactory.createExploreActivity(
      locale.locale,
      playerLevel.value
    )
    
    // 消耗体力
    staminaRes.consume(locale.locale.staminaCost)
    
    // 开始探索活动
    const success = game.activityRunner.value.startActivity(exploreActivity)
    if (!success) {
      throw new Error('开始探索活动失败，资源不足')
    }
    
    exploreError.value = null
  } catch (error) {
    console.error('开始探索失败:', error)
    exploreError.value = '开始探索失败，请稍后重试。'
  }
}

// 检查探索活动是否重复
function isExploreRepeating(localeId: string): boolean {
  if (!game.activityRunner.value) return false
  return game.activityRunner.value.repeatingActivities.has(`explore_${localeId}`)
}

// 切换探索活动重复
function toggleExploreRepeat(localeId: string) {
  if (!game.activityRunner.value) return
  game.activityRunner.value.toggleRepeat(`explore_${localeId}`)
}

// 获取地点危险等级颜色
function getDangerColor(level: number): string {
  if (level <= 1) return '#4caf50' // 安全
  if (level <= 2) return '#ff9800' // 中等
  if (level <= 3) return '#f44336' // 危险
  return '#9c27b0' // 极度危险
}

// 获取地点解锁状态文本
function getLocaleStatus(locale: LocaleInstance): { text: string, color: string } {
  if (!locale.discovered) {
    return { text: '未发现', color: '#666' }
  }
  
  const canExplore = localeManager.value?.canExplore(
    locale.id,
    playerLevel.value,
    hasAttackSpell.value
  )
  
  if (canExplore?.can) {
    return { text: '可探索', color: '#4caf50' }
  } else {
    return { text: `需: ${canExplore?.reason || '条件未满足'}`, color: '#ff9800' }
  }
}

// 加载最近战斗记录（模拟）
function loadRecentCombatLogs() {
  // 这里可以从战斗系统或本地存储加载
  recentCombatLogs.value = [
    { id: 1, monster: '史莱姆', result: '胜利', time: '刚刚', gold: 5, exp: 10 },
    { id: 2, monster: '巨鼠', result: '胜利', time: '5分钟前', gold: 3, exp: 8 },
    { id: 3, monster: '石傀儡', result: '失败', time: '10分钟前', gold: 0, exp: 0 }
  ]
}

onMounted(() => {
  loadLocaleData()
  loadRecentCombatLogs()
})
</script>

<template>
  <div class="explore-section">
    <h2 class="section-title">🗺️ 探索</h2>
    
    <!-- 错误提示 -->
    <div v-if="exploreError" class="error-message">
      {{ exploreError }}
      <button @click="exploreError = null" class="close-error-btn">×</button>
    </div>
    
    <!-- 解锁提示 -->
    <div v-if="!hasAttackSpell" class="unlock-hint">
      <p>需要学会至少一个攻击法术才能解锁探索功能。</p>
      <p>前往 <strong>法术</strong> 页面学习攻击法术。</p>
    </div>
    
    <!-- 加载状态 -->
    <div v-else-if="isLoading" class="loading-state">
      <p>加载探索地点中...</p>
    </div>
    
    <!-- 探索界面 -->
    <div v-else class="explore-container">
      <!-- 探索进度 -->
      <div class="explore-progress">
        <h3>探索进度</h3>
        <div class="progress-stats">
          <div class="stat-item">
            <span class="stat-label">已发现地点</span>
            <span class="stat-value">{{ discoveredLocales.length }} / {{ locales.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">可探索地点</span>
            <span class="stat-value">{{ availableLocales.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">玩家等级</span>
            <span class="stat-value">{{ playerLevel }}</span>
          </div>
        </div>
      </div>
      
      <!-- 地点列表 -->
      <div class="locales-container">
        <h3>探索地点</h3>
        <div class="locales-grid">
          <div 
            v-for="locale in locales" 
            :key="locale.id"
            class="locale-card"
            :class="{ discovered: locale.discovered, undiscovered: !locale.discovered }"
          >
            <div class="locale-header">
              <h4 class="locale-name">{{ locale.locale.name }}</h4>
              <span 
                class="danger-level"
                :style="{ backgroundColor: getDangerColor(locale.locale.dangerLevel) }"
              >
                危险等级 {{ locale.locale.dangerLevel }}
              </span>
            </div>
            
            <div class="locale-body">
              <p class="locale-desc">{{ locale.locale.description }}</p>
              
              <div class="locale-info">
                <div class="info-item">
                  <span class="info-label">探索时长:</span>
                  <span class="info-value">{{ locale.locale.exploreDuration }} 秒</span>
                </div>
                <div class="info-item">
                  <span class="info-label">体力消耗:</span>
                  <span class="info-value">{{ locale.locale.staminaCost }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">可能遭遇:</span>
                  <span class="info-value">{{ locale.locale.monsters.length }} 种怪物</span>
                </div>
              </div>
              
              <div class="locale-status">
                <span 
                  class="status-badge"
                  :style="{ color: getLocaleStatus(locale).color }"
                >
                  {{ getLocaleStatus(locale).text }}
                </span>
                
                <span class="explored-count" v-if="locale.exploredCount > 0">
                  已探索 {{ locale.exploredCount }} 次
                </span>
              </div>
            </div>
            
            <div class="locale-footer">
              <div class="locale-buttons">
                <button
                  @click="startExplore(locale.id)"
                  class="btn explore-btn"
                  :disabled="!locale.discovered || !availableLocales.includes(locale)"
                >
                  开始探索
                </button>
                <button 
                  @click="toggleExploreRepeat(locale.id)" 
                  :class="['btn repeat-btn', { active: isExploreRepeating(locale.id) }]"
                  :disabled="!locale.discovered || !availableLocales.includes(locale)"
                >
                  {{ isExploreRepeating(locale.id) ? '取消重复' : '重复' }}
                </button>
              </div>
              
              <div class="locale-rewards">
                <span class="rewards-label">可能奖励:</span>
                <div class="rewards-tags">
                  <span v-if="locale.locale.rewards.gold" class="reward-tag gold">金币</span>
                  <span v-if="locale.locale.rewards.experience" class="reward-tag exp">经验</span>
                  <span 
                    v-for="mana in getManaRewardTypes(locale)"
                    :key="mana"
                    class="reward-tag mana"
                  >
                    {{ mana.replace('mana_', '') }}魔力
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 最近战斗记录 -->
      <div class="recent-combats">
        <h3>最近战斗记录</h3>
        <div v-if="recentCombatLogs.length === 0" class="no-combats">
          <p>暂无战斗记录</p>
        </div>
        <div v-else class="combat-logs">
          <div v-for="log in recentCombatLogs" :key="log.id" class="combat-log-item">
            <div class="log-header">
              <span class="log-monster">{{ log.monster }}</span>
              <span class="log-time">{{ log.time }}</span>
            </div>
            <div class="log-body">
              <span class="log-result" :class="log.result.toLowerCase()">{{ log.result }}</span>
              <div class="log-rewards">
                <span v-if="log.gold > 0" class="reward gold">💰 {{ log.gold }} 金币</span>
                <span v-if="log.exp > 0" class="reward exp">⭐ {{ log.exp }} 经验</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.explore-section {
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

.error-message {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid #f44336;
  border-radius: 8px;
  padding: 15px;
  margin: 15px 0;
  color: #f44336;
  position: relative;
}

.close-error-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  color: #f44336;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
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

.unlock-hint strong {
  color: #bb86fc;
}

.loading-state {
  text-align: center;
  padding: 40px;
  color: #aaa;
}

.explore-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.explore-progress, .locales-container, .recent-combats {
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 15px;
}

.explore-progress h3, .locales-container h3, .recent-combats h3 {
  margin-top: 0;
  color: #bb86fc;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
}

.progress-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-top: 15px;
}

.stat-item {
  background: #3a3a3a;
  border: 1px solid #555;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 5px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #fff;
}

.locales-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.locale-card {
  background: #3a3a3a;
  border: 1px solid #555;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.locale-card.undiscovered {
  opacity: 0.6;
  filter: grayscale(50%);
}

.locale-card:hover {
  border-color: #666;
  transform: translateY(-2px);
}

.locale-header {
  background: #444;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.locale-name {
  margin: 0;
  color: #fff;
  font-size: 18px;
}

.danger-level {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  color: white;
}

.locale-body {
  padding: 15px;
}

.locale-desc {
  margin: 0 0 15px 0;
  color: #aaa;
  line-height: 1.5;
}

.locale-info {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 15px;
}

.info-item {
  text-align: center;
}

.info-label {
  display: block;
  font-size: 11px;
  color: #666;
  margin-bottom: 2px;
}

.info-value {
  display: block;
  font-size: 14px;
  color: #fff;
}

.locale-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
}

.status-badge {
  font-size: 12px;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
}

.explored-count {
  font-size: 12px;
  color: #666;
}

.locale-footer {
  padding: 15px;
  background: #444;
  border-top: 1px solid #555;
}

.explore-btn {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.explore-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.explore-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.locale-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.locale-buttons .btn {
  flex: 1;
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

.locale-rewards {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rewards-label {
  font-size: 12px;
  color: #666;
}

.rewards-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.reward-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: bold;
}

.reward-tag.gold {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.reward-tag.exp {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.reward-tag.mana {
  background: rgba(187, 134, 252, 0.2);
  color: #bb86fc;
}

.recent-combats {
  margin-top: 20px;
}

.no-combats {
  text-align: center;
  padding: 40px;
  color: #666;
}

.combat-logs {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 15px;
}

.combat-log-item {
  background: #3a3a3a;
  border: 1px solid #555;
  border-radius: 8px;
  padding: 15px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.log-monster {
  font-weight: bold;
  color: #fff;
}

.log-time {
  font-size: 12px;
  color: #666;
}

.log-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-result {
  font-size: 14px;
  font-weight: bold;
  padding: 4px 12px;
  border-radius: 20px;
}

.log-result.胜利 {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.log-result.失败 {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.log-rewards {
  display: flex;
  gap: 10px;
}

.reward {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
}

.reward.gold {
  background: rgba(255, 193, 7, 0.1);
  color: #ffc107;
}

.reward.exp {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}
</style>