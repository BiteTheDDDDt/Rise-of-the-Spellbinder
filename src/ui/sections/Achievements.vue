<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useGame } from '../../core/useGame'
import type { Achievement, AchievementType } from '../../systems/achievement'
import AchievementPopup from '../components/AchievementPopup.vue'
import Tooltip from '../components/Tooltip.vue'

const game = useGame()
const { t } = useI18n()
const achievements = ref<Achievement[]>([])
const achievementDefinitions = ref<any[]>([])
const selectedCategory = ref<string>('all')
const selectedType = ref<AchievementType | 'all'>('all')
const unlockedAchievements = ref<Achievement[]>([])
const recentUnlocked = ref<Achievement[]>([])
const showHidden = ref(false)

function getAchievementName(id: string, fallback: string): string {
  return t(`achievement.${id}`, fallback)
}

// Load achievement definitions
onMounted(async () => {
  try {
    const basePath = import.meta.env.BASE_URL || '/'
    const response = await fetch(`${basePath}data/achievements.json`)
    const data = await response.json()
    achievementDefinitions.value = data.achievements || []
    
    // Register achievement definitions to achievement manager
    if (game.player.value.achievementManager) {
      const achievementManager = game.player.value.achievementManager
      // Register each achievement definition if not already registered
      for (const achievementDef of achievementDefinitions.value) {
        // Check if definition already registered (simplified check)
        const existingAchievement = achievementManager.getAchievement(achievementDef.id)
        if (!existingAchievement) {
          achievementManager.registerAchievementDefinition(achievementDef)
        }
      }
      achievements.value = achievementManager.getAllAchievements()
      unlockedAchievements.value = achievementManager.getUnlockedAchievements()
      
      // Subscribe to achievement unlocks
      achievementManager.subscribe((achievement: Achievement) => {
        // Add to recent unlocks for display
        recentUnlocked.value.unshift(achievement)
        if (recentUnlocked.value.length > 5) {
          recentUnlocked.value.pop()
        }
        
        // Update achievements list
        achievements.value = achievementManager.getAllAchievements()
        unlockedAchievements.value = achievementManager.getUnlockedAchievements()
      })
    }
  } catch (error) {
    console.error('Failed to load achievements:', error)
  }
})

const categories = computed(() => {
  const cats = new Set<string>()
  cats.add('all')
  achievementDefinitions.value.forEach(def => cats.add(def.category))
  return Array.from(cats)
})

const types = computed(() => {
  const typeSet = new Set<AchievementType | 'all'>()
  typeSet.add('all')
  achievementDefinitions.value.forEach(def => typeSet.add(def.type))
  return Array.from(typeSet)
})



const filteredDefinitions = computed(() => {
  let filtered = achievementDefinitions.value
  
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(def => def.category === selectedCategory.value)
  }
  
  if (selectedType.value !== 'all') {
    filtered = filtered.filter(def => def.type === selectedType.value)
  }
  
  if (!showHidden.value) {
    filtered = filtered.filter(def => !def.hidden)
  }
  
  return filtered
})

const lockedAchievements = computed(() => {
  return filteredDefinitions.value.filter(def => {
    const achievement = game.player.value?.achievementManager?.getAchievement(def.id)
    return !achievement || !achievement.unlocked
  })
})

const totalAchievements = computed(() => achievementDefinitions.value.length)
const totalUnlocked = computed(() => unlockedAchievements.value.length)
const completionRate = computed(() => {
  return totalAchievements.value > 0 ? Math.round((totalUnlocked.value / totalAchievements.value) * 100) : 0
})

const typeLabels: Record<AchievementType | 'all', string> = {
  skill: t('achievementCategory.skill'),
  spell: t('achievementCategory.spell'),
  activity: t('achievementCategory.activity'),
  resource: t('achievementCategory.resource'),
  time: t('achievementCategory.time'),
  misc: t('achievementCategory.secret'),
  all: t('common.all')
}

const categoryLabels: Record<string, string> = {
  all: t('achievementCategory.all'),
  beginner: t('achievementCategory.beginner'),
  skill: t('achievementCategory.skill'),
  spell: t('achievementCategory.spell'),
  activity: t('achievementCategory.activity'),
  resource: t('achievementCategory.resource'),
  element: t('achievementCategory.element'),
  progress: t('achievementCategory.progress'),
  time: t('achievementCategory.time'),
  secret: t('achievementCategory.secret')
}



function getTypeIcon(type: AchievementType): string {
  switch (type) {
    case 'skill': return '📚'
    case 'spell': return '✨'
    case 'activity': return '⚡'
    case 'resource': return '💰'
    case 'time': return '⏰'
    case 'misc': return '⭐'
    default: return '🏆'
  }
}
</script>

<template>
  <div class="achievements-section">
    <h2 class="section-title">🏆 成就</h2>
    
    <!-- Stats Overview -->
    <div class="stats-overview">
      <div class="stat-card">
        <div class="stat-value">{{ totalUnlocked }}/{{ totalAchievements }}</div>
        <div class="stat-label">已解锁</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ completionRate }}%</div>
        <div class="stat-label">完成率</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ recentUnlocked.length }}</div>
        <div class="stat-label">最近解锁</div>
      </div>
    </div>
    
    <!-- Filters -->
    <div class="filters">
      <div class="filter-group">
        <label for="category-select">类别: </label>
        <select id="category-select" v-model="selectedCategory" class="filter-select">
          <option v-for="category in categories" :key="category" :value="category">
            {{ categoryLabels[category] || category }}
          </option>
        </select>
      </div>
      
      <div class="filter-group">
        <label for="type-select">类型: </label>
        <select id="type-select" v-model="selectedType" class="filter-select">
          <option v-for="type in types" :key="type" :value="type">
             {{ typeLabels[type as keyof typeof typeLabels] }}
          </option>
        </select>
      </div>
      
      <div class="filter-group">
        <label class="checkbox-label">
          <input type="checkbox" v-model="showHidden" class="checkbox">
          显示隐藏成就
        </label>
      </div>
    </div>
    
    <!-- Recent Unlocks -->
    <div v-if="recentUnlocked.length > 0" class="recent-unlocks">
      <h3>最近解锁</h3>
      <div class="recent-grid">
        <div v-for="achievement in recentUnlocked.slice(0, 3)" :key="achievement.id" class="recent-card">
          <div class="recent-icon">{{ achievement.icon }}</div>
          <div class="recent-details">
            <div class="recent-name">{{ getAchievementName(achievement.id, achievement.name) }}</div>
            <div class="recent-time">{{ t('ui.recentUnlocks') }}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Unlocked Achievements -->
    <div class="achievements-category">
      <h3>已解锁成就 ({{ unlockedAchievements.length }})</h3>
      <div v-if="unlockedAchievements.length > 0" class="achievement-grid">
        <div v-for="achievement in unlockedAchievements" :key="achievement.id" class="achievement-card unlocked">
          <div class="achievement-header">
            <div class="achievement-icon">{{ achievement.icon }}</div>
            <div class="achievement-info">
              <h4 class="achievement-name">{{ achievement.name }}</h4>
              <div class="achievement-meta">
                <span class="meta-item">{{ categoryLabels[achievement.category] || achievement.category }}</span>
                 <span class="meta-item">{{ getTypeIcon(achievement.type) }} {{ typeLabels[achievement.type as keyof typeof typeLabels] }}</span>
              </div>
            </div>
            <Tooltip :content="`解锁时间: ${achievement.unlockedAt ? new Date(achievement.unlockedAt).toLocaleString() : '未知'}`" position="left">
              <div class="achievement-status unlocked-badge">已解锁</div>
            </Tooltip>
          </div>
          <p class="achievement-desc">{{ achievement.description }}</p>
          
          <div v-if="achievement.rewards.length > 0" class="achievement-rewards">
            <strong>奖励: </strong>
            <span v-for="(reward, index) in achievement.rewards" :key="index" class="reward">
              {{ 
                reward.type === 'resource' ? `💰 ${reward.amount} ${reward.resourceId}` :
                reward.type === 'unlock' ? `🔓 ${reward.unlockId}` :
                `⭐ ${reward.bonusValue}% ${reward.bonusType}`
              }}{{ Number(index) < achievement.rewards.length - 1 ? ', ' : '' }}
            </span>
          </div>
        </div>
      </div>
      <p v-else class="no-achievements">尚未解锁任何成就</p>
    </div>
    
    <!-- Locked Achievements -->
    <div class="achievements-category">
      <h3>未解锁成就 ({{ lockedAchievements.length }})</h3>
      <div v-if="lockedAchievements.length > 0" class="achievement-grid">
        <div v-for="achievement in lockedAchievements" :key="achievement.id" class="achievement-card locked">
          <div class="achievement-header">
            <div class="achievement-icon">{{ achievement.icon }}</div>
            <div class="achievement-info">
              <h4 class="achievement-name">{{ achievement.name }}</h4>
              <div class="achievement-meta">
                <span class="meta-item">{{ categoryLabels[achievement.category] || achievement.category }}</span>
                <span class="meta-item">{{ getTypeIcon(achievement.type) }} {{ typeLabels[achievement.type as keyof typeof typeLabels] }}</span>
                <span v-if="achievement.hidden" class="meta-item secret-badge">秘密</span>
              </div>
            </div>
            <div class="achievement-status locked-badge">未解锁</div>
          </div>
          <p class="achievement-desc">{{ achievement.hidden ? '？？？？？？' : achievement.description }}</p>
          
          <div class="achievement-progress">
            <div class="progress-info">
              <span>进度: {{ 
                game.player.value?.achievementManager?.getAchievement(achievement.id)?.current || 0 
              }}/{{ achievement.condition.required }}</span>
              <span>{{ 
                Math.round((game.player.value?.achievementManager?.getAchievement(achievement.id)?.progress || 0)) 
              }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ 
                width: `${game.player.value?.achievementManager?.getAchievement(achievement.id)?.progress || 0}%` 
              }"></div>
            </div>
          </div>
          
          <div v-if="!achievement.hidden && achievement.rewards.length > 0" class="achievement-rewards">
            <strong>奖励: </strong>
            <span v-for="(reward, index) in achievement.rewards" :key="index" class="reward">
              {{ 
                reward.type === 'resource' ? `💰 ${reward.amount} ${reward.resourceId}` :
                reward.type === 'unlock' ? `🔓 ${reward.unlockId}` :
                `⭐ ${reward.bonusValue}% ${reward.bonusType}`
              }}{{ Number(index) < achievement.rewards.length - 1 ? ', ' : '' }}
            </span>
          </div>
          <div v-else-if="achievement.hidden" class="achievement-rewards">
            <strong>奖励: </strong>
            <span class="reward">？？？？？？</span>
          </div>
        </div>
      </div>
      <p v-else class="no-achievements">没有未解锁的成就</p>
    </div>
    
    <!-- Achievement Popups -->
    <div v-for="achievement in recentUnlocked" :key="`popup-${achievement.id}`">
       <AchievementPopup 
        v-if="achievement.unlocked && achievement.unlockedAt && Date.now() - Number(achievement.unlockedAt) < 10000"
        :achievement="achievement"
        :duration="5000"
      />
    </div>
  </div>
</template>

<style scoped>
.achievements-section {
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

.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
}

.stat-card {
  background: #252525;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  border: 1px solid #444;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #03dac6;
  margin-bottom: 5px;
}

.stat-label {
  color: #aaa;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 25px;
  padding: 15px;
  background: #252525;
  border-radius: 8px;
  border: 1px solid #444;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  color: #e0e0e0;
  font-size: 14px;
}

.filter-select {
  padding: 8px 12px;
  background: #1e1e1e;
  color: white;
  border: 1px solid #555;
  border-radius: 6px;
  font-size: 14px;
  min-width: 120px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.recent-unlocks {
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(15, 52, 96, 0.3), rgba(15, 52, 96, 0.1));
  border-radius: 10px;
  border: 1px solid #0f3460;
}

.recent-unlocks h3 {
  color: #03dac6;
  margin-top: 0;
  margin-bottom: 15px;
}

.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.recent-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.recent-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.recent-details {
  flex-grow: 1;
}

.recent-name {
  color: white;
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 5px;
}

.recent-time {
  color: #aaa;
  font-size: 12px;
}

.achievements-category {
  margin-bottom: 30px;
}

.achievements-category h3 {
  color: #03dac6;
  margin-bottom: 15px;
  padding-bottom: 5px;
  border-bottom: 1px solid #333;
}

.achievement-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.achievement-card {
  background: #252525;
  border-radius: 10px;
  padding: 20px;
  border: 1px solid #333;
  transition: transform 0.2s, border-color 0.2s;
}

.achievement-card:hover {
  transform: translateY(-2px);
}

.achievement-card.unlocked {
  border-color: #4caf50;
}

.achievement-card.locked {
  border-color: #ff5722;
}

.achievement-header {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}

.achievement-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.achievement-info {
  flex-grow: 1;
}

.achievement-name {
  margin: 0 0 5px 0;
  color: white;
  font-size: 18px;
}

.achievement-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.meta-item {
  color: #aaa;
  font-size: 12px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.secret-badge {
  background: rgba(187, 134, 252, 0.2);
  color: #bb86fc;
}

.achievement-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.unlocked-badge {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.locked-badge {
  background: rgba(255, 87, 34, 0.2);
  color: #ff5722;
}

.achievement-desc {
  color: #aaa;
  font-size: 14px;
  margin-bottom: 15px;
  line-height: 1.5;
}

.achievement-progress {
  margin-bottom: 15px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #fff;
  font-size: 14px;
}

.progress-bar {
  height: 8px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff9800, #ff5722);
  border-radius: 4px;
  transition: width 0.3s;
}

.achievement-rewards {
  font-size: 14px;
  padding-top: 15px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.achievement-rewards strong {
  color: #ff9800;
}

.reward {
  color: #e0e0e0;
  font-size: 13px;
  margin-right: 5px;
}

.no-achievements {
  color: #666;
  text-align: center;
  padding: 40px 20px;
  font-style: italic;
  font-size: 16px;
}
</style>